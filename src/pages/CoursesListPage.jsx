import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { useData } from "../contexts/DataContext.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";

export function CoursesListPage() {
  const { courses, categories, teachers, getLessonsByCourse } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl mb-4">Все курсы</h1>
          <p className="text-xl">Найдите подходящий курс</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const teacher = teachers.find((t) => t.id === course.teacherId);
            const category = categories.find((c) => c.id === course.categoryId);
            const lessonsCount = getLessonsByCourse(course.id).length;

            return (
              <Card key={course.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <Badge className="w-fit mb-2" variant="secondary">{category?.name}</Badge>
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

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Курсы не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
