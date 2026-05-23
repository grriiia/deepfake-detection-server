import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router"; // 수정: role 값을 URL에서 읽기 위해 추가
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

const ROOM_ID = "demo"; // 수정: 데스크탑/노트북이 같은 방에 들어오도록 고정
const DESKTOP_SERVER_IP = "192.168.0.10"; // 수정: 여기를 실제 데스크탑 IP로 변경

const CAPTURE_INTERVAL_MS = 1000;
const JPEG_QUALITY = 0.72;
const HISTORY_MAX = 40;

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

function confidenceColor(score: number) {
  if (score < 0.4) return "#22c55e";
  if (score < 0.6) return "#f59e0b";
  return "#ef4444";
}

function verdictLabel(v: Verdict, smoothed: number) {
  if (v === "error") return "오류";
  if (v === "no_face") return "얼굴 없음";
  if (smoothed >= 0.5) return "딥페이크 의심";
  return "정상";
}

export function LiveDetect() {
  const { role } = useParams(); // 수정: /live/desktop 또는 /live/laptop 구분
  const isDesktop = role === "desktop"; // 수정: 데스크탑만 분석 결과 표시

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
  const [remoteImage, setRemoteImage] = useState<string | null>(null); // 수정: 상대방 카메라 화면

  // 수정: 기존 /ws/live-deepfake 대신 방 기반 WebSocket 사용
  const WS_URL = `ws://${DESKTOP_SERVER_IP}:8000/ws/room/${ROOM_ID}/${
    isDesktop ? "desktop" : "laptop"
  }`;

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

  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.readyState < 2) return;

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

  const openWebSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      setWsStatus("connecting");
      setStatusMsg("서버에 연결 중...");

      const ws = new WebSocket(WS_URL); // 수정: 깨졌던 new WebSocket(W...) 부분 수정
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        setStatusMsg("연결됨 — 영상 송수신 중...");
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 수정: 상대방 프레임 수신
          if (data.type === "frame") {
            setRemoteImage(`data:image/jpeg;base64,${data.image}`);
            return;
          }

          // 수정: 분석 결과는 데스크탑에서만 사용
          if (data.type === "analysis") {
            setLatest(data);
            setFrameCount(data.frame_count);

            setHistory((prev) => {
              const next = [...prev, data.smoothed];
              return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
            });

            return;
          }
        } catch {
          // 메시지 파싱 실패 무시
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
  }, [WS_URL]);

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

      captureTimerRef.current = setInterval(sendFrame, CAPTURE_INTERVAL_MS);
      setIsRunning(true);
      setHistory([]);
      setFrameCount(0);
      setRemoteImage(null); // 수정: 시작 시 상대 화면 초기화
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusMsg(`오류: ${msg}`);
      cleanup();
    }
  };

  const handleStop = () => {
    cleanup();
    setIsRunning(false);
    setWsStatus("idle");
    setLatest(null);
    setHistory([]);
    setFrameCount(0);
    setRemoteImage(null); // 수정: 중지 시 상대 화면 초기화
    setStatusMsg("분석이 중지되었습니다.");
  };

  const renderGraph = () => {
    if (history.length < 2) return null;

    const W = 320;
    const H = 60;

    const pts = history.map((v, i) => {
      const x = (i / (HISTORY_MAX - 1)) * W;
      const y = H - v * H;
      return `${x},${y}`;
    });

    const latestColor = confidenceColor(history[history.length - 1] ?? 0.5);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <line
          x1="0"
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeDasharray="4 3"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={latestColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle
          cx={W}
          cy={H - (history[history.length - 1] ?? 0.5) * H}
          r={4}
          fill={latestColor}
        />
      </svg>
    );
  };

  const smoothed = latest?.smoothed ?? 0;
  const verdict: Verdict = latest?.prediction ?? null;
  const barColor = confidenceColor(smoothed);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">홈</Link>
            <span>/</span>
            <span>실시간 판별</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            실시간 딥페이크 판별
          </h1>

          {/* 수정: 현재 역할 표시 */}
          <p className="text-muted-foreground">
            현재 모드: {isDesktop ? "데스크탑 분석자" : "노트북 송출자"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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
                    {s === "webcam" ? (
                      <Camera className="w-4 h-4" />
                    ) : (
                      <Monitor className="w-4 h-4" />
                    )}
                    {s === "webcam" ? "웹캠" : "화면 공유"}
                  </button>
                ))}
              </div>
            )}

            {/* 수정: 내 카메라 / 상대방 카메라 2분할 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">내 카메라</h3>
                <div className="relative rounded-xl overflow-hidden bg-card border border-border aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: isRunning ? "block" : "none" }}
                  />

                  {!isRunning && (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      {source === "webcam" ? (
                        <Camera className="w-16 h-16" />
                      ) : (
                        <Monitor className="w-16 h-16" />
                      )}
                      <p className="text-sm text-center">{statusMsg}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  상대방 카메라
                </h3>
                <div className="relative rounded-xl overflow-hidden bg-card border border-border aspect-video flex items-center justify-center">
                  {remoteImage ? (
                    <img
                      src={remoteImage}
                      alt="Remote Camera"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Monitor className="w-16 h-16" />
                      <p className="text-sm">상대방 연결 대기 중...</p>
                    </div>
                  )}

                  {/* 수정: 데스크탑에서만 상대방 영상 위에 분석 배지 표시 */}
                  {isDesktop && latest && (
                    <div
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold text-sm shadow-lg"
                      style={{
                        backgroundColor:
                          smoothed >= 0.5
                            ? "rgba(239,68,68,0.85)"
                            : "rgba(34,197,94,0.85)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      {smoothed >= 0.5 ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      {verdictLabel(verdict, smoothed)}
                      <span className="ml-1 opacity-80 font-normal">
                        ({(smoothed * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!isRunning ? (
                <button
                  id="live-detect-start"
                  onClick={handleStart}
                  className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                >
                  <Play className="w-5 h-5" />
                  시작
                </button>
              ) : (
                <button
                  id="live-detect-stop"
                  onClick={handleStop}
                  className="flex-1 py-3 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                >
                  <Square className="w-5 h-5" />
                  중지
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground break-all">
                  {WS_URL}
                </p>
              </div>
            </div>

            {/* 수정: 데스크탑에서만 분석 결과 표시 */}
            {isDesktop ? (
              <>
                <div className="p-5 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">
                      노트북 영상 딥페이크 신뢰도
                    </span>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div
                    className="text-4xl font-bold mb-3 transition-all duration-500"
                    style={{ color: barColor }}
                  >
                    {latest ? `${(smoothed * 100).toFixed(1)}%` : "--"}
                  </div>

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

                  {latest && (
                    <p className="text-xs text-muted-foreground mt-3">
                      현재 프레임:{" "}
                      <span style={{ color: confidenceColor(latest.confidence) }}>
                        {(latest.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>

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

                {latest?.error && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{latest.error}</p>
                  </div>
                )}
              </>
            ) : (
              // 수정: 노트북은 분석하지 않고 안내만 표시
              <div className="p-5 rounded-xl bg-card border border-border">
                <h4 className="font-semibold mb-2">노트북 모드</h4>
                <p className="text-sm text-muted-foreground">
                  이 화면은 카메라 영상을 데스크탑으로 송출하고,
                  데스크탑 카메라 영상을 수신합니다. 딥페이크 분석은
                  데스크탑 GPU 서버에서만 수행됩니다.
                </p>
              </div>
            )}

            <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-primary text-sm">사용 안내</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• 데스크탑: /live/desktop 접속</li>
                <li>• 노트북: /live/laptop 접속</li>
                <li>• 두 기기는 같은 ROOM_ID를 사용해야 합니다</li>
                <li>• 분석 결과는 데스크탑 화면에만 표시됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}