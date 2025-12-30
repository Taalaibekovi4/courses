import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Users, Filter } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";

const FALLBACK_CAT_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TEACHER_IMG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_COURSE_BG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";
const str = (v) => String(v ?? "").trim();

function getCourseCategoryId(course) {
  return course?.categoryId ?? course?.category ?? null;
}

function getCourseTeacher(course) {
  // Swagger: instructor (id) + instructor_name
  // Старое: teacherId + teacherName
  const id = course?.teacherId ?? course?.instructor ?? null;
  const name = course?.teacherName ?? course?.instructor_name ?? course?.instructorName ?? "—";
  return { id: str(id), name: str(name) || "—" };
}

function getLessonsCount(course) {
  const v =
    course?.lessonsCount ??
    course?.lessons_count ??
    course?.lessonsCount ??
    0;
  return Number(v) || 0;
}

export function CategoryPage() {
  const { id } = useParams();
  const categoryId = str(id); // slug теперь = id

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

  const teachers = useMemo(() => {
    const map = new Map();
    for (const c of categoryCourses) {
      const t = getCourseTeacher(c);
      if (!t.id && !t.name) continue;
      const key = t.id || t.name; // если id нет, спасаемся именем
      if (!map.has(key)) {
        map.set(key, {
          id: t.id || key,
          name: t.name || "—",
          image: FALLBACK_TEACHER_IMG,
          bio: "",
        });
      }
    }
    return Array.from(map.values());
  }, [categoryCourses]);

  const [selectedTeacherKey, setSelectedTeacherKey] = useState("all");

  const filteredCourses = useMemo(() => {
    if (selectedTeacherKey === "all") return categoryCourses;
    return categoryCourses.filter((c) => {
      const t = getCourseTeacher(c);
      const key = t.id || t.name;
      return str(key) === str(selectedTeacherKey);
    });
  }, [categoryCourses, selectedTeacherKey]);

  const catBg = category?.imageUrl || category?.coverUrl || category?.image || FALLBACK_CAT_IMG;

  if (!loading && !error && !category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="app-container py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Категория не найдена</p>
              <div className="mt-4">
                <Link to="/categories">
                  <Button variant="outline">Назад к категориям</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* HERO FULL-WIDTH */}
      <section className={`relative overflow-hidden text-white ${fullBleed}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${catBg})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/80 to-purple-700/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

        <div className="relative app-container py-12">
          <div className="max-w-3xl">
            <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
              Категория
            </Badge>

            <h1 className="text-4xl mt-3">{category?.name || "—"}</h1>
            <p className="text-xl text-white/90 mt-2">{category?.description || "—"}</p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <BookOpen className="w-4 h-4" />
                <span>Курсов: {categoryCourses.length}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <Users className="w-4 h-4" />
                <span>Преподавателей: {teachers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <div className="app-container py-12">
        {loading && (
          <div className="py-12 text-center text-gray-600">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto" />
            <div className="mt-3">Загрузка...</div>
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
            {/* Teachers */}
            <section className="py-2">
              <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-3xl">Преподаватели</h2>
                  <p className="text-gray-600 mt-1">
                    Выбирай преподавателя — ниже отфильтруются курсы этой категории
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={selectedTeacherKey === "all" ? "default" : "outline"}
                    onClick={() => setSelectedTeacherKey("all")}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Все
                  </Button>
                </div>
              </div>

              {teachers.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-gray-600">
                    Преподаватели пока не отображаются (нужны курсы в категории).
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((t) => {
                    const tKey = str(t.id) || str(t.name);
                    const isActive = str(selectedTeacherKey) === tKey;

                    const tCoursesCount = categoryCourses.filter((c) => {
                      const ct = getCourseTeacher(c);
                      const key = ct.id || ct.name;
                      return str(key) === tKey;
                    }).length;

                    return (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() =>
                          setSelectedTeacherKey((prev) =>
                            str(prev) === tKey ? "all" : tKey
                          )
                        }
                        className="text-left"
                      >
                        <Card
                          className={[
                            "group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300",
                            isActive ? "ring-2 ring-blue-600" : "",
                          ].join(" ")}
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${t.image || FALLBACK_TEACHER_IMG})` }}
                            aria-hidden="true"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

                          <div className="relative h-[220px] flex flex-col justify-between">
                            <CardHeader className="p-5 text-white">
                              <CardTitle className="text-2xl drop-shadow-sm">
                                {t.name || "—"}
                              </CardTitle>
                              <CardDescription className="text-white/85 line-clamp-2 mt-2">
                                {t.bio || "Преподаватель этой категории"}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-white/80">Курсов:</span>
                                <Badge
                                  className="bg-white/15 text-white border-white/20"
                                  variant="secondary"
                                >
                                  {tCoursesCount}
                                </Badge>
                              </div>

                              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/90">
                                <span className="underline decoration-white/40 group-hover:decoration-white">
                                  {isActive ? "Показаны его курсы" : "Показать его курсы"}
                                </span>
                                <span className="transition-transform duration-300 group-hover:translate-x-1">
                                  →
                                </span>
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
            <section className="pt-10 pb-4">
              <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-3xl">Курсы</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedTeacherKey === "all"
                      ? "Все курсы этой категории"
                      : "Курсы выбранного преподавателя"}
                  </p>
                </div>

                {selectedTeacherKey !== "all" ? (
                  <Button variant="outline" onClick={() => setSelectedTeacherKey("all")}>
                    Сбросить фильтр
                  </Button>
                ) : null}
              </div>

              {filteredCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-600">
                      В этой категории пока нет курсов по выбранному фильтру
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCourses.map((course) => {
                    const t = getCourseTeacher(course);
                    const lessonsCount = getLessonsCount(course);

                    return (
                      <Link key={course.id} to={`/course/${course.id}`} className="block">
                        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 max-w-[360px] mx-auto">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${FALLBACK_COURSE_BG})` }}
                            aria-hidden="true"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

                          <div className="relative h-[320px] flex flex-col justify-between">
                            <CardHeader className="p-5 text-white">
                              <div className="flex items-start justify-between gap-3">
                                <Badge
                                  className="w-fit bg-white/15 text-white border-white/20"
                                  variant="secondary"
                                >
                                  {category?.name || "Категория"}
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
                                <span className="font-semibold">{t.name || "—"}</span>
                              </div>
                            </CardHeader>

                            <CardContent className="p-5 pt-0">
                              <div className="rounded-xl border border-white/15 bg-black/25 backdrop-blur-md p-4">
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
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;
