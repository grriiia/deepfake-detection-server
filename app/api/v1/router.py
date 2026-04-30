# ============================================================
# app/api/v1/router.py - v1 전체 라우터 등록
# ============================================================

from fastapi import APIRouter
from app.api.v1.endpoints import auth, videos, analyses
from app.api.v1 import deepfake

router = APIRouter()

# 각 엔드포인트 라우터 등록
# prefix: URL 앞에 붙는 경로
# tags: Swagger UI에서 그룹으로 묶임
router.include_router(auth.router,     prefix="/auth",     tags=["인증"])
router.include_router(videos.router,   prefix="/videos",   tags=["영상"])
router.include_router(analyses.router, prefix="/analyses", tags=["분석"])
router.include_router(deepfake.router, prefix="/deepfake", tags=["딥페이크"])