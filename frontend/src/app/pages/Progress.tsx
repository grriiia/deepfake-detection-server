import { useState, useEffect, use } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Upload, ScanFace, Activity, Brain, FileText, CheckCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../api/client";

export function Progress() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const videoId = location.state?.videoId; // Analyze에서 넘겨준 ID

  const steps = [
    { icon: Upload, label: "영상 업로드 중", status: "complete" },
    { icon: ScanFace, label: "얼굴 영역 추출 중", status: "complete" },
    { icon: Activity, label: "프레임 전처리 중", status: "active" },
    { icon: Brain, label: "Xception 모델 추론 중", status: "pending" },
    { icon: FileText, label: "리포트 생성 중", status: "pending" },
  ];

  useEffect(() => {
    if (!videoId) return;

    let analysisId = "";
    let pollInterval: number;

    const startAnalysis = async () => {
      // LocalStorage에서 토큰 가져오기
      const token = localStorage.getItem("access_token");

      if(!token){
        alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
        navigate("/login");
        return;
      }

      // 1. 업로드 직후 DB에 반영될 시간을 아주 잠깐 줍니다 (0.5초)
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // 1. 분석 요청 (POST /analyses/{video_id}/analyze)
        const res = await apiClient.post(`/analyses/${videoId}/analyze`, {},{
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        analysisId = res.data.analysis_id;

        // 시각적 피드백을 위해 스텝 이동 (임의 설정)
        setCurrentStep(1);

        // 2. 3초마다 상태 확인 (Polling)
        pollInterval = setInterval(async () => {
          const statusRes = await apiClient.get(`/analyses/${analysisId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const { status } = statusRes.data;

          if(status === "pending"){
            setProgress(20);
            setCurrentStep(2);
          }
          else if(status === "running"){
            setProgress(60);
            setCurrentStep(3); // 모델 추론 단계 
          }
          else if (status === "done") {
            clearInterval(pollInterval);
            setProgress(100);
            setCurrentStep(4);

            // 분석 완료 시 결과 데이터를 들고 이동
            navigate("/result", { state: { analysisData: statusRes.data } });
          } else if (status === "failed") {
            clearInterval(pollInterval);
            alert("분석에 실패했습니다.");
            navigate("/analyze");
          }
        }, 3000); // 3초 간격 폴링
      } catch (err: any) {
        console.error("Analysis error:", err.response?.data || err);

        if(err.response?.status === 404){
          alert("영상이 아직 서버에 등록되지 않았습니다. 잠시 후 다시 시도하거나 다시 업로드해주세요.");
        }
        else
          alert("분석 요청 중 오류가 발생했습니다.");
        navigate("/analyze");
      }
    };

    startAnalysis();

    // 컴포넌트가 사라질 때 폴링 중단(메모리 누수 방지)
    return () => { 
      if (pollInterval) clearInterval(pollInterval); 
    };
  }, [videoId, navigate]);

  const getStepStatus = (index: number) => {
    if (index < currentStep) return "complete";
    if (index === currentStep) return "active";
    return "pending";
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">3/4 단계</span>
            <span className="text-sm text-muted-foreground">분석 진행 중</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Progress Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 rounded-xl bg-card border border-border">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">딥페이크 특징 분석 중</h1>
                <p className="text-muted-foreground">
                  Xception 모델이 얼굴 영역의 합성 아티팩트를 탐지하고 있습니다
                </p>
              </div>

              {/* Circular Progress */}
              <div className="relative w-48 h-48 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-secondary"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold">{progress}%</span>
                  <span className="text-sm text-muted-foreground mt-1">완료</span>
                </div>
              </div>

              {/* Current Step */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">{steps[currentStep]?.label}</span>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">영상 정보</h3>
              <div className="flex items-start gap-4">
                <div className="w-32 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">파일명</span>
                    <div className="font-medium">sample_video.mp4</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">길이</span>
                    <div className="font-medium">5.2초</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">해상도</span>
                    <div className="font-medium">1920x1080</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">프레임 레이트</span>
                    <div className="font-medium">30 FPS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Steps Log */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">처리 단계</h3>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const status = getStepStatus(index);
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          status === "complete"
                            ? "bg-green-500/10 text-green-500"
                            : status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {status === "complete" ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : status === "active" ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div
                          className={`text-sm font-medium mb-1 ${
                            status === "pending" ? "text-muted-foreground" : ""
                          }`}
                        >
                          {step.label}
                        </div>
                        {status === "complete" && (
                          <div className="text-xs text-green-500">완료됨</div>
                        )}
                        {status === "active" && (
                          <div className="text-xs text-primary">진행 중...</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h4 className="text-sm font-semibold mb-2 text-primary">Xception 딥러닝 분석</h4>
              <p className="text-xs text-muted-foreground">
                사전 학습된 Xception 모델이 얼굴 영역의 미세한 텍스처 패턴과 합성 경계선을 분석하여 딥페이크 아티팩트를 탐지하고 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="mt-8 text-center">
          <Link
            to="/analyze"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            분석 취소
          </Link>
        </div>
      </div>
    </div>
  );
}