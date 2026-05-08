import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle, XCircle, AlertTriangle, Eye, Trash2, Download, Search, Loader2 } from "lucide-react";
import { apiClient } from "../../api/client";

export function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.get("/analyses/");
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const deleteAnalysis = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/analyses/${id}`);
      setHistory(history.filter(item => item.analysis_id !== id));
    } catch (err) {
      alert("삭제에 실패했습니다.");
    }
  };

  const getVerdictText = (prediction: string | null) => {
    if (prediction === "real") return "진짜";
    if (prediction === "fake") return "딥페이크";
    return "분석 중";
  };

  const getVerdictColor = (prediction: string | null) => {
    switch (prediction) {
      case "real":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "fake":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-muted-foreground bg-secondary border-border";
    }
  };

  const getVerdictIcon = (prediction: string | null) => {
    switch (prediction) {
      case "real":
        return CheckCircle;
      case "fake":
        return XCircle;
      default:
        return AlertTriangle;
    }
  };

  const filteredHistory = history.filter(item => 
    item.video_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.prediction && getVerdictText(item.prediction).includes(searchTerm))
  );

  const stats = {
    total: history.length,
    real: history.filter(h => h.prediction === "real").length,
    fake: history.filter(h => h.prediction === "fake").length,
    unknown: history.filter(h => h.status !== "done").length
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">분석 히스토리</h1>
          <p className="text-muted-foreground">이전 딥페이크 탐지 분석 결과를 확인하고 관리하세요</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-2">총 분석 수</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-sm text-green-500 mb-2">진짜 탐지</div>
            <div className="text-2xl font-bold text-green-500">{stats.real}</div>
          </div>
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="text-sm text-red-500 mb-2">딥페이크 탐지</div>
            <div className="text-2xl font-bold text-red-500">{stats.fake}</div>
          </div>
          <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-sm text-yellow-500 mb-2">분석 중/기타</div>
            <div className="text-2xl font-bold text-yellow-500">{stats.unknown}</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="파일명 또는 결과로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>
          <select className="px-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option>모든 판정</option>
            <option>진짜</option>
            <option>딥페이크</option>
            <option>불확실</option>
          </select>
          <select className="px-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>최근 3개월</option>
            <option>전체 기간</option>
          </select>
        </div>

        {/* History Table */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold">비디오 ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">날짜 및 시간</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">판정</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">신뢰도</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">상태</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">작업</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-muted-foreground">분석 내역을 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => {
                    const VerdictIcon = getVerdictIcon(item.prediction);
                    const isReal = item.prediction === "real";
                    const displayConfidence = isReal ? (1 - item.confidence) * 100 : item.confidence * 100;
                    
                    return (
                      <tr key={item.analysis_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium truncate max-w-[200px]" title={item.video_id}>
                            {item.video_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getVerdictColor(item.prediction)}`}>
                            <VerdictIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{getVerdictText(item.prediction)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full rounded-full ${isReal ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${item.status === 'done' ? displayConfidence : 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {item.status === 'done' ? `${displayConfidence.toFixed(1)}%` : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${item.status === 'done' ? 'text-green-500' : item.status === 'failed' ? 'text-red-500' : 'text-primary'}`}>
                            {item.status === 'done' ? '완료' : item.status === 'failed' ? '실패' : '진행 중'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'done' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await apiClient.get(`/analyses/${item.analysis_id}`);
                                    navigate("/result", { state: { analysisData: res.data } });
                                  } catch (err) {
                                    alert("상세 정보를 가져오는데 실패했습니다.");
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                title="상세 보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteAnalysis(item.analysis_id)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            247개 중 1-5개 표시
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-border hover:bg-card transition-colors disabled:opacity-50" disabled>
              이전
            </button>
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">1</button>
            <button className="px-4 py-2 rounded-lg border border-border hover:bg-card transition-colors">2</button>
            <button className="px-4 py-2 rounded-lg border border-border hover:bg-card transition-colors">3</button>
            <button className="px-4 py-2 rounded-lg border border-border hover:bg-card transition-colors">다음</button>
          </div>
        </div>
      </div>
    </div>
  );
}
