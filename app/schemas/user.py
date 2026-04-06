# ============================================================
# app/schemas/user.py - 유저 요청/응답 데이터 형식
# ============================================================

from pydantic import BaseModel


class UserCreate(BaseModel):
    """회원가입 요청 바디 { "username": "...", "password": "..." }"""
    username: str
    password: str


class UserOut(BaseModel):
    """유저 정보 응답 (비밀번호 절대 포함 금지!)"""
    id: int
    username: str

    class Config:
        orm_mode = True  # SQLAlchemy 모델 → Pydantic 변환 허용