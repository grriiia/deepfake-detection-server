# ============================================================
# app/db/session.py - DB 연결 설정
# ============================================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

# DB 엔진 생성
# check_same_thread=False: SQLite에서 멀티스레드 허용
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모든 모델이 상속할 기본 클래스
Base = declarative_base()


def get_db():
    """
    DB 세션 의존성 함수
    - 요청마다 새 세션 생성
    - 요청 완료 후 자동 close()
    - Depends(get_db)로 엔드포인트에 주입
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()