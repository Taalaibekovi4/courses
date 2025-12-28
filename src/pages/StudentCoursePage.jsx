import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import YouTube from "react-youtube";
import { toast } from "sonner";
import { PlayCircle, Lock, CheckCircle, Send, Paperclip, Link as LinkIcon, X, Clock, XCircle } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Input } from "../components/ui/input.jsx";
import { Badge } from "../components/ui/badge.jsx";

const norm = (s) => String(s ?? "").trim();

function getYouTubeId(raw) {
  const v = norm(raw);
  if (!v) return "";
  if (/^[a-zA-Z0-9_-]{6,}$/.test(v) && !v.includes("http")) return v;

  const m1 = v.match(/(?:youtube\.com\/watch\?v=)([^&]+)/);
  if (m1?.[1]) return m1[1];
  const m2 = v.match(/(?:youtu\.be\/)([^?&]+)/);
  if (m2?.[1]) return m2[1];

  const m3 = v.match(/([a-zA-Z0-9_-]{6,})/);
  return m3?.[1] || "";
}

function statusBadge(status) {
  if (status === "accepted") return <Badge className="bg-green-600 text-white border-transparent">Принято</Badge>;
  if (status === "rejected") return <Badge variant="destructive">На доработку</Badge>;
  if (status === "submitted") return <Badge variant="secondary">На проверке</Badge>;
  return null;
}

function LessonStatusIcon({ status }) {
  if (status === "accepted") return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
  if (status === "rejected") return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
  if (status === "submitted") return <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />;
  return null;
}

