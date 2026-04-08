# 테스트용 계정 자동생성 스크립트
from app.db.session import SessionLocal, engine, Base
from app.models.user import User
from app.models.video import Video
from app.models.analysis import Analysis
from app.core.security import get_password_hash

# 테이블 생성 (없으면 자동 생성)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 테스트 계정이 없으면 생성
existing = db.query(User).filter(User.username == "test").first()
if not existing:
    test_user = User(
        username="test",
        hashed_password=get_password_hash("test1234")
    )
    db.add(test_user)
    db.commit()
    print("테스트 계정 생성 완료!")
    print("아이디: test")
    print("비밀번호: test1234")
else:
    print("테스트 계정이 이미 존재합니다.")

db.close()