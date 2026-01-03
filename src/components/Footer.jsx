import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Mail, MessageCircle } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";

const WHATSAPP_NUMBER = "996221000953";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";
const API_ORIGIN = str(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = str(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) {
    if (API_ORIGIN) return `${API_ORIGIN}${u}`;
    return u;
  }
  if (API_ORIGIN) return `${API_ORIGIN}/${u}`;
  return u;
}

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

export function Footer() {
  const data = useData();

  // ✅ settings как в HomePage
  const settingsFromCtx = data?.settings || null;
  const [settings, setSettings] = useState(settingsFromCtx);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (settingsFromCtx) setSettings(settingsFromCtx);
  }, [settingsFromCtx]);

  const loadSettings = useCallback(async () => {
    if (settingsFromCtx) return;
    setSettingsLoading(true);
    try {
      const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });
      const r = await api.get("/settings/");
      setSettings(extractSettings(r.data) || null);
    } catch (e) {
      console.error("FOOTER SETTINGS ERROR:", e);
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [settingsFromCtx]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ✅ ЛОГО из settings (без fallback)
  const logoUrl = useMemo(() => {
    // поддержка разных названий поля на бэке:
    const raw =
      settings?.logo ||
      settings?.logo_url ||
      settings?.logoUrl ||
      settings?.site_logo ||
      settings?.siteLogo ||
      settings?.header_logo ||
      settings?.headerLogo ||
      "";
    return toAbsUrl(raw);
  }, [settings]);

  const brandName = useMemo(() => {
    return (
      str(settings?.site_name) ||
      str(settings?.project_name) ||
      str(settings?.name) ||
      "vostok-massage.kg"
    );
  }, [settings]);

  const footerText = useMemo(() => {
    return (
      str(settings?.footer_text) ||
      "Онлайн-платформа видео-курсов с доступом по токенам."
    );
  }, [settings]);

  return (
    <footer className="relative bg-[#0b0b0b] text-white">
      {/* top divider glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_20%_0%,rgba(255,214,10,.14),transparent_55%)]" />

      <div className="app-container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* BRAND */}
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="text-lg font-extrabold tracking-wide text-white">
                  {brandName}
                </div>
                {settingsLoading ? (
                  <div className="text-xs text-white/40">Загрузка…</div>
                ) : null}
              </div>
            </div>

            <p className="mt-4 text-sm text-white/60 leading-relaxed">
              {footerText}
            </p>
          </div>

          {/* NAV */}
          <div>
            <h3 className="font-extrabold text-white mb-4 uppercase tracking-[0.08em] text-sm">
              Навигация
            </h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li>
                <Link to="/" className="hover:text-[#FFD70A] transition">
                  Главная
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-[#FFD70A] transition">
                  Все курсы
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#FFD70A] transition">
                  Категории
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#FFD70A] transition">
                  Вход
                </Link>
              </li>
            </ul>
          </div>

          {/* STUDENTS */}
          <div>
            <h3 className="font-extrabold text-white mb-4 uppercase tracking-[0.08em] text-sm">
              Студентам
            </h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li>
                <Link to="/dashboard" className="hover:text-[#FFD70A] transition">
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-[#FFD70A] transition">
                  Каталог курсов
                </Link>
              </li>
              <li>
                <span className="text-white/45">Активация токена</span>
              </li>
              <li>
                <span className="text-white/45">Домашние задания</span>
              </li>
            </ul>
          </div>

          {/* CONTACTS */}
          <div>
            <h3 className="font-extrabold text-white mb-4 uppercase tracking-[0.08em] text-sm">
              Контакты
            </h3>

            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#FFD70A]" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  className="hover:text-[#FFD70A] transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </li>

              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#FFD70A]" />
                <a
                  href={`mailto:${str(settings?.email) || "info@eduplatform.com"}`}
                  className="hover:text-[#FFD70A] transition"
                >
                  {str(settings?.email) || "info@eduplatform.com"}
                </a>
              </li>
            </ul>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/70">Оплата через WhatsApp</div>
              <div className="mt-1 text-xs text-white/45">Доступ по токенам</div>
            </div>
          </div>
        </div>

        {/* bottom */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/55">
            © {new Date().getFullYear()} {brandName}. Все права защищены.
          </p>
          <p className="mt-2 text-xs text-white/35">
            Платформа онлайн-обучения с доступом по токенам
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
