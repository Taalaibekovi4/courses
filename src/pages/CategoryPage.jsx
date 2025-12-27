import React from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Button } from "../components/ui/button.jsx";

export function CategoryPage() {
  const { slug } = useParams();
  const { categories, courses, teachers, getLessonsByCourse } = useData();

  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p>Категория не найдена</p>
      </div>
    );
  }

  const categoryCourses = courses.filter((c) => c.categoryId === category.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl mb-3">{category.name}</h1>
          <p className="text-xl text-white/90">{category.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {categoryCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">В этой категории пока нет курсов</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryCourses.map((course) => {
              const teacher = teachers.find((t) => t.id === course.teacherId);
              const lessonsCount = getLessonsByCourse(course.id).length;

              return (
                <Card key={course.id} className="hover:shadow-lg transition">
                  <CardHeader>
                    <Badge className="w-fit mb-2">{category.name}</Badge>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Преподаватель:</span>
                        <span className="font-medium">{teacher?.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Уроков:</span>
                        <span className="font-medium">{lessonsCount}</span>
                      </div>

                      <Link to={`/course/${course.slug}`}>
                        <Button className="w-full">Подробнее</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