function AttachmentsList({ attachments, onRemove, readonly = false }) {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-600">Прикрепления:</p>
      <div className="space-y-2">
        {list.map((a, idx) => {
          const url = a?.url || "";
          const name = a?.name || "Файл";
          const isLink = a?.type === "link";
          return (
            <div key={`${a?.type || "x"}_${idx}`} className="flex items-center justify-between gap-3 border rounded p-2 bg-white">
              <a
                href={url || "#"}
                target={url ? "_blank" : undefined}
                rel="noreferrer"
                className={`text-sm break-all ${url ? "text-blue-600 hover:underline" : "text-gray-700"}`}
                onClick={(e) => {
                  if (!url) e.preventDefault();
                }}
              >
                {isLink ? "🔗 " : "📎 "}
                {name}
              </a>

              {!readonly && (
                <button
                  className="text-gray-500 hover:text-red-600"
                  onClick={() => onRemove(idx)}
                  type="button"
                  aria-label="remove"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashNavInline({ title }) {
  const items = [
    { to: "/dashboard?tab=courses", label: "Мои курсы" },
    { to: "/dashboard?tab=homework", label: "Домашние задания" },
    { to: "/dashboard?tab=activate", label: "Активировать токен" },
    { to: "/dashboard?tab=archive", label: "Архив" },
  ];

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link key={it.to} to={it.to} className="block">
            <span
              className={[
                "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm",
                "transition select-none bg-white border-gray-200 text-gray-800",
                "hover:bg-gray-100",
              ].join(" ")}
            >
              {it.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ✅ заголовок снизу */}
      <div className="mt-3 text-sm text-gray-600">{title}</div>
    </div>
  );
}

export function StudentCoursePage() {
  const { courseId } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const {
    getLessonsByCourse,
    getUserTokens,
    getUserHomeworks,
    markLessonAsOpened,
    submitHomework,
    updateHomework,
    getCourseWithDetails,
  } = useData();

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [homeworkText, setHomeworkText] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState([]);

  const queryLessonId = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get("lesson") || "";
  }, [location.search]);

  const cameFromHomework = !!queryLessonId;

  if (!user || !courseId) return null;

  const lessons = getLessonsByCourse(courseId);
  const courseDetails = getCourseWithDetails(courseId);
  const userToken = getUserTokens(user.id).find((t) => t.courseId === courseId);
  const userHomeworks = getUserHomeworks(user.id);

  useEffect(() => {
    if (!lessons.length) return;

    if (queryLessonId) {
      const exists = lessons.find((l) => String(l.id) === String(queryLessonId));
      if (exists) {
        setSelectedLesson(exists.id);
        return;
      }
    }

    if (!selectedLesson) setSelectedLesson(lessons[0]?.id || null);
  }, [lessons, queryLessonId, selectedLesson]);

  if (!userToken || !courseDetails) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">У вас нет доступа к этому курсу</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLesson = selectedLesson ? lessons.find((l) => l.id === selectedLesson) : null;

  const myHwForLesson = useMemo(() => {
    if (!currentLesson) return null;
    const list = (userHomeworks || [])
      .filter((hw) => hw.courseId === courseId && hw.lessonId === currentLesson.id)
      .slice()
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    return list[0] || null;
  }, [userHomeworks, courseId, currentLesson]);

  useEffect(() => {
    if (!currentLesson) return;

    if (myHwForLesson) {
      setHomeworkText(myHwForLesson.content || "");
      setAttachments(Array.isArray(myHwForLesson.attachments) ? myHwForLesson.attachments : []);
      setLinkInput("");
    } else {
      setHomeworkText("");
      setAttachments([]);
      setLinkInput("");
    }
  }, [currentLesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canOpenLesson = useCallback(
    (lessonId) => {
      if (userToken.openedLessons.includes(lessonId)) return true;
      if (userToken.videoLimit === -1) return true;
      return userToken.videosUsed < userToken.videoLimit;
    },
    [userToken]
  );

  const handleLessonSelect = (lessonId) => {
    if (canOpenLesson(lessonId)) {
      setSelectedLesson(lessonId);
      if (!userToken.openedLessons.includes(lessonId)) {
        markLessonAsOpened(userToken.id, lessonId);
      }
    } else {
      toast.error("У вас закончились доступные видео. Купите новый тариф.");
    }
  };

  function addLink() {
    const url = norm(linkInput);
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    setAttachments((prev) => [...prev, { type: "link", name: normalized, url: normalized }]);
    setLinkInput("");
  }

  function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const items = files.slice(0, 30).map((f) => ({
      type: "file",
      name: f.webkitRelativePath || f.name,
      url: URL.createObjectURL(f),
    }));

    setAttachments((prev) => [...prev, ...items]);
    e.target.value = "";
  }

  function removeAttachment(idx) {
    setAttachments((prev) => {
      const item = prev[idx];
      if (item?.url?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.url);
        } catch (_) {}
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  const isAccepted = myHwForLesson?.status === "accepted";
  const isRejected = myHwForLesson?.status === "rejected";
  const isSubmitted = myHwForLesson?.status === "submitted";

  const canEdit = !!currentLesson && !isAccepted;
  const canSendNew = !!currentLesson && !myHwForLesson;
  const canResubmit = !!currentLesson && isRejected;

  const handleSaveOrSend = () => {
    if (!currentLesson) return;

    const text = norm(homeworkText);
    if (!text && attachments.length === 0) {
      toast.error("Добавьте текст, ссылку или файл");
      return;
    }

    if (canSendNew) {
      submitHomework({
        lessonId: currentLesson.id,
        userId: user.id,
        courseId,
        content: text,
        attachments,
      });
      toast.success("Домашнее задание отправлено на проверку");
      return;
    }

    if (isSubmitted && myHwForLesson) {
      updateHomework(myHwForLesson.id, { content: text, attachments });
      toast.success("Сохранено (ожидает проверки)");
      return;
    }

    if (canResubmit && myHwForLesson) {
      updateHomework(myHwForLesson.id, {
        content: text,
        attachments,
        status: "submitted",
        submittedAt: new Date(),
        reviewedAt: null,
        teacherComment: "",
      });
      toast.success("Отправлено повторно на проверку");
      return;
    }

    toast.error("Это задание уже принято — менять нельзя.");
  };

  const playerOpts = { width: "100%", height: "100%", playerVars: { autoplay: 0 } };

  const lessonHomeworkStatusMap = useMemo(() => {
    const map = new Map();
    (userHomeworks || [])
      .filter((hw) => hw.courseId === courseId)
      .forEach((hw) => {
        const prev = map.get(hw.lessonId);
        const rank = (s) => (s === "accepted" ? 3 : s === "submitted" ? 2 : s === "rejected" ? 1 : 0);
        if (!prev || rank(hw.status) > rank(prev)) map.set(hw.lessonId, hw.status);
      });
    return map;
  }, [userHomeworks, courseId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ✅ такая же навигация + заголовок снизу */}
        <DashNavInline />

        <div className="mb-6">
          <h1 className="text-3xl mb-2">{courseDetails.title}</h1>
          <p className="text-gray-600">
            Доступно видео: {userToken.videosUsed} / {userToken.videoLimit === -1 ? lessons.length : userToken.videoLimit}
          </p>
        </div>

        <div className={cameFromHomework ? "grid lg:grid-cols-1 gap-6" : "grid lg:grid-cols-3 gap-6"}>
          {/* Lessons List */}
          {!cameFromHomework ? (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Уроки курса</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lessons.map((lesson) => {
                      const canOpen = canOpenLesson(lesson.id);
                      const st = lessonHomeworkStatusMap.get(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonSelect(lesson.id)}
                          className={`w-full text-left p-3 rounded-lg transition ${
                            selectedLesson === lesson.id ? "bg-blue-100 border-blue-600" : "hover:bg-gray-100"
                          } border ${!canOpen ? "opacity-50" : ""}`}
                          disabled={!canOpen}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            {st ? (
                              <LessonStatusIcon status={st} />
                            ) : canOpen ? (
                              <PlayCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{lesson.title}</p>
                              <p className="text-xs text-gray-600 truncate">{lesson.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Video Player & Homework */}
          <div className={cameFromHomework ? "space-y-6" : "lg:col-span-2 space-y-6"}>
            {currentLesson ? (
              <>
                <Card>
                  <CardHeader className="flex-row items-start justify-between">
                    <CardTitle className="min-w-0">{currentLesson.title}</CardTitle>
                    {myHwForLesson?.status ? statusBadge(myHwForLesson.status) : null}
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <YouTube videoId={getYouTubeId(currentLesson.videoUrl)} opts={playerOpts} className="w-full h-full" />
                    </div>
                    <p className="mt-4 text-gray-700">{currentLesson.description}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Домашнее задание</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentLesson.homeworkDescription ? (
                      <p className="mb-4">{currentLesson.homeworkDescription}</p>
                    ) : (
                      <p className="mb-4 text-sm text-gray-600">Можно отправить решение текстом, ссылкой или файлом.</p>
                    )}

                    {myHwForLesson?.teacherComment ? (
                      <div className="mb-4 p-3 bg-blue-50 rounded">
                        <div className="text-sm font-medium mb-1">Комментарий преподавателя:</div>
                        <div className="text-sm whitespace-pre-wrap">{myHwForLesson.teacherComment}</div>
                      </div>
                    ) : null}

                    <Textarea
                      placeholder="Ваш ответ или пояснение..."
                      value={homeworkText}
                      onChange={(e) => setHomeworkText(e.target.value)}
                      rows={5}
                      disabled={!canEdit}
                    />

                    <div className="mt-4 grid md:grid-cols-2 gap-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ссылка (GitHub, Google Drive...)"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          disabled={!canEdit}
                        />
                        <Button type="button" variant="outline" onClick={addLink} disabled={!canEdit}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <label className={`w-full ${canEdit ? "" : "opacity-60 pointer-events-none"}`}>
                          <input
                            type="file"
                            multiple
                            webkitdirectory="true"
                            directory="true"
                            onChange={onPickFiles}
                            className="hidden"
                            disabled={!canEdit}
                          />
                          <div className="w-full border rounded-md px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-2">
                            <Paperclip className="w-4 h-4" />
                            <span className="text-sm">Файлы / Папка</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <AttachmentsList attachments={attachments} onRemove={removeAttachment} readonly={!canEdit} />

                    <div className="mt-4 flex flex-wrap gap-3">
                      {isAccepted ? (
                        <Button disabled className="bg-green-600 hover:bg-green-600">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Принято — отправка закрыта
                        </Button>
                      ) : (
                        <Button onClick={handleSaveOrSend}>
                          <Send className="w-4 h-4 mr-2" />
                          {canSendNew ? "Отправить на проверку" : isSubmitted ? "Сохранить" : isRejected ? "Отправить снова" : "Сохранить"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Выберите урок</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
