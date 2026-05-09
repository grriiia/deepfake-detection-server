import { Link, useLocation, useNavigate } from "react-router";
import { Activity, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem("forensiface_access_token");
    
    // "null" 이나 "undefined" 문자열이 저장되어 있는 경우 방지
    const isValidToken = !!token && token !== "undefined" && token !== "null";
    setIsLoggedIn(isValidToken);

    // 토큰이 있다면 실제 유효한지 백엔드에 한 번 확인해봅니다 (선택사항)
    if (isValidToken) {
      apiClient.get("/auth/me").catch(() => {
        setIsLoggedIn(false);
        localStorage.removeItem("forensiface_access_token");
      });
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("forensiface_access_token");
    setIsLoggedIn(false);
    navigate("/");
  };

  const navItems = [
    { name: "홈", path: "/" },
    { name: "분석", path: "/analyze" },
    { name: "히스토리", path: "/history" },
    { name: "대시보드", path: "/dashboard" },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">ForensiFace</span>
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 mr-4 border-r border-border pr-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors text-sm font-medium ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-medium text-primary">로그인됨</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}