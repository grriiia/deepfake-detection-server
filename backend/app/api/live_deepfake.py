# ============================================================
# app/api/live_deepfake.py  –  실시간 딥페이크 판별 WebSocket 엔드포인트
# ============================================================
#
# 연결 URL: ws://localhost:8000/ws/live-deepfake
#           ws://localhost:8000/ws/live-deepfake?token=<JWT>  (인증 필요 시)
#
# 프로토콜:
#   클라이언트 → 서버 : binary  (JPEG 바이너리, 최대 200 KB)
#   서버 → 클라이언트 : JSON 텍스트
#       {
#           "prediction" : "real" | "fake" | "no_face" | "error",
#           "confidence" : float (0.0 ~ 1.0),
#           "smoothed"   : float,          ← EMA 적용된 안정화 점수
#           "frame_count": int,            ← 연결 이후 처리한 누적 프레임 수
#           "error"      : str | null
#       }
# ============================================================

import time
from collections import deque
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.concurrency import run_in_threadpool # [추가] 블로킹 함수 비동기 실행용
from app.services.deepfake_service import predict_frame

router = APIRouter()

# EMA 스무딩 계수 (0 ~ 1, 클수록 최신 프레임 반영 빠름)
EMA_ALPHA = 0.35
# 연결당 최대 프레임 버퍼 (메모리 관리용, 실제로는 EMA만 사용)
MAX_BUFFER = 30


@router.websocket("/live-deepfake")
async def live_deepfake_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),  # 추후 JWT 검증에 활용 가능
):
    """
    실시간 딥페이크 판별 WebSocket 엔드포인트.

    - 클라이언트가 JPEG 바이너리를 보낼 때마다 즉시 추론하여 결과를 반환
    - EMA(지수이동평균)를 사용해 프레임 간 점수 변동을 안정화
    - 비정상 데이터(빈 패킷, 초과 크기)는 무시하고 연결 유지
    """
    await websocket.accept()

    frame_count: int = 0
    ema_score: float = 0.5  # 초기값: 판별 불가 상태
    recent_scores: deque = deque(maxlen=MAX_BUFFER)

    print(f"[LiveDeepfake] 클라이언트 연결됨 | token={token!r}")

    try:
        while True:
            # 클라이언트로부터 바이너리 프레임 수신
            frame_bytes: bytes = await websocket.receive_bytes()

            # 빈 패킷 무시
            if not frame_bytes:
                continue

            # 추론 실행 (별도 스레드풀에서 실행하여 이벤트 루프 블로킹 방지)
            result = await run_in_threadpool(predict_frame, frame_bytes)
            frame_count += 1

            prediction = result.get("prediction", "error")
            confidence = result.get("confidence", 0.0)
            error_msg = result.get("error", None)

            if prediction == "error":
                # 에러 시 이전 EMA 점수 유지하되 에러 메시지 전달
                await websocket.send_json({
                    "prediction": "error",
                    "confidence": confidence,
                    "smoothed": round(ema_score, 4),
                    "frame_count": frame_count,
                    "error": error_msg,
                    "timestamp": int(time.time() * 1000),
                })
                continue

            # EMA 스무딩 적용
            ema_score = EMA_ALPHA * confidence + (1 - EMA_ALPHA) * ema_score
            recent_scores.append(confidence)

            # 스무딩된 점수로 최종 판정
            smoothed_prediction = "fake" if ema_score >= 0.5 else "real"

            await websocket.send_json({
                "prediction": smoothed_prediction,
                "confidence": confidence,          # 현재 프레임 원본 점수
                "smoothed": round(ema_score, 4),   # EMA 안정화 점수
                "frame_count": frame_count,
                "error": None,
                "timestamp": int(time.time() * 1000),
            })

    except WebSocketDisconnect:
        print(f"[LiveDeepfake] 클라이언트 연결 종료 | 총 처리 프레임: {frame_count}")
    except Exception as e:
        print(f"[LiveDeepfake] 예외 발생: {e}")
        try:
            await websocket.send_json({
                "prediction": "error",
                "confidence": 0.0,
                "smoothed": round(ema_score, 4),
                "frame_count": frame_count,
                "error": str(e),
                "timestamp": int(time.time() * 1000),
            })
        except Exception:
            pass
