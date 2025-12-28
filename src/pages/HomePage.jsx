import React, { useMemo } from "react";
import { Link } from "react-router-dom";
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

const getTeacherImg = (teacher) => {
  const img = teacher?.avatarUrl || teacher?.photoUrl || teacher?.image || "";
  return img ? String(img) : FALLBACK_TEACHER_BG;
};

const getCategoryImg = (category) => {
  const img = category?.imageUrl || category?.coverUrl || category?.image || "";
  return img ? String(img) : FALLBACK_CAT_BG;
};

const HomePage = () => {
  const data = useData?.() || {};
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];

  const teacherById = useMemo(() => {
    const m = new Map();
    for (const t of teachers) m.set(t?.id, t);
    return m;
  }, [teachers]);

  const popularCourse = useMemo(() => courses?.[0] || null, [courses]);

  const heroTeacher = useMemo(() => {
    const firstCourse = courses?.[0];
    const t = firstCourse?.teacherId ? teacherById.get(firstCourse.teacherId) : null;
    return t || teachers?.[0] || null;
  }, [courses, teachers, teacherById]);

  const heroBg = heroTeacher ? getTeacherImg(heroTeacher) : FALLBACK_HERO_BG;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* HERO: фон 100% ширины экрана, контент по .app-container */}
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

        {/* Контент HERO ровно по контейнеру */}
        <div className="relative app-container pt-12 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
          <div className="max-w-3xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm">
              <BadgeCheck className="w-4 h-4" />
              <span>Онлайн-платформа курсов с проверкой ДЗ</span>
            </div>

            <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
              Начните учиться сегодня — результат увидите уже через неделю
            </h1>

            <p className="mt-4 text-white/85 text-base sm:text-lg max-w-2xl">
              Выбирайте курсы, смотрите уроки, сдавайте домашние задания и получайте обратную связь от преподавателя.
            </p>

            <div className="mt-7">
              <Link to="/courses" className="inline-block w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-gray-900 hover:bg-white/90">
                  Выбрать курс
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* ✅ ВСЁ НИЖЕ HERO — В КОНТЕЙНЕРЕ */}
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
                    <li>Пишете в WhatsApp</li>
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
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="block h-full">
                <Card className="h-full min-h-[150px] hover:shadow-lg transition cursor-pointer">
                  <div
                    className="h-[120px] w-full bg-cover bg-center rounded-t-xl"
                    style={{ backgroundImage: `url(${getCategoryImg(category)})` }}
                    aria-hidden="true"
                  />
                  <div className="p-6 flex flex-col h-full">
                    <div
                      className="text-xl font-semibold leading-snug overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={category.name}
                    >
                      {category.name}
                    </div>

                    <div
                      className="mt-2 text-gray-600 overflow-hidden"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={category.description}
                    >
                      {category.description}
                    </div>

                    <div className="mt-auto" />
                  </div>
                </Card>
              </Link>
            ))}
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
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    Программа адаптирована для новичков
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    Доступ по токену
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    Видео не “уходят” на YouTube ссылкой
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <Users className="w-5 h-5 text-green-600" />
                    Проверка ДЗ
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    Принято / На доработку — всё прозрачно
                  </div>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm sm:text-base">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                    Короткие уроки
                  </div>
                  <div className="mt-2 text-xs sm:text-sm text-gray-600">
                    Смотрите по 10–20 минут, без перегруза
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="py-12 pb-20">
          <h2 className="text-3xl mb-8">Популярные курсы</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course) => {
              const teacher = course?.teacherId ? teacherById.get(course.teacherId) : null;
              return (
                <Link key={course.id} to={`/course/${course.slug}`} className="block h-full">
                  <Card className="hover:shadow-lg transition cursor-pointer h-full flex flex-col">
                    <div
                      className="h-[140px] w-full bg-cover bg-center rounded-t-xl"
                      style={{ backgroundImage: `url(${getTeacherImg(teacher)})` }}
                      aria-hidden="true"
                    />
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
