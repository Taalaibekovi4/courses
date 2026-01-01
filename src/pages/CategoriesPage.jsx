  import React, { useMemo } from "react";
  import { Link } from "react-router-dom";
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

  const HERO_BG =
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80";

  const str = (v) => String(v ?? "").trim();

  function getCourseCategoryId(course) {
    return course?.categoryId ?? course?.category ?? course?.category_id ?? null;
  }

  function getCategoryImg(category) {
    // Swagger: photo
    const img =
      category?.photo ||
      category?.imageUrl ||
      category?.coverUrl ||
      category?.image ||
      "";
    return img ? String(img) : FALLBACK_CAT_IMG;
  }

  export function CategoriesPage() {
    const data = useData?.() || {};

    const categories = Array.isArray(data.categories) ? data.categories : [];
    const courses = Array.isArray(data.courses) ? data.courses : [];

    const loading = Boolean(data?.loading?.public);
    const error = str(data?.error?.public);

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
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        {/* HERO full-width */}
        <section className="relative overflow-hidden text-white w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_BG})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="relative app-container py-12">
            <h1 className="text-4xl mb-3 drop-shadow-sm">Категории курсов</h1>
            <p className="text-xl text-white/90 max-w-2xl">Выберите направление</p>
          </div>
        </section>

        <div className="app-container py-12">
          {loading && (
            <div className="py-12 text-center text-gray-600">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto" />
              <div className="mt-3">Загрузка категорий...</div>
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const imgUrl = getCategoryImg(category);

                const categoryId = str(category?.id);
                const countFromMap = coursesByCategory.get(categoryId) || 0;
                const count = Number(category?.courses_count ?? countFromMap) || 0;

                return (
                  <Link
                    key={category?.id}
                    to={`/category/${category?.id}`}
                    className="block"
                  >
                    <Card className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl">
                      {/* PHOTO TOP (реальный img, НЕ background) */}
                      <div className="h-[160px] w-full bg-gray-100">
                        <img
                          src={imgUrl}
                          alt={category?.name || "Категория"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_CAT_IMG;
                          }}
                        />
                      </div>

                      {/* CONTENT BOTTOM */}
                      <CardHeader className="p-6 pb-3">
                        <CardTitle className="text-2xl">
                          {category?.name || "Категория"}
                        </CardTitle>
                        <CardDescription className="mt-2 text-gray-600 line-clamp-2">
                          {category?.description || "—"}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Курсов:</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-900">
                          <span className="underline decoration-gray-300 hover:decoration-gray-500">
                            Открыть категорию
                          </span>
                          <span>→</span>
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
