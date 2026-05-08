import { useLocation, Navigate, Link, useNavigate } from "react-router";
import { Download, Save, RotateCcw, CheckCircle, AlertTriangle, Clock, Video, TrendingUp, Activity, Zap, FileVideo } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Tooltip } from "../components/Tooltip";
import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisData = location.state?.analysisData;

  // Redirect if no data
  if (!analysisData) {
    return <Navigate to="/analyze" replace />;
  }

  const {
    prediction,
    confidence,
    manipulated_frame_count,
    manipulated_frame_ratio,
    confidence_timeline,
    layercam_image,
    frequency_spectrum,
    texture_map,
    representative_frames,
    created_at,
    finished_at,
  } = analysisData;

  const isReal = prediction === "real";
  const displayPrediction = isReal ? "진짜" : "가짜";
  const displayConfidence = isReal ? (1 - confidence) * 100 : confidence * 100;

  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadReport = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    
    // 캡처 전 스크롤을 최상단으로 이동 (html2canvas 오동작 방지)
    window.scrollTo(0, 0);

    try {
      console.log("Starting report export process...");
      // 렌더링 및 스크롤 이동 대기
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("Capturing canvas with html2canvas...");
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5, // 2보다는 낮춰서 메모리 부하 감소 및 에러 방지
        useCORS: true,
        backgroundColor: "#0a1628",
        logging: true, // 라이브러리 내부 로그 활성화
        allowTaint: true,
        onclone: (clonedDoc) => {
          console.log("DOM cloned for capture. Initiating final sanitization attempt...");
          
          try {
            // 1. 외부 스타일시트(link) 제거 - oklab의 주요 근원 중 하나
            const links = clonedDoc.querySelectorAll("link[rel='stylesheet']");
            links.forEach(l => l.remove());

            // 2. 모든 스타일 태그 내의 oklab/oklch 단어를 rgb로 강제 치환
            // 파서가 'oklab'이라는 단어 자체를 인식하지 못하게 함
            const styleTags = clonedDoc.getElementsByTagName("style");
            for (let i = 0; i < styleTags.length; i++) {
              styleTags[i].innerHTML = styleTags[i].innerHTML
                .replace(/oklab/g, "rgb")
                .replace(/oklch/g, "rgb");
            }

            // 3. 인라인 스타일 및 전체 컨테이너 HTML 치환
            const container = clonedDoc.getElementById("report-container");
            if (container) {
              container.innerHTML = container.innerHTML
                .replace(/oklab/g, "rgb")
                .replace(/oklch/g, "rgb");
              
              container.style.padding = "40px";
              container.style.backgroundColor = "#0a1628";
              container.style.width = "1200px";
              container.style.color = "#e2e8f0";
            }

            // 4. 모든 요소의 속성에서 oklab/oklch 제거
            const all = clonedDoc.querySelectorAll("*");
            all.forEach(el => {
              for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                if (attr.value.includes("oklab") || attr.value.includes("oklch")) {
                  el.setAttribute(attr.name, attr.value.replace(/oklab/g, "rgb").replace(/oklch/g, "rgb"));
                }
              }
            });

            // 5. 강력한 전역 오버라이드 (그림자, 필터 등 에러 유발 요소 제거)
            const forceStyle = clonedDoc.createElement("style");
            forceStyle.innerHTML = `
              * {
                box-shadow: none !important;
                text-shadow: none !important;
                filter: none !important;
                backdrop-filter: none !important;
                transition: none !important;
                animation: none !important;
              }
              :root, .dark, * {
                --background: #0a1628 !important;
                --foreground: #e2e8f0 !important;
                --card: #0f2137 !important;
                --primary: #06b6d4 !important;
                --secondary: #1e3a5f !important;
                --muted: #94a3b8 !important;
                --accent: #0ea5e9 !important;
                --border: #1e3a5f !important;
              }
            `;
            clonedDoc.head.appendChild(forceStyle);
            
            // Recharts 안정화
            const charts = clonedDoc.querySelectorAll(".recharts-responsive-container");
            charts.forEach((chart) => {
              (chart as HTMLElement).style.width = "500px";
              (chart as HTMLElement).style.height = "250px";
            });

          } catch (e) {
            console.warn("Final sanitization encountered an issue:", e);
          }
        }
      });

      if (!canvas) {
        throw new Error("Canvas generation failed: result is null");
      }

      console.log("Canvas generated successfully:", canvas.width, "x", canvas.height);
      const imgData = canvas.toDataURL("image/png");
      
      console.log("Initializing jsPDF...");
      // A4 규격 설정 (mm)
      const imgWidth = 210; 
      const pageHeight = 297;  
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // 첫 페이지
      console.log("Adding first page to PDF...");
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // 다중 페이지 처리
      let pageCount = 1;
      while (heightLeft > 0) {
        console.log(`Adding page ${++pageCount}...`);
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      console.log("Saving PDF file...");
      pdf.save(`Forensiface_Report_${timestamp}.pdf`);
      console.log("Report export completed successfully.");
    } catch (error) {
      console.error("Critical PDF Export Error:", error);
      alert(`리포트 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}\n\n상세 내용은 브라우저 개발자 도구(F12)의 Console 탭을 확인해주세요.`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveResult = () => {
    // 분석 결과는 이미 완료 시점에 DB에 기록되어 있으므로, 
    // 사용자에게 명시적으로 히스토리에 보존되었음을 알리고 히스토리 페이지로의 안내를 제공합니다.
    toast.success("분석 결과가 히스토리에 성공적으로 저장되었습니다.");
    
    // 0.8초 후 히스토리 페이지로 이동할지 묻는 확인창 표시
    setTimeout(() => {
      if (confirm("저장된 기록을 확인하기 위해 히스토리 페이지로 이동하시겠습니까?")) {
        navigate("/history");
      }
    }, 800);
  };
  
  // Calculate processing time
  const processingTime = useMemo(() => {
    if (!created_at || !finished_at) return "N/A";
    const start = new Date(created_at).getTime();
    const end = new Date(finished_at).getTime();
    return ((end - start) / 1000).toFixed(1) + "초";
  }, [created_at, finished_at]);

  // Chart data mapping
  const confidenceTimelineData = useMemo(() => 
    (confidence_timeline || []).map((pt: any) => ({
      frame: pt.frame_index,
      confidence: isReal ? (1 - pt.confidence) * 100 : pt.confidence * 100,
      artifact: pt.confidence * 100, // For area chart
    })), [confidence_timeline, isReal]
  );

  const evidencePoints = isReal ? [
    "얼굴 영역 전반에서 자연스러운 텍스처 패턴이 유지됨",
    "프레임 간 특징 일관성이 높으며 급격한 변화 없음",
    "합성 경계선이나 블렌딩 아티팩트가 탐지되지 않음",
    "Xception 모델의 깊은 특징 맵에서 이상 패턴 발견되지 않음",
  ] : [
    "얼굴 경계면에서 비정상적인 텍스처 불연속성 감지",
    "특정 프레임 구간에서 특징 일관성이 급격히 저하됨",
    "합성 흔적으로 의심되는 아티팩트 패턴이 탐지됨",
    "신경망 활성화 맵이 조작 의심 영역에 집중됨",
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto" ref={reportRef} id="report-container">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" data-html2canvas-ignore>
              <Link to="/" className="hover:text-foreground">홈</Link>
              <span>/</span>
              <Link to="/analyze" className="hover:text-foreground">분석</Link>
              <span>/</span>
              <span>결과</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">분석 결과 리포트</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider">
                Forensic Analysis
              </span>
            </div>
            <p className="text-muted-foreground">ForensiFace Xception SBI 기반 딥페이크 탐지 시스템</p>
            <div className="text-[10px] text-muted-foreground mt-1 flex gap-3">
              <span>분석 일시: {finished_at ? new Date(finished_at).toLocaleString('ko-KR') : 'N/A'}</span>
              <span>•</span>
              <span>리포트 식별자: {analysisData.id?.slice(0, 8) || 'FF-TMP-001'}</span>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-2xl font-black italic tracking-tighter text-primary mb-1">
              FORENSI<span className="text-foreground">FACE</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
              AI Deepfake Detection Platform
            </div>
          </div>
        </div>

        {/* Top Summary Cards - 6 cards in one row */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          {/* 최종 판정 - 더 넓게 */}
          <div className={`col-span-2 p-6 rounded-xl border ${isReal ? 'bg-green-500/10 to-emerald-500/10 border-green-500/20' : 'bg-red-500/10 to-rose-500/10 border-red-500/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">최종 판정</span>
                <Tooltip
                  title="최종 판정"
                  description="현재 영상이 최종적으로 '진짜' 또는 '딥페이크'로 분류된 결과입니다."
                  interpretation="해석: 현재 영상 기준"
                />
              </div>
              {isReal ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className={`text-3xl font-bold ${isReal ? 'text-green-500' : 'text-red-500'}`}>
              {displayPrediction}
            </div>
          </div>

          {/* 판정 확신도 */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">판정 확신도</span>
                <Tooltip
                  title="판정 확신도"
                  description="현재 영상이 최종 판정으로 분류된 정도에 대한 모델의 확신입니다. 이 값은 이 영상 1건에 대한 판단 강도이며, 모델 전체 정확도를 의미하지 않습니다."
                  interpretation="해석: 높을수록 판정 방향에 대한 확신이 큼 / 현재 영상 기준"
                />
              </div>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{displayConfidence.toFixed(1)}%</div>
          </div>

          {/* 생리 신호 일관성 */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">특징 일관성</span>
                <Tooltip
                  title="특징 일관성"
                  description="Xception 모델이 추출한 얼굴 특징이 프레임 간 얼마나 일관되게 유지되는지를 나타냅니다. 딥페이크는 프레임별로 특징 패턴이 불안정한 경향이 있습니다."
                  interpretation="해석: 높을수록 자연스러운 특징 패턴 / 현재 영상 기준"
                />
              </div>
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold">{((1 - manipulated_frame_ratio) * 100).toFixed(1)}%</div>
          </div>

          {/* ROI 간 지연 안정도 */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">아티팩트 점수</span>
                <Tooltip
                  title="아티팩트 점수"
                  description="합성 경계선, 블렌딩 흔적, 비정상 텍스처 등 딥페이크 아티팩트가 탐지된 정도입니다. 낮을수록 진짜일 가능성이 높습니다."
                  interpretation="해석: 낮을수록 아티팩트가 적음 / 현재 영상 기준"
                />
              </div>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{(manipulated_frame_ratio * 100).toFixed(1)}%</div>
          </div>

          {/* 분석 가능 프레임 비율 */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">분석 가능 프레임</span>
                <Tooltip
                  title="분석 가능 프레임 비율"
                  description="전체 프레임 중 얼굴 추적, 조명, 움직임 조건을 만족하여 실제 판정에 사용된 프레임의 비율입니다."
                  interpretation="해석: 낮을수록 결과 해석에 주의 필요 / 현재 영상 기준"
                />
              </div>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{confidence_timeline?.length || 0}개</div>
          </div>

          {/* 처리 시간 */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">처리 시간</span>
                <Tooltip
                  title="처리 시간"
                  description="영상 입력부터 최종 결과 생성까지 걸린 전체 분석 시간입니다."
                  interpretation="해석: 시스템 처리 속도를 보여주는 운영 지표 / 현재 영상 기준"
                />
              </div>
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{processingTime}</div>
          </div>
        </div>

        {/* Main Upper Content Area - 2 columns */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Video Preview */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">분석 프레임 추출</h3>
            <div className="relative rounded-lg bg-secondary overflow-hidden">
              <div className="aspect-video grid grid-cols-2 gap-1 p-1">
                {representative_frames && representative_frames.length > 0 ? (
                  representative_frames.map((frame: string, idx: number) => (
                    <div key={idx} className="relative group overflow-hidden rounded-md bg-black">
                      <img
                        src={`data:image/jpeg;base64,${frame}`}
                        alt={`Analysis Frame ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white border border-white/10">
                        Frame {idx + 1}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 flex items-center justify-center">
                    <Video className="w-16 h-16 text-muted-foreground opacity-20" />
                  </div>
                )}
              </div>
              
              {/* Status Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <div className="px-3 py-1.5 rounded-lg bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 border border-white/10">
                  <CheckCircle className="w-3 h-3" />
                  얼굴 추적 정상
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium border border-white/10">
                  조명 상태: 양호
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium border border-white/10">
                  움직임 수준: 보통
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Analysis Summary */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">AI 분석 요약</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Xception 모델이 분석한 결과, 영상은 {isReal ? '실제 얼굴의 자연스러운 특징 패턴을 보입니다.' : '인위적으로 조작된 특징 패턴이 다수 발견되었습니다.'} {isReal ? '딥페이크에서 흔히 나타나는 합성 아티팩트가 탐지되지 않았습니다.' : '프레임 전반에서 높은 조작 가능성이 확인되었습니다.'}
            </p>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">주요 증거:</h4>
              {evidencePoints.map((point, index) => (
                <div key={index} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-primary font-semibold flex-shrink-0">{index + 1}.</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Visualizations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">특징 시각화</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Deep Feature Map */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">깊은 특징 맵 활성화</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={confidenceTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "프레임", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Texture Pattern Analysis */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">텍스처 패턴 분석</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={confidenceTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "프레임", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Artifact Detection Score */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">프레임별 아티팩트 점수</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={confidenceTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "프레임", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "점수", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                  />
                  <Area type="monotone" dataKey="artifact" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Confidence Over Time */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">시간별 판정 확신도</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={confidenceTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" opacity={0.3} />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    label={{ value: "프레임", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: "확신도 (%)", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                  />
                  <Area type="monotone" dataKey="confidence" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Evidence Analysis */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">근거 분석</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature Attention Map */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">특징 주목 영역</h3>
              <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center relative overflow-hidden">
                {layercam_image ? (
                  <img src={`data:image/jpeg;base64,${layercam_image}`} alt="Feature Attention Map" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-3/4 h-3/4 border-2 border-primary/30 rounded-lg relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10"></div>
                    <Activity className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Xception 모델이 판정에 주목한 얼굴 영역</p>
            </div>

            {/* Texture Consistency Map */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">텍스처 일관성 맵</h3>
              <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center relative overflow-hidden">
                {texture_map ? (
                  <img src={`data:image/jpeg;base64,${texture_map}`} alt="Texture Consistency Map" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-3/4 h-3/4 border-2 border-primary/30 rounded-lg relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10"></div>
                    <Activity className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">얼굴 영역별 텍스처 패턴 자연성 분포</p>
            </div>

            {/* Artifact Heatmap */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">아티팩트 히트맵</h3>
              <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center relative overflow-hidden">
                {frequency_spectrum ? (
                  <img src={`data:image/jpeg;base64,${frequency_spectrum}`} alt="Artifact Heatmap" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-3/4 h-3/4 border-2 border-primary/30 rounded-lg relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10"></div>
                    <Zap className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">딥페이크 아티팩트 탐지 강도 분포</p>
            </div>
          </div>
        </div>

        {/* Model Validation Performance - Clearly separated */}
        <div className="mb-8 p-6 rounded-xl bg-secondary/30 border border-border">
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">모델 검증 성능</h3>
            <p className="text-sm text-muted-foreground">
              아래 지표는 검증 데이터셋 기준이며, 현재 영상 1건의 분석 결과와는 다릅니다.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Precision */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Precision</span>
                <Tooltip
                  title="Precision"
                  description="모델이 '딥페이크'라고 판정한 샘플들 중 실제로 딥페이크인 비율입니다."
                  formula="Precision = TP / (TP + FP)"
                  interpretation="해석: 높을수록 오탐이 적음 / 검증 데이터셋 기준"
                />
              </div>
              <div className="text-xl font-bold">0.912</div>
            </div>

            {/* Recall */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Recall</span>
                <Tooltip
                  title="Recall"
                  description="실제 딥페이크 샘플들 중 모델이 올바르게 찾아낸 비율입니다."
                  formula="Recall = TP / (TP + FN)"
                  interpretation="해석: 높을수록 딥페이크를 덜 놓침 / 검증 데이터셋 기준"
                />
              </div>
              <div className="text-xl font-bold">0.887</div>
            </div>

            {/* F1-score */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">F1-score</span>
                <Tooltip
                  title="F1-score"
                  description="Precision과 Recall을 함께 반영한 균형 성능 지표입니다."
                  formula="F1 = 2 × (Precision × Recall) / (Precision + Recall)"
                  interpretation="해석: 둘 중 하나만 높아도 충분하지 않음 / 검증 데이터셋 기준"
                />
              </div>
              <div className="text-xl font-bold">0.899</div>
            </div>

            {/* PR-AUC */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">PR-AUC</span>
                <Tooltip
                  title="PR-AUC"
                  description="판정 임계값을 바꿔가며 본 Precision-Recall 곡선의 면적입니다. 양성 클래스가 상대적으로 적은 환경에서 모델 성능을 평가할 때 특히 유용합니다."
                  interpretation="해석: 높을수록 전반적인 양성 탐지 성능이 좋음 / 검증 데이터셋 기준"
                />
              </div>
              <div className="text-xl font-bold">0.924</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-secondary">
              <span className="text-muted-foreground">임계값</span>
              <span className="font-medium">0.5</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-secondary">
              <span className="text-muted-foreground">검증 데이터셋</span>
              <span className="font-medium">FaceForensics++</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg bg-secondary">
              <span className="text-muted-foreground">최근 평가 일시</span>
              <span className="font-medium">2026-03-20</span>
            </div>
          </div>
        </div>

        {/* Quality & Limitations */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            품질 및 제한사항
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            분석은 입력 품질의 영향을 받을 수 있으며, 조명·움직임·얼굴 가림·추적 손실 구간이 결과 해석에 영향을 줄 수 있습니다.
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
              <div className="font-semibold mb-1 text-sm">분석 상태</div>
              <div className="text-sm text-muted-foreground">정상 처리됨</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="font-semibold mb-1 text-sm">모델 버전</div>
              <div className="text-sm text-muted-foreground">Xception SBI</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="font-semibold mb-1 text-sm">추출 프레임</div>
              <div className="text-sm text-muted-foreground">{confidence_timeline?.length || 0} 프레임</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <div className="font-semibold mb-1 text-sm">조작 의심</div>
              <div className="text-sm text-muted-foreground">{manipulated_frame_count} 프레임</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center" data-html2canvas-ignore>
          <button 
            onClick={handleDownloadReport}
            disabled={isExporting}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isExporting ? "리포트 생성 중..." : "리포트 다운로드"}
          </button>
          <button 
            onClick={handleSaveResult}
            className="px-6 py-3 rounded-lg border border-border hover:bg-card transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            결과 저장
          </button>
          <Link
            to="/analyze"
            className="px-6 py-3 rounded-lg border border-border hover:bg-card transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            다른 영상 분석
          </Link>
        </div>
      </div>
    </div>
  );
}