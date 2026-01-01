// src/pages/CoursesListPage.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";



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

  const loading = data?.loading?.public;
  const error = data?.error?.public || "";

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <section className="relative text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        <div className="relative app-container py-12">
          <h1 className="text-4xl mb-3 drop-shadow-sm">Все курсы</h1>
          <p className="text-xl text-white/90 max-w-2xl">Найдите подходящий курс и прокачайте навыки</p>
        </div>
      </section>

      <div className="app-container py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Поиск курсов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={!!loading}
            />
          </div>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-600">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto" />
            <div className="mt-3">Загрузка курсов...</div>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <div className="text-red-600 font-medium">{error}</div>
            <div className="mt-3">
              <Button variant="outline" onClick={() => data?.loadPublic?.()}>
                Обновить
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => {
                const lessonsCount = Number(course?.lessonsCount ?? course?.lessons_count ?? 0);

                const courseKey = course?.slug ? String(course.slug) : String(course.id);
                const link = `/course/${courseKey}`;

                const coursePreview = {
                  id: course?.id ?? null,
                  slug: course?.slug ?? null,
                  title: course?.title ?? "",
                  description: course?.description ?? "",
                  lessonsCount,
                  categoryName: getCourseCategoryName(course, categories),
                  teacherName: getTeacherName(course),
                  photo: course?.photo ?? null, // ✅ для CoursePage
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

                return (
                  <Link
                    key={String(course?.id ?? courseKey)}
                    to={link}
                    state={{ coursePreview }}
                    className="block"
                  >
                    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 max-w-[360px] mx-auto">
                      {/* ✅ фото курса (если нет — блока просто не будет) */}
                      {img ? (
                        <div className="absolute inset-0">
                          <img
                            src={img}
                            alt={course?.title || "Курс"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // ✅ если битая ссылка — просто убираем картинку, без фолбека
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
                      <div className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />

                      <div className="relative min-h-[360px] flex flex-col justify-between">
                        <CardHeader className="p-5 text-white">
                          <div className="flex items-start justify-between gap-3">
                            <Badge className="w-fit bg-white/15 text-white border-white/20" variant="secondary">
                              {getCourseCategoryName(course, categories)}
                            </Badge>

                            <div className="flex items-center gap-2 text-white/85 text-xs">
                              <BookOpen className="w-4 h-4" />
                              <span className="whitespace-nowrap">{lessonsCount} уроков</span>
                            </div>
                          </div>

                          <CardTitle className="mt-4 text-2xl leading-snug drop-shadow-sm">
                            {course?.title || "Курс"}
                          </CardTitle>

                          <div className="mt-3 text-sm text-white/85">
                            <span className="text-white/70">Преподаватель: </span>
                            <span className="font-semibold">{getTeacherName(course)}</span>
                          </div>
                        </CardHeader>

                        <CardContent className="p-5 pt-0">
                          <div
                            className={[
                              "rounded-xl border border-white/15 bg-black/25 backdrop-blur-md p-4",
                              "opacity-100 translate-y-0",
                              "sm:opacity-0 sm:translate-y-4 sm:group-hover:opacity-100 sm:group-hover:translate-y-0",
                              "transition-all duration-300",
                            ].join(" ")}
                          >
                            <CardDescription className="text-white/85 mb-3 line-clamp-2">
                              {course?.description || "—"}
                            </CardDescription>

                            <div className="flex items-center justify-between text-sm text-white/85 mb-4">
                              <span className="text-white/70">Уроков:</span>
                              <span className="font-semibold">{lessonsCount}</span>
                            </div>

                            <Button className="w-full bg-white text-gray-900 hover:bg-white/90">
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

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">Курсы не найдены</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CoursesListPage;
