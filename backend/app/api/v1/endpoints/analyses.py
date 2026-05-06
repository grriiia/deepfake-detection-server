# ============================================================
# app/api/v1/endpoints/analyses.py - 분석 요청/결과 API
# ============================================================

import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.models.user import User
from app.models.video import Video
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisOut
from app.api.deps import get_current_user
from app.services.deepfake_service import predict_video

router = APIRouter()


async def run_analysis(analysis_id: str, video_path: str):
    """
    백그라운드 분석 실행 함수
    - AI 모델 호출 및 결과를 DB에 업데이트
    """
    db = SessionLocal()
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if not analysis:
            return

        # 상태 업데이트: running
        analysis.status = "running"
        db.commit()

        # AI 분석 실행 (비차단 스레드에서 실행)
        result = await asyncio.to_thread(predict_video, video_path)

        # 결과 업데이트
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        analysis.prediction = result.get("prediction")
        analysis.confidence = result.get("confidence")
        analysis.manipulated_frame_count = result.get("manipulated_frame_count")
        analysis.manipulated_frame_ratio = result.get("manipulated_frame_ratio")
        analysis.confidence_timeline = result.get("confidence_timeline")
        analysis.top1_frame = result.get("top1_frame")
        analysis.layercam_image = result.get("layercam_image")
        analysis.frequency_spectrum = result.get("frequency_spectrum")
        analysis.texture_map = result.get("texture_map")
        analysis.representative_frames = result.get("representative_frames")
        
        analysis.status = "done"
        analysis.error_message = None
        analysis.finished_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        print(f"[ERROR] Analysis {analysis_id} failed: {e}")
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(e)
            analysis.finished_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/{video_id}/analyze")
async def request_analysis(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    딥페이크 분석 요청
    - 분석 레코드를 생성하고 백그라운드 태스크를 시작합니다.
    """
    # 권한 및 영상 존재 확인
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.user_id == current_user.id,
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="영상을 찾을 수 없습니다",
        )

    # 분석 초기 레코드 생성
    analysis = Analysis(
        video_id=video_id,
        user_id=current_user.id,
        status="pending",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # 비동기 백그라운드 작업 시작
    asyncio.create_task(run_analysis(analysis.id, video.path))

    return {"analysis_id": analysis.id, "status": "pending"}


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    특정 분석 결과 상세 조회
    """
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="분석 결과를 찾을 수 없습니다",
        )

    # DB 모델의 id를 스키마의 analysis_id로 매핑하여 반환
    return AnalysisOut(
        analysis_id=analysis.id,
        video_id=analysis.video_id,
        status=analysis.status,
        prediction=analysis.prediction,
        confidence=analysis.confidence,
        manipulated_frame_count=analysis.manipulated_frame_count,
        manipulated_frame_ratio=analysis.manipulated_frame_ratio,
        confidence_timeline=analysis.confidence_timeline,
        top1_frame=analysis.top1_frame,
        layercam_image=analysis.layercam_image,
        frequency_spectrum=analysis.frequency_spectrum,
        texture_map=analysis.texture_map,
        representative_frames=analysis.representative_frames,
        error_message=analysis.error_message,
        created_at=analysis.created_at,
        finished_at=analysis.finished_at,
    )


@router.get("/")
def get_my_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자의 전체 분석 이력 조회
    """
    analyses = db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    ).order_by(Analysis.created_at.desc()).all()

    # 목록 조회 시 대용량 바이너리 데이터(이미지 등)는 제외하여 반환
    return [
        {
            "analysis_id": a.id,
            "video_id": a.video_id,
            "status": a.status,
            "prediction": a.prediction,
            "confidence": a.confidence,
            "manipulated_frame_count": a.manipulated_frame_count,
            "manipulated_frame_ratio": a.manipulated_frame_ratio,
            "created_at": a.created_at,
            "finished_at": a.finished_at,
        }
        for a in analyses
    ]


@router.delete("/{analysis_id}")
def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    분석 결과 삭제
    """
    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == current_user.id,
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="분석 결과를 찾을 수 없습니다",
        )

    db.delete(analysis)
    db.commit()
    return {"message": "삭제되었습니다"}