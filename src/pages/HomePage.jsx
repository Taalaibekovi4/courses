import React from "react";
import { Link } from "react-router-dom";
import { useData } from "../contexts/DataContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { BookOpen, Users, Award } from "lucide-react";

export function HomePage() {
  const { categories, courses } = useData();

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl mb-6">Добро пожаловать в EduPlatform</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Учитесь у лучших преподавателей. Выбирайте курсы и развивайтесь вместе с нами.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/courses">
              <Button size="lg" variant="secondary">Все курсы</Button>
            </Link>
            <Link to="/categories">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
              >
                Категории
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-blue-100 p-4 rounded-full">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <div className="text-3xl">{courses.length}</div>
                <div className="text-gray-600">Курсов</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-green-100 p-4 rounded-full">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <div className="text-3xl">1000+</div>
                <div className="text-gray-600">Студентов</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="bg-purple-100 p-4 rounded-full">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <div className="text-3xl">{categories.length}</div>
                <div className="text-gray-600">Категорий</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl mb-8">Категории курсов</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`}>
              <Card className="hover:shadow-lg transition cursor-pointer">
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 pb-20">
        <h2 className="text-3xl mb-8">Популярные курсы</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.slice(0, 3).map((course) => (
            <Link key={course.id} to={`/course/${course.slug}`}>
              <Card className="hover:shadow-lg transition cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">Подробнее</Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
