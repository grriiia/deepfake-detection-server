# ============================================================
# app/schemas/analysis.py - 분석 요청/응답 데이터 형식
# ============================================================

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AnalysisOut(BaseModel):
    """
    분석 결과 응답 스키마
    - pending/running: status만 있고 나머지 null
    - done: 모든 필드 채워짐
    - failed: status + error_message
    """
    analysis_id: str
    video_id:    str
    status:      str  # pending / running / done / failed

    # 최종 판정
    prediction: Optional[str]   = None  # "real" / "fake"
    confidence: Optional[float] = None  # 0.0 ~ 1.0  (AI: overall_confidence)

    # 프레임 조작 통계
    manipulated_frame_count: Optional[int]   = None  # AI: manipulated_frame_count
    manipulated_frame_ratio: Optional[float] = None  # AI: metrics.fake_ratio

    # Xception 분석 결과
    confidence_timeline: Optional[list] = None  # 프레임별 confidence 흐름
    top1_frame:          Optional[dict] = None  # 최고 confidence 프레임 + 시각화 (AI: top_evidence)
    layercam_image:      Optional[str]  = None  # base64 히트맵 (AI: top_evidence.layercam_base64)
    frequency_spectrum:  Optional[str]  = None  # base64 주파수 스펙트럼 (AI: top_evidence.spectrum_base64)

    error_message: Optional[str] = None

    created_at:  Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class AnalysisSimple(BaseModel):
    """분석 이력 목록용 간단 응답 (base64 이미지 제외)"""
    analysis_id: str
    video_id:    str
    status:      str
    prediction:  Optional[str]   = None
    confidence:  Optional[float] = None

    # 목록에서도 조작 비율은 표시 가능하도록 포함
    manipulated_frame_count: Optional[int]   = None
    manipulated_frame_ratio: Optional[float] = None

    created_at:  Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        orm_mode = True