// src/pages/CategoryPage.jsx
import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Users, Filter } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";

const FALLBACK_CAT_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_COURSE_BG =
  "https://images.unsplash.com/photo-1556228724-4b1b4b3b6d12?auto=format&fit=crop&w=1600&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";
const str = (v) => String(v ?? "").trim();
const normName = (name) => str(name).toLowerCase().replace(/\s+/g, " ").trim();

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

function getCourseCategoryId(course) {
  // Swagger: category (integer)
  return course?.categoryId ?? course?.category ?? course?.category_id ?? null;
}

function getCourseTeacher(course) {
  // Swagger: instructor (id) + instructor_name
  // Старое: teacherId + teacherName
  const id = course?.teacherId ?? course?.instructor ?? course?.teacher_id ?? course?.instructor_id ?? null;

  const name =
    course?.teacherName ??
    course?.instructor_name ??
    course?.instructorName ??
    course?.teacher_name ??
    "—";

  return { id: str(id), name: str(name) || "—" };
}

function getTeacherKeyFromTeacher(t) {
  // ✅ ГЛАВНОЕ: ключ по имени (если имя нормальное)
  const n = normName(t?.name);
  if (n && n !== "—") return `name:${n}`;

  // fallback по id
  const id = str(t?.id);
  if (id) return `id:${id}`;

  return "unknown";
}

function getLessonsCount(course) {
  const v = course?.lessonsCount ?? course?.lessons_count ?? 0;
  return Number(v) || 0;
}

function getCategoryImg(category) {
  // Swagger: photo
  const img = category?.photo || category?.imageUrl || category?.coverUrl || category?.image || "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_CAT_IMG;
}

function getCourseImg(course) {
  // Swagger: photo
  const img = course?.photo || course?.imageUrl || course?.coverUrl || course?.image || "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_COURSE_BG;
}

