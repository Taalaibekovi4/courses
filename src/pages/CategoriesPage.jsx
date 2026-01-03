// src/pages/CategoriesPage.jsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import { useData } from "../contexts/DataContext.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";

const FALLBACK_CAT_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80";

// ✅ fallback hero (если settings.banner пустой)
const HERO_BG_FALLBACK =
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=2000&q=80"; // massage vibe

const str = (v) => String(v ?? "").trim();

/** base для медиа (если бэк отдаёт /media/...) */
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

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

function getCourseCategoryId(course) {
  return course?.categoryId ?? course?.category ?? course?.category_id ?? null;
}

function getCategoryImg(category) {
  const img = category?.photo || category?.imageUrl || category?.coverUrl || category?.image || "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_CAT_IMG;
}

export function CategoriesPage() {
  const data = useData?.() || {};

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];

  const loading = Boolean(data?.loading?.public);
  const error = str(data?.error?.public);

  // ✅ SETTINGS: сначала из контекста, если нет — тянем /settings/
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
      console.error(e);
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [settingsFromCtx]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ✅ HERO BG из settings.banner
  const bannerUrl = useMemo(() => toAbsUrl(settings?.banner), [settings]);
  const HERO_BG = useMemo(() => bannerUrl || HERO_BG_FALLBACK, [bannerUrl]);

  const coursesByCategory = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      const catId = getCourseCategoryId(c);
      const key = str(catId);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [courses]);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white overflow-x-hidden">
      {/* HERO full-width */}
      <section className="relative overflow-hidden text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_BG})` }} />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,214,10,.20),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(255,214,10,.10),transparent_55%)]" />
        </div>

        <div className="relative app-container py-14 sm:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs sm:text-sm text-white/80">
              Направления обучения
            </div>

            <h1 className="mt-4 text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
              Категории курсов
            </h1>

            <p className="mt-4 text-white/80 text-base sm:text-lg max-w-2xl">
              Выберите направление — массаж, техника, практика и протоколы.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/65">
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                Категорий: {categories.length}
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                Курсов: {courses.length}
              </div>
              {settingsLoading ? (
                <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Загрузка настроек…</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </section>

      <div className="app-container py-12">
        {loading && (
          <div className="py-12 text-center text-white/70">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/50 mx-auto" />
            <div className="mt-3">Загрузка категорий...</div>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <div className="text-red-300 font-medium">{error}</div>
            <div className="mt-4">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => data?.loadPublic?.()}
              >
                Обновить
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const imgUrl = getCategoryImg(category);

              const categoryId = str(category?.id);
              const countFromMap = coursesByCategory.get(categoryId) || 0;
              const count = Number(category?.courses_count ?? countFromMap) || 0;

              return (
                <Link key={category?.id} to={`/category/${category?.id}`} className="block">
                  <Card className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                    {/* IMAGE */}
                    <div className="relative h-[170px] w-full bg-black/30">
                      <img
                        src={imgUrl}
                        alt={category?.name || "Категория"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_CAT_IMG;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    </div>

                    {/* CONTENT */}
                    <CardHeader className="p-6 pb-3">
                      <CardTitle className="text-xl sm:text-2xl text-white font-extrabold">
                        {category?.name || "Категория"}
                      </CardTitle>
                      <CardDescription className="mt-2 text-white/70 line-clamp-2">
                        {category?.description || "—"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70">Курсов:</span>
                        <Badge className="bg-[#FFD70A] text-black border-transparent" variant="secondary">
                          {count}
                        </Badge>
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/90">
                        <span className="underline decoration-white/30 group-hover:decoration-white/70">
                          Открыть категорию
                        </span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoriesPage;
