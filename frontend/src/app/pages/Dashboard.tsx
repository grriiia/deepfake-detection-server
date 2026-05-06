import { Users, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function Dashboard() {
  const monthlyAnalysisData = [
    { id: "jan", month: "1월", total: 145, real: 112, fake: 28, uncertain: 5 },
    { id: "feb", month: "2월", total: 178, real: 138, fake: 32, uncertain: 8 },
    { id: "mar", month: "3월", total: 247, real: 189, fake: 43, uncertain: 15 },
  ];

  const verdictDistribution = [
    { id: "real", name: "진짜", value: 189, color: "#10b981" },
    { id: "fake", name: "딥페이크", value: 43, color: "#ef4444" },
    { id: "uncertain", name: "불확실", value: 15, color: "#f59e0b" },
  ];

  const dailyActivityData = Array.from({ length: 7 }, (_, i) => ({
    id: `day-${i}`,
    day: ["월", "화", "수", "목", "금", "토", "일"][i],
    analyses: Math.floor(Math.random() * 30) + 20,
  }));

  const recentAlerts = [
    { id: 1, type: "high-confidence-fake", message: "고신뢰도 딥페이크가 탐지되었습니다", time: "2시간 전" },
    { id: 2, type: "system", message: "시스템 유지보수가 예정되어 있습니다", time: "5시간 전" },
    { id: 3, type: "quality", message: "낮은 품질의 비디오가 처리되었습니다", time: "1일 전" },
  ];

  const topUsers = [
    { name: "연구팀 A", analyses: 89, accuracy: 96.2 },
    { name: "보안부서", analyses: 67, accuracy: 94.8 },
    { name: "QA팀", analyses: 54, accuracy: 97.1 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
          <p className="text-muted-foreground">시스템 개요 및 분석 통계</p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-green-500">+12.5%</span>
            </div>
            <div className="text-2xl font-bold mb-1">247</div>
            <div className="text-sm text-muted-foreground">총 분석 수</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-xs text-green-500">+8.2%</span>
            </div>
            <div className="text-2xl font-bold mb-1">76.5%</div>
            <div className="text-sm text-muted-foreground">진짜 탐지율</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-xs text-red-500">+15.3%</span>
            </div>
            <div className="text-2xl font-bold mb-1">17.4%</div>
            <div className="text-sm text-muted-foreground">딥페이크 탐지율</div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-green-500">+2.1%</span>
            </div>
            <div className="text-2xl font-bold mb-1">93.2%</div>
            <div className="text-sm text-muted-foreground">평균 신뢰도</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Analysis Trend */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">월별 분석 추이</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyAnalysisData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="real" fill="#10b981" name="진짜" />
                <Bar dataKey="fake" fill="#ef4444" name="딥페이크" />
                <Bar dataKey="uncertain" fill="#f59e0b" name="불확실" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Verdict Distribution */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">판정 분포</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={verdictDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {verdictDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Activity */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">일일 활동 (최근 7일)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ background: "#0f2137", border: "1px solid #1e3a5f", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="analyses" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Alerts */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4">최근 알림</h3>
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="p-3 rounded-lg bg-secondary">
                  <div className="flex items-start gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">{alert.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="mt-6 p-6 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-4">상위 사용자</h3>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.analyses}회 분석</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-500">{user.accuracy}%</div>
                  <div className="text-xs text-muted-foreground">정확도</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}