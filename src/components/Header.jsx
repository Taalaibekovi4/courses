import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, User, LogOut, LayoutDashboard, Menu, X, Home, BookOpen, Layers } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { Button } from "./ui/button.jsx";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
    setMobileOpen(false);
  }

  function getDashboardLink() {
    if (!user) return "/login";
    if (user.role === "admin") return "/admin";
    if (user.role === "teacher") return "/teacher";
    return "/dashboard";
  }

  const dashboardLabel = useMemo(() => {
    if (!user) return "Войти";
    if (user.role === "admin") return "Админка";
    if (user.role === "teacher") return "Кабинет";
    return "Мои курсы";
  }, [user]);

  const navItems = useMemo(
    () => [
      { to: "/", label: "Главная", icon: Home },
      { to: "/courses", label: "Курсы", icon: BookOpen },
      { to: "/categories", label: "Категории", icon: Layers },
    ],
    []
  );

  const isActive = (to) => {
    const path = location.pathname;
    if (to === "/") return path === "/";
    return path.startsWith(to);
  };

  const getInitials = (name) => {
    const s = String(name || "").trim();
    if (!s) return "U";
    const parts = s.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b" />

      <div className=" relative">
        <div className="app-container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setMobileOpen(false)}>
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight group-hover:text-blue-600 transition">EduPlatform</div>
              <div className="text-xs text-gray-500 -mt-0.5">Онлайн обучение</div>
            </div>
          </Link>

          {/* desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((it) => {
              const ActiveIcon = it.icon;
              const active = isActive(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2",
                    active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-blue-700",
                  ].join(" ")}
                >
                  <ActiveIcon className="w-4 h-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to={getDashboardLink()}>
                  <Button variant="ghost" size="sm" className="rounded-lg">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {dashboardLabel}
                  </Button>
                </Link>

                {/* user chip */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    {getInitials(user.name)}
                  </div>
                  <div className="leading-tight pr-1">
                    <div className="text-sm font-medium text-gray-900 max-w-[160px] truncate">{user.name}</div>
                    <div className="text-[11px] text-gray-500 -mt-0.5">
                      {user.role === "teacher" ? "Преподаватель" : user.role === "admin" ? "Администратор" : "Студент"}
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-lg">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button className="rounded-lg">Войти</Button>
              </Link>
            )}
          </div>

          {/* mobile toggle */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* mobile panel */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-white/95 backdrop-blur">
            <div className="container mx-auto px-4 py-4 space-y-3">
              <div className="grid gap-2">
                {navItems.map((it) => {
                  const ActiveIcon = it.icon;
                  const active = isActive(it.to);
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition",
                        active ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-800 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      <ActiveIcon className="w-5 h-5" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>

              {user ? (
                <div className="pt-3 border-t">
                  <Link
                    to={getDashboardLink()}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{dashboardLabel}</div>
                      <div className="text-xs text-gray-500">{user.name}</div>
                    </div>
                  </Link>

                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full mt-3 rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-xl">Войти</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
