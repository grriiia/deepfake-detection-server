# ============================================================
# app/core/security.py - JWT 및 비밀번호 해싱
# ============================================================

from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# bcrypt 알고리즘으로 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """평문 비밀번호를 bcrypt 해시로 변환 (복호화 불가)"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """입력한 비밀번호가 저장된 해시와 일치하는지 확인"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    """
    JWT 액세스 토큰 생성
    - sub: 토큰 주인 (user_id)
    - exp: 만료 시각
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)