# ============================================================
# app/models/analysis.py - Analysis DB 모델
# Xception 기반 딥페이크 분석 결과 저장
# ============================================================

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class Analysis(Base):
    """analyses 테이블 - 딥페이크 분석 결과 저장"""
    __tablename__ = "analyses"

    id       = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String,  ForeignKey("videos.id"), nullable=False)
    user_id  = Column(Integer, ForeignKey("users.id"),  nullable=False)

    # 분석 상태
    # pending  → 분석 대기 중 (업로드 직후 초기값)
    # running  → AI 서버에서 처리 중
    # done     → 분석 완료
    # failed   → 분석 실패
    status = Column(String, default="pending")

    # 최종 판정
    prediction = Column(String, nullable=True)  # "real" / "fake"
    confidence = Column(Float,  nullable=True)  # 0.0 ~ 1.0  (AI: overall_confidence)

    # Xception 분석 결과 ---------------------------------

    # 조작된 프레임 수 (AI: manipulated_frame_count)
    manipulated_frame_count = Column(Integer, nullable=True)

    # 조작된 프레임 비율 (AI: metrics.fake_ratio)
    manipulated_frame_ratio = Column(Float, nullable=True)

    # 프레임별 confidence 흐름 (선 그래프용)
    # AI 응답: confidence_timeline
    # 예: [{"frame": 0, "time": 0.0, "score": 0.12}, ...]
    confidence_timeline = Column(JSON, nullable=True)

    # 가장 confidence가 높은 프레임 + 시각화 정보
    # AI 응답: top_evidence
    # 예: {"frame_index": 30, "time_sec": 1.0, "confidence": 0.95,
    #       "layercam_base64": "...", "spectrum_base64": "..."}
    top1_frame = Column(JSON, nullable=True)

    # LayerCAM 히트맵 이미지 (base64)
    # 모델이 가짜라고 판단한 근거 영역을 붉은색으로 시각화
    # AI 응답: top_evidence.layercam_base64
    layercam_image = Column(Text, nullable=True)

    # 주파수 스펙트럼 이미지 (base64)
    # GAN 고유의 checkerboard artifacts 시각화
    # AI 응답: top_evidence.spectrum_base64
    frequency_spectrum = Column(Text, nullable=True)

    # 실패 시 에러 메시지 (AI: error)
    error_message = Column(String, nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    owner = relationship("User",  back_populates="analyses")
    video = relationship("Video", back_populates="analyses")