# ============================================================
# app/services/deepfake_service.py - Deepfake Detection Service
# ============================================================

import io
import os
import base64
import cv2
import torch
import numpy as np
from typing import Dict, Any, List, Optional
from PIL import Image
from torchvision import transforms
from retinaface.pre_trained_models import get_model

from app.ai.model import Detector
from app.ai.preprocess import extract_frames


# 전역 설정 및 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(APP_DIR, ".."))
WEIGHT_PATH = os.path.join(PROJECT_ROOT, "app", "ai", "weights", "SBI.tar")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 전역 리소스 캐싱
_model = None
_face_detector = None

# 이미지 분석용 전처리
image_transform = transforms.Compose([
    transforms.Resize((380, 380)),
    transforms.ToTensor(),
])


def load_resources():
    """AI 모델 및 리소스 로드"""
    global _model, _face_detector

    if _model is None:
        model = Detector().to(DEVICE)
        checkpoint = torch.load(WEIGHT_PATH, map_location=DEVICE)
        state_dict = checkpoint["model"] if isinstance(checkpoint, dict) and "model" in checkpoint else checkpoint
        model.load_state_dict(state_dict)
        model.eval()
        _model = model

    if _face_detector is None:
        _face_detector = get_model("resnet50_2020-07-20", max_size=2048, device=DEVICE)
        _face_detector.eval()


def predict_image(image_bytes: bytes) -> Dict[str, Any]:
    """단일 이미지에 대한 딥페이크 분석 실행"""
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
        "texture_map": None,
        "representative_frames": [],
    }


def _get_layercam_map(model: torch.nn.Module, face_tensor: torch.Tensor, original_img: np.ndarray) -> Optional[str]:
    """특징 주목 영역(LayerCAM) 생성"""
    model.eval()
    features = []
    
    def hook(module, input, output):
        features.append(output)
    
    # EfficientNet-B4의 마지막 convolution head 사용
    handle = model.net._conv_head.register_forward_hook(hook)
    with torch.no_grad():
        model(face_tensor)
    handle.remove()
    
    if not features:
        return None
        
    act = features[0].squeeze().cpu().numpy()
    cam = np.mean(act, axis=0)
    cam = np.maximum(cam, 0)
    cam = cam / (np.max(cam) + 1e-7)
    cam = cv2.resize(cam, (380, 380))
    
    heatmap_input = (255 * cam).astype(np.uint8)
    heatmap = cv2.applyColorMap(heatmap_input, cv2.COLORMAP_JET)
    
    # 가시성을 위해 원본과 합성 (60% 히트맵)
    overlay = cv2.addWeighted(original_img, 0.4, heatmap, 0.6, 0)
    _, buffer = cv2.imencode('.jpg', overlay)
    return base64.b64encode(buffer).decode('utf-8')


def _get_frequency_spectrum(gray_img: np.ndarray) -> str:
    """주파수 스펙트럼(FFT) 분석 맵 생성"""
    f = np.fft.fft2(gray_img)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
    
    magnitude_spectrum = np.clip(
        255 * (magnitude_spectrum / (np.max(magnitude_spectrum) + 1e-7)), 
        0, 255
    ).astype(np.uint8)
    
    heatmap = cv2.applyColorMap(magnitude_spectrum, cv2.COLORMAP_VIRIDIS)
    _, buffer = cv2.imencode('.jpg', heatmap)
    return base64.b64encode(buffer).decode('utf-8')


def _get_texture_map(gray_img: np.ndarray) -> str:
    """텍스처 일관성(Laplacian) 맵 생성"""
    laplacian = np.absolute(cv2.Laplacian(gray_img, cv2.CV_64F))
    texture_input = np.clip(laplacian * 4, 0, 255).astype(np.uint8)
    
    heatmap = cv2.applyColorMap(texture_input, cv2.COLORMAP_HOT)
    _, buffer = cv2.imencode('.jpg', heatmap)
    return base64.b64encode(buffer).decode('utf-8')


def predict_video(video_path: str, n_frames: int = 32) -> Dict[str, Any]:
    """영상 전체에 대한 딥페이크 분석 실행"""
    load_resources()

    # 프레임 추출 및 얼굴 검출
    face_list, idx_list = extract_frames(video_path, n_frames, _face_detector)

    if not face_list:
        return {
            "prediction": "unknown",
            "confidence": 0.0,
            "manipulated_frame_count": 0,
            "manipulated_frame_ratio": 0.0,
            "confidence_timeline": [],
            "top1_frame": None,
            "layercam_image": None,
            "frequency_spectrum": None,
            "texture_map": None,
            "representative_frames": [],
        }

    # AI 모델 추론
    with torch.no_grad():
        img_batch = torch.tensor(np.array(face_list)).to(DEVICE).float() / 255.0
        preds = _model(img_batch).softmax(1)[:, 1].cpu().numpy()

    # 프레임별 최대 점수 산출 (다중 얼굴 대응)
    unique_frame_indices = sorted(list(set(idx_list)))
    frame_scores = []
    for f_idx in unique_frame_indices:
        scores_for_frame = [preds[i] for i, v in enumerate(idx_list) if v == f_idx]
        frame_scores.append(max(scores_for_frame))

    # 결과 통계 계산
    frame_scores = np.array(frame_scores)
    final_score = float(frame_scores.mean())
    prediction = "fake" if final_score >= 0.5 else "real"
    manipulated_count = int(np.sum(frame_scores >= 0.5))
    manipulated_ratio = float(manipulated_count / len(frame_scores))

    timeline = [
        {"frame_index": i, "confidence": round(float(s), 4)}
        for i, s in enumerate(frame_scores)
    ]

    # 가장 의심되는 프레임(Top 1) 선정 및 시각화
    top_idx_in_scores = int(np.argmax(frame_scores))
    # 원본 face_list에서의 인덱스 찾기
    top_idx_in_list = idx_list.index(unique_frame_indices[top_idx_in_scores])
    
    top1_info = {
        "frame_index": top_idx_in_scores,
        "confidence": round(float(frame_scores[top_idx_in_scores]), 4),
    }

    # 대표 프레임 추출
    representative_frames = []
    sample_indices = np.linspace(0, len(face_list) - 1, min(4, len(face_list)), dtype=int)
    for idx in sample_indices:
        face_img = cv2.cvtColor(face_list[idx].transpose(1, 2, 0), cv2.COLOR_RGB2BGR)
        _, buf = cv2.imencode('.jpg', face_img)
        representative_frames.append(base64.b64encode(buf).decode('utf-8'))

    # 가시화 맵 생성
    layercam_b64 = None
    spectrum_b64 = None
    texture_b64 = None

    if len(face_list) > 0:
        top_face = face_list[top_idx_in_list]
        top_face_tensor = torch.tensor(top_face).unsqueeze(0).to(DEVICE).float() / 255.0
        
        orig_img = cv2.cvtColor(top_face.transpose(1, 2, 0), cv2.COLOR_RGB2BGR)
        gray_img = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
        
        layercam_b64 = _get_layercam_map(_model, top_face_tensor, orig_img)
        spectrum_b64 = _get_frequency_spectrum(gray_img)
        texture_b64 = _get_texture_map(gray_img)

    return {
        "prediction": prediction,
        "confidence": round(final_score, 4),
        "manipulated_frame_count": manipulated_count,
        "manipulated_frame_ratio": round(manipulated_ratio, 4),
        "confidence_timeline": timeline,
        "top1_frame": top1_info,
        "layercam_image": layercam_b64,
        "frequency_spectrum": spectrum_b64,
        "texture_map": texture_b64,
        "representative_frames": representative_frames,
    }