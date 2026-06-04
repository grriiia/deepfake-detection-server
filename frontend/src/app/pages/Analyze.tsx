import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Video, Camera, CheckCircle, AlertCircle, Loader2, Zap } from "lucide-react";
import { apiClient } from "../../api/client";
import axios from "axios";

export function Analyze() {
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]); // 통합된 file 변수에 저장
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    
    // FormData 생성 (백엔드 videos.py의 upload_video 함수가 'file' 키값을 요구함)
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 로컬 스토리지에서 토큰 직접 가져오기
      const token = localStorage.getItem("forensiface_access_token");

      // API 호출: POST /api/v1/videos/upload
      const response = await apiClient.post("/videos/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`,
        },
      });

      // 서버에서 전달해준 video_id 추출
      const { video_id } = response.data;

      // await apiClient.post(`/analyses/${video_id}/analyze`, {}, {
      //     headers: { "Authorization": `Bearer ${token}` },
      // }); 

      // 분석 대기 페이지(Progress)로 이동하면서 video_id 전달
      navigate("/progress", { state: { videoId: video_id } });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("영상 업로드에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  const guidelines = [
    { icon: CheckCircle, text: "정면 얼굴 각도로 최소한의 회전", status: "good" },
    { icon: CheckCircle, text: "얼굴 전체와 주요 특징점이 명확히 보임", status: "good" },
    { icon: AlertCircle, text: "강한 그림자 없이 안정적인 조명", status: "warning" },
    { icon: CheckCircle, text: "움직임이 적고 흐림 최소화", status: "good" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">홈</Link>
            <span>/</span>
            <span>새 분석</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">새 딥페이크 분석</h1>
          <p className="text-muted-foreground">딥페이크 분석을 위한 비디오 업로드 또는 실시간 영상 캡처</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">1/4 단계</span>
            <span className="text-sm text-muted-foreground">영상 입력</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full w-1/4 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-lg bg-secondary">
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4" />
                영상 업로드
              </button>
              <button
                onClick={() => setActiveTab("camera")}
                className={`flex-1 py-3 rounded-md transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "camera"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera className="w-4 h-4" />
                실시간 카메라
              </button>
            </div>

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <div className="space-y-6">
                <div className="p-12 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors bg-card">
                  <input
                    type="file"
                    id="file-upload"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">영상 파일을 여기에 드롭하거나 클릭하여 찾아보기</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      MP4, AVI, MOV, WebM 지원 (최대 100MB)
                    </p>
                    <div className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                      파일 선택
                    </div>
                  </label>
                </div>

                {file && (
                  <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{file.name}</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Duration</span>
                            <div className="font-medium">--:--</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Resolution</span>
                            <div className="font-medium">1920x1080</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">FPS</span>
                            <div className="font-medium">30</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Camera Tab — 실시간 판별 페이지로 이동 */}
            {activeTab === "camera" && (
              <div className="space-y-6">
                <div className="p-10 rounded-xl border-2 border-dashed border-primary/40 bg-card flex flex-col items-center gap-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">실시간 딥페이크 판별</h3>
                    <p className="text-sm text-muted-foreground">
                      웹캠 또는 화면 공유를 통해 1초 간격으로 실시간 분석을 진행합니다.
                    </p>
                  </div>
                  <Link
                    to="/live"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                  >
                    <Zap className="w-4 h-4" />
                    실시간 판별 시작
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Guidelines */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-4">캡처 가이드라인</h3>
              <div className="space-y-3">
                {guidelines.map((guideline, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <guideline.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        guideline.status === "good"
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">{guideline.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
              <h4 className="font-semibold mb-2 text-primary">얼굴 검출 요구사항</h4>
              <p className="text-sm text-muted-foreground mb-4">
                정확한 분석을 위해 영상 전체에서 얼굴 영역이 안정적으로 검출되어야 합니다.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• 최소 길이: 3초</div>
                <div>• 최대 길이: 30초</div>
                <div>• 권장: 5-10초</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            to="/"
            className="px-6 py-3 rounded-lg border border-border hover:bg-card transition-colors"
          >
            취소
          </Link>

          <button
            onClick={handleUpload} // 클릭 시 실제 업로드 로직 실행
            disabled={!file || isUploading} // 파일이 없거나 업로드 중이면 클릭 방지
            className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              file && !isUploading
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isUploading ? (
              <>
                업로드 중...
                <Loader2 className="w-5 h-5 animate-spin" />
              </>
            ) : (
              <>
                품질 검사 실행
                <CheckCircle className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