export function CategoryPage() {
  const { id } = useParams();
  const categoryId = str(id);

  const data = useData?.() || {};
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];

  const loading = Boolean(data?.loading?.public);
  const error = str(data?.error?.public);

  const category = useMemo(
    () => categories.find((c) => String(c?.id) === String(id)) || null,
    [categories, id]
  );

  const categoryCourses = useMemo(() => {
    if (!categoryId) return [];
    return courses.filter((c) => str(getCourseCategoryId(c)) === categoryId);
  }, [courses, categoryId]);

  /**
   * ✅ FIX: преподаватель считается по НОРМАЛИЗОВАННОМУ ИМЕНИ
   * Тогда если id в курсах разный, но имя одно — будет 1 преподаватель.
   * Фото карточки преподавателя — фото курса (как у тебя было).
   */
  const teachers = useMemo(() => {
    const map = new Map(); // teacherKey -> teacher

    for (const c of categoryCourses) {
      const t = getCourseTeacher(c); // {id, name}
      const key = getTeacherKeyFromTeacher(t);
      if (key === "unknown") continue;

      const coverFromCourse = getCourseImg(c);

      if (!map.has(key)) {
        map.set(key, {
          id: t.id || key,
          name: t.name || "—",
          image: coverFromCourse || FALLBACK_COURSE_BG,
          bio: "",
          _ids: t.id ? [t.id] : [],
        });
      } else {
        const cur = map.get(key);

        // улучшаем картинку если первая была fallback
        const betterImg =
          cur?.image && cur.image !== FALLBACK_COURSE_BG
            ? cur.image
            : coverFromCourse || cur?.image || FALLBACK_COURSE_BG;

        // улучшаем имя если было "—"
        const betterName = cur?.name && cur.name !== "—" ? cur.name : t.name || cur?.name || "—";

        const ids = new Set([...(cur?._ids || [])]);
        if (t.id) ids.add(t.id);

        map.set(key, { ...cur, name: betterName, image: betterImg, _ids: Array.from(ids) });
      }
    }

    return Array.from(map.values());
  }, [categoryCourses]);

  const [selectedTeacherKey, setSelectedTeacherKey] = useState("all");

  const filteredCourses = useMemo(() => {
    if (selectedTeacherKey === "all") return categoryCourses;

    return categoryCourses.filter((c) => {
      const t = getCourseTeacher(c);
      const key = getTeacherKeyFromTeacher(t);
      return str(key) === str(selectedTeacherKey);
    });
  }, [categoryCourses, selectedTeacherKey]);

  const catBg = getCategoryImg(category);

  if (!loading && !error && !category) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="app-container py-12">
          <Card className="border border-white/10 bg-white/5 rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-white/70">Категория не найдена</p>
              <div className="mt-4">
                <Link to="/categories">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Назад к категориям
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white overflow-x-hidden">
      {/* HERO FULL-WIDTH */}
      <section className={`relative overflow-hidden text-white ${fullBleed}`}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${catBg})` }} />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,214,10,.20),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(255,214,10,.10),transparent_55%)]" />
        </div>

        <div className="relative app-container py-14 sm:py-16">
          <div className="max-w-3xl">
            <Badge className="bg-white/10 text-white border-white/20" variant="secondary">
              Категория
            </Badge>

            <h1 className="mt-4 text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
              {category?.name || "—"}
            </h1>

            <p className="mt-4 text-white/80 text-base sm:text-lg max-w-2xl">
              {category?.description || "—"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2">
                <BookOpen className="w-4 h-4" />
                <span>Курсов: {categoryCourses.length}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2">
                <Users className="w-4 h-4" />
                <span>Преподавателей: {teachers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </section>

      <div className="app-container py-12">
        {loading && (
          <div className="py-12 text-center text-white/70">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/50 mx-auto" />
            <div className="mt-3">Загрузка...</div>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <div className="text-red-300 font-medium">{error}</div>
            <div className="mt-3">
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
          <>
            {/* Teachers */}
            <section className="py-2">
              <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-[#FFD70A] text-2xl sm:text-3xl font-extrabold tracking-[0.06em] uppercase">
                    Преподаватели
                  </h2>
                  <p className="text-white/70 mt-2">
                    Выбирай преподавателя — ниже отфильтруются курсы этой категории
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={selectedTeacherKey === "all" ? "default" : "outline"}
                    onClick={() => setSelectedTeacherKey("all")}
                    className={
                      selectedTeacherKey === "all"
                        ? "bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold"
                        : "border-white/20 text-white hover:bg-white/10"
                    }
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Все
                  </Button>
                </div>
              </div>

              {teachers.length === 0 ? (
                <Card className="border border-white/10 bg-white/5 rounded-2xl">
                  <CardContent className="py-10 text-center text-white/70">
                    Преподаватели пока не отображаются (нужны курсы в категории).
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((t) => {
                    const tKey = getTeacherKeyFromTeacher(t);
                    const isActive = str(selectedTeacherKey) === str(tKey);

                    const tCoursesCount = categoryCourses.filter((c) => {
                      const ct = getCourseTeacher(c);
                      return getTeacherKeyFromTeacher(ct) === tKey;
                    }).length;

                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => setSelectedTeacherKey((prev) => (str(prev) === str(tKey) ? "all" : tKey))}
                        className="text-left"
                      >
                        <Card
                          className={[
                            "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition-all duration-300",
                            "shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
                            isActive ? "ring-2 ring-[#FFD70A]" : "",
                          ].join(" ")}
                        >
                          {/* фон — фото курса */}
                          <div className="absolute inset-0">
                            <img
                              src={t.image || FALLBACK_COURSE_BG}
                              alt={t.name || "Преподаватель"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_COURSE_BG;
                              }}
                            />
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

                          <div className="relative h-[230px] flex flex-col justify-between">
                            <CardHeader className="p-6 text-white">
                              <CardTitle className="text-2xl font-extrabold drop-shadow-sm">
                                {t.name || "—"}
                              </CardTitle>
                              <CardDescription className="text-white/80 line-clamp-2 mt-2">
                                {t.bio || "Преподаватель этой категории"}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="p-6 pt-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-white/80">Курсов:</span>
                                <Badge className="bg-[#FFD70A] text-black border-transparent" variant="secondary">
                                  {tCoursesCount}
                                </Badge>
                              </div>

                              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/90">
                                <span className="underline decoration-white/30 group-hover:decoration-white/70">
                                  {isActive ? "Показаны его курсы" : "Показать его курсы"}
                                </span>
                                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Courses */}
            <section className="pt-12 pb-4">
              <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-[#FFD70A] text-2xl sm:text-3xl font-extrabold tracking-[0.06em] uppercase">
                    Курсы
                  </h2>
                  <p className="text-white/70 mt-2">
                    {selectedTeacherKey === "all"
                      ? "Все курсы этой категории"
                      : "Курсы выбранного преподавателя"}
                  </p>
                </div>

                {selectedTeacherKey !== "all" ? (
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => setSelectedTeacherKey("all")}
                  >
                    Сбросить фильтр
                  </Button>
                ) : null}
              </div>

              {filteredCourses.length === 0 ? (
                <Card className="border border-white/10 bg-white/5 rounded-2xl">
                  <CardContent className="py-12 text-center">
                    <p className="text-white/70">В этой категории пока нет курсов по выбранному фильтру</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCourses.map((course) => {
                    const t = getCourseTeacher(course);
                    const lessonsCount = getLessonsCount(course);
                    const courseImg = getCourseImg(course);

                    return (
                      <Link key={course?.id} to={`/course/${course?.id}`} className="block">
                        <Card className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/7 transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                          <div className="absolute inset-0">
                            <img
                              src={courseImg}
                              alt={course?.title || "Курс"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_COURSE_BG;
                              }}
                            />
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

                          <div className="relative h-[330px] flex flex-col justify-between">
                            <CardHeader className="p-6 text-white">
                              <div className="flex items-start justify-between gap-3">
                                <Badge className="w-fit bg-white/10 text-white border-white/20" variant="secondary">
                                  {course?.category_name || category?.name || "Категория"}
                                </Badge>

                                <div className="flex items-center gap-2 text-white/80 text-xs">
                                  <BookOpen className="w-4 h-4" />
                                  <span className="whitespace-nowrap">{lessonsCount} уроков</span>
                                </div>
                              </div>

                              <CardTitle className="mt-4 text-2xl font-extrabold leading-snug drop-shadow-sm">
                                {course?.title}
                              </CardTitle>

                              <div className="mt-3 text-sm text-white/85">
                                <span className="text-white/70">Преподаватель: </span>
                                <span className="font-semibold">{t.name || "—"}</span>
                              </div>
                            </CardHeader>

                            <CardContent className="p-6 pt-0">
                              <div className="rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md p-4">
                                <CardDescription className="text-white/85 mb-3 line-clamp-2">
                                  {course?.description}
                                </CardDescription>

                                <div className="flex items-center justify-between text-sm text-white/85 mb-4">
                                  <span className="text-white/70">Уроков:</span>
                                  <span className="font-semibold">{lessonsCount}</span>
                                </div>

                                <Button className="w-full h-11 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">
                                  Подробнее
                                </Button>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;
