import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Analyze } from "./pages/Analyze";
import { QualityCheck } from "./pages/QualityCheck";
import { Progress } from "./pages/Progress";
import { Result } from "./pages/Result";
import { History } from "./pages/History";
import { Dashboard } from "./pages/Dashboard";
import { Signup } from "./pages/Signup";
import { LiveDetect } from "./pages/LiveDetect";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "analyze", Component: Analyze },
      { path: "quality-check", Component: QualityCheck },
      { path: "progress", Component: Progress },
      { path: "result", Component: Result },
      { path: "history", Component: History },
      { path: "dashboard", Component: Dashboard },
      { path: "live/:role", Component: LiveDetect }, // 수정
    ],
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
]);
