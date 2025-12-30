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

export function CategoriesPage() {
  const data = useData?.() || {};

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];

  const loading = Boolean(data?.loading?.public);
  const error = str(data?.error?.public);

  const coursesByCategory = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      const catId = c?.categoryId ?? c?.category; // поддержка и старого, и swagger
      const key = str(catId);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [courses]);

  const getCatImg = (category) => {
    const img = category?.imageUrl || category?.coverUrl || category?.image || "";
    return img ? String(img) : FALLBACK_CAT_IMG;
  };

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

        <div
          className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-3xl rounded-full"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-28 -left-28 w-[28rem] h-[28rem] bg-purple-400/15 blur-3xl rounded-full"
          aria-hidden="true"
        />

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
              const bgUrl = getCatImg(category);

              // Swagger: category.id (slug нет)
              const categoryId = str(category?.id);
              const countFromMap = coursesByCategory.get(categoryId) || 0;

              // Swagger может давать courses_count
              const count = Number(category?.courses_count ?? countFromMap);

              return (
                <Link key={category.id} to={`/category/${category.id}`} className="block">
                  <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${bgUrl})` }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600/12 to-purple-600/12" />

                    <div className="relative h-[220px] flex flex-col justify-between">
                      <CardHeader className="p-5 text-white">
                        <CardTitle className="text-2xl drop-shadow-sm">
                          {category?.name || "Категория"}
                        </CardTitle>
                        <CardDescription className="text-white/85 line-clamp-2 mt-2">
                          {category?.description || "—"}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-5 pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/80">Курсов:</span>
                          <Badge
                            className="bg-white/15 text-white border-white/20"
                            variant="secondary"
                          >
                            {count}
                          </Badge>
                        </div>

                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/90">
                          <span className="underline decoration-white/40 group-hover:decoration-white">
                            Открыть категорию
                          </span>
                          <span className="transition-transform duration-300 group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </CardContent>
                    </div>
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
