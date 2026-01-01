import React, { useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Home,
  BookOpen,
  Layers,
  Shield,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { Button } from "./ui/button.jsx";

const normLow = (s) => String(s ?? "").trim().toLowerCase();

function isAdminRole(role) {
  const r = normLow(role);
  return ["admin", "Analystic", "superadmin", "owner"].includes(r);
}

function getCabinetLink(user) {
  if (!user) return "/login";
  const r = normLow(user.role);
  if (r === "teacher") return "/teacher";
  return "/dashboard"; // студент
}

function getCabinetLabel(user) {
  if (!user) return "Войти";
  const r = normLow(user.role);
  if (r === "teacher") return "Мой кабинет";
  return "Мои курсы";
}

function getRoleLabel(role) {
  const r = normLow(role);
  if (isAdminRole(r)) return "Администратор";
  if (r === "teacher") return "Преподаватель";
  return "Студент";
}

function getInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = useMemo(() => normLow(user?.role), [user]);
  const showAdmin = useMemo(() => isAdminRole(role), [role]);

  // “Кабинет” показываем только teacher/student, админам — НЕ показываем
  const showCabinet = useMemo(() => !!user && !showAdmin, [user, showAdmin]);

  const cabinetTo = useMemo(() => getCabinetLink(user), [user]);
  const cabinetLabel = useMemo(() => getCabinetLabel(user), [user]);

  const navItems = useMemo(
    () => [
      { to: "/", label: "Главная", icon: Home },
      { to: "/courses", label: "Курсы", icon: BookOpen },
      { to: "/categories", label: "Категории", icon: Layers },
    ],
    []
  );

  const isActive = useCallback(
    (to) => {
      const path = location.pathname;
      if (to === "/") return path === "/";
      return path.startsWith(to);
    },
    [location.pathname]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    setMobileOpen(false);
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b" />

      <div className="relative">
        <div className="app-container py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" onClick={closeMobile}>
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight group-hover:text-blue-600 transition">
                EduPlatform
              </div>
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
                {/* Кнопка кабинета: только teacher/student */}
                {showCabinet ? (
                  <Link to={cabinetTo}>
                    <Button variant="ghost" size="sm" className="rounded-lg">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {cabinetLabel}
                    </Button>
                  </Link>
                ) : null}

                {/* Админка: только админам */}
                {showAdmin ? (
                  <Link to="/Analystic">
                    <Button size="sm" className="rounded-lg">
                      <Shield className="w-4 h-4 mr-2" />
                      Админка
                    </Button>
                  </Link>
                ) : null}

                {/* user chip */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    {getInitials(user.name)}
                  </div>
                  <div className="leading-tight pr-1">
                    <div className="text-sm font-medium text-gray-900 max-w-[160px] truncate">{user.name}</div>
                    <div className="text-[11px] text-gray-500 -mt-0.5">{getRoleLabel(user.role)}</div>
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
                      onClick={closeMobile}
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
                <div className="pt-3 border-t space-y-2">
                  {/* Кабинет: только teacher/student */}
                  {showCabinet ? (
                    <Link
                      to={cabinetTo}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition"
                      onClick={closeMobile}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{cabinetLabel}</div>
                        <div className="text-xs text-gray-500">{user.name}</div>
                      </div>
                    </Link>
                  ) : null}

                  {/* Админка: только админам */}
                  {showAdmin ? (
                    <Link
                      to="/Analystic"
                      className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                      onClick={closeMobile}
                    >
                      <Shield className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Админка</div>
                        <div className="text-xs text-blue-700/70">Аналитика</div>
                      </div>
                    </Link>
                  ) : null}

                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full mt-2 rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={closeMobile}>
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

export default Header;
