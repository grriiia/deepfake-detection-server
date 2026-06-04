import { Link } from "react-router";
import { Upload, LineChart, Shield, Video, Zap, Target, ChevronRight, Activity } from "lucide-react";

export function Landing() {
  const features = [
    {
      icon: Video,
      title: "영상 입력",
      description: "영상을 업로드하거나 웹캠으로 실시간 영상을 캡처하여 분석을 시작하세요",
    },
    {
      icon: LineChart,
      title: "딥러닝 분석",
      description: "SBI 가중치가 적용된 EfficientNet-B4 모델이 얼굴 영역의 미세한 합성 아티팩트를 탐지합니다",
    },
    {
      icon: Shield,
      title: "설명 가능한 결과",
      description: "히트맵, 특징 시각화, 신뢰도 점수가 포함된 상세한 포렌식 리포트를 제공합니다",
    },
  ];

  const steps = [
    { number: "01", title: "업로드 또는 녹화", description: "분석할 얼굴 영상을 제공하세요" },
    { number: "02", title: "품질 검사", description: "시스템이 얼굴 가시성과 조명을 검증합니다" },
    { number: "03", title: "AI 처리", description: "EfficientNet-B4 SBI 모델이 딥페이크 특징을 분석합니다" },
    { number: "04", title: "결과 확인", description: "판정이 포함된 상세 포렌식 리포트를 확인하세요" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
            <Zap className="w-4 h-4" />
            <span className="text-sm">EfficientNet-B4 SBI 기반</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            신경망 기반
            <br />
            딥페이크 탐지
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            SBI 가중치가 적용된 EfficientNet-B4 모델로 얼굴 영상의 미세한 합성 아티팩트와 텍스처 이상을 탐지하는 첨단 AI 포렌식 플랫폼입니다. 과학적 정밀도로 딥페이크를 분류합니다.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link
              to="/analyze"
              className="px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              분석 시작
              <ChevronRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 rounded-lg border border-border text-foreground hover:bg-card transition-colors">
              데모 보기
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">핵심 기능</h2>
            <p className="text-muted-foreground text-lg">AI 기반 첨단 딥페이크 탐지 기술</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">작동 방식</h2>
            <p className="text-muted-foreground text-lg">정확한 딥페이크 탐지를 위한 간단한 4단계 프로세스</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="p-6 rounded-xl bg-background border border-border">
                  <div className="text-4xl font-bold text-primary/20 mb-4">{step.number}</div>
                  <h4 className="font-semibold mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">분석 미리보기</h2>
            <p className="text-muted-foreground text-lg">설명 가능한 AI를 통한 종합 포렌식 분석</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">얼굴 영역 탐지</h4>
              </div>
              <div className="aspect-video rounded-lg bg-background border border-border flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">얼굴 영역 오버레이 시각화</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <LineChart className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">특징 분석</h4>
              </div>
              <div className="aspect-video rounded-lg bg-background border border-border flex items-center justify-center">
                <div className="text-center">
                  <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">딥러닝 특징 맵 시각화</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg mb-2">최종 판정</h4>
                <p className="text-muted-foreground">신뢰도 점수와 상세 설명이 포함된 종합 결과를 확인하세요</p>
              </div>
              <div className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold">
                진짜
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">ForensiFace</span>
              </div>
              <p className="text-sm text-muted-foreground">
                EfficientNet-B4 SBI 모델을 활용한 첨단 AI 기반 딥페이크 탐지 서비스
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">플랫폼</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>분석 서비스</div>
                <div>API 문서</div>
                <div>요금제</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">법적 고지</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>개인정보 처리방침</div>
                <div>서비스 약관</div>
                <div>문의하기</div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2026 ForensiFace. 첨단 AI 포렌식 플랫폼. 졸업 프로젝트.
          </div>
        </div>
      </footer>
    </div>
  );
}
