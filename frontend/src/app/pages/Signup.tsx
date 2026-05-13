import { Link, useNavigate } from "react-router-dom";
import { Activity, Mail, Lock, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { apiClient } from "../../api/client";

export function Signup() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userName.trim().length < 3) {
      alert("아이디는 최소 3자 이상 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      alert("비밀번호는 최소 6자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordCheck) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/register", {
        username: userName,
        password: password,
      });

      alert("회원가입이 완료되었습니다. 로그인해주세요.");
      navigate("/login");
    } catch (error: any) {
      console.error("Signup failed:", error);

      if (error.response?.status === 400) {
        alert(error.response.data.detail || "이미 사용 중인 아이디입니다.");
      } else {
        alert("회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
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
              회원가입 후 영상을 업로드하고 AI 기반 딥페이크 분석 결과를 확인하세요.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-background/50 border border-border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">간편한 계정 생성</h4>
                <p className="text-sm text-muted-foreground">
                  아이디와 비밀번호만으로 ForensiFace 분석 서비스를 이용할 수 있습니다.
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

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">회원가입</h1>
            <p className="text-muted-foreground">
              ForensiFace 계정을 생성하세요
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm">아이디 또는 이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
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
              <p className="text-xs text-muted-foreground">
                최소 6자 이상 입력해주세요.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="비밀번호를 다시 입력하세요"
                  value={passwordCheck}
                  onChange={(e) => setPasswordCheck(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-input-background border border-input focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  회원가입 중...
                </>
              ) : (
                "회원가입"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}