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

const HERO_BG =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1800&q=80";

const FALLBACK_BG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80";

const norm = (s) => String(s ?? "").trim();
const lower = (s) => norm(s).toLowerCase();

function getTeacherName(course) {
  return (
    course?.teacherName ||
    course?.teacher_name ||
    course?.teacherUsername ||
    course?.teacher_username ||
    course?.teacher?.username ||
    course?.teacher?.name ||
    course?.teacher?.email ||
    "—"
  );
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
      const cat = lower(c?.categoryName || c?.category_name);
      const teacher = lower(getTeacherName(c));
      return t.includes(q) || d.includes(q) || cat.includes(q) || teacher.includes(q);
    });
  }, [courses, searchQuery]);

  const getCategoryName = (course) => {
    if (course?.categoryName) return course.categoryName;
    if (course?.category_name) return course.category_name;

    const cat = categories.find((c) => String(c.id) === String(course?.categoryId));
    return cat?.name || "Категория";
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* HERO 100% ширины */}
      <section className="relative text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        <div className="relative app-container py-12">
          <h1 className="text-4xl mb-3 drop-shadow-sm">Все курсы</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Найдите подходящий курс и прокачайте навыки
          </p>
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

                // ✅ ВАЖНО: даём ключ, который реально совпадёт с деталкой.
                // если есть slug — используем slug, иначе id
                const courseKey = course?.slug ? String(course.slug) : String(course.id);
                const link = `/course/${courseKey}`;

                return (
                  <Link key={String(course.id)} to={link} className="block">
                    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 max-w-[360px] mx-auto">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${FALLBACK_BG})` }}
                        aria-hidden="true"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
                      <div className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />

                      <div className="relative min-h-[360px] flex flex-col justify-between">
                        <CardHeader className="p-5 text-white">
                          <div className="flex items-start justify-between gap-3">
                            <Badge
                              className="w-fit bg-white/15 text-white border-white/20"
                              variant="secondary"
                            >
                              {getCategoryName(course)}
                            </Badge>

                            <div className="flex items-center gap-2 text-white/85 text-xs">
                              <BookOpen className="w-4 h-4" />
                              <span className="whitespace-nowrap">{lessonsCount} уроков</span>
                            </div>
                          </div>

                          <CardTitle className="mt-4 text-2xl leading-snug drop-shadow-sm">
                            {course.title}
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
                              {course.description || "—"}
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
