# ============================================================
# app/services/ai_client.py - AI 서버 HTTP 클라이언트
# AI팀 서버에 분석 요청을 보내고 결과를 받아오는 함수
# ============================================================

import httpx
from app.core.config import AI_SERVER_URL


async def call_ai_server(video_path: str, analysis_id: str) -> dict:
    """
    AI 서버에 분석 요청

    요청 형식 (AI팀과 합의된 스펙):
    POST http://AI_SERVER_URL/analyze
    {
        "analysis_id": "uuid",
        "video_path": "uploaded_videos/uuid.mp4"
    }

    응답 형식:
    {
        "prediction": "fake",          # "real" / "fake"
        "confidence": 0.91,            # 0.0 ~ 1.0

        "confidence_timeline": [       # 프레임별 confidence 흐름
            {"frame": 0,  "time": 0.0, "score": 0.12},
            {"frame": 15, "time": 0.5, "score": 0.87},
            ...
        ],

        "top1_frame": {                # 가장 confidence 높은 프레임
            "frame_index": 30,
            "time_sec": 1.0,
            "confidence": 0.95,
            "image_base64": "iVBORw0KGgo..."
        },

        "layercam": {                  # LayerCAM 히트맵
            "image_base64": "iVBORw0KGgo..."
        },

        "frequency_spectrum": {        # 주파수 스펙트럼
            "image_base64": "iVBORw0KGgo..."
        },

        "error": null                  # 실패 시 에러 메시지
    }

    timeout=300.0: 영상 분석은 최대 5분까지 대기
    """
    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            f"{AI_SERVER_URL}/analyze",
            json={
                "analysis_id": analysis_id,
                "video_path":  video_path,
            }
        )
        response.raise_for_status()
        return response.json()