import { useEffect, useMemo, useState } from "react"; // [추가]
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react"; // [변경]
import { apiClient } from "../../api/client"; // [추가]

type User = {
  id: number;
  username: string;
  role: number;
};

type AdminAnalysisLog = {
  analysis_id: string;
  username: string;
  user_id: number;
  video_id: string;
  filename: string;
  uploaded_at: string;
  analyzed_at: string;
  finished_at: string | null;
  status: string;
  prediction: "real" | "fake" | null;
  confidence: number | null;
};

export function Dashboard() {
  // [추가] 로그인 사용자 정보
  const [me, setMe] = useState<User | null>(null);

  // [추가] 관리자 전체 분석 로그
  const [logs, setLogs] = useState<AdminAnalysisLog[]>([]);

  // [추가] 로딩 / 에러 상태
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // [추가] 관리자 권한 확인 후 관리자 로그 조회
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const meRes = await apiClient.get("/auth/me");
        setMe(meRes.data);

        // role 1: 관리자, role 2: 일반 회원
        if (meRes.data.role !== 1) {
          return;
        }

        const logsRes = await apiClient.get("/analyses/admin/all");
        setLogs(logsRes.data);
      } catch (error: any) {
        console.error("Dashboard load failed:", error);

        if (error.response?.status === 403) {
          setErrorMessage("접근 권한이 없습니다.");
        } else if (error.response?.status === 401) {
          setErrorMessage("로그인이 필요합니다.");
        } else {
          setErrorMessage("관리자 대시보드를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // [추가] 통계 계산
  const stats = useMemo(() => {
    const total = logs.length;
    const real = logs.filter((item) => item.prediction === "real").length;
    const fake = logs.filter((item) => item.prediction === "fake").length;
    const pending = logs.filter((item) => item.status !== "done").length;

    const doneLogs = logs.filter(
      (item) => item.status === "done" && item.confidence !== null
    );

    const avgConfidence =
      doneLogs.length > 0
        ? doneLogs.reduce((sum, item) => sum + (item.confidence ?? 0), 0) /
          doneLogs.length
        : 0;

    return {
      total,
      real,
      fake,
      pending,
      avgConfidence,
    };
  }, [logs]);

  // [추가] 판정 텍스트
  const getPredictionText = (prediction: AdminAnalysisLog["prediction"]) => {
    if (prediction === "real") return "진짜";
    if (prediction === "fake") return "딥페이크";
    return "-";
  };

  // [추가] 상태 텍스트
  const getStatusText = (status: string) => {
    if (status === "done") return "완료";
    if (status === "failed") return "실패";
    if (status === "running") return "분석 중";
    if (status === "pending") return "대기 중";
    return status;
  };

  // [추가] 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>관리자 대시보드를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // [추가] 일반 회원 접근 제한 화면
  if (!me || me.role !== 1) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto p-8 rounded-xl bg-card border border-border text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-bold mb-3">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground">
            관리자만 접근할 수 있는 페이지입니다.
          </p>

          {errorMessage && (
            <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  // [변경] 기존 더미 차트 대시보드 → 실제 관리자 분석 로그 대시보드
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
          <p className="text-muted-foreground">
            사용자별 영상 업로드 및 딥페이크 분석 기록을 확인합니다.
          </p>
        </div>

        {/* [변경] 실제 로그 기반 통계 카드 */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stats.total}</div>
            <div className="text-sm text-muted-foreground">총 분석 수</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stats.real}</div>
            <div className="text-sm text-muted-foreground">진짜 판정</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stats.fake}</div>
            <div className="text-sm text-muted-foreground">딥페이크 판정</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">진행 중/실패</div>
          </div>
        </div>

        {/* [추가] 평균 신뢰도 카드 */}
        <div className="mb-8 p-6 rounded-xl bg-card border border-border">
          <div className="text-sm text-muted-foreground mb-2">평균 모델 신뢰도</div>
          <div className="text-3xl font-bold">
            {(stats.avgConfidence * 100).toFixed(1)}%
          </div>
        </div>

        {/* [추가] 관리자 로그 테이블 */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold">전체 사용자 분석 기록</h3>
            <p className="text-sm text-muted-foreground mt-1">
              누가, 언제, 어떤 영상을 업로드하고 검사했는지 확인할 수 있습니다.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    사용자
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    파일명
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    업로드 시간
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    검사 요청 시간
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    완료 시간
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    판정
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    신뢰도
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    상태
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-muted-foreground"
                    >
                      아직 분석 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => (
                    <tr
                      key={item.analysis_id}
                      className="border-b border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.username}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {item.user_id}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className="font-medium truncate max-w-[220px]"
                          title={item.filename}
                        >
                          {item.filename}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                          video_id: {item.video_id}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(item.uploaded_at).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(item.analyzed_at).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {item.finished_at
                          ? new Date(item.finished_at).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-sm border ${
                            item.prediction === "real"
                              ? "text-green-500 bg-green-500/10 border-green-500/20"
                              : item.prediction === "fake"
                              ? "text-red-500 bg-red-500/10 border-red-500/20"
                              : "text-muted-foreground bg-secondary border-border"
                          }`}
                        >
                          {getPredictionText(item.prediction)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {item.confidence !== null
                          ? `${(item.confidence * 100).toFixed(1)}%`
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-sm ${
                            item.status === "done"
                              ? "text-green-500"
                              : item.status === "failed"
                              ? "text-red-500"
                              : "text-primary"
                          }`}
                        >
                          {getStatusText(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}