import React from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../contexts/DataContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlayCircle, CheckCircle } from "lucide-react";

const WHATSAPP_NUMBER = "996221000953"; // <-- поменяй на свой

export function CoursePage() {
  const { slug } = useParams();
  const { courses, getCourseWithDetails, getLessonsByCourse } = useData();

  const course = courses.find((c) => c.slug === slug);
  if (!course) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p>Курс не найден</p>
      </div>
    );
  }

  const courseDetails = getCourseWithDetails(course.id);
  const lessons = getLessonsByCourse(course.id);
  if (!courseDetails) return null;

  function generateWhatsAppLink(tariffId) {
    const tariff = courseDetails.tariffs.find((t) => t.id === tariffId);
    if (!tariff) return "#";

    const msg = `Хочу купить курс: ${courseDetails.title}
Преподаватель: ${courseDetails.teacher.name}
Тариф: ${tariff.name}
Цена: ${tariff.price} сом`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <Badge className="mb-4" variant="secondary">{courseDetails.category.name}</Badge>
          <h1 className="text-4xl mb-4">{courseDetails.title}</h1>
          <p className="text-xl mb-4">{courseDetails.description}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {courseDetails.teacher.name[0]}
              </div>
              <span>{courseDetails.teacher.name}</span>
            </div>
            <span>•</span>
            <span>{courseDetails.lessonsCount} уроков</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>О преподавателе</CardTitle></CardHeader>
              <CardContent><p>{courseDetails.teacher.bio}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Программа курса</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.title}</h4>
                        <p className="text-sm text-gray-600">{lesson.description}</p>
                        {lesson.homeworkDescription && (
                          <p className="text-xs text-blue-600 mt-1">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Домашнее задание
                          </p>
                        )}
                      </div>
                      <PlayCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader><CardTitle>Выберите тариф</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courseDetails.tariffs.map((tariff) => (
                    <div key={tariff.id} className="border rounded-lg p-4 hover:border-blue-600 transition">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{tariff.name}</h4>
                        <span className="text-2xl font-bold text-blue-600">
                          {tariff.price} сом
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {tariff.videoCount === -1 ? "Все видео курса" : `Доступ к ${tariff.videoCount} видео`}
                      </p>
                      <a href={generateWhatsAppLink(tariff.id)} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full">Купить через WhatsApp</Button>
                      </a>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    После покупки вы получите токен доступа, активируйте его в{" "}
                    <Link to="/dashboard" className="text-blue-600 hover:underline">
                      личном кабинете
                    </Link>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
