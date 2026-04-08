# Forensiface 백엔드 실행 가이드

## ⚡ 빠른 실행

```bash
conda create -n deepguard python=3.11
conda activate deepguard
cd deepfake-detection-server
pip install -r requirements.txt
python test_user.py
uvicorn main:app --reload
```

테스트 계정: `test` / `test1234`

---

## 📋 상세 실행 가이드

### 1. 사전 준비
- Python 3.11 이상
- Anaconda 설치

### 2. 가상환경 생성 및 활성화
```bash
conda create -n deepguard python=3.11
conda activate deepguard
```

### 3. 프로젝트 폴더로 이동
```bash
cd deepfake-detection-server
```

### 4. 라이브러리 설치
```bash
pip install -r requirements.txt
```

### 5. 테스트 계정 생성
```bash
python test_user.py
```

### 6. 서버 실행
```bash
uvicorn main:app --reload
```

### 7. 확인
브라우저에서 `http://localhost:8000/docs` 접속

### 8. 로그인 정보
```
아이디: test
비밀번호: test1234
```