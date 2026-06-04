import { Link } from "react-router";
import { CheckCircle, AlertTriangle, XCircle, Video, Target, Sun, Footprints, Eye, Maximize, Film } from "lucide-react";

export function QualityCheck() {
  const qualityMetrics = [
    { icon: CheckCircle, label: "얼굴 감지", value: "예", status: "pass" },
    { icon: CheckCircle, label: "얼굴 가시성", value: "100%", status: "pass" },
    { icon: AlertTriangle, label: "조명 품질", value: "보통", status: "warning" },
    { icon: CheckCircle, label: "모션 블러", value: "낮음", status: "pass" },
    { icon: CheckCircle, label: "가려짐", value: "없음", status: "pass" },
    { icon: CheckCircle, label: "해상도", value: "1920x1080", status: "pass" },
    { icon: CheckCircle, label: "프레임 충분성", value: "150 프레임", status: "pass" },
  ];

  const overallScore = 87;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">홈</Link>
            <span>/</span>
            <Link to="/analyze" className="hover:text-foreground">분석</Link>
            <span>/</span>
            <span>품질 검사</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">분석 전 품질 검사</h1>
              <p className="text-muted-foreground">비디오 품질 및 얼굴 검출 상태 검증 중</p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">통과</span>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">2/4 단계</span>
            <span className="text-sm text-muted-foreground">품질 검사</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Video Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">얼굴 검출이 포함된 영상 미리보기</h3>
              <div className="relative rounded-lg overflow-hidden bg-secondary">
                <div className="aspect-video flex items-center justify-center">
                  <Video className="w-16 h-16 text-muted-foreground" />
                </div>
                
                {/* Face Box Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-64 border-2 border-primary rounded-lg">
                    {/* Upper face region */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-accent rounded">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-accent whitespace-nowrap">
                        상단 얼굴 영역
                      </div>
                    </div>
                    
                    {/* Lower face region */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-accent rounded">
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-accent whitespace-nowrap">
                        하단 얼굴 영역
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Frame Timeline */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">프레임 타임라인</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-24 h-16 rounded bg-secondary flex-shrink-0 border-2 border-transparent hover:border-primary cursor-pointer transition-colors"
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      {i * 0.5}초
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Quality Metrics */}
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <h3 className="font-semibold mb-4 text-center">전체 품질 점수</h3>
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallScore / 100)}`}
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold">{overallScore}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                비디오 품질이 분석에 적합합니다
              </p>
            </div>

            {/* Quality Metrics */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">품질 지표</h3>
              <div className="space-y-3">
                {qualityMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <metric.icon
                        className={`w-4 h-4 ${
                          metric.status === "pass"
                            ? "text-green-500"
                            : metric.status === "warning"
                            ? "text-yellow-500"
                            : "text-red-500"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <span className="text-sm font-medium">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-500 mb-1">조명 안내</h4>
                  <p className="text-xs text-muted-foreground">
                    조명 품질이 보통 수준입니다. 분석은 진행되지만 고르지 않은 조명으로 인해 결과의 신뢰도가 약간 낮아질 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <Link
            to="/analyze"
            className="px-6 py-3 rounded-lg border border-border hover:bg-card transition-colors"
          >
            영상 다시 업로드
          </Link>
          <Link
            to="/progress"
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            분석 계속하기
            <Target className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
