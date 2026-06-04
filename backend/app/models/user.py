# ============================================================
# app/models/user.py - User DB 모델
# ============================================================

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    """users 테이블 - 회원 정보 저장"""
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)  # 평문 저장 금지!
    role = Column(Integer, default=2, nullable=False)  # role: 1=관리자, 2=일반 사용자 (기본값)

    # 1:N 관계 - 한 유저가 여러 영상/분석 보유 가능
    videos   = relationship("Video",    back_populates="owner")
    analyses = relationship("Analysis", back_populates="owner")