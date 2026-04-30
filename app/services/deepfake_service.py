import io
import os
from typing import Dict, Any

import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from retinaface.pre_trained_models import get_model

from app.ai.model import Detector
from app.ai.preprocess import extract_frames


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(APP_DIR, ".."))

WEIGHT_PATH = os.path.join(PROJECT_ROOT, "app", "ai", "weights", "SBI.tar")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

image_transform = transforms.Compose([
    transforms.Resize((380, 380)),
    transforms.ToTensor(),
])

_model = None
_face_detector = None


def load_resources():
    global _model, _face_detector

    if _model is None:
        model = Detector().to(DEVICE)
        checkpoint = torch.load(WEIGHT_PATH, map_location=DEVICE)

        if isinstance(checkpoint, dict) and "model" in checkpoint:
            model.load_state_dict(checkpoint["model"])
        else:
            model.load_state_dict(checkpoint)

        model.eval()
        _model = model

    if _face_detector is None:
        face_detector = get_model("resnet50_2020-07-20", max_size=2048, device=DEVICE)
        face_detector.eval()
        _face_detector = face_detector


def predict_image(image_bytes: bytes) -> Dict[str, Any]:
    load_resources()

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = image_transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = _model(img)
        probs = torch.softmax(logits, dim=1)
        fake_score = probs[0, 1].item()

    prediction = "fake" if fake_score >= 0.5 else "real"

    return {
        "prediction": prediction,
        "confidence": round(float(fake_score), 4),
        "manipulated_frame_count": None,
        "manipulated_frame_ratio": None,
        "confidence_timeline": None,
        "top1_frame": None,
        "layercam_image": None,
        "frequency_spectrum": None,
    }


def predict_video(video_path: str, n_frames: int = 32) -> Dict[str, Any]:
    load_resources()

    face_list, idx_list = extract_frames(video_path, n_frames, _face_detector)

    if len(face_list) == 0:
        return {
            "prediction": "unknown",
            "confidence": 0.0,
            "manipulated_frame_count": 0,
            "manipulated_frame_ratio": 0.0,
            "confidence_timeline": [],
            "top1_frame": None,
            "layercam_image": None,
            "frequency_spectrum": None,
        }

    with torch.no_grad():
        img = torch.tensor(face_list).to(DEVICE).float() / 255.0
        pred = _model(img).softmax(1)[:, 1]

    pred_list = []
    idx_img = -1

    for i in range(len(pred)):
        if idx_list[i] != idx_img:
            pred_list.append([])
            idx_img = idx_list[i]
        pred_list[-1].append(pred[i].item())

    pred_res = np.zeros(len(pred_list))
    for i in range(len(pred_res)):
        pred_res[i] = max(pred_list[i])

    final_score = float(pred_res.mean())
    prediction = "fake" if final_score >= 0.5 else "real"
    manipulated_count = int(np.sum(pred_res >= 0.5))
    manipulated_ratio = float(manipulated_count / len(pred_res)) if len(pred_res) > 0 else 0.0

    timeline = [
        {"frame_index": i, "confidence": round(float(score), 4)}
        for i, score in enumerate(pred_res.tolist())
    ]

    top_idx = int(np.argmax(pred_res)) if len(pred_res) > 0 else None
    top1_frame = (
        {
            "frame_index": top_idx,
            "confidence": round(float(pred_res[top_idx]), 4),
        }
        if top_idx is not None
        else None
    )

    return {
        "prediction": prediction,
        "confidence": round(final_score, 4),
        "manipulated_frame_count": manipulated_count,
        "manipulated_frame_ratio": round(manipulated_ratio, 4),
        "confidence_timeline": timeline,
        "top1_frame": top1_frame,
        "layercam_image": None,
        "frequency_spectrum": None,
    }