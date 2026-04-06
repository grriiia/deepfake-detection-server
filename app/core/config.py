# ============================================================
# app/core/config.py - 전체 설정값 관리
# 나중에 .env 파일로 분리 권장
# ============================================================

# JWT 서명 비밀 키 - 실제 배포 시 반드시 복잡한 값으로 변경!
SECRET_KEY = "your-secret-key-change-this-in-production"

# JWT 암호화 알고리즘
ALGORITHM = "HS256"

# 액세스 토큰 유효 시간 (분 단위)
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 영상 파일 저장 경로
UPLOAD_DIR = "uploaded_videos"

# 허용할 영상 파일 확장자
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm"}

# 최대 업로드 파일 크기: 200MB
MAX_FILE_SIZE = 200 * 1024 * 1024

# AI 서버 주소
AI_SERVER_URL = "http://localhost:8001"

# DB 주소
DATABASE_URL = "sqlite:///./users.db"