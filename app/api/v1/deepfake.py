import os
import shutil
import tempfile
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.schemas.analysis import AnalysisOut
from app.services.deepfake_service import predict_image, predict_video

router = APIRouter()


@router.post("/image", response_model=AnalysisOut)
async def analyze_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    contents = await file.read()
    result = predict_image(contents)
    now = datetime.utcnow()

    return AnalysisOut(
        analysis_id=str(uuid.uuid4()),
        video_id=file.filename,
        status="done",
        prediction=result["prediction"],
        confidence=result["confidence"],
        manipulated_frame_count=result["manipulated_frame_count"],
        manipulated_frame_ratio=result["manipulated_frame_ratio"],
        confidence_timeline=result["confidence_timeline"],
        top1_frame=result["top1_frame"],
        layercam_image=result["layercam_image"],
        frequency_spectrum=result["frequency_spectrum"],
        error_message=None,
        created_at=now,
        finished_at=now,
    )


@router.post("/video", response_model=AnalysisOut)
async def analyze_video(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="비디오 파일만 업로드 가능합니다.")

    tmp_path = None
    now = datetime.utcnow()

    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        result = predict_video(tmp_path)

        return AnalysisOut(
            analysis_id=str(uuid.uuid4()),
            video_id=file.filename,
            status="done",
            prediction=result["prediction"],
            confidence=result["confidence"],
            manipulated_frame_count=result["manipulated_frame_count"],
            manipulated_frame_ratio=result["manipulated_frame_ratio"],
            confidence_timeline=result["confidence_timeline"],
            top1_frame=result["top1_frame"],
            layercam_image=result["layercam_image"],
            frequency_spectrum=result["frequency_spectrum"],
            error_message=None,
            created_at=now,
            finished_at=now,
        )

    except Exception as e:
        return AnalysisOut(
            analysis_id=str(uuid.uuid4()),
            video_id=file.filename,
            status="failed",
            prediction=None,
            confidence=None,
            manipulated_frame_count=None,
            manipulated_frame_ratio=None,
            confidence_timeline=None,
            top1_frame=None,
            layercam_image=None,
            frequency_spectrum=None,
            error_message=str(e),
            created_at=now,
            finished_at=datetime.utcnow(),
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)