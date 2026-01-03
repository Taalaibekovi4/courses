// src/pages/CoursesListPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Search, BookOpen, GraduationCap } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";

const HERO_FALLBACK_BG =
  "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=2000&q=80"; // massage/spa

const norm = (s) => String(s ?? "").trim();
const lower = (s) => norm(s).toLowerCase();

/** base для медиа (если бэк отдаёт /media/...) */
const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";

const API_ORIGIN = norm(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = norm(url);
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
  return norm(raw).replace(/\/+$/, "");
}

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

function getTeacherName(course) {
  return (
    course?.instructor_name ||
    course?.instructorName ||
    course?.teacher_name ||
    course?.teacherName ||
    course?.teacherUsername ||
    course?.teacher_username ||
    course?.instructor?.full_name ||
    course?.instructor?.username ||
    course?.instructor?.email ||
    course?.teacher?.full_name ||
    course?.teacher?.username ||
    course?.teacher?.name ||
    course?.teacher?.email ||
    "—"
  );
}

function getCourseCategoryName(course, categories) {
  if (course?.categoryName) return course.categoryName;
  if (course?.category_name) return course.category_name;
  if (course?.category?.name) return course.category.name;

  const catId = course?.categoryId ?? course?.category_id ?? course?.category ?? null;

  const cat = (Array.isArray(categories) ? categories : []).find(
    (c) => String(c?.id ?? c?.pk ?? "") === String(catId ?? "")
  );

  return cat?.name || cat?.title || "Категория";
}

function getCourseImg(course) {
  const img = course?.photo || course?.imageUrl || course?.coverUrl || course?.image || "";
  // ✅ НИКАКОГО FALLBACK: если фото нет — вернётся пустая строка
  return toAbsUrl(img);
}

export function CoursesListPage() {
  const data = useData?.() || {};
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  const loading = Boolean(data?.loading?.public);
  const error = norm(data?.error?.public || "");

  // ✅ SETTINGS: как на HomePage (сначала из контекста, если нет — грузим сами)
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

  // ✅ HERO BG из settings.banner (как на HomePage)
  const bannerUrl = useMemo(() => toAbsUrl(settings?.banner), [settings]);
  const heroBg = useMemo(() => bannerUrl || HERO_FALLBACK_BG, [bannerUrl]);

  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = lower(searchQuery);
    if (!q) return courses;

    return courses.filter((c) => {
      const t = lower(c?.title);
      const d = lower(c?.description);
      const cat = lower(c?.categoryName || c?.category_name || c?.category?.name);
      const teacher = lower(getTeacherName(c));
      return t.includes(q) || d.includes(q) || cat.includes(q) || teacher.includes(q);
    });
  }, [courses, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white overflow-x-hidden">
      {/* HERO (фон теперь берется из settings.banner как на HomePage) */}
      <section className="relative overflow-hidden text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,214,10,.20),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(255,214,10,.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
        </div>

        <div className="relative app-container py-14 sm:py-16">
          <div className="max-w-3xl">
            <Badge className="bg-white/10 text-white border-white/20" variant="secondary">
              Курсы
            </Badge>

            <h1 className="mt-4 text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
              Все курсы массажа
            </h1>

            <p className="mt-4 text-white/80 text-base sm:text-lg max-w-2xl">
              Выбирай направление, смотри уроки, выполняй домашние задания и получай обратную связь от преподавателей.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2">
                <BookOpen className="w-4 h-4" />
                <span>Всего курсов: {courses.length}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2">
                <Search className="w-4 h-4" />
                <span>Найдено: {filtered.length}</span>
              </div>
              {settingsLoading ? (
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2">
                  <span>Загрузка настроек…</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </section>

      <div className="app-container py-10">
        {/* SEARCH */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45 w-5 h-5" />
            <Input
              placeholder="Поиск: курс, описание, категория, преподаватель..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/40 rounded-2xl h-12"
              disabled={loading}
            />
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center text-white/70">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/40 mx-auto" />
            <div className="mt-3">Загрузка курсов...</div>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <div className="text-red-300 font-medium">{error}</div>
            <div className="mt-3">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 rounded-xl"
                onClick={() => data?.loadPublic?.()}
              >
                Обновить
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => {
                const lessonsCount = Number(course?.lessonsCount ?? course?.lessons_count ?? 0);

                const courseKey = course?.slug ? String(course.slug) : String(course.id);
                const link = `/course/${courseKey}`;

                // ✅ твоя логика preview — не трогаю
                const coursePreview = {
                  id: course?.id ?? null,
                  slug: course?.slug ?? null,
                  title: course?.title ?? "",
                  description: course?.description ?? "",
                  lessonsCount,
                  categoryName: getCourseCategoryName(course, categories),
                  teacherName: getTeacherName(course),
                  photo: course?.photo ?? null,
                  teacherId:
                    course?.instructor_id ??
                    course?.instructorId ??
                    course?.teacher_id ??
                    course?.teacherId ??
                    course?.instructor ??
                    course?.teacher ??
                    course?.teacher?.id ??
                    course?.instructor?.id ??
                    null,
                  categoryId:
                    course?.category_id ??
                    course?.categoryId ??
                    course?.category ??
                    course?.category?.id ??
                    null,
                };

                const img = getCourseImg(course);
                const catName = getCourseCategoryName(course, categories);
                const teacherName = getTeacherName(course);

                return (
                  <Link
                    key={String(course?.id ?? courseKey)}
                    to={link}
                    state={{ coursePreview }}
                    className="block"
                  >
                    <Card className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                      {img ? (
                        <div className="absolute inset-0">
                          <img
                            src={img}
                            alt={course?.title || "Курс"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_60%_20%,rgba(255,214,10,.16),transparent_55%)]" />

                      <div className="relative min-h-[360px] flex flex-col justify-between p-6">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <Badge className="bg-white/10 text-white border-white/20" variant="secondary">
                              {catName}
                            </Badge>

                            <div className="flex items-center gap-2 text-white/80 text-xs">
                              <BookOpen className="w-4 h-4" />
                              <span className="whitespace-nowrap">{lessonsCount} уроков</span>
                            </div>
                          </div>

                          <CardHeader className="p-0 mt-4">
                            <CardTitle className="text-2xl font-extrabold leading-snug drop-shadow-sm">
                              {course?.title || "Курс"}
                            </CardTitle>

                            <CardDescription className="mt-3 text-white/75 line-clamp-2">
                              {course?.description || "—"}
                            </CardDescription>
                          </CardHeader>

                          <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/85">
                            <GraduationCap className="w-4 h-4 text-[#FFD70A]" />
                            <span className="text-white/70">Преподаватель:</span>
                            <span className="font-semibold text-white">{teacherName}</span>
                          </div>
                        </div>

                        <CardContent className="p-0 mt-6">
                          <Button className="w-full h-11 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">
                            Подробнее
                          </Button>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/70">Курсы не найдены</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CoursesListPage;
