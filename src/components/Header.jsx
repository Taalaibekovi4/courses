import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, User, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Button } from "./ui/button.jsx";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold">EduPlatform</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/courses" className="hover:text-blue-600 transition">Курсы</Link>
          <Link to="/categories" className="hover:text-blue-600 transition">Категории</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to={getDashboardLink()}>
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  {user.role === "admin" ? "Админка" : user.role === "teacher" ? "Кабинет" : "Мои курсы"}
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/login"><Button>Войти</Button></Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link to="/courses" className="block hover:text-blue-600" onClick={() => setMobileOpen(false)}>
              Курсы
            </Link>
            <Link to="/categories" className="block hover:text-blue-600" onClick={() => setMobileOpen(false)}>
              Категории
            </Link>

            {user ? (
              <>
                <Link to={getDashboardLink()} className="block hover:text-blue-600" onClick={() => setMobileOpen(false)}>
                  {user.role === "admin" ? "Админка" : user.role === "teacher" ? "Кабинет" : "Мои курсы"}
                </Link>
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </Button>
                </div>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Войти</Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
