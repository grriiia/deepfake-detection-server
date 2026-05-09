# ============================================================
# app/api/v1/endpoints/auth.py - 인증 API
# 회원가입 / 로그인 / 내 정보 조회
# ============================================================
import os
import uuid
from urllib.parse import urlencode

from fastapi.responses import RedirectResponse

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

from authlib.integrations.starlette_client import OAuth  # [추가] 소셜 로그인 OAuth 처리

from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ============================================================
# [추가] OAuth 설정
# 실제 값은 환경변수로 관리하는 것을 권장
# ============================================================

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

oauth = OAuth()

# [추가] Google OAuth 등록
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid email profile",
        },
    )

# [추가] GitHub OAuth 등록
if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET:
    oauth.register(
        name="github",
        client_id=GITHUB_CLIENT_ID,
        client_secret=GITHUB_CLIENT_SECRET,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={
            "scope": "read:user user:email",
        },
    )


def redirect_to_frontend_with_token(token: str):
    """
    [추가] 소셜 로그인 성공 후 프론트로 JWT를 전달
    프론트에서는 /login?token=... 값을 읽어서 localStorage에 저장해야 함
    """
    query = urlencode({"token": token})
    return RedirectResponse(url=f"{FRONTEND_URL}/login?{query}")


def get_or_create_oauth_user(
    db: Session,
    provider: str,
    provider_user_id: str,
    email: str | None,
):
    """
    [추가] 소셜 로그인 사용자를 DB에서 찾거나 새로 생성

    현재 User 모델이 username/password 중심이므로,
    별도 컬럼 추가 없이 username에 provider 정보를 섞어서 저장함.

    예:
    google:123456789
    github:987654321
    """
    username = f"{provider}:{provider_user_id}"

    user = db.query(User).filter(User.username == username).first()
    if user:
        return user

    # [추가] 소셜 로그인 계정은 실제 비밀번호 로그인을 사용하지 않으므로 임의 비밀번호 해시 저장
    random_password = str(uuid.uuid4())

    user = User(
        username=username,
        hashed_password=get_password_hash(random_password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

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

# ============================================================
# [추가] Google 로그인 시작
# 프론트 버튼 → /api/v1/auth/google/login
# ============================================================

@router.get("/google/login")
async def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth 환경변수가 설정되지 않았습니다.",
        )

    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


# ============================================================
# [추가] Google 로그인 콜백
# Google Cloud Console에 이 주소를 Redirect URI로 등록해야 함
# http://localhost:8000/api/v1/auth/google/callback
# ============================================================

@router.get("/google/callback", name="google_callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    token_data = await oauth.google.authorize_access_token(request)

    user_info = token_data.get("userinfo")
    if not user_info:
        user_info = await oauth.google.parse_id_token(request, token_data)

    provider_user_id = str(user_info.get("sub"))
    email = user_info.get("email")

    if not provider_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google 사용자 정보를 가져오지 못했습니다.",
        )

    user = get_or_create_oauth_user(
        db=db,
        provider="google",
        provider_user_id=provider_user_id,
        email=email,
    )

    access_token = create_access_token(user.id)
    return redirect_to_frontend_with_token(access_token)


# ============================================================
# [추가] GitHub 로그인 시작
# 프론트 버튼 → /api/v1/auth/github/login
# ============================================================

@router.get("/github/login")
async def github_login(request: Request):
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth 환경변수가 설정되지 않았습니다.",
        )

    redirect_uri = request.url_for("github_callback")
    return await oauth.github.authorize_redirect(request, redirect_uri)


# ============================================================
# [추가] GitHub 로그인 콜백
# GitHub OAuth App에 이 주소를 Callback URL로 등록해야 함
# http://localhost:8000/api/v1/auth/github/callback
# ============================================================

@router.get("/github/callback", name="github_callback")
async def github_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    token_data = await oauth.github.authorize_access_token(request)

    github_user = await oauth.github.get("user", token=token_data)
    github_user = github_user.json()

    provider_user_id = str(github_user.get("id"))
    email = github_user.get("email")

    if not provider_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub 사용자 정보를 가져오지 못했습니다.",
        )

    user = get_or_create_oauth_user(
        db=db,
        provider="github",
        provider_user_id=provider_user_id,
        email=email,
    )

    access_token = create_access_token(user.id)
    return redirect_to_frontend_with_token(access_token)