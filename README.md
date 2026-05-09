# 딥페이크 탐지 플랫폼 실행 가이드

이 문서는 딥페이크 탐지 플랫폼의 백엔드와 프론트엔드를 처음 실행하는 사용자를 위한 가이드입니다.

---

## 1. 백엔드 (Backend) 실행 방법

백엔드는 **FastAPI**로 구축되어 있으며, AI 모델 추론을 담당합니다.

### 사전 준비
*   Python 3.8 이상 설치
*   (권장) Anaconda 또는 venv 가상환경 생성

### 실행 단계
1.  **터미널(또는 PowerShell)을 열고 백엔드 디렉토리로 이동합니다.**
    ```powershell
    cd backend
    ```

2.  **가상환경을 활성화합니다.** (Anaconda 사용 시)
    ```powershell
    conda activate deepguard
    ```

3.  **필요한 패키지를 설치합니다.** (처음 실행 시 1회)
    ```powershell
    pip install -r requirements.txt
    ```
    *추가로 AI 모델 실행을 위한 `torch`, `torchvision`, `opencv-python` 등이 필요할 수 있습니다.*

4.  **백엔드 서버를 실행합니다.**
    ```powershell
    uvicorn main:app --reload
    ```
    *   성공 시 `http://127.0.0.1:8000`에서 서버가 동작합니다.
    *   `--reload` 옵션은 코드 수정 시 서버를 자동으로 재시작합니다.

---

## 2. 프론트엔드 (Frontend) 실행 방법

프론트엔드는 **React + Vite**로 구축되어 있습니다.

### 사전 준비
*   Node.js (LTS 버전 권장) 설치

### 실행 단계
1.  **새 터미널을 열고 프론트엔드 디렉토리로 이동합니다.** (백엔드 터미널은 그대로 두세요)
    ```powershell
    cd frontend
    ```

2.  **의존성 패키지를 설치합니다.** (처음 실행 시 1회)
    ```powershell
    npm install
    ```

3.  **개발 서버를 실행합니다.**
    ```powershell
    npm run dev
    ```
    *   성공 시 터미널에 출력된 주소(예: `http://localhost:5173`)를 컨트롤(Ctrl) 키를 누른 채 클릭하거나 브라우저 주소창에 입력하여 접속합니다.

---

## 3. 문제 해결 (FAQ)

*   **포트 충돌 에러가 발생해요**: 이미 다른 프로그램이 8000번(백엔드) 또는 5173번(프론트) 포트를 사용 중일 수 있습니다. 터미널을 완전히 종료하고 다시 시도하세요.
*   **OpenCV 관련 에러**: `pip install opencv-python` 명령어로 라이브러리가 설치되어 있는지 확인하세요.
*   **모델 가중치(weights) 에러**: `backend/app/ai/weights/SBI.tar` 파일이 존재하는지 확인하세요.

---
**주의**: 분석을 위해서는 백엔드와 프론트엔드 서버가 **모두** 켜져 있어야 합니다.
