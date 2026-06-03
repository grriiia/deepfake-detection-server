# ============================================================
# app/api/deps.py - 공통 의존성 함수
# 로그인이 필요한 모든 엔드포인트에서 사용
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.config import SECRET_KEY, ALGORITHM

# Authorization 헤더에서 Bearer 토큰 추출
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),  # 헤더에서 JWT 자동 추출
    db: Session = Depends(get_db),
) -> User:
    """
    JWT 토큰 검증 후 현재 로그인한 유저 반환
    - 토큰 없음 / 만료 / 위변조 → 401 에러
    - 유저 없음 → 404 에러
    - Depends(get_current_user)로 엔드포인트에 주입
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="유저를 찾을 수 없습니다",
        )
    return user

def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="접근 권한이 없습니다",
        )
    return current_user