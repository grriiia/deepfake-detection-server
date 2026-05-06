# ============================================================
# app/schemas/video.py - 영상 요청/응답 데이터 형식
# ============================================================

from datetime import datetime
from pydantic import BaseModel


class VideoOut(BaseModel):
    """영상 업로드 성공 응답"""
    video_id:   str
    filename:   str
    created_at: datetime

    class Config:
        from_attributes = True