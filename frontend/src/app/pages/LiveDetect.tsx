import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Monitor,
  Square,
  Play,
  Wifi,
  WifiOff,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Info,
} from "lucide-react";

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────
const WS_URL = `ws://${window.location.hostname}:8000/ws/live-deepfake`;
const CAPTURE_INTERVAL_MS = 1000; // 1초마다 프레임 전송
const JPEG_QUALITY = 0.72;
const HISTORY_MAX = 40; // 신뢰도 그래프 최대 포인트 수

type Source = "webcam" | "screen";
type WsStatus = "idle" | "connecting" | "connected" | "error";
type Verdict = "real" | "fake" | "error" | "no_face" | null;

interface FrameResult {
  prediction: Verdict;
  confidence: number;
  smoothed: number;
  frame_count: number;
  error?: string;
  timestamp: number;
}

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
function confidenceColor(score: number) {
  if (score < 0.4) return "#22c55e";   // green-500 → real
  if (score < 0.6) return "#f59e0b";   // amber-500 → uncertain
  return "#ef4444";                     // red-500   → fake
}

function verdictLabel(v: Verdict, smoothed: number) {
  if (v === "error") return "오류";
  if (v === "no_face") return "얼굴 없음";
  if (smoothed < 0.4) return "정상 가능성 높음";
  if (smoothed <= 0.6) return "의심 / 추가 검토 필요";
  return "딥페이크 가능성 높음";
}

