# ============================================================
# app/api/v1/endpoints/auth.py - 인증 API
# 회원가입 / 로그인 / 내 정보 조회
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    회원가입
    - POST /api/v1/auth/register
    - 요청: { "username": "...", "password": "..." }
    - 성공 (200): { "id": 1, "username": "..." }
    - 실패 (400): { "detail": "이미 사용 중인 아이디입니다" }
    """
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 아이디입니다",
        )

    db_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    로그인
    - POST /api/v1/auth/login
    - 요청: form-data (username, password) ← JSON 아님 주의!
    - 성공 (200): { "access_token": "eyJ...", "token_type": "bearer" }
    - 실패 (400): { "detail": "아이디 또는 비밀번호가 올바르지 않습니다" }

    프론트 연동: Login.tsx 로그인 버튼 클릭 시 호출
    반환된 access_token을 localStorage에 저장
    """
    user = db.query(User).filter(User.username == form_data.username).first()

    # 보안상 "유저 없음"과 "비밀번호 틀림"을 같은 메시지로 처리
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="아이디 또는 비밀번호가 올바르지 않습니다",
        )

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    """
    현재 로그인한 유저 정보 조회
    - GET /api/v1/auth/me
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): { "id": 1, "username": "..." }
    - 실패 (401): { "detail": "유효하지 않은 토큰입니다" }

    프론트 연동: Navigation.tsx 로그인 상태 확인 시 사용
    """
    return current_user