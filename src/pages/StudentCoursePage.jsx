// src/pages/StudentCoursePage.jsx
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import YouTube from "react-youtube";
import { toast } from "sonner";
import { PlayCircle, Lock, CheckCircle, Send, Paperclip, Link as LinkIcon, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Input } from "../components/ui/input.jsx";

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

function AttachmentsList({ attachments, onRemove }) {
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
              <button
                className="text-gray-500 hover:text-red-600"
                onClick={() => onRemove(idx)}
                type="button"
                aria-label="remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentCoursePage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const {
    getLessonsByCourse,
    getUserTokens,
    markLessonAsOpened,
    submitHomework,
    getCourseWithDetails,
  } = useData();

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [homeworkText, setHomeworkText] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [attachments, setAttachments] = useState([]); // {type, name, url}

  if (!user || !courseId) return null;

  const lessons = getLessonsByCourse(courseId);
  const courseDetails = getCourseWithDetails(courseId);
  const userToken = getUserTokens(user.id).find((t) => t.courseId === courseId);

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

  const canOpenLesson = (lessonId) => {
    if (userToken.openedLessons.includes(lessonId)) return true;
    if (userToken.videoLimit === -1) return true;
    return userToken.videosUsed < userToken.videoLimit;
  };

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
      url: URL.createObjectURL(f), // демо
    }));

    setAttachments((prev) => [...prev, ...items]);
    e.target.value = "";
  }

  function removeAttachment(idx) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  const handleHomeworkSubmit = () => {
    if (!currentLesson) return;

    const text = norm(homeworkText);
    if (!text && attachments.length === 0) {
      toast.error("Добавьте текст, ссылку или файл");
      return;
    }

    submitHomework({
      lessonId: currentLesson.id,
      userId: user.id,
      courseId,
      content: text,
      attachments,
    });

    toast.success("Домашнее задание отправлено на проверку");
    setHomeworkText("");
    setAttachments([]);
    setLinkInput("");
  };

  const playerOpts = { width: "100%", height: "100%", playerVars: { autoplay: 0 } };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl mb-2">{courseDetails.title}</h1>
          <p className="text-gray-600">
            Доступно видео: {userToken.videosUsed} /{" "}
            {userToken.videoLimit === -1 ? lessons.length : userToken.videoLimit}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lessons List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Уроки курса</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessons.map((lesson) => {
                    const isOpened = userToken.openedLessons.includes(lesson.id);
                    const canOpen = canOpenLesson(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonSelect(lesson.id)}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedLesson === lesson.id ? "bg-blue-100 border-blue-600" : "hover:bg-gray-100"
                        } border ${!canOpen ? "opacity-50" : ""}`}
                        disabled={!canOpen}
                      >
                        <div className="flex items-center gap-3">
                          {isOpened ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
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

          {/* Video Player & Homework */}
          <div className="lg:col-span-2 space-y-6">
            {currentLesson ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{currentLesson.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <YouTube videoId={getYouTubeId(currentLesson.videoUrl)} opts={playerOpts} className="w-full h-full" />
                    </div>
                    <p className="mt-4 text-gray-700">{currentLesson.description}</p>
                  </CardContent>
                </Card>

                {currentLesson.homeworkDescription && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Домашнее задание</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{currentLesson.homeworkDescription}</p>

                      <Textarea
                        placeholder="Ваш ответ или пояснение..."
                        value={homeworkText}
                        onChange={(e) => setHomeworkText(e.target.value)}
                        rows={5}
                      />

                      {/* ссылки */}
                      <div className="mt-4 grid md:grid-cols-2 gap-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ссылка (GitHub, Google Drive...)"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                          />
                          <Button type="button" variant="outline" onClick={addLink}>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Добавить
                          </Button>
                        </div>

                        {/* файлы/папка */}
                        <div className="flex gap-2">
                          <label className="w-full">
                            <input
                              type="file"
                              multiple
                              // папка (chrome/edge)
                              webkitdirectory="true"
                              directory="true"
                              onChange={onPickFiles}
                              className="hidden"
                            />
                            <div className="w-full border rounded-md px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-center gap-2">
                              <Paperclip className="w-4 h-4" />
                              <span className="text-sm">Файлы / Папка</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <AttachmentsList attachments={attachments} onRemove={removeAttachment} />

                      <Button onClick={handleHomeworkSubmit} className="mt-4">
                        <Send className="w-4 h-4 mr-2" />
                        Отправить на проверку
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Выберите урок из списка слева</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
