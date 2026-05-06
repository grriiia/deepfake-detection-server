import { Outlet, useLocation } from "react-router";
import { Navigation } from "./components/Navigation";

export function Root() {
  const location = useLocation();
  const showNavigation = location.pathname !== "/login";

  return (
    <>
      {showNavigation && <Navigation />}
      <Outlet />
    </>
  );
}
