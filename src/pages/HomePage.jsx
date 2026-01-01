// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { BadgeCheck, Rocket, ShieldCheck, Users, BookOpen } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";

const FALLBACK_HERO_BG =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1800&q=80";

const FALLBACK_TEACHER_BG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_CAT_BG =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_COURSE_BG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

/**
 * Делает ссылку абсолютной:
 * - если url уже http(s) — оставляем
 * - если url типа /media/... — приклеиваем домен из VITE_API_URL (если есть)
 */
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

const getTeacherImg = (teacher) => {
  const img = teacher?.avatarUrl || teacher?.photoUrl || teacher?.image || "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_TEACHER_BG;
};

const getCategoryImg = (category) => {
  const img = category?.photo || category?.imageUrl || category?.coverUrl || category?.image || "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_CAT_BG;
};

const getCourseImg = (course, teacher) => {
  const img = course?.photo || course?.imageUrl || course?.coverUrl || course?.image || "";
  const abs = toAbsUrl(img);
  if (abs) return abs;
  const teacherImg = getTeacherImg(teacher);
  return teacherImg || FALLBACK_COURSE_BG;
};

const HomePage = () => {
  const data = useData();

  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const teachers = Array.isArray(data?.teachers) ? data.teachers : [];

  // если DataContext уже отдаёт settings — используем сразу
  const settingsFromCtx = data?.settings || null;

  // если не отдаёт — тянем сами
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

  const teacherById = useMemo(() => {
    const m = new Map();
    for (const t of teachers) m.set(t?.id, t);
    return m;
  }, [teachers]);

  const popularCourse = useMemo(() => courses?.[0] || null, [courses]);

  const heroTeacher = useMemo(() => {
    const firstCourse = courses?.[0];
    const t = firstCourse?.teacherId
      ? teacherById.get(firstCourse.teacherId)
      : firstCourse?.teacher || null;
    return t || teachers?.[0] || null;
  }, [courses, teachers, teacherById]);

  // ✅ баннер берём из settings.banner (если есть)
  const bannerUrl = useMemo(() => toAbsUrl(settings?.banner), [settings]);
  const heroBg = useMemo(() => {
    if (bannerUrl) return bannerUrl;
    if (heroTeacher) return getTeacherImg(heroTeacher);
    return FALLBACK_HERO_BG;
  }, [bannerUrl, heroTeacher]);

  // ✅ заголовок/описание из settings (если есть)
  const heroTitle = useMemo(
    () => str(settings?.title) || "Начните учиться сегодня — результат увидите уже через неделю",
    [settings]
  );
  const heroDesc = useMemo(
    () =>
      str(settings?.description) ||
      "Выбирайте курсы, смотрите уроки, сдавайте домашние задания и получайте обратную связь от преподавателя.",
    [settings]
  );

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* HERO */}
      <section
        className="relative overflow-hidden h-[100svh] min-h-screen w-screen"
        style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,.25),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,.22),transparent_55%)]" />

        <div className="relative app-container pt-12 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
          <div className="max-w-3xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm">
              <BadgeCheck className="w-4 h-4" />
              <span>Онлайн-платформа курсов с проверкой ДЗ</span>
            </div>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
              {heroTitle}
            </h1>

            <p className="mt-4 text-white/85 text-base sm:text-lg max-w-2xl">{heroDesc}</p>

            <div className="mt-7">
              <Link to="/courses" className="inline-block w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-gray-900 hover:bg-white/90">
                  Выбрать курс
                </Button>
              </Link>
            </div>

            {settingsLoading ? (
              <div className="mt-5 text-xs text-white/70">Загрузка настроек…</div>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <div className="app-container">
        <section className="mt-10 sm:mt-12">
          <Card className="border shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-gray-600 text-sm">Рекомендуем начать с</div>

                  <div className="mt-3 text-xl sm:text-2xl font-semibold leading-snug">
                    {popularCourse?.title || "React с нуля до профи"}
                  </div>

                  <div className="mt-3 text-gray-600 text-sm sm:text-base line-clamp-2">
                    {popularCourse?.description || "Полный курс по React для начинающих и продвинутых"}
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge className="bg-black text-white border-transparent" variant="secondary">
                    Топ
                  </Badge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="font-semibold">Как получить доступ</div>
                  <ol className="mt-2 text-sm text-gray-700 list-decimal pl-5 space-y-1">
                    <li>Выбираете курс</li>
                    <li>Оплачиваешь.</li>
                    <li>Получаете токен и активируете в кабинете</li>
                  </ol>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-gray-500 text-xs">Курсов</div>
                    <div className="text-2xl font-semibold">{courses.length}</div>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="text-gray-500 text-xs">Категорий</div>
                    <div className="text-2xl font-semibold">{categories.length}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="pt-12">
          <h2 className="text-3xl mb-8">Категории курсов</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {categories.map((category) => {
              const img = getCategoryImg(category);

              return (
                <Link key={category.id} to={`/category/${category.id}`} className="block h-full">
                  <Card className="h-full min-h-[150px] hover:shadow-lg transition cursor-pointer overflow-hidden rounded-2xl">
                    <div className="h-[120px] w-full bg-gray-100">
                      <img
                        src={img}
                        alt={category?.name || "Категория"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_CAT_BG;
                        }}
                      />
                    </div>

                    <div className="p-6 flex flex-col h-full">
                      <div
                        className="text-xl font-semibold leading-snug overflow-hidden"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                      >
                        {category.name}
                      </div>

                      <div
                        className="mt-2 text-gray-600 overflow-hidden"
                        style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
                      >
                        {category.description}
                      </div>

                      <div className="mt-auto" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="pt-10">
          <Card className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="text-2xl font-semibold">Почему это удобно</div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <Rocket className="w-5 h-5 text-blue-600" />
                    Учимся с нуля
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">Программа адаптирована для новичков</div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    Доступ по токену
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">Видео не “уходят” на YouTube ссылкой</div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <Users className="w-5 h-5 text-green-600" />
                    Проверка ДЗ
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">Принято / На доработку — всё прозрачно</div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                    Короткие уроки
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">Смотрите по 10–20 минут, без перегруза</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-12 pb-20">
          <h2 className="text-3xl mb-8">Популярные курсы</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course) => {
              const teacher = course?.teacherId
                ? teacherById.get(course.teacherId)
                : course?.instructor
                ? teacherById.get(course.instructor)
                : course?.teacher || null;

              const courseImg = getCourseImg(course, teacher);

              return (
                <Link key={course.id} to={`/course/${course.id}`} className="block h-full">
                  <Card className="hover:shadow-lg transition cursor-pointer h-full flex flex-col overflow-hidden rounded-2xl">
                    <div className="h-[140px] w-full bg-gray-100">
                      <img
                        src={courseImg}
                        alt={course?.title || "Курс"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const tImg = getTeacherImg(teacher);
                          if (tImg && e.currentTarget.src !== tImg) {
                            e.currentTarget.src = tImg;
                            return;
                          }
                          e.currentTarget.src = FALLBACK_COURSE_BG;
                        }}
                      />
                    </div>

                    <div className="p-6 flex-1">
                      <div className="text-xl font-semibold">{course.title}</div>
                      <div className="text-gray-600 mt-2">{course.description}</div>
                    </div>

                    <div className="p-6 pt-0">
                      <Button variant="outline" className="w-full">
                        Подробнее
                      </Button>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export { HomePage };
export default HomePage;
