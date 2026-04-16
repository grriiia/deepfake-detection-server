# ============================================================
# app/api/v1/endpoints/analyses.py - 분석 요청/결과 API
# 분석 요청 / 결과 조회 / 이력 목록 / 삭제
# ============================================================

import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisOut
from app.api.deps import get_current_user
from app.services.ai_client import call_ai_server

router = APIRouter()


async def run_analysis(analysis_id: str, video_path: str, db: Session):
    """
    분석 작업 실행 함수 (백그라운드에서 실행)
    - AI 서버 호출 → 결과 DB 저장
    - 성공: status = "done"
    - 실패: status = "failed" + error_message

    AI팀 응답 → DB 필드 매핑:
      overall_confidence        → confidence
      manipulated_frame_count   → manipulated_frame_count
      metrics.fake_ratio        → manipulated_frame_ratio
      confidence_timeline       → confidence_timeline
      top_evidence              → top1_frame  (dict 통째로 저장)
      top_evidence.layercam_base64  → layercam_image
      top_evidence.spectrum_base64  → frequency_spectrum
      error                     → error_message
    """
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        return

    # 상태를 "running"으로 변경
    analysis.status = "running"
    db.commit()

    try:
        # AI 서버에 분석 요청
        result = await call_ai_server(video_path, analysis_id)

        # top_evidence 미리 추출 (layercam, spectrum 공통 참조)
        top_evidence = result.get("top_evidence") or {}

        # ── 결과 DB 저장 ──────────────────────────────────────
        analysis.prediction             = result.get("prediction")
        analysis.confidence             = result.get("overall_confidence")         # ✅ 수정
        analysis.manipulated_frame_count = result.get("manipulated_frame_count")   # ✅ 추가
        analysis.manipulated_frame_ratio = (result.get("metrics") or {}).get("fake_ratio")  # ✅ 추가
        analysis.confidence_timeline    = result.get("confidence_timeline")
        analysis.top1_frame             = top_evidence                             # ✅ 수정 (top_evidence)
        analysis.layercam_image         = top_evidence.get("layercam_base64")      # ✅ 수정
        analysis.frequency_spectrum     = top_evidence.get("spectrum_base64")      # ✅ 수정
        analysis.error_message          = result.get("error")                      # ✅ 수정 (error)
        analysis.status                 = "done"
        analysis.finished_at            = datetime.utcnow()
        # ─────────────────────────────────────────────────────

    except Exception as e:
        # AI 서버 오류 시 실패 처리
        print(f"[분석 실패] analysis_id={analysis_id}, error={e}")
        analysis.status        = "failed"
        analysis.error_message = str(e)
        analysis.finished_at   = datetime.utcnow()

    db.commit()


@router.post("/{video_id}/analyze")
async def request_analysis(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    분석 요청 (비동기 처리)
    - POST /api/v1/analyses/{video_id}/analyze
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): { "analysis_id": "uuid", "status": "pending" }
    - 실패 (404): { "detail": "영상을 찾을 수 없습니다" }

    동작 방식:
    1. Analysis 레코드 생성 (status=pending)
    2. 즉시 analysis_id 반환
    3. 백그라운드에서 AI 서버 호출 진행
    4. 프론트는 3초마다 GET /analyses/{id}로 폴링

    프론트 연동: QualityCheck.tsx "분석 계속하기" 버튼 클릭 시 호출
    """
    # 영상 존재 여부 + 소유권 확인
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.user_id == current_user.id,
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="영상을 찾을 수 없습니다",
        )

    # Analysis 레코드 생성
    analysis = Analysis(
        video_id=video_id,
        user_id=current_user.id,
        status="pending",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # 백그라운드에서 AI 서버 호출
    asyncio.create_task(
        run_analysis(analysis.id, video.path, db)
    )

    return {"analysis_id": analysis.id, "status": "pending"}


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    분석 결과 조회 (폴링용)
    - GET /api/v1/analyses/{analysis_id}
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): AnalysisOut
    - 실패 (404): { "detail": "분석 결과를 찾을 수 없습니다" }

    프론트 연동: Progress.tsx에서 3초마다 호출
    status == "done" 이면 Result.tsx로 이동
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

    return AnalysisOut(
        analysis_id              = analysis.id,
        video_id                 = analysis.video_id,
        status                   = analysis.status,
        prediction               = analysis.prediction,
        confidence               = analysis.confidence,
        manipulated_frame_count  = analysis.manipulated_frame_count,
        manipulated_frame_ratio  = analysis.manipulated_frame_ratio,
        confidence_timeline      = analysis.confidence_timeline,
        top1_frame               = analysis.top1_frame,
        layercam_image           = analysis.layercam_image,
        frequency_spectrum       = analysis.frequency_spectrum,
        error_message            = analysis.error_message,
        created_at               = analysis.created_at,
        finished_at              = analysis.finished_at,
    )


@router.get("/")
def get_my_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    내 분석 이력 목록 조회
    - GET /api/v1/analyses/
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): [{ "analysis_id": "...", "status": "...", ... }, ...]

    프론트 연동: History.tsx 분석 이력 목록 표시 시 호출
    최신순 정렬, base64 이미지 제외 (목록이라 가볍게)
    """
    analyses = db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    ).order_by(Analysis.created_at.desc()).all()

    return [
        {
            "analysis_id":            a.id,
            "video_id":               a.video_id,
            "status":                 a.status,
            "prediction":             a.prediction,
            "confidence":             a.confidence,
            "manipulated_frame_count": a.manipulated_frame_count,
            "manipulated_frame_ratio": a.manipulated_frame_ratio,
            "created_at":             a.created_at,
            "finished_at":            a.finished_at,
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
    - DELETE /api/v1/analyses/{analysis_id}
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): { "message": "삭제되었습니다" }
    - 실패 (404): { "detail": "분석 결과를 찾을 수 없습니다" }

    프론트 연동: History.tsx 삭제 버튼 클릭 시 호출
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