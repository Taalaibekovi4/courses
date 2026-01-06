import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { MessageCircle, Instagram } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";

const WHATSAPP_NUMBER = "996221000953";
const INSTAGRAM_URL =
  "https://www.instagram.com/vostok_osh?igsh=MW5ma3p4eGtqOTB3Mg==";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  "";
const API_ORIGIN = str(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = str(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return API_ORIGIN ? `${API_ORIGIN}${u}` : u;
  return API_ORIGIN ? `${API_ORIGIN}/${u}` : u;
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
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [settingsFromCtx]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const logoUrl = useMemo(() => {
    const raw =
      settings?.logo ||
      settings?.logo_url ||
      settings?.site_logo ||
      settings?.header_logo ||
      "";
    return toAbsUrl(raw);
  }, [settings]);

  const brandName = useMemo(
    () =>
      str(settings?.site_name) ||
      str(settings?.project_name) ||
      "vostok-massage.kg",
    [settings]
  );

  const footerText = useMemo(
    () =>
      str(settings?.footer_text) ||
      "Онлайн-платформа видео-курсов с доступом по токенам.",
    [settings]
  );

  return (
    <footer className="relative bg-[#0b0b0b] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="app-container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* BRAND */}
          <div>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              )}

              <div>
                <div className="text-lg font-extrabold">{brandName}</div>
                {settingsLoading && (
                  <div className="text-xs text-white/40">Загрузка…</div>
                )}
              </div>
            </div>

            <p className="mt-4 text-sm text-white/60">{footerText}</p>
          </div>

          {/* NAV */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest">
              Навигация
            </h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li><Link to="/" className="hover:text-[#FFD70A]">Главная</Link></li>
              <li><Link to="/courses" className="hover:text-[#FFD70A]">Курсы</Link></li>
              <li><Link to="/categories" className="hover:text-[#FFD70A]">Категории</Link></li>
              <li><Link to="/login" className="hover:text-[#FFD70A]">Вход</Link></li>
            </ul>
          </div>

          {/* STUDENTS */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest">
              Студентам
            </h3>
            <ul className="space-y-2 text-sm text-white/65">
              <li><Link to="/dashboard" className="hover:text-[#FFD70A]">Кабинет</Link></li>
              <li><Link to="/courses" className="hover:text-[#FFD70A]">Каталог</Link></li>
              <li className="text-white/45">Активация токена</li>
              <li className="text-white/45">Домашние задания</li>
            </ul>
          </div>

          {/* CONTACTS */}
          <div>
            <h3 className="mb-4 text-sm font-extrabold uppercase tracking-widest">
              Контакты
            </h3>

            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#FFD70A]" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFD70A]"
                >
                  WhatsApp
                </a>
              </li>

              <li className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-[#FFD70A]" />
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFD70A]"
                >
                  Instagram
                </a>
              </li>
            </ul>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/70">Оплата через WhatsApp</div>
              <div className="mt-1 text-xs text-white/45">Доступ по токенам</div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/55">
            © {new Date().getFullYear()} {brandName}. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
