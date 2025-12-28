import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PlayCircle, CheckCircle, Key, XCircle, Clock, Archive, RotateCcw } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Progress } from "../components/ui/progress.jsx";
import { Tabs, TabsContent } from "../components/ui/tabs.jsx";

const TAB_VALUES = new Set(["courses", "homework", "activate", "archive"]);

function DashNav({ activeTab }) {
  const items = [
    { to: "/dashboard?tab=courses", label: "Мои курсы", tab: "courses" },
    { to: "/dashboard?tab=homework", label: "Домашние задания", tab: "homework" },
    { to: "/dashboard?tab=activate", label: "Активировать токен", tab: "activate" },
    { to: "/dashboard?tab=archive", label: "Архив", tab: "archive" },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const isActive = activeTab === it.tab;
          return (
            <Link key={it.tab} to={it.to} className="block">
              <span
                className={[
                  "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm",
                  "transition select-none",
                  "hover:bg-gray-100",
                  isActive ? "bg-white border-blue-600 text-blue-700" : "bg-white border-gray-200 text-gray-800",
                ].join(" ")}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ✅ заголовок снизу (как ты просил) */}
      <div className="mt-3 text-sm text-gray-600">
        {activeTab === "courses" && "Раздел: Мои курсы"}
        {activeTab === "homework" && "Раздел: Домашние задания"}
        {activeTab === "activate" && "Раздел: Активировать токен"}
        {activeTab === "archive" && "Раздел: Архив"}
      </div>
    </div>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    getUserTokens,
    getUserHomeworks,
    activateToken,
    getCourseWithDetails,
    getLessonsByCourse,
    archiveStudentHomework,
    unarchiveStudentHomework,
  } = useData();

  const [tokenInput, setTokenInput] = useState("");

  const tabFromQuery = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get("tab") || "courses";
    return TAB_VALUES.has(t) ? t : "courses";
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(tabFromQuery);

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  const userTokens = useMemo(() => (user ? getUserTokens(user.id) : []), [user, getUserTokens]);
  const allHomeworks = useMemo(() => (user ? getUserHomeworks(user.id) : []), [user, getUserHomeworks]);

  const homeworksActive = useMemo(() => allHomeworks.filter((hw) => !hw.isStudentArchived), [allHomeworks]);
  const homeworksArchived = useMemo(() => allHomeworks.filter((hw) => hw.isStudentArchived), [allHomeworks]);

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

  function homeworkIcon(status) {
    if (status === "accepted") return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === "rejected") return <XCircle className="w-5 h-5 text-red-600" />;
    if (status === "submitted") return <Clock className="w-5 h-5 text-orange-600" />;
    return <PlayCircle className="w-5 h-5 text-gray-400" />;
  }

  const buildLessonLink = (courseId, lessonId) =>
    `/student/course/${courseId}?lesson=${encodeURIComponent(lessonId)}`;

  function onTabChange(nextTab) {
    setActiveTab(nextTab);
    navigate(`/dashboard?tab=${encodeURIComponent(nextTab)}`, { replace: true });
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl mb-4">Мои курсы</h1>

      {/* ✅ одинаковая навигация */}
      <DashNav activeTab={activeTab} />

      {/* Tabs оставляем только как контейнер контента */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        {/* ✅ Мои курсы: адаптив 320px + 2 в ряд на md */}
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
            <div className="grid gap-6 md:grid-cols-2">
              {userTokens.map((token) => {
                const courseDetails = getCourseWithDetails(token.courseId);
                const lessons = getLessonsByCourse(token.courseId);
                if (!courseDetails) return null;

                const progress =
                  token.videoLimit === -1
                    ? (token.videosUsed / Math.max(lessons.length, 1)) * 100
                    : (token.videosUsed / Math.max(token.videoLimit, 1)) * 100;

                return (
                  <Card key={token.id} className="h-full">
                    <CardHeader>
                      {/* ✅ mobile-friendly layout */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="truncate">{courseDetails.title}</CardTitle>
                          <CardDescription className="truncate">{courseDetails.teacher.name}</CardDescription>
                        </div>
                        <Badge className="self-start sm:self-auto shrink-0">{courseDetails.category.name}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* ✅ отступ снизу до кнопки */}
                        <div className="mb-7">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Прогресс</span>
                            <span className="whitespace-nowrap">
                              {token.videosUsed} / {token.videoLimit === -1 ? lessons.length : token.videoLimit}
                            </span>
                          </div>
                          <Progress value={progress} />
                        </div>

                        <Link to={`/student/course/${token.courseId}`}>
                          <Button className="w-full">Перейти к курсу</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ✅ Домашние задания */}
        <TabsContent value="homework" className="space-y-4">
          {homeworksActive.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">У вас пока нет домашних заданий</p>
              </CardContent>
            </Card>
          ) : (
            homeworksActive
              .slice()
              .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
              .map((hw) => {
                const courseDetails = getCourseWithDetails(hw.courseId);
                const openUrl = buildLessonLink(hw.courseId, hw.lessonId);
                const isAccepted = hw.status === "accepted";

                return (
                  <Card key={hw.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="min-w-0 flex items-start gap-3">
                          {homeworkIcon(hw.status)}
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{courseDetails?.title || "Курс"}</h4>
                            <p className="text-sm text-gray-600 truncate">Урок: {hw.lessonId}</p>
                          </div>
                        </div>
                        {homeworkStatusBadge(hw.status)}
                      </div>

                      {hw.teacherComment ? (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium mb-1">Комментарий преподавателя:</p>
                          <p className="text-sm whitespace-pre-wrap">{hw.teacherComment}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link to={openUrl}>
                          <Button variant="outline">Открыть</Button>
                        </Link>

                        {isAccepted ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              archiveStudentHomework(hw.id);
                              toast.success("Перемещено в архив");
                            }}
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            В архив
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </TabsContent>

        {/* ✅ Активировать токен (адаптив 320px) */}
        <TabsContent value="activate">
          <Card>
            <CardHeader>
              <CardTitle>Активировать токен доступа</CardTitle>
              <CardDescription>Введите токен, полученный после покупки курса</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Введите токен (например: ABC123XYZ)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <Button onClick={handleActivateToken} className="sm:w-auto w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Активировать
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">Токен можно получить в WhatsApp после покупки курса</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ Архив */}
        <TabsContent value="archive" className="space-y-4">
          {homeworksArchived.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">Архив пуст</p>
              </CardContent>
            </Card>
          ) : (
            homeworksArchived
              .slice()
              .sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0))
              .map((hw) => {
                const courseDetails = getCourseWithDetails(hw.courseId);
                const openUrl = buildLessonLink(hw.courseId, hw.lessonId);

                return (
                  <Card key={hw.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="min-w-0 flex items-start gap-3">
                          {homeworkIcon(hw.status)}
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{courseDetails?.title || "Курс"}</h4>
                            <p className="text-sm text-gray-600 truncate">Урок: {hw.lessonId}</p>
                          </div>
                        </div>
                        {homeworkStatusBadge(hw.status)}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link to={openUrl}>
                          <Button variant="outline">Открыть</Button>
                        </Link>

                        <Button
                          variant="outline"
                          onClick={() => {
                            unarchiveStudentHomework(hw.id);
                            toast.success("Возвращено из архива");
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Разархивировать
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
