// src/pages/StudentDashboard.jsx
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

/* abs url like in CoursePage */
const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";
const API_ORIGIN = norm(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = norm(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) {
    if (API_ORIGIN) return `${API_ORIGIN}${u}`;
    return u;
  }
  if (API_ORIGIN) return `${API_ORIGIN}/${u}`;
  return u;
}

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
  return String(hw?.course_id ?? hw?.courseId ?? hw?.course ?? "");
}
function getHwLessonId(hw) {
  return String(hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? hw?.lesson?.pk ?? "");
}
function getHwTitle(hw) {
  return hw?.lesson_title || (getHwLessonId(hw) ? `Урок #${getHwLessonId(hw)}` : "Урок");
}
function getHwStatus(hw) {
  return String(hw?.status ?? "").toLowerCase(); // accepted | rework | declined | examination
}
function getHwTeacherComment(hw) {
  return hw?.comment ?? "";
}
function getHwDate(hw) {
  return hw?.updated_at || hw?.created_at || "";
}

function homeworkStatusBadge(status) {
  if (status === "accepted") return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (status === "examination") return <Badge variant="secondary">На проверке</Badge>;
  if (status === "rework") return <Badge variant="secondary">На доработку</Badge>;
  if (status === "declined") return <Badge variant="destructive">Отклонено</Badge>;
  if (status) return <Badge variant="outline">Отправлено</Badge>;
  return <Badge variant="outline">—</Badge>;
}

function homeworkIcon(status) {
  if (status === "accepted") return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (status === "examination") return <Clock className="w-5 h-5 text-blue-500" />;
  if (status === "rework") return <Clock className="w-5 h-5 text-orange-600" />;
  if (status === "declined") return <XCircle className="w-5 h-5 text-red-600" />;
  return <PlayCircle className="w-5 h-5 text-gray-400" />;
}

/* ✅ attachments view (dashboard) */
function AttachmentsViewStudentDash({ attachments }) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <div className="mt-3 space-y-1">
      <div className="text-xs text-gray-600">Файлы:</div>
      {list.map((a, idx) => {
        const url = a?.url || a?.file || a?.link || "";
        const name = a?.name || a?.filename || "Файл";
        const key = `${a?.type || "x"}_${idx}`;
        return url ? (
          <a
            key={key}
            href={toAbsUrl(url)}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline break-all text-sm"
          >
            📎 {name}
          </a>
        ) : (
          <div key={key} className="text-sm text-gray-700">
            📎 {name}
          </div>
        );
      })}
    </div>
  );
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

function getCourseId(course) {
  return String(course?.id ?? course?.course_id ?? "").trim();
}
function getTeacherName(course) {
  return (
    course?.teacher_name ||
    course?.instructor_name ||
    course?.access?.teacher_name ||
    course?.access?.instructor_name ||
    course?.teacher?.full_name ||
    course?.teacher?.name ||
    course?.instructor?.full_name ||
    course?.instructor?.name ||
    ""
  );
}
function getCategoryName(course) {
  return (
    course?.category_name ||
    course?.category?.name ||
    course?.access?.category_name ||
    course?.access?.category?.name ||
    "Категория"
  );
}

