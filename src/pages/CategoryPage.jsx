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

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";

export function CategoryPage() {
  const { slug } = useParams();

  const data = useData?.() || {};
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];
  const getLessonsByCourse =
    typeof data.getLessonsByCourse === "function" ? data.getLessonsByCourse : () => [];

  const category = useMemo(
    () => categories.find((c) => String(c?.slug) === String(slug)) || null,
    [categories, slug]
  );

  const [selectedTeacherId, setSelectedTeacherId] = useState("all");

  const categoryCourses = useMemo(() => {
    if (!category) return [];
    return courses.filter((c) => c?.categoryId === category.id);
  }, [courses, category]);

  const categoryTeachers = useMemo(() => {
    const ids = Array.from(new Set(categoryCourses.map((c) => c?.teacherId).filter(Boolean)));
    return ids.map((id) => teachers.find((t) => t?.id === id)).filter(Boolean);
  }, [categoryCourses, teachers]);

  const filteredCourses = useMemo(() => {
    if (selectedTeacherId === "all") return categoryCourses;
    return categoryCourses.filter((c) => String(c?.teacherId) === String(selectedTeacherId));
  }, [categoryCourses, selectedTeacherId]);

  const getCatImg = (cat) => cat?.imageUrl || cat?.coverUrl || cat?.image || FALLBACK_CAT_IMG;
  const getTeacherImg = (t) => t?.avatarUrl || t?.photoUrl || t?.image || FALLBACK_TEACHER_IMG;

  if (!category) {
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

  const catBg = getCatImg(category);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ✅ HERO FULL-WIDTH (не в контейнере) */}
      <section className={`relative overflow-hidden text-white ${fullBleed}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${catBg})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/80 to-purple-700/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

        {/* ✅ контент hero — в app-container */}
        <div className="relative app-container py-12">
          <div className="max-w-3xl">
            <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
              Категория
            </Badge>

            <h1 className="text-4xl mt-3">{category.name}</h1>
            <p className="text-xl text-white/90 mt-2">{category.description}</p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <BookOpen className="w-4 h-4" />
                <span>Курсов: {categoryCourses.length}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <Users className="w-4 h-4" />
                <span>Преподавателей: {categoryTeachers.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* ✅ Teachers — в app-container */}
      <section className="app-container py-10">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-3xl">Преподаватели</h2>
            <p className="text-gray-600 mt-1">
              Выбирай преподавателя — ниже отфильтруются курсы этой категории
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectedTeacherId === "all" ? "default" : "outline"}
              onClick={() => setSelectedTeacherId("all")}
            >
              <Filter className="w-4 h-4 mr-2" />
              Все
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryTeachers.map((t) => {
            const tCoursesCount = categoryCourses.filter((c) => c?.teacherId === t.id).length;
            const bgUrl = getTeacherImg(t);
            const isActive = String(selectedTeacherId) === String(t.id);

            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setSelectedTeacherId((prev) => (String(prev) === String(t.id) ? "all" : t.id))
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
                    style={{ backgroundImage: `url(${bgUrl})` }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

                  <div className="relative h-[220px] flex flex-col justify-between">
                    <CardHeader className="p-5 text-white">
                      <CardTitle className="text-2xl drop-shadow-sm">{t.name}</CardTitle>
                      <CardDescription className="text-white/85 line-clamp-2 mt-2">
                        {t.bio || "Преподаватель этой категории"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-5 pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">Курсов:</span>
                        <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
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
      </section>

      {/* ✅ Courses — в app-container */}
      <section className="app-container pb-16">
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-3xl">Курсы</h2>
            <p className="text-gray-600 mt-1">
              {selectedTeacherId === "all" ? "Все курсы этой категории" : "Курсы выбранного преподавателя"}
            </p>
          </div>

          {selectedTeacherId !== "all" ? (
            <Button variant="outline" onClick={() => setSelectedTeacherId("all")}>
              Сбросить фильтр
            </Button>
          ) : null}
        </div>

        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">В этой категории пока нет курсов по выбранному фильтру</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const teacher = teachers.find((tt) => tt?.id === course?.teacherId) || null;
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

                    <div className="relative h-[320px] flex flex-col justify-between">
                      <CardHeader className="p-5 text-white">
                        <div className="flex items-start justify-between gap-3">
                          <Badge className="w-fit bg-white/15 text-white border-white/20" variant="secondary">
                            {category.name}
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
    </div>
  );
}

export default CategoryPage;
