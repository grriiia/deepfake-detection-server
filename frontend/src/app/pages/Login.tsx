import { Link, useNavigate } from "react-router-dom";
import { Activity, Mail, Lock, Loader2, Github } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

export function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("forensiface_access_token", token);
      navigate("/analyze");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // OAuth2PasswordRequestForm은 URLSearchParams 형식을 요구함
    const params = new URLSearchParams();
    params.append("username", userName);
    params.append("password", password);

    try {
      // 백엔드 로그인 API 호출
      const response = await apiClient.post("/auth/login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // 토큰 저장
      const { access_token } = response.data;
      localStorage.setItem("forensiface_access_token", access_token);

      // 분석 페이지로 이동
      navigate("/analyze");
    } catch(error: any){
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/api/v1/auth/google/login";
  };

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:8000/api/v1/auth/github/login";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-card to-background p-12 flex-col justify-between border-r border-border">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">ForensiFace</span>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold">
              AI 기반
              <br />
              딥페이크 탐지
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              Xception 딥러닝 모델로 얼굴 영상의 합성 아티팩트를 탐지하는 첨단 AI 포렌식 플랫폼
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-background/50 border border-border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Xception 딥러닝 분석</h4>
                <p className="text-sm text-muted-foreground">
                  과학적 정밀도로 얼굴 텍스처 패턴과 합성 흔적을 분석하는 최첨단 AI 모델
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>© 2026 ForensiFace</span>
            <span>•</span>
            <span>AI 포렌식 플랫폼</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">환영합니다</h1>
            <p className="text-muted-foreground">ForensiFace 계정으로 로그인하세요</p>
          </div>

          <form onSubmit={handleLogin}className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm">이메일 주소</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text" // email 이었음
                  required
                  placeholder="name@example.com"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-input accent-primary" />
                <span>로그인 상태 유지</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                비밀번호 찾기
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">또는</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick = {handleGoogleLogin}
                className="py-3 rounded-lg border border-border hover:bg-card transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={handleGithubLogin}
                className="py-3 rounded-lg border border-border hover:bg-card transition-colors flex items-center justify-center gap-2"
              >
                <Github className="w-5 h-5" />
                GitHub
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            계정이 없으신가요?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              무료 회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}