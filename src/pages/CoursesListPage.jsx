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

const FALLBACK_TEACHER_IMG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80";

const HERO_BG =
  "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1800&q=80";

export function CoursesListPage() {
  const data = useData?.() || {};
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];
  const getLessonsByCourse =
    typeof data.getLessonsByCourse === "function" ? data.getLessonsByCourse : () => [];

  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const t = String(c?.title || "").toLowerCase();
      const d = String(c?.description || "").toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [courses, searchQuery]);

  const getTeacherImg = (teacher) => {
    const img = teacher?.avatarUrl || teacher?.photoUrl || teacher?.image || "";
    return img ? String(img) : FALLBACK_TEACHER_IMG;
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ✅ HERO 100% ширины (вне контейнера) */}
      <section className="relative text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full" aria-hidden="true" />
        <div className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] bg-blue-400/15 blur-3xl rounded-full" aria-hidden="true" />

        {/* ✅ Текст в контейнере */}
        <div className="relative app-container py-12">
          <h1 className="text-4xl mb-3 drop-shadow-sm">Все курсы</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Найдите подходящий курс и прокачайте навыки
          </p>
        </div>
      </section>

      {/* ✅ ниже — контейнер */}
      <div className="app-container py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Поиск курсов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const teacher = teachers.find((t) => t.id === course.teacherId);
            const category = categories.find((c) => c.id === course.categoryId);
            const lessonsCount = (getLessonsByCourse(course.id) || []).length;

            const bgUrl = getTeacherImg(teacher);

            return (
              <Link key={course.id} to={`/course/${course.slug}`} className="block">
                <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 max-w-[360px] mx-auto">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${bgUrl})` }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
                  <div className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />

                  <div className="relative min-h-[360px] flex flex-col justify-between">
                    <CardHeader className="p-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <Badge className="w-fit bg-white/15 text-white border-white/20" variant="secondary">
                          {category?.name || "Категория"}
                        </Badge>

                        <div className="flex items-center gap-2 text-white/85 text-xs">
                          <BookOpen className="w-4 h-4" />
                          <span className="whitespace-nowrap">{lessonsCount} урока</span>
                        </div>
                      </div>

                      <CardTitle className="mt-4 text-2xl leading-snug drop-shadow-sm">
                        {course.title}
                      </CardTitle>

                      <div className="mt-3 text-sm text-white/85">
                        <span className="text-white/70">Преподаватель: </span>
                        <span className="font-semibold">{teacher?.name || "—"}</span>
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
                          {course.description}
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
      </div>
    </div>
  );
}
