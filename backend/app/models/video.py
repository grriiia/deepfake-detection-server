# ============================================================
# app/models/video.py - Video DB 모델
# ============================================================

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base


class Video(Base):
    """videos 테이블 - 업로드된 영상 정보 저장"""
    __tablename__ = "videos"

    # UUID로 ID 생성 (예측 불가능하고 고유한 문자열 ID)
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename   = Column(String, nullable=False)   # 원본 파일명 (화면 표시용)
    path       = Column(String, nullable=False)   # 서버 저장 경로 (AI 서버 전달용)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner    = relationship("User",     back_populates="videos")
    analyses = relationship("Analysis", back_populates="video")