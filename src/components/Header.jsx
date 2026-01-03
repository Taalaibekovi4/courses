// src/components/Header.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { LogOut, LayoutDashboard, Menu, X, Home, BookOpen, Layers, Shield } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { Button } from "./ui/button.jsx";

const str = (v) => String(v ?? "").trim();
const normLow = (s) => str(s).toLowerCase();

function isAdminRole(role) {
  const r = normLow(role);
  return ["admin", "analystic", "superadmin", "owner"].includes(r);
}

function getCabinetLink(user) {
  if (!user) return "/login";
  const r = normLow(user.role);
  if (r === "teacher") return "/teacher";
  return "/dashboard";
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
  const s = str(name);
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

function toAbsUrl(url) {
  const u = str(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;

  const base = getApiBase();
  const origin = base.replace(/\/api\/?$/i, "").replace(/\/$/, "");

  if (u.startsWith("/")) return origin ? `${origin}${u}` : u;
  return origin ? `${origin}/${u}` : u;
}

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

/* ===========================
   ✅ FAVICON helpers (круглый)
   =========================== */

function removeAllFavicons() {
  document
    .querySelectorAll("link[rel='icon'], link[rel='shortcut icon'], link[rel~='icon']")
    .forEach((n) => n.remove());
}

function setCircularFaviconFromImageUrl(imageUrl) {
  const url = str(imageUrl);
  if (!url) return;

  const size = 64;

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, 0, 0, size, size);

    canvas.toBlob((blob) => {
      if (!blob) return;

      removeAllFavicons();

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = blobUrl;
      document.head.appendChild(link);

      const link2 = document.createElement("link");
      link2.rel = "shortcut icon";
      link2.type = "image/png";
      link2.href = blobUrl;
      document.head.appendChild(link2);
    }, "image/png");
  };

  img.onerror = () => {
    removeAllFavicons();
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    document.head.appendChild(link);
  };

  img.src = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

/* ===========================
   ✅ anchors helpers
   =========================== */

function scrollToId(id, headerOffset = 0) {
  try {
    const el = document.getElementById(id);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.pageYOffset - Math.max(0, headerOffset) - 10;
    window.scrollTo({ top, behavior: "smooth" });
  } catch (_) {}
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/"; // оставили для anchor-навигации

  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(64);

  // active section only for Home
  const [activeSection, setActiveSection] = useState("home");

  const role = useMemo(() => normLow(user?.role), [user]);
  const showAdmin = useMemo(() => isAdminRole(role), [role]);
  const showCabinet = useMemo(() => !!user && !showAdmin, [user, showAdmin]);
  const cabinetTo = useMemo(() => getCabinetLink(user), [user]);
  const cabinetLabel = useMemo(() => getCabinetLabel(user), [user]);

  // обычные страницы (ссылки)
  const navItemsNormal = useMemo(
    () => [
      { to: "/", label: "Главная", icon: Home },
      { to: "/courses", label: "Курсы", icon: BookOpen },
      { to: "/categories", label: "Категории", icon: Layers },
    ],
    []
  );

  // home anchors (в порядке как надо)
  const navItemsHome = useMemo(
    () => [
      { id: "forwho", label: "ДЛЯ КОГО" },
      { id: "categories", label: "КАТЕГОРИИ" },
      { id: "benefits", label: "ЧТО ПОЛУЧИШЬ" },
      { id: "catalog", label: "КУРСЫ" },
      { id: "speakers", label: "ПРЕПОДЫ" },
      { id: "contacts", label: "КОНТАКТЫ" },
    ],
    []
  );

  const isActiveNormal = useCallback(
    (to) => {
      const path = location.pathname;
      if (to === "/") return path === "/";
      return path.startsWith(to);
    },
    [location.pathname]
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    setMobileOpen(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
  }, [logout, navigate]);

  // logo click
  const handleLogoClick = useCallback(
    (e) => {
      e.preventDefault();
      closeMobile();

      const goTop = () => requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }));

      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(goTop, 0);
      } else {
        goTop();
        setActiveSection("home");
      }
    },
    [closeMobile, location.pathname, navigate]
  );

  // settings.logo + favicon
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });
        const r = await api.get("/settings/");
        const s = extractSettings(r.data);
        const absLogo = toAbsUrl(s?.logo);
        if (!alive) return;
        setLogoUrl(absLogo || "");
        if (absLogo) setCircularFaviconFromImageUrl(absLogo);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setLogoUrl("");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // measure header height
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      const h = Math.max(56, Math.round(el.getBoundingClientRect().height || 0));
      setHeaderH(h || 64);
    };

    apply();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => apply());
      ro.observe(el);
    } else {
      window.addEventListener("resize", apply);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", apply);
    };
  }, []);

  // scroll-spy only on Home
  useEffect(() => {
    if (!isHome) return;

    const ids = ["home", "forwho", "categories", "benefits", "catalog", "speakers", "contacts"];

    let raf = 0;
    const onScroll = () => {
      if (raf) return;

      raf = requestAnimationFrame(() => {
        raf = 0;

        const y = headerH + 20;
        let best = "home";

        for (const id of ids) {
          const el = document.getElementById(id);
          if (!el) continue;

          const r = el.getBoundingClientRect();
          if (r.top <= y) best = id;
        }

        setActiveSection(best);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHome, headerH]);

  const onHomeNavClick = useCallback(
    (id) => {
      closeMobile();
      setActiveSection(id);
      scrollToId(id, headerH);
    },
    [closeMobile, headerH]
  );

  // ✅ ЕДИНЫЙ ЧЁРНЫЙ СТИЛЬ (как на Home)
  const headerBgClass = "bg-black/55 border-b border-white/10 backdrop-blur";
  const logoWrapClass = "bg-white/5 border border-white/10";
  const desktopLinkActive = "bg-[#FFD70A] text-black";
  const desktopLinkIdle = "text-white/85 hover:text-white hover:bg-white/10";

  return (
    <>
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
        <div className={["absolute inset-0", headerBgClass].join(" ")} />
        <div className="relative">
          <div className="app-container py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group" onClick={handleLogoClick}>
              <span className={["w-10 h-10 rounded-[10%] flex items-center justify-center shadow-sm overflow-hidden", logoWrapClass].join(" ")}>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="logo"
                    className="w-full h-full object-cover rounded-[10%]"
                    loading="lazy"
                    onError={() => setLogoUrl("")}
                  />
                )}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              {isHome
                ? navItemsHome.map((it) => {
                    const active = activeSection === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => onHomeNavClick(it.id)}
                        className={[
                          "px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold uppercase tracking-wide transition",
                          active ? desktopLinkActive : desktopLinkIdle,
                        ].join(" ")}
                      >
                        {it.label}
                      </button>
                    );
                  })
                : navItemsNormal.map((it) => {
                    const ActiveIcon = it.icon;
                    const active = isActiveNormal(it.to);
                    return (
                      <Link
                        key={it.to}
                        to={it.to}
                        className={[
                          "px-3 py-2 rounded-lg text-sm font-extrabold uppercase tracking-wide transition flex items-center gap-2",
                          active ? desktopLinkActive : desktopLinkIdle,
                        ].join(" ")}
                      >
                        <ActiveIcon className="w-4 h-4" />
                        {it.label}
                      </Link>
                    );
                  })}
            </nav>

            {/* Desktop Right */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  {showCabinet && (
                    <Link to={cabinetTo}>
                      <Button variant="ghost" size="sm" className="rounded-lg text-white hover:bg-white/10">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {cabinetLabel}
                      </Button>
                    </Link>
                  )}

                  {showAdmin && (
                    <Link to="/Analystic">
                      <Button size="sm" className="rounded-lg bg-[#FFD70A] text-black hover:bg-[#ffde33]">
                        <Shield className="w-4 h-4 mr-2" />
                        Админка
                      </Button>
                    </Link>
                  )}

                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10 border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                      {getInitials(user.name)}
                    </div>
                    <div className="leading-tight pr-1">
                      <div className="text-sm font-medium max-w-[160px] truncate text-white">{user.name}</div>
                      <div className="text-[11px] -mt-0.5 text-white/70">{getRoleLabel(user.role)}</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="rounded-lg border-white/20 text-white hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button className="rounded-lg bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">Войти</Button>
                </Link>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg transition hover:bg-white/10 text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ top: headerH }}>
          <div className="absolute inset-0 bg-black/30" onClick={closeMobile} aria-hidden="true" />

          <div className="absolute inset-x-0 top-0 border-b shadow-lg bg-[#0b0b0b] border-white/10">
            <div className="app-container py-3">
              <nav className="flex flex-col gap-1">
                {isHome
                  ? navItemsHome.map((it) => {
                      const active = activeSection === it.id;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => onHomeNavClick(it.id)}
                          className={[
                            "w-full text-left px-3 py-3 rounded-lg text-sm font-extrabold uppercase tracking-wide transition",
                            active ? desktopLinkActive : desktopLinkIdle,
                          ].join(" ")}
                        >
                          {it.label}
                        </button>
                      );
                    })
                  : navItemsNormal.map((it) => {
                      const ActiveIcon = it.icon;
                      const active = isActiveNormal(it.to);
                      return (
                        <Link
                          key={it.to}
                          to={it.to}
                          onClick={closeMobile}
                          className={[
                            "px-3 py-3 rounded-lg text-sm font-extrabold uppercase tracking-wide transition flex items-center gap-2",
                            active ? desktopLinkActive : desktopLinkIdle,
                          ].join(" ")}
                        >
                          <ActiveIcon className="w-4 h-4" />
                          {it.label}
                        </Link>
                      );
                    })}
              </nav>

              <div className="mt-3 pt-3 border-t border-white/10">
                {user ? (
                  <div className="flex flex-col gap-2">
                    {showCabinet && (
                      <Link to={cabinetTo} onClick={closeMobile}>
                        <Button variant="ghost" size="sm" className="w-full justify-start rounded-lg text-white hover:bg-white/10">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          {cabinetLabel}
                        </Button>
                      </Link>
                    )}

                    {showAdmin && (
                      <Link to="/Analystic" onClick={closeMobile}>
                        <Button size="sm" className="w-full justify-start rounded-lg bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">
                          <Shield className="w-4 h-4 mr-2" />
                          Админка
                        </Button>
                      </Link>
                    )}

                    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/10 border border-white/10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                        {getInitials(user.name)}
                      </div>
                      <div className="leading-tight pr-1">
                        <div className="text-sm font-medium max-w-[220px] truncate text-white">{user.name}</div>
                        <div className="text-[11px] -mt-0.5 text-white/70">{getRoleLabel(user.role)}</div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-center rounded-lg border-white/20 text-white hover:bg-white/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                ) : (
                  <Link to="/login" onClick={closeMobile}>
                    <Button className="w-full rounded-lg bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">Войти</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div aria-hidden="true" style={{ height: headerH }} />
    </>
  );
}

export default Header;