/* ✅ группировка: 1 карточка на урок (берём последнюю версию) */
function groupLatestHomeworks(allHomeworks) {
  const map = new Map(); // key = courseId|lessonId -> hw
  for (const hw of Array.isArray(allHomeworks) ? allHomeworks : []) {
    const cid = getHwCourseId(hw);
    const lid = getHwLessonId(hw);
    if (!cid || !lid) continue;
    const key = `${cid}__${lid}`;

    const prev = map.get(key);
    const t = new Date(getHwDate(hw) || 0).getTime();
    const pt = prev ? new Date(getHwDate(prev) || 0).getTime() : -1;

    if (!prev || t >= pt) map.set(key, hw);
  }
  return Array.from(map.values());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [archivedIds, setArchivedIds] = useState(() => new Set());
  useEffect(() => {
    if (!user?.id) return;
    setArchivedIds(getArchivedSet(user.id));
  }, [user?.id]);

  const allHomeworks = useMemo(() => (Array.isArray(data.myHomeworks) ? data.myHomeworks : []), [data.myHomeworks]);

  // ✅ вместо всех версий — только последние (чтобы не было дублей)
  const homeworksLatest = useMemo(() => groupLatestHomeworks(allHomeworks), [allHomeworks]);

  const homeworksActive = useMemo(() => {
    const set = archivedIds;
    return homeworksLatest.filter((hw) => !set.has(getHwIdsKey(hw)));
  }, [homeworksLatest, archivedIds]);

  const homeworksArchived = useMemo(() => {
    const set = archivedIds;
    return homeworksLatest.filter((hw) => set.has(getHwIdsKey(hw)));
  }, [homeworksLatest, archivedIds]);

  const myCourses = useMemo(() => (Array.isArray(data.myCourses) ? data.myCourses : []), [data.myCourses]);

  const courseProgress = useCallback(
    (course) => {
      const cid = getCourseId(course);
      const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
      const totalLessons = lessons.length;

      const acceptedCount = allHomeworks.filter(
        (hw) => getHwCourseId(hw) === cid && getHwStatus(hw) === "accepted"
      ).length;

      const denom = Math.max(totalLessons || 0, 1);
      const pct = Math.min(100, Math.round((acceptedCount / denom) * 100));

      return { totalLessons, acceptedCount, pct };
    },
    [allHomeworks]
  );

  async function handleActivateToken() {
    const token = norm(tokenInput);
    if (!token) {
      toast.error("Введите токен");
      return;
    }

    const res = await data.activateToken?.(token);
    if (res?.ok) {
      toast.success("Доступ успешно активирован!");
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

  const buildLessonLink = (courseId, lessonId) =>
    `/student/course/${encodeURIComponent(String(courseId))}?lesson=${encodeURIComponent(String(lessonId))}`;

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
              <CardContent className="py-14 text-center">
                <div className="mx-auto max-w-xl">
                  <h2 className="text-xl font-semibold mb-2">У вас пока нет доступа к курсам</h2>
                  <p className="text-gray-600">
                    Получите токен после покупки и активируйте его — курсы и уроки появятся здесь автоматически.
                  </p>

                  <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                    <Button onClick={() => onTabChange("activate")}>
                      <Key className="w-4 h-4 mr-2" />
                      Взять доступ
                    </Button>

                    <Link to="/courses">
                      <Button variant="outline">Посмотреть курсы</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {myCourses.map((course, idx) => {
                const cid = getCourseId(course);
                if (!cid) return null;

                const key = `course_${cid}_${idx}`;
                const title = course?.title || course?.name || course?.access?.course_title || "Курс";
                const categoryName = getCategoryName(course);

                const teacher = getTeacherName(course);
                const teacherLine = teacher ? `Преподаватель: ${teacher}` : "Преподаватель: —";

                const { totalLessons, acceptedCount, pct } = courseProgress(course);

                return (
                  <Card key={key} className="h-full">
                    <CardHeader>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="truncate">{title}</CardTitle>
                          <CardDescription className="truncate">{teacherLine}</CardDescription>
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
                              {totalLessons ? ` / ${totalLessons}` : ""}{" "}
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>

                        <Link to={`/student/course/${encodeURIComponent(cid)}`}>
                          <Button className="w-full">Перейти к курсу</Button>
                        </Link>

                        {course?.access?.remaining_videos != null ? (
                          <div className="text-sm text-gray-600">
                            Осталось открытий видео:{" "}
                            <span className="font-medium">{course.access.remaining_videos}</span>
                          </div>
                        ) : null}
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
                            <h4 className="font-semibold truncate">{hw?.course_title || "Курс"}</h4>
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

                      <AttachmentsViewStudentDash attachments={hw?.attachments} />

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
                placeholder="Введите токен (например: ABCDEF123)"
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
              <p className="text-sm text-gray-600 mt-4">После активации курсы появятся в разделе “Мои курсы”.</p>
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
                            <h4 className="font-semibold truncate">{hw?.course_title || "Курс"}</h4>
                            <p className="text-sm text-gray-600 truncate">{lessonTitle}</p>
                          </div>
                        </div>
                        {homeworkStatusBadge(status)}
                      </div>

                      <AttachmentsViewStudentDash attachments={hw?.attachments} />

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
