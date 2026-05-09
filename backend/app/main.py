# ============================================================
# app/main.py - FastAPI 앱 진입점
# 앱 생성 + CORS + 라우터 등록 + 에러 핸들러만 담당
# ============================================================

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware  # [추가] OAuth state 저장용 세션 미들웨어

from app.api.v1.router import router as v1_router
from app.db.session import Base, engine
from app.core.config import SECRET_KEY  # [추가] 세션 암호화에 사용할 키

# 모든 테이블 생성 (없으면 자동 생성)
# User, Video, Analysis 테이블
import app.models.user
import app.models.video
import app.models.analysis
Base.metadata.create_all(bind=engine)

# FastAPI 앱 생성
app = FastAPI(
    title="DeepGuard API",
    description="Xception 기반 딥페이크 탐지 서비스 백엔드",
    version="0.3.0",
    # Swagger UI: http://localhost:8000/docs
    # ReDoc:      http://localhost:8000/redoc
)

# [추가] Google/GitHub OAuth 로그인 과정에서 state 값을 세션에 저장하기 위해 필요
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
)

# CORS 설정
# 프론트엔드 주소를 여기에 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # 내 로컬 (Vite 기본 포트)
        "http://127.0.0.1:5173",
        "http://localhost:3000",    # 포트 변경 시
        "http://127.0.0.1:3000",
        # 프론트 개발자 로컬 주소 추가 시 여기에 입력
        # 예: "http://192.168.0.10:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 500 에러 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    예상치 못한 서버 에러 전역 처리
    - 실제 에러는 서버 콘솔에 출력
    - 프론트에는 한국어 메시지만 반환
    """
    print(f"[서버 에러] {request.method} {request.url} → {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."},
    )

# v1 라우터 등록
# 모든 API 경로 앞에 /api/v1 이 붙음
# 예: /api/v1/auth/login, /api/v1/videos/upload
app.include_router(v1_router, prefix="/api/v1")


# 헬스체크
@app.get("/health")
def health_check():
    """
    서버 상태 확인용
    - GET /health
    - 인증 불필요
    - 브라우저: http://localhost:8000/health
    """
    return {"status": "ok", "message": "DeepGuard API 정상 동작 중"}