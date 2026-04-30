# ============================================================
# app/schemas/analysis.py - 분석 요청/응답 데이터 형식
# ============================================================

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ConfidencePoint(BaseModel):
    frame_index: int
    confidence: float


class TopFrame(BaseModel):
    frame_index: int
    confidence: float


class AnalysisOut(BaseModel):
    """
    분석 결과 응답 스키마
    - pending/running: status만 있고 나머지 null
    - done: 모든 필드 채워짐
    - failed: status + error_message
    """
    analysis_id: str
    video_id: str
    status: str

    prediction: Optional[str] = None
    confidence: Optional[float] = None

    manipulated_frame_count: Optional[int] = None
    manipulated_frame_ratio: Optional[float] = None

    confidence_timeline: Optional[List[ConfidencePoint]] = None
    top1_frame: Optional[TopFrame] = None
    layercam_image: Optional[str] = None
    frequency_spectrum: Optional[str] = None

    error_message: Optional[str] = None

    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class AnalysisSimple(BaseModel):
    """분석 이력 목록용 간단 응답 (base64 이미지 제외)"""
    analysis_id: str
    video_id: str
    status: str
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    manipulated_frame_count: Optional[int] = None
    manipulated_frame_ratio: Optional[float] = None
    created_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

class Config:
    from_attributes = True