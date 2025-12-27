import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../contexts/DataContext.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";

export function CategoriesPage() {
  const { categories, courses } = useData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl mb-4">Категории курсов</h1>
          <p className="text-xl">Выберите направление</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const categoryCourses = courses.filter((c) => c.categoryId === category.id);

            return (
              <Card key={category.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Курсов:</span>
                    <Badge variant="secondary">{categoryCourses.length}</Badge>
                  </div>

                  <Link to={`/category/${category.slug}`} className="text-blue-600 text-sm hover:underline">
                    Открыть категорию →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
