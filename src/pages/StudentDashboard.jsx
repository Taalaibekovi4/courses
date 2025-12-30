import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Key, Archive, RotateCcw, PlayCircle, CheckCircle, XCircle, Clock } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Progress } from "../components/ui/progress.jsx";

const TAB_VALUES = new Set(["courses", "homework", "activate", "archive"]);
const LS_HW_ARCHIVE = "student_hw_archive_v1";

const norm = (s) => String(s ?? "").trim();

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function getArchivedSet(userId) {
  const raw = localStorage.getItem(LS_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(userId || "0");
  const arr = Array.isArray(obj[key]) ? obj[key] : [];
  return new Set(arr.map(String));
}

function setArchivedSet(userId, set) {
  const raw = localStorage.getItem(LS_HW_ARCHIVE) || "{}";
  const obj = safeJsonParse(raw, {});
  const key = String(userId || "0");
  obj[key] = Array.from(set);
  localStorage.setItem(LS_HW_ARCHIVE, JSON.stringify(obj));
}

function getHwIdsKey(hw) {
  return String(hw?.id ?? hw?.pk ?? "");
}

function getHwCourseId(hw) {
  return String(
    hw?.course ??
      hw?.course_id ??
      hw?.courseId ??
      hw?.lesson_course ??
      hw?.lesson?.course ??
      hw?.lesson?.course_id ??
      ""
  );
}

function getHwLessonId(hw) {
  return String(hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? hw?.lesson?.pk ?? "");
}

function getHwTitle(hw) {
  return (
    hw?.lesson_title ||
    hw?.lessonTitle ||
    hw?.lesson?.title ||
    hw?.lesson?.name ||
    (getHwLessonId(hw) ? `Урок #${getHwLessonId(hw)}` : "Урок")
  );
}

function getHwStatus(hw) {
  return String(hw?.status ?? "").toLowerCase();
}

function getHwTeacherComment(hw) {
  return hw?.teacher_comment ?? hw?.teacherComment ?? hw?.comment ?? "";
}

function getHwDate(hw) {
  return (
    hw?.submitted_at ||
    hw?.submittedAt ||
    hw?.created_at ||
    hw?.createdAt ||
    hw?.updated_at ||
    hw?.updatedAt ||
    ""
  );
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
  const data = useData();

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

  const onTabChange = useCallback(
    (nextTab) => {
      const t = TAB_VALUES.has(nextTab) ? nextTab : "courses";
      setActiveTab(t);
      navigate(`/dashboard?tab=${encodeURIComponent(t)}`, { replace: true });
    },
    [navigate]
  );

  useEffect(() => {
    if (!user) return;
    data.loadMyCourses?.();
    data.loadMyHomeworks?.();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // local archive for homeworks
  const [archivedIds, setArchivedIds] = useState(() => new Set());
  useEffect(() => {
    if (!user?.id) return;
    setArchivedIds(getArchivedSet(user.id));
  }, [user?.id]);

  const allHomeworks = useMemo(() => (Array.isArray(data.myHomeworks) ? data.myHomeworks : []), [data.myHomeworks]);

  const homeworksActive = useMemo(() => {
    const set = archivedIds;
    return allHomeworks.filter((hw) => !set.has(getHwIdsKey(hw)));
  }, [allHomeworks, archivedIds]);

  const homeworksArchived = useMemo(() => {
    const set = archivedIds;
    return allHomeworks.filter((hw) => set.has(getHwIdsKey(hw)));
  }, [allHomeworks, archivedIds]);

  const myCourses = useMemo(() => (Array.isArray(data.myCourses) ? data.myCourses : []), [data.myCourses]);

  const courseProgress = useCallback(
    (courseId) => {
      const cid = String(courseId || "");
      const lessons = (data.lessonsByCourse || {})[cid];
      const totalLessons = Array.isArray(lessons) ? lessons.length : 0;

      const acceptedCount = allHomeworks.filter((hw) => getHwCourseId(hw) === cid && getHwStatus(hw) === "accepted")
        .length;

      // если уроки ещё не подгружены — прогресс по ДЗ всё равно покажем, но процент от max(accepted,1)
      const denom = Math.max(totalLessons, acceptedCount, 1);
      const pct = Math.min(100, Math.round((acceptedCount / denom) * 100));

      return { totalLessons, acceptedCount, pct };
    },
    [data.lessonsByCourse, allHomeworks]
  );

  const ensureLessonsLoaded = useCallback(
    (courseId) => {
      const cid = String(courseId || "");
      const current = (data.lessonsByCourse || {})[cid];
      if (Array.isArray(current)) return;
      data.loadLessonsPublicByCourse?.(cid);
    },
    [data]
  );

  async function handleActivateToken() {
    const token = norm(tokenInput);
    if (!token) {
      toast.error("Введите токен");
      return;
    }

    const res = await data.activateToken?.(token);
    if (res?.ok) {
      toast.success("Токен успешно активирован!");
      setTokenInput("");
      onTabChange("courses");
    } else {
      toast.error(res?.error || "Неверный токен или токен уже активирован");
    }
  }

  function archiveHw(hwId) {
    if (!user?.id) return;
    const next = new Set(archivedIds);
    next.add(String(hwId));
    setArchivedSet(user.id, next);
    setArchivedIds(next);
  }

  function unarchiveHw(hwId) {
    if (!user?.id) return;
    const next = new Set(archivedIds);
    next.delete(String(hwId));
    setArchivedSet(user.id, next);
    setArchivedIds(next);
  }

  const buildLessonLink = (courseId, lessonId) => `/student/course/${courseId}?lesson=${encodeURIComponent(lessonId)}`;

  if (!user) return null;

  return (
    <div className="py-8">
      <h1 className="text-3xl mb-4">Личный кабинет</h1>

      <DashNav activeTab={activeTab} />

      {/* ====== COURSES ====== */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {data.loading?.myCourses ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-600">Загрузка курсов...</CardContent>
            </Card>
          ) : myCourses.length === 0 ? (
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
              {myCourses.map((course) => {
                const cid = course?.id ?? course?.pk ?? course?.course_id ?? course?.courseId;
                const key = String(cid ?? course?.title ?? Math.random());
                const title = course?.title || course?.name || "Курс";
                const teacherName =
                  course?.teacher_name ||
                  course?.teacher?.name ||
                  course?.teacher?.username ||
                  course?.teacher_username ||
                  "Преподаватель";
                const categoryName = course?.category_name || course?.category?.name || "Категория";

                // подгружаем уроки (для корректного totalLessons)
                ensureLessonsLoaded(cid);

                const { totalLessons, acceptedCount, pct } = courseProgress(cid);

                return (
                  <Card key={key} className="h-full">
                    <CardHeader>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="truncate">{title}</CardTitle>
                          <CardDescription className="truncate">{teacherName}</CardDescription>
                        </div>
                        <Badge className="self-start sm:self-auto shrink-0">{categoryName}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        <div className="mb-7">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Прогресс</span>
                            <span className="whitespace-nowrap">
                              Принято ДЗ: {acceptedCount}
                              {totalLessons ? ` / ${totalLessons}` : ""}
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>

                        <Link to={`/student/course/${cid}`}>
                          <Button className="w-full">Перейти к курсу</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== HOMEWORK ====== */}
      {activeTab === "homework" && (
        <div className="space-y-4">
          {data.loading?.myHomeworks ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-600">Загрузка домашних заданий...</CardContent>
            </Card>
          ) : homeworksActive.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">У вас пока нет домашних заданий</p>
              </CardContent>
            </Card>
          ) : (
            homeworksActive
              .slice()
              .sort((a, b) => new Date(getHwDate(b) || 0) - new Date(getHwDate(a) || 0))
              .map((hw) => {
                const id = getHwIdsKey(hw) || `${getHwCourseId(hw)}_${getHwLessonId(hw)}`;
                const courseId = getHwCourseId(hw);
                const lessonId = getHwLessonId(hw);
                const openUrl = buildLessonLink(courseId, lessonId);

                const status = getHwStatus(hw);
                const comment = getHwTeacherComment(hw);
                const lessonTitle = getHwTitle(hw);

                return (
                  <Card key={id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="min-w-0 flex items-start gap-3">
                          {homeworkIcon(status)}
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{hw?.course_title || hw?.courseTitle || "Курс"}</h4>
                            <p className="text-sm text-gray-600 truncate">{lessonTitle}</p>
                          </div>
                        </div>
                        {homeworkStatusBadge(status)}
                      </div>

                      {comment ? (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium mb-1">Комментарий преподавателя:</p>
                          <p className="text-sm whitespace-pre-wrap">{comment}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link to={openUrl}>
                          <Button variant="outline">Открыть</Button>
                        </Link>

                        {status === "accepted" ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              archiveHw(id);
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
        </div>
      )}

      {/* ====== ACTIVATE TOKEN ====== */}
      {activeTab === "activate" && (
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
              <Button onClick={handleActivateToken} className="sm:w-auto w-full" disabled={!!data.loading?.activateToken}>
                <Key className="w-4 h-4 mr-2" />
                {data.loading?.activateToken ? "Активация..." : "Активировать"}
              </Button>
            </div>
            {data.error?.activateToken ? (
              <p className="text-sm text-red-600 mt-3">{data.error.activateToken}</p>
            ) : (
              <p className="text-sm text-gray-600 mt-4">Токен можно получить в WhatsApp после покупки курса</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====== ARCHIVE ====== */}
      {activeTab === "archive" && (
        <div className="space-y-4">
          {homeworksArchived.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-600">Архив пуст</p>
              </CardContent>
            </Card>
          ) : (
            homeworksArchived
              .slice()
              .sort((a, b) => new Date(getHwDate(b) || 0) - new Date(getHwDate(a) || 0))
              .map((hw) => {
                const id = getHwIdsKey(hw) || `${getHwCourseId(hw)}_${getHwLessonId(hw)}`;
                const courseId = getHwCourseId(hw);
                const lessonId = getHwLessonId(hw);
                const openUrl = buildLessonLink(courseId, lessonId);

                const status = getHwStatus(hw);
                const lessonTitle = getHwTitle(hw);

                return (
                  <Card key={id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="min-w-0 flex items-start gap-3">
                          {homeworkIcon(status)}
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">{hw?.course_title || hw?.courseTitle || "Курс"}</h4>
                            <p className="text-sm text-gray-600 truncate">{lessonTitle}</p>
                          </div>
                        </div>
                        {homeworkStatusBadge(status)}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link to={openUrl}>
                          <Button variant="outline">Открыть</Button>
                        </Link>

                        <Button
                          variant="outline"
                          onClick={() => {
                            unarchiveHw(id);
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
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