// ──────────────────────────────────────────────
// 컴포넌트
// ──────────────────────────────────────────────
export function LiveDetect() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [source, setSource] = useState<Source>("webcam");
  const [isRunning, setIsRunning] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [latest, setLatest] = useState<FrameResult | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [statusMsg, setStatusMsg] = useState("시작 버튼을 눌러 분석을 시작하세요.");
  const [frameCount, setFrameCount] = useState(0);

  // ── 정리 함수
  const cleanup = useCallback(() => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── 캔버스 → JPEG 바이너리 캡처 후 WebSocket 전송
  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.readyState < 2) return; // 아직 영상 로드 안 됨

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 360;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob && ws.readyState === WebSocket.OPEN) {
          blob.arrayBuffer().then((buf) => ws.send(buf));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }, []);

  // ── WebSocket 열기
  const openWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      setWsStatus("connecting");
      setStatusMsg("서버에 연결 중...");

      const ws = new WebSocket(WS_URL);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        setStatusMsg("연결됨 — 분석 중...");
        resolve();
      };

      ws.onmessage = (ev) => {
        try {
          const data: FrameResult = JSON.parse(ev.data as string);
          setLatest(data);
          setFrameCount(data.frame_count);
          setHistory((prev) => {
            const next = [...prev, data.smoothed];
            return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
          });
        } catch {
          /* 파싱 실패 무시 */
        }
      };

      ws.onerror = () => {
        setWsStatus("error");
        setStatusMsg("서버 연결 오류 — 백엔드가 실행 중인지 확인하세요.");
        reject(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        setWsStatus("idle");
      };
    });
  }, []);

  // ── 분석 시작
  const handleStart = async () => {
    try {
      let stream: MediaStream;
      if (source === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: false,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await openWebSocket();

      // 주기적 프레임 전송 시작
      captureTimerRef.current = setInterval(sendFrame, CAPTURE_INTERVAL_MS);
      setIsRunning(true);
      setHistory([]);
      setFrameCount(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusMsg(`오류: ${msg}`);
      cleanup();
    }
  };

  // ── 분석 중지
  const handleStop = () => {
    cleanup();
    setIsRunning(false);
    setWsStatus("idle");
    setLatest(null);
    setHistory([]);
    setFrameCount(0);
    setStatusMsg("분석이 중지되었습니다.");
  };

  // ── 미니 그래프 SVG 생성
  const renderGraph = () => {
    if (history.length < 2) return null;
    const W = 320;
    const H = 60;
    const pts = history.map((v, i) => {
      const x = (i / (HISTORY_MAX - 1)) * W;
      const y = H - v * H;
      return `${x},${y}`;
    });
    const polyline = pts.join(" ");
    const latestColor = confidenceColor(history[history.length - 1] ?? 0.5);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* 50% 경계선 */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
        <polyline points={polyline} fill="none" stroke={latestColor} strokeWidth="2" strokeLinejoin="round" />
        {/* 최신 포인트 */}
        {(() => {
          const last = history[history.length - 1] ?? 0.5;
          const x = W;
          const y = H - last * H;
          return <circle cx={x} cy={y} r={4} fill={latestColor} />;
        })()}
      </svg>
    );
  };

  const smoothed = latest?.smoothed ?? 0;
  const verdict: Verdict = latest?.prediction ?? null;
  const barColor = confidenceColor(smoothed);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      {/* 히든 캔버스 */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="max-w-6xl mx-auto">
        {/* ── 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">홈</Link>
            <span>/</span>
            <span>실시간 판별</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">실시간 딥페이크 판별</h1>
          <p className="text-muted-foreground">
            웹캠 또는 화면 공유를 통해 실시간으로 딥페이크 여부를 분석합니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── 좌측: 영상 + 컨트롤 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 소스 탭 */}
            {!isRunning && (
              <div className="flex gap-2 p-1 rounded-lg bg-secondary">
                {(["webcam", "screen"] as Source[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={`flex-1 py-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                      source === s
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "webcam" ? <Camera className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                    {s === "webcam" ? "웹캠" : "화면 공유"}
                  </button>
                ))}
              </div>
            )}

            {/* 영상 뷰어 */}
            <div className="relative rounded-xl overflow-hidden bg-card border border-border aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ display: isRunning ? "block" : "none" }}
              />

              {/* 대기 상태 플레이스홀더 */}
              {!isRunning && (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  {source === "webcam" ? (
                    <Camera className="w-16 h-16" />
                  ) : (
                    <Monitor className="w-16 h-16" />
                  )}
                  <p className="text-sm">{statusMsg}</p>
                </div>
              )}

              {/* 분석 중 오버레이 HUD */}
              {isRunning && (
                <>
                  {/* 상단 왼쪽: 상태 */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-sm font-medium">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: barColor }}
                    />
                    분석 중
                  </div>

                  {/* 상단 오른쪽: 프레임 카운터 */}
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-muted-foreground">
                    {frameCount} 프레임 처리
                  </div>

                  {/* 하단 중앙: 판정 배지 */}
                  {latest && (
                    <div
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold text-sm shadow-lg transition-all duration-300"
                      style={{
                        backgroundColor:
                          smoothed < 0.4
                            ? "rgba(34,197,94,0.85)"
                            : smoothed <= 0.6
                            ? "rgba(245,158,11,0.85)"
                            : "rgba(239,68,68,0.85)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {smoothed < 0.4 ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : smoothed <= 0.6 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )}
                      {verdictLabel(verdict, smoothed)}
                      <span className="ml-1 opacity-80 font-normal">
                        ({(smoothed * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex gap-3">
              {!isRunning ? (
                <button
                  id="live-detect-start"
                  onClick={handleStart}
                  className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                >
                  <Play className="w-5 h-5" />
                  분석 시작
                </button>
              ) : (
                <button
                  id="live-detect-stop"
                  onClick={handleStop}
                  className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                >
                  <Square className="w-5 h-5" />
                  분석 중지
                </button>
              )}
            </div>
          </div>

          {/* ── 우측: 결과 패널 */}
          <div className="space-y-4">
            {/* 연결 상태 */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
              {wsStatus === "connected" ? (
                <Wifi className="w-5 h-5 text-green-500 shrink-0" />
              ) : wsStatus === "error" ? (
                <WifiOff className="w-5 h-5 text-destructive shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {wsStatus === "connected"
                    ? "서버 연결됨"
                    : wsStatus === "connecting"
                    ? "연결 중..."
                    : wsStatus === "error"
                    ? "연결 오류"
                    : "연결 안 됨"}
                </p>
                <p className="text-xs text-muted-foreground">{WS_URL}</p>
              </div>
            </div>

            {/* 신뢰도 게이지 */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">딥페이크 신뢰도</span>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* 큰 퍼센트 */}
              <div
                className="text-4xl font-bold mb-3 transition-all duration-500"
                style={{ color: barColor }}
              >
                {latest ? `${(smoothed * 100).toFixed(1)}%` : "--"}
              </div>

              {/* 바 게이지 */}
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${smoothed * 100}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>정상</span>
                <span>딥페이크</span>
              </div>

              {/* 현재 프레임 원시 점수 */}
              {latest && (
                <p className="text-xs text-muted-foreground mt-3">
                  현재 프레임:{" "}
                  <span style={{ color: confidenceColor(latest.confidence) }}>
                    {(latest.confidence * 100).toFixed(1)}%
                  </span>
                </p>
              )}
            </div>

            {/* 신뢰도 히스토리 그래프 */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <p className="text-sm font-medium mb-3">신뢰도 추이</p>
              {history.length >= 2 ? (
                renderGraph()
              ) : (
                <div className="h-14 flex items-center justify-center text-xs text-muted-foreground">
                  데이터 수집 중...
                </div>
              )}
            </div>

            {/* 에러 표시 */}
            {latest?.error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{latest.error}</p>
              </div>
            )}

            {/* 안내 패널 */}
            <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-primary text-sm">사용 안내</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• 얼굴이 카메라에 정면으로 보이도록 해주세요</li>
                <li>• 1초 간격으로 자동 분석됩니다</li>
                <li>• 0~40%: 정상 가능성 높음</li>
                <li>• 40~60%: 의심 / 추가 검토 필요</li>
                <li>• 60~100%: 딥페이크 가능성 높음</li>
                <li>• 분석 결과는 참고용이며 법적 근거가 되지 않습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
