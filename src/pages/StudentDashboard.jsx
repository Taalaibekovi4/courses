import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PlayCircle, CheckCircle, Key } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Progress } from "../components/ui/progress.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.jsx";

export function StudentDashboard() {
  const { user } = useAuth();
  const {
    getUserTokens,
    getUserHomeworks,
    activateToken,
    getCourseWithDetails,
    getLessonsByCourse,
  } = useData();

  const [tokenInput, setTokenInput] = useState("");

  const userTokens = useMemo(() => (user ? getUserTokens(user.id) : []), [user, getUserTokens]);
  const userHomeworks = useMemo(() => (user ? getUserHomeworks(user.id) : []), [user, getUserHomeworks]);

  function handleActivateToken() {
    if (!user) return;

    const success = activateToken(user.id, tokenInput.trim());
    if (success) {
      toast.success("Токен успешно активирован!");
      setTokenInput("");
    } else {
      toast.error("Неверный токен или токен уже активирован");
    }
  }

  function homeworkStatusBadge(status) {
    if (status === "accepted") return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
    if (status === "rejected") return <Badge variant="destructive">На доработку</Badge>;
    if (status === "submitted") return <Badge variant="secondary">На проверке</Badge>;
    return <Badge variant="outline">—</Badge>;
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl mb-8">Мои курсы</h1>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Мои курсы</TabsTrigger>
          <TabsTrigger value="homework">Домашние задания</TabsTrigger>
          <TabsTrigger value="activate">Активировать токен</TabsTrigger>
        </TabsList>

        {/* My Courses */}
        <TabsContent value="courses" className="space-y-6">
          {userTokens.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 mb-4">У вас пока нет активных курсов</p>
                <Link to="/courses">
                  <Button>Посмотреть каталог</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            userTokens.map((token) => {
              const courseDetails = getCourseWithDetails(token.courseId);
              const lessons = getLessonsByCourse(token.courseId);
              if (!courseDetails) return null;

              const progress =
                token.videoLimit === -1
                  ? (token.videosUsed / Math.max(lessons.length, 1)) * 100
                  : (token.videosUsed / Math.max(token.videoLimit, 1)) * 100;

              return (
                <Card key={token.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <CardTitle>{courseDetails.title}</CardTitle>
                        <CardDescription>{courseDetails.teacher.name}</CardDescription>
                      </div>
                      <Badge>{courseDetails.category.name}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Прогресс</span>
                          <span>
                            {token.videosUsed} / {token.videoLimit === -1 ? lessons.length : token.videoLimit}
                          </span>
                        </div>
                        <Progress value={progress} />
                      </div>

                      <div className="space-y-2">
                        {lessons.slice(0, 5).map((lesson) => {
                          const isOpened = token.openedLessons.includes(lesson.id);
                          return (
                            <div key={lesson.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100">
                              {isOpened ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <PlayCircle className="w-5 h-5 text-gray-400" />
                              )}
                              <span className="flex-1">{lesson.title}</span>
                            </div>
                          );
                        })}
                      </div>

                      <Link to={`/student/course/${token.courseId}`}>
                        <Button className="w-full">Перейти к курсу</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Homework */}
        <TabsContent value="homework" className="space-y-4">
          {userHomeworks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">У вас пока нет домашних заданий</p>
              </CardContent>
            </Card>
          ) : (
            userHomeworks.map((hw) => {
              const courseDetails = getCourseWithDetails(hw.courseId);
              return (
                <Card key={hw.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <h4 className="font-semibold">{courseDetails?.title}</h4>
                        <p className="text-sm text-gray-600">Урок: {hw.lessonId}</p>
                      </div>
                      {homeworkStatusBadge(hw.status)}
                    </div>

                    {hw.content ? <p className="text-sm mb-2 whitespace-pre-wrap">{hw.content}</p> : null}

                    {hw.link ? (
                      <p className="text-sm mb-2">
                        Ссылка:{" "}
                        <a className="text-blue-600 hover:underline" href={hw.link} target="_blank" rel="noreferrer">
                          {hw.link}
                        </a>
                      </p>
                    ) : null}

                    {Array.isArray(hw.attachments) && hw.attachments.length > 0 ? (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium mb-2">Вложения:</p>
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                          {hw.attachments.map((f) => (
                            <li key={`${hw.id}_${f.name}_${f.size}`}>{f.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {hw.teacherComment ? (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <p className="text-sm font-medium mb-1">Комментарий преподавателя:</p>
                        <p className="text-sm whitespace-pre-wrap">{hw.teacherComment}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Activate Token */}
        <TabsContent value="activate">
          <Card>
            <CardHeader>
              <CardTitle>Активировать токен доступа</CardTitle>
              <CardDescription>Введите токен, полученный после покупки курса</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Введите токен (например: ABC123XYZ)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <Button onClick={handleActivateToken}>
                  <Key className="w-4 h-4 mr-2" />
                  Активировать
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">Токен можно получить в WhatsApp после покупки курса</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
