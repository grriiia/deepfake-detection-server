# ============================================================
# app/core/security.py - JWT 및 비밀번호 해싱
# ============================================================
#
# [주의] passlib + bcrypt >= 4.0.0 조합은 passlib 내부의 wrap-bug 감지 루틴이
#        72바이트 초과 비밀번호를 _bcrypt.hashpw()에 직접 전달하여 ValueError를
#        발생시킵니다. 이를 피하기 위해 passlib을 사용하지 않고 bcrypt를 직접
#        호출합니다.
# ============================================================

from datetime import datetime, timedelta
import bcrypt
from jose import jwt
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def _to_bytes(password: str) -> bytes:
    """
    비밀번호를 UTF-8 바이트로 변환하고 72바이트로 자릅니다.
    bcrypt는 72바이트 이후를 무시하므로 동작이 동일합니다.
    bcrypt >= 4.0.0 은 72바이트 초과 시 ValueError를 발생시키므로
    미리 자르는 것이 필수입니다.
    """
    return password.encode("utf-8")[:72]


def get_password_hash(password: str) -> str:
    """평문 비밀번호를 bcrypt 해시로 변환 (복호화 불가)"""
    hashed = bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """입력한 비밀번호가 저장된 해시와 일치하는지 확인"""
    return bcrypt.checkpw(_to_bytes(plain_password), hashed_password.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    """
    JWT 액세스 토큰 생성
    - sub: 토큰 주인 (user_id)
    - exp: 만료 시각
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)