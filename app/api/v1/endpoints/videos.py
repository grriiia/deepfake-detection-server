# ============================================================
# app/api/v1/endpoints/videos.py - 영상 관리 API
# 업로드 / 목록 조회
# ============================================================

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas.video import VideoOut
from app.api.deps import get_current_user
from app.core.config import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE

router = APIRouter()

# 업로드 폴더 생성 (없으면 자동 생성)
Path(UPLOAD_DIR).mkdir(exist_ok=True)


@router.post("/upload", response_model=VideoOut)
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    영상 업로드
    - POST /api/v1/videos/upload
    - 헤더: Authorization: Bearer <token>
    - 요청: multipart/form-data (file 필드)
    - 성공 (200): { "video_id": "uuid", "filename": "...", "created_at": "..." }
    - 실패 (400): { "detail": "지원하지 않는 파일 형식입니다. 허용: ..." }
    - 실패 (400): { "detail": "파일 크기는 200MB를 초과할 수 없습니다" }
    - 실패 (401): { "detail": "유효하지 않은 토큰입니다" }

    프론트 연동: Analyze.tsx "품질 검사 실행" 버튼 클릭 시 호출
    반환된 video_id를 분석 요청에서 사용
    """
    # 확장자 검증
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 파일 크기 검증 (200MB 초과 차단)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 크기는 200MB를 초과할 수 없습니다",
        )

    # UUID로 저장 파일명 생성 (원본 파일명 충돌 방지)
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = Path(UPLOAD_DIR) / saved_name

    # 서버에 파일 저장
    with open(saved_path, "wb") as f:
        f.write(contents)

    # DB에 영상 정보 저장
    video = Video(
        filename=file.filename,
        path=str(saved_path),
        user_id=current_user.id,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoOut(
        video_id=video.id,
        filename=video.filename,
        created_at=video.created_at,
    )


@router.get("/")
def get_my_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    내 영상 목록 조회
    - GET /api/v1/videos/
    - 헤더: Authorization: Bearer <token>
    - 성공 (200): [{ "video_id": "...", "filename": "...", "created_at": "..." }, ...]
    - 실패 (401): { "detail": "유효하지 않은 토큰입니다" }
    """
    videos = db.query(Video).filter(Video.user_id == current_user.id).all()
    return [
        {
            "video_id":   v.id,
            "filename":   v.filename,
            "created_at": v.created_at,
        }
        for v in videos
    ]