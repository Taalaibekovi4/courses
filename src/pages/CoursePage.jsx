import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "../contexts/DataContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlayCircle, CheckCircle, X, BookOpen, GraduationCap, ShoppingCart } from "lucide-react";

const WHATSAPP_NUMBER = "996221000953";
const PREVIEW_SECONDS = 5;

const FALLBACK_YT_URL = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";
const FALLBACK_TEACHER =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";

function getYouTubeId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short?.[1]) return short[1];

  const v = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (v?.[1]) return v[1];

  const emb = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (emb?.[1]) return emb[1];

  return "";
}

function ensureYouTubeScript() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(true);

    const existing = document.getElementById("yt-iframe-api");
    if (existing) {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check);
          resolve(true);
        }
      }, 100);
      return;
    }

    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => resolve(true);
  });
}

export function CoursePage() {
  const { slug } = useParams();

  const data = useData?.() || {};
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const getCourseWithDetails =
    typeof data.getCourseWithDetails === "function" ? data.getCourseWithDetails : () => null;
  const getLessonsByCourse =
    typeof data.getLessonsByCourse === "function" ? data.getLessonsByCourse : () => [];

  const [selectedLessonIds, setSelectedLessonIds] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState("");

  const tariffsRef = useRef(null);
  const playRequestedRef = useRef(false);

  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  const course = useMemo(
    () => courses.find((c) => String(c?.slug) === String(slug)) || null,
    [courses, slug]
  );

  const courseDetails = useMemo(() => {
    if (!course?.id) return null;
    return getCourseWithDetails(course.id);
  }, [course, getCourseWithDetails]);

  const lessons = useMemo(() => {
    if (!course?.id) return [];
    return getLessonsByCourse(course.id) || [];
  }, [course, getLessonsByCourse]);

  const teacher = courseDetails?.teacher || {};
  const category = courseDetails?.category || {};

  const coverUrl =
    courseDetails?.coverUrl ||
    courseDetails?.imageUrl ||
    teacher?.avatarUrl ||
    teacher?.photoUrl ||
    FALLBACK_COVER;

  const teacherImg = teacher?.avatarUrl || teacher?.photoUrl || teacher?.image || FALLBACK_TEACHER;

  const lessonsById = useMemo(() => {
    const map = new Map();
    (lessons || []).forEach((l) => map.set(l.id, l));
    return map;
  }, [lessons]);

  const activeLesson = useMemo(() => {
    const first = (lessons || [])[0] || null;
    if (!activeLessonId) return first;
    return lessonsById.get(activeLessonId) || first;
  }, [activeLessonId, lessons, lessonsById]);

  const rawVideo = String(activeLesson?.videoUrl || "").trim() || FALLBACK_YT_URL;
  const youTubeId = getYouTubeId(rawVideo);

  const selectedLessons = useMemo(() => {
    return (selectedLessonIds || []).map((id) => lessonsById.get(id)).filter(Boolean);
  }, [selectedLessonIds, lessonsById]);

  const toggleSelectLesson = useCallback((lessonId) => {
    setSelectedLessonIds((prev) => {
      const set = new Set(prev);
      if (set.has(lessonId)) set.delete(lessonId);
      else set.add(lessonId);
      return Array.from(set);
    });
  }, []);

  const stopYouTubeTimer = useCallback(() => {
    if (ytTimerRef.current) {
      clearInterval(ytTimerRef.current);
      ytTimerRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubeTimer();
    const p = ytPlayerRef.current;
    ytPlayerRef.current = null;
    if (p && typeof p.destroy === "function") {
      try {
        p.destroy();
      } catch (_) {}
    }
  }, [stopYouTubeTimer]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");
    playRequestedRef.current = false;
    destroyYouTubePlayer();
  }, [destroyYouTubePlayer]);

  const openPreview = useCallback((lessonId) => {
    setActiveLessonId(lessonId);
    setIsPaywallOpen(false);
    setIsPreviewOpen(true);
    setIsVideoReady(false);
    setVideoError("");
    playRequestedRef.current = true;
  }, []);

  useEffect(() => {
    return () => {
      destroyYouTubePlayer();
    };
  }, [destroyYouTubePlayer]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPreviewOpen, closePreview]);

  const clampPreviewYouTube = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p || typeof p.getCurrentTime !== "function") return;

    const t = Number(p.getCurrentTime() || 0);
    if (t >= PREVIEW_SECONDS) {
      try {
        p.pauseVideo();
        p.seekTo(PREVIEW_SECONDS, true);
      } catch (_) {}
      setIsPaywallOpen(true);
      stopYouTubeTimer();
    }
  }, [stopYouTubeTimer]);

  const startYouTubeTimer = useCallback(() => {
    stopYouTubeTimer();
    ytTimerRef.current = setInterval(clampPreviewYouTube, 200);
  }, [clampPreviewYouTube, stopYouTubeTimer]);

  const initYouTubePlayer = useCallback(
    async (videoId) => {
      try {
        await ensureYouTubeScript();

        if (!ytMountRef.current) return;

        destroyYouTubePlayer();
        setIsVideoReady(false);
        setVideoError("");

        ytPlayerRef.current = new window.YT.Player(ytMountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              setIsVideoReady(true);
              setVideoError("");

              try {
                e.target.seekTo(0, true);
                e.target.playVideo();
              } catch (_) {}

              startYouTubeTimer();
            },
            onStateChange: (e) => {
              if (window.YT && e?.data === window.YT.PlayerState.PLAYING) {
                setIsVideoReady(true);
                startYouTubeTimer();
              }
            },
            onError: (e) => {
              console.error("YouTube error:", e);
              setVideoError("YouTube не дал воспроизвести это видео. Поставь другое видео в урок.");
              setIsVideoReady(false);
              stopYouTubeTimer();
            },
          },
        });
      } catch (err) {
        console.error("YT init error:", err);
        setVideoError("Не удалось загрузить YouTube плеер.");
        setIsVideoReady(false);
      }
    },
    [destroyYouTubePlayer, startYouTubeTimer, stopYouTubeTimer]
  );

  useEffect(() => {
    if (!isPreviewOpen) return;

    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");

    if (!youTubeId) {
      setVideoError("Неверная YouTube ссылка/ID (нужно v=... или youtu.be/...).");
      setIsVideoReady(false);
      return;
    }

    const t = setTimeout(() => {
      if (playRequestedRef.current) initYouTubePlayer(youTubeId);
    }, 50);

    return () => clearTimeout(t);
  }, [isPreviewOpen, youTubeId, initYouTubePlayer]);

  const scrollToTariffs = useCallback(() => {
    const el = tariffsRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function generateWhatsAppTariffLink(tariffId) {
    const tariff = courseDetails?.tariffs?.find((t) => t.id === tariffId);
    if (!tariff) return "#";

    const msg = `Хочу купить курс: ${courseDetails.title}
Преподаватель: ${teacher.name}
Тариф: ${tariff.name}
Цена: ${tariff.price} сом`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  function generateWhatsAppSelectedLessonsLink() {
    const count = selectedLessons.length;
    if (!count) return "#";

    const list = selectedLessons.map((l, i) => `${i + 1}) ${l.title}`).join("\n");

    const msg = `Хочу доступ к урокам курса: ${courseDetails.title}
Преподаватель: ${teacher.name}
Нужно уроков: ${count}

Список уроков:
${list}`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  if (!course || !courseDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="app-container py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Курс не найден</p>
              <div className="mt-4">
                <Link to="/courses">
                  <Button variant="outline">Назад к курсам</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ✅ HERO FULL-WIDTH */}
      <section className={`relative text-white overflow-hidden ${fullBleed}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        {/* ✅ контент hero — app-container */}
        <div className="relative app-container py-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
                {category?.name || "Категория"}
              </Badge>
              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <BookOpen className="w-4 h-4" />
                {(courseDetails.lessonsCount ?? lessons.length) || 0} уроков
              </span>
              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <GraduationCap className="w-4 h-4" />
                {teacher?.name || "—"}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl mt-4 leading-tight">{courseDetails.title}</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-3 max-w-3xl">{courseDetails.description}</p>

            <div className="mt-6 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/25 bg-white/10">
                <img src={teacherImg} alt={teacher?.name || "Teacher"} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold">{teacher?.name || "—"}</div>
                <div className="text-sm text-white/80">Преподаватель курса</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* ✅ BODY — app-container */}
      <div className="app-container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>О преподавателе</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                  <img src={teacherImg} alt={teacher?.name || "Teacher"} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <p className="text-gray-700 leading-relaxed">{teacher?.bio || "—"}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Программа курса</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {lessons.map((lesson, index) => {
                    const isSelected = selectedLessonIds.includes(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSelectLesson(lesson.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") toggleSelectLesson(lesson.id);
                        }}
                        className={[
                          "group flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer",
                          "bg-white hover:bg-gray-50",
                          isSelected ? "border-green-300 ring-1 ring-green-200" : "border-gray-200",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm mt-0.5 font-semibold",
                            isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900",
                          ].join(" ")}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{lesson.title}</h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{lesson.description}</p>

                              {lesson.homeworkDescription ? (
                                <div className="mt-2 text-xs text-blue-700 inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Домашнее задание
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPreview(lesson.id);
                              }}
                              className="shrink-0 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
                              aria-label="Смотреть"
                            >
                              <PlayCircle className="w-5 h-5 text-gray-700" />
                              <span className="hidden sm:inline text-gray-800">Смотреть</span>
                            </button>
                          </div>

                          <div className="sm:hidden mt-2 text-xs text-gray-500">
                            Нажми на карточку — выберешь урок. Нажми “Смотреть” — откроется превью.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Тарифы и покупка</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div ref={tariffsRef} />

                <div className="space-y-3">
                  {(courseDetails.tariffs || []).map((tariff) => (
                    <div
                      key={tariff.id}
                      className="rounded-2xl border border-gray-200 p-4 bg-white hover:border-blue-600 hover:shadow-sm transition"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{tariff.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {tariff.videoCount === -1 ? "Все видео курса" : `Доступ к ${tariff.videoCount} видео`}
                          </div>
                        </div>
                        <div className="text-2xl font-extrabold text-blue-600 whitespace-nowrap">
                          {tariff.price} сом
                        </div>
                      </div>

                      <a
                        href={generateWhatsAppTariffLink(tariff.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-4"
                      >
                        <Button className="w-full">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Купить тариф
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Выбранные уроки</div>
                    <Badge variant="secondary">{selectedLessons.length}</Badge>
                  </div>

                  {selectedLessons.length > 0 ? (
                    <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
                      {selectedLessons.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-start justify-between gap-3 text-sm border border-gray-100 bg-gray-50 rounded-xl p-2"
                        >
                          <span className="text-gray-800 leading-snug">{l.title}</span>
                          <button
                            type="button"
                            onClick={() => toggleSelectLesson(l.id)}
                            className="text-gray-500 hover:text-red-600 transition"
                            aria-label="Убрать"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">
                      Выбери уроки слева — и купи их одним сообщением.
                    </p>
                  )}

                  <a
                    className={`mt-4 block ${selectedLessons.length ? "" : "pointer-events-none opacity-50"}`}
                    href={generateWhatsAppSelectedLessonsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full" variant="outline">
                      Купить выбранные уроки
                    </Button>
                  </a>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm text-gray-700">
                    После покупки вы получите токен доступа — активируйте его в{" "}
                    <Link to="/dashboard" className="text-blue-700 hover:underline font-medium">
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

      {/* MODAL PREVIEW */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" />

          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold truncate pr-3">{activeLesson?.title || "Просмотр урока"}</div>
              <button
                type="button"
                onClick={closePreview}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-gray-950">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <div ref={ytMountRef} className="absolute inset-0 w-full h-full" />

                {!isVideoReady && !videoError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                  </div>
                )}

                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center">
                    <div className="text-base font-semibold mb-2">Видео не загрузилось</div>
                    <div className="text-sm text-white/70 break-words">{videoError}</div>
                  </div>
                )}
              </div>

              {isPaywallOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
                    <div className="text-lg font-semibold">Купите тариф, пожалуйста 🙂</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Полный доступ откроет все уроки без ограничений и домашние задания с проверкой преподавателя.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={closePreview}>
                        Понятно
                      </Button>
                      <Button
                        onClick={() => {
                          closePreview();
                          setTimeout(() => {
                            scrollToTariffs();
                          }, 100);
                        }}
                      >
                        Купить тариф
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Превью покажет только начало урока — дальше доступ открывается после покупки.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
