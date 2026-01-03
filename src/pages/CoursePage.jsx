// src/pages/CoursePage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import axios from "axios";

import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlayCircle, CheckCircle, X, BookOpen, GraduationCap, ShoppingCart, Volume2 } from "lucide-react";

// ⚠️ PREVIEW_SECONDS оставляем как было
const PREVIEW_SECONDS = 5;

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

/** base для медиа (если бэк отдаёт /media/...) */
const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";

const API_ORIGIN = str(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function toAbsUrl(url) {
  const u = str(url);
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

function pickCourseIdFromParams(params) {
  return String(params?.id ?? params?.slug ?? params?.courseId ?? params?.pk ?? "").trim();
}

function extractArrayAny(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const keys = ["results", "items", "data", "lessons", "lesson_list", "lessons_list", "list"];
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  if (data?.data && typeof data.data === "object") {
    for (const k of keys) {
      if (Array.isArray(data?.data?.[k])) return data.data[k];
    }
  }
  return [];
}

function getCourseId(obj) {
  return obj?.id ?? obj?.pk ?? obj?.courseId ?? obj?.course_id ?? null;
}
function getCourseTitle(obj) {
  return obj?.title || obj?.name || "Курс";
}
function getCourseDesc(obj) {
  return obj?.description || obj?.desc || "";
}
function getTeacherNameFromAny(obj) {
  return (
    obj?.instructor_name ||
    obj?.instructorName ||
    obj?.teacherName ||
    obj?.teacher_name ||
    obj?.teacher?.full_name ||
    obj?.teacher?.username ||
    obj?.teacher?.email ||
    obj?.instructor?.full_name ||
    obj?.instructor?.username ||
    obj?.instructor?.email ||
    "—"
  );
}
function getCategoryNameFromAny(obj) {
  return obj?.categoryName || obj?.category_name || obj?.category?.name || obj?.category_title || "";
}

function getCoursePhotoFromAny(obj) {
  const raw = obj?.photo || obj?.imageUrl || obj?.coverUrl || obj?.image || obj?._raw?.photo || "";
  return toAbsUrl(raw);
}

/** ✅ НОРМАЛИЗАЦИЯ courseId урока (самая важная часть) */
function normalizeLessonCourseId(l) {
  const c = l?.course;
  const cid =
    l?.course_id ??
    l?.courseId ??
    (c && typeof c === "object" ? c.id ?? c.pk ?? c.course_id ?? c.courseId : c) ??
    l?.course?.id ??
    "";
  return String(cid ?? "").trim();
}

function pickLessonVideo(obj) {
  const v =
    obj?.youtube_video_id ||
    obj?.youtubeVideoId ||
    obj?.youtube_id ||
    obj?.youtubeId ||
    obj?.video_url ||
    obj?.videoUrl ||
    obj?.video ||
    obj?.url ||
    obj?.file_url ||
    obj?.fileUrl ||
    "";
  return String(v || "").trim();
}

function extractLessonsFromCourse(courseLike) {
  const raw =
    courseLike?.lessons ||
    courseLike?.lesson_list ||
    courseLike?.lessons_list ||
    courseLike?._raw?.lessons ||
    courseLike?._raw?.lesson_list ||
    courseLike?._raw?.lessons_list ||
    null;

  const arr = extractArrayAny(raw);
  if (!arr.length) return [];

  return arr.map((l, idx) => ({
    id: l?.id ?? l?.pk ?? `embedded-${idx + 1}`,
    title: l?.title || l?.name || `Урок ${idx + 1}`,
    description: l?.description || "",
    order: l?.order ?? idx + 1,
    videoUrl: pickLessonVideo(l),
    youtubeStatus: String(l?.youtube_status || ""),
    youtubeError: String(l?.youtube_error || ""),
    homeworkDescription: l?.homework_description || "",
    courseId: normalizeLessonCourseId(l),
    _raw: l,
  }));
}

function normalizeLessonsList(arr) {
  const list = extractArrayAny(arr);
  return (list || []).map((l, idx) => ({
    id: l?.id ?? l?.pk ?? `lesson-${idx + 1}`,
    title: l?.title || l?.name || `Урок ${idx + 1}`,
    description: l?.description || "",
    order: l?.order ?? idx + 1,
    videoUrl: pickLessonVideo(l),
    youtubeStatus: String(l?.youtube_status || ""),
    youtubeError: String(l?.youtube_error || ""),
    homeworkDescription: l?.homework_description || "",
    courseId: normalizeLessonCourseId(l),
    _raw: l,
  }));
}

/** ✅ shorts + live */
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

  const shorts = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts?.[1]) return shorts[1];

  const live = s.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (live?.[1]) return live[1];

  return "";
}

function isDirectVideoUrl(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v) return false;
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("blob:") ||
    v.endsWith(".mp4") ||
    v.endsWith(".webm") ||
    v.endsWith(".ogg") ||
    v.includes(".mp4?") ||
    v.includes(".webm?") ||
    v.includes(".ogg?")
  );
}

async function tryGet(apiInstance, path, config = {}) {
  try {
    const r = await apiInstance.get(path, config);
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function ensureYouTubeScriptWithTimeout(ms = 3500) {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(true);

    const existing = document.getElementById("yt-iframe-api");
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const t = setTimeout(() => finish(false), ms);

    const check = () => {
      if (window.YT && window.YT.Player) {
        clearTimeout(t);
        finish(true);
      }
    };

    if (existing) {
      const i = setInterval(() => {
        check();
        if (done) clearInterval(i);
      }, 100);
      return;
    }

    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => finish(false);
    document.body.appendChild(tag);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prev === "function") prev();
      } catch (_) {}
      check();
    };
  });
}

function normalizeTariff(t) {
  return {
    id: String(t?.id ?? ""),
    title: String(t?.title ?? t?.name ?? ""),
    price: String(t?.price ?? t?.amount ?? ""),
    courseId: String(t?.course ?? t?.course_id ?? t?.courseId ?? ""),
    description: String(t?.description ?? t?.desc ?? ""),
    _raw: t,
  };
}

function moneySom(v) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return `${s} сом`;
}

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

export function CoursePage() {
  const params = useParams();
  const courseId = pickCourseIdFromParams(params);

  const location = useLocation();
  const preview = location?.state?.coursePreview || null;

  const API_BASE = getApiBase();
  const publicApi = useMemo(() => axios.create({ baseURL: API_BASE, timeout: 20000 }), [API_BASE]);

  // ✅ SETTINGS (whatsapp_number)
  const [settings, setSettings] = useState(null);

  const whatsappNumber = useMemo(() => {
    const n = str(settings?.whatsapp_number);
    return n || "996221000953";
  }, [settings]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await publicApi.get("/settings/");
        const s = extractSettings(r.data);
        if (!alive) return;
        setSettings(s || null);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setSettings(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [publicApi]);

  const [course, setCourse] = useState(() => {
    const pid = getCourseId(preview);
    if (pid != null && String(pid) === String(courseId)) return preview;
    if (preview?.slug && String(preview.slug) === String(courseId)) return preview;
    return null;
  });

  const [courseLoading, setCourseLoading] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");

  const [tariffs, setTariffs] = useState([]);
  const [tariffsLoading, setTariffsLoading] = useState(false);
  const [tariffsError, setTariffsError] = useState("");

  const [activeLessonId, setActiveLessonId] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  const [fallbackIframeId, setFallbackIframeId] = useState("");

  // ✅ для мобильных: стартуем muted, а звук включаем кнопкой
  const [isMuted, setIsMuted] = useState(true);

  // ✅ чтобы iframe можно было “перезапустить” со звуком после клика
  const [iframeKey, setIframeKey] = useState(0);

  // ✅ для direct video preview
  const htmlVideoRef = useRef(null);
  const htmlVideoTimerRef = useRef(null);

  const tariffsRef = useRef(null);

  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  // ✅ guard от двойного useEffect в React 18 StrictMode (DEV)
  const didLoadLessonsRef = useRef(false);

  // ✅ если меняется courseId — сбрасываем guard и данные
  useEffect(() => {
    didLoadLessonsRef.current = false;
    setLessons([]);
    setLessonsError("");
    setActiveLessonId(null);
  }, [courseId]);

  const courseLessonsCount = useMemo(() => {
    const c = course?._raw || course || {};
    const n = Number(c?.lessonsCount ?? c?.lessons_count ?? c?.lessonsTotal ?? c?.lessons_total ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [course]);

  const categoryName = useMemo(
    () => getCategoryNameFromAny(course) || course?.categoryName || "Категория",
    [course]
  );
  const teacherName = useMemo(
    () => getTeacherNameFromAny(course) || course?.teacherName || "—",
    [course]
  );

  const coverUrl = useMemo(() => {
    const img = getCoursePhotoFromAny(course) || getCoursePhotoFromAny(preview) || "";
    return img || FALLBACK_COVER;
  }, [course, preview]);

  const loadCourse = useCallback(async () => {
    const cid = String(courseId || "").trim();
    if (!cid) return;

    setCourseLoading(true);
    try {
      const res = await tryGet(publicApi, `/courses/${cid}/`);
      if (!res.ok || !res.data) {
        setCourse(null);
        return;
      }

      const fetched = res.data;
      setCourse({
        id: getCourseId(fetched) ?? preview?.id ?? cid,
        title: getCourseTitle(fetched) || preview?.title || "Курс",
        description: getCourseDesc(fetched) || preview?.description || "",
        lessonsCount: fetched?.lessonsCount ?? fetched?.lessons_count ?? preview?.lessonsCount ?? 0,
        teacherName:
          getTeacherNameFromAny(fetched) !== "—"
            ? getTeacherNameFromAny(fetched)
            : preview?.teacherName || "—",
        categoryName: getCategoryNameFromAny(fetched) || preview?.categoryName || "",
        photo: fetched?.photo ?? preview?.photo ?? null,
        _raw: fetched,
      });
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, publicApi, preview]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const loadTariffs = useCallback(async () => {
    const cid = getCourseId(course) ?? courseId;
    if (!cid) return;

    setTariffsLoading(true);
    setTariffsError("");

    try {
      const r1 = await tryGet(publicApi, "/tariffs/", { params: { course_id: cid } });
      let arr = r1.ok ? extractArrayAny(r1.data) : [];

      if (!arr.length) {
        const r2 = await tryGet(publicApi, "/tariffs/", { params: { course: cid } });
        arr = r2.ok ? extractArrayAny(r2.data) : [];
      }

      const normed = (arr || []).map(normalizeTariff).filter((t) => t.id);
      const filtered = normed.filter((t) => String(t.courseId || "") === String(cid));
      setTariffs(filtered.length ? filtered : normed);
    } catch (_) {
      setTariffsError("Не удалось загрузить тарифы");
      setTariffs([]);
    } finally {
      setTariffsLoading(false);
    }
  }, [publicApi, course, courseId]);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

  /** ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: уроки всегда берем ТОЛЬКО для этого курса */
  const loadLessons = useCallback(async () => {
    const cid = String(getCourseId(course) ?? courseId ?? "").trim();
    if (!cid) return;

    setLessonsLoading(true);
    setLessonsError("");

    try {
      const embedded = extractLessonsFromCourse(course);
      if (embedded.length) {
        const filtered = embedded.filter((l) => String(l.courseId || "") === String(cid));
        const finalList = filtered.length ? filtered : [];
        finalList.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(finalList);
        if (courseLessonsCount > 0 && finalList.length === 0) {
          setLessonsError("Уроки есть, но у вложенных уроков не совпадает course_id. Проверь поле course у уроков.");
        }
        return;
      }

      let res = await tryGet(publicApi, "/lessons/", { params: { course_id: cid } });
      let arr = res.ok ? extractArrayAny(res.data) : [];

      if (!arr.length) {
        res = await tryGet(publicApi, "/lessons/", { params: { course: cid } });
        arr = res.ok ? extractArrayAny(res.data) : [];
      }

      if (arr.length) {
        const normalized = normalizeLessonsList(arr);
        const filtered = normalized.filter((l) => String(l.courseId || "") === String(cid));

        filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(filtered);

        if (courseLessonsCount > 0 && filtered.length === 0) {
          setLessonsError(
            "Уроки в курсе есть, но сервер вернул уроки без корректного course/course_id. Проверь сериализатор уроков."
          );
        }
        return;
      }

      setLessons([]);
      if (courseLessonsCount > 0) {
        setLessonsError(
          "Уроки в курсе есть, но сервер не отдаёт публичный список уроков. Добавь lessons в /courses/{id}/ или сделай публичный эндпоинт /lessons/?course_id=."
        );
      }
    } finally {
      setLessonsLoading(false);
    }
  }, [course, publicApi, courseLessonsCount, courseId]);

  useEffect(() => {
    if (didLoadLessonsRef.current) return;
    if (!course) return;
    didLoadLessonsRef.current = true;
    loadLessons();
  }, [course, loadLessons]);

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

  const stopYouTubeTimer = useCallback(() => {
    if (ytTimerRef.current) {
      clearInterval(ytTimerRef.current);
      ytTimerRef.current = null;
    }
  }, []);

  const stopHtmlVideoTimer = useCallback(() => {
    if (htmlVideoTimerRef.current) {
      clearInterval(htmlVideoTimerRef.current);
      htmlVideoTimerRef.current = null;
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

  const destroyHtmlVideo = useCallback(() => {
    stopHtmlVideoTimer();
    const v = htmlVideoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch (_) {}
    }
  }, [stopHtmlVideoTimer]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");
    setIsMuted(true);
    setIframeKey((k) => k + 1);
    destroyYouTubePlayer();
    destroyHtmlVideo();
  }, [destroyYouTubePlayer, destroyHtmlVideo]);

  const openPreview = useCallback((lessonId) => {
    setActiveLessonId(lessonId);
    setIsPaywallOpen(false);
    setIsPreviewOpen(true);
    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");
    setIsMuted(true);
    setIframeKey((k) => k + 1);
  }, []);

  useEffect(() => {
    return () => {
      destroyYouTubePlayer();
      destroyHtmlVideo();
    };
  }, [destroyYouTubePlayer, destroyHtmlVideo]);

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

  const startHtmlVideoTimer = useCallback(() => {
    stopHtmlVideoTimer();
    htmlVideoTimerRef.current = setInterval(() => {
      const v = htmlVideoRef.current;
      if (!v) return;
      const t = Number(v.currentTime || 0);
      if (t >= PREVIEW_SECONDS) {
        try {
          v.pause();
          v.currentTime = PREVIEW_SECONDS;
        } catch (_) {}
        setIsPaywallOpen(true);
        stopHtmlVideoTimer();
      }
    }, 200);
  }, [stopHtmlVideoTimer]);

  const initYouTubePlayer = useCallback(
    async (videoId) => {
      const ok = await ensureYouTubeScriptWithTimeout(3500);

      if (!ok) {
        setFallbackIframeId(videoId);
        setIsVideoReady(true);
        setVideoError("");
        setTimeout(() => setIsPaywallOpen(true), PREVIEW_SECONDS * 1000);
        return;
      }

      if (!ytMountRef.current) return;

      destroyYouTubePlayer();

      setFallbackIframeId("");
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);

      try {
        ytPlayerRef.current = new window.YT.Player(ytMountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              setIsVideoReady(true);
              setVideoError("");

              try {
                e.target.seekTo(0, true);
                if (typeof e.target.mute === "function") e.target.mute();
                e.target.playVideo();
              } catch (_) {}

              startYouTubeTimer();
            },
            onStateChange: (e) => {
              if (!window.YT) return;
              if (e?.data === window.YT.PlayerState.ENDED) {
                stopYouTubeTimer();
                setIsVideoEnded(true);
              }
            },
            onError: () => {
              setVideoError("Видео не воспроизводится. Проверь youtube_video_id на бэке.");
              setIsVideoReady(false);
              setIsVideoEnded(false);
              stopYouTubeTimer();
            },
          },
        });
      } catch (_) {
        setVideoError("Не удалось загрузить плеер.");
        setIsVideoReady(false);
        setIsVideoEnded(false);
        stopYouTubeTimer();
      }
    },
    [destroyYouTubePlayer, startYouTubeTimer, stopYouTubeTimer]
  );

  const enableSound = useCallback(() => {
    setIsMuted(false);

    const p = ytPlayerRef.current;
    if (p && typeof p.unMute === "function") {
      try {
        p.unMute();
        if (typeof p.setVolume === "function") p.setVolume(100);
        if (typeof p.playVideo === "function") p.playVideo();
      } catch (_) {}
      return;
    }

    const v = htmlVideoRef.current;
    if (v) {
      try {
        v.muted = false;
        v.volume = 1;
        v.play();
      } catch (_) {}
      return;
    }

    if (fallbackIframeId) {
      setIframeKey((k) => k + 1);
    }
  }, [fallbackIframeId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!isPreviewOpen) return;

      setIsPaywallOpen(false);
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);
      setFallbackIframeId("");
      setIsMuted(true);

      destroyYouTubePlayer();
      destroyHtmlVideo();

      const l = activeLesson;
      if (!l) {
        setVideoError("Урок не найден.");
        return;
      }

      const rawOriginal = String(activeLesson?.videoUrl || pickLessonVideo(activeLesson?._raw) || "").trim();
      const raw = isDirectVideoUrl(rawOriginal) ? toAbsUrl(rawOriginal) : rawOriginal;

      if (!raw) {
        setVideoError("В этом уроке нет видео (youtube_video_id / video_url пустой на сервере).");
        return;
      }

      const ytId = getYouTubeId(raw);
      const isDirect = isDirectVideoUrl(raw) && !ytId;

      if (!alive) return;

      if (isDirect) {
        setIsVideoReady(true);
        setVideoError("");
        setTimeout(() => startHtmlVideoTimer(), 50);
        return;
      }

      if (!ytId) {
        setVideoError("Неверная ссылка/ID. Нужен YouTube URL или videoId (11 символов) или прямой mp4/webm/ogg.");
        return;
      }

      setTimeout(() => initYouTubePlayer(ytId), 50);
    })();

    return () => {
      alive = false;
    };
  }, [
    isPreviewOpen,
    activeLesson,
    initYouTubePlayer,
    destroyYouTubePlayer,
    destroyHtmlVideo,
    startHtmlVideoTimer,
  ]);

  const scrollToTariffs = useCallback(() => {
    const el = tariffsRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function generateWhatsAppTariffLink(t) {
    const msg = `Хочу купить доступ к курсу: ${getCourseTitle(course)}
Преподаватель: ${teacherName}
Тариф: ${t?.title || t?.id}
Цена: ${t?.price || ""} сом`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  }

  if (!course && !courseLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="app-container py-12">
          <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <CardContent className="py-12 text-center">
              <p className="text-white/80">Курс не найден</p>
              <div className="mt-4">
                <Link to="/courses">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Назад к курсам
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const lessonsCountShown = courseLessonsCount || lessons.length || 0;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white overflow-x-hidden">
      {/* HERO */}
      <section className={`relative overflow-hidden ${fullBleed}`}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverUrl})` }} />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,214,10,.20),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(255,214,10,.10),transparent_55%)]" />
        </div>

        <div className="relative app-container py-14 sm:py-16">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
                {categoryName}
              </Badge>

              <span className="inline-flex items-center gap-2 text-xs sm:text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2 text-white/90">
                <BookOpen className="w-4 h-4" />
                {lessonsCountShown} уроков
              </span>

              <span className="inline-flex items-center gap-2 text-xs sm:text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2 text-white/90">
                <GraduationCap className="w-4 h-4" />
                {teacherName}
              </span>
            </div>

            <h1 className="mt-4 text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
              {getCourseTitle(course)}
            </h1>

            <p className="mt-4 text-white/80 text-base sm:text-lg max-w-3xl">
              {getCourseDesc(course)}
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
      </section>

      {/* CONTENT */}
      <div className="app-container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-white font-extrabold">Программа курса</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => loadLessons()}
                  disabled={lessonsLoading}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Обновить
                </Button>
              </CardHeader>

              <CardContent>
                {lessonsLoading && (
                  <div className="py-6 text-center text-white/70">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto" />
                    <div className="mt-2">Загружаем уроки...</div>
                  </div>
                )}

                {!lessonsLoading && lessons.length === 0 && (
                  <div className="py-6 text-center">
                    <div className="text-white font-semibold">
                      {lessonsError
                        ? "Не удалось показать список уроков."
                        : courseLessonsCount > 0
                        ? "Уроки в курсе есть, но список не пришёл."
                        : "Пока нет уроков."}
                    </div>

                    {lessonsError ? (
                      <div className="mt-2 text-sm text-white/70 max-w-xl mx-auto">{lessonsError}</div>
                    ) : null}

                    <div className="mt-4">
                      <Button
                        onClick={() => loadLessons()}
                        className="h-11 px-6 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold"
                      >
                        Проверить снова
                      </Button>
                    </div>
                  </div>
                )}

                {!lessonsLoading && lessons.length > 0 && (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => openPreview(lesson.id)}
                        className={[
                          "w-full text-left group flex items-start gap-3 p-4 rounded-2xl border transition",
                          "border-white/10 bg-black/30 hover:bg-white/5 hover:border-white/20",
                        ].join(" ")}
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm mt-0.5 font-semibold bg-white/10 text-white">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-white truncate">{lesson.title}</h4>
                              <p className="text-sm text-white/70 mt-1 line-clamp-2">{lesson.description}</p>

                              {lesson.homeworkDescription ? (
                                <div className="mt-2 text-xs text-black inline-flex items-center gap-1 bg-[#FFD70A] rounded-full px-3 py-1 font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Домашнее задание
                                </div>
                              ) : null}
                            </div>

                            <span className="shrink-0 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-white/15 bg-white/5 group-hover:bg-white/10 transition">
                              <PlayCircle className="w-5 h-5 text-white/85" />
                              <span className="hidden sm:inline text-white/90">Смотреть</span>
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card className="rounded-2xl border border-white/10 bg-white/5 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] lg:sticky lg:top-24">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-white font-extrabold">Тарифы</CardTitle>
                  <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
                    {tariffs.length || 0}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div ref={tariffsRef} />

                {tariffsLoading ? (
                  <div className="py-2 text-sm text-white/70">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50" />
                    <div className="mt-2">Загрузка тарифов...</div>
                  </div>
                ) : tariffsError ? (
                  <div className="text-sm text-red-300">{tariffsError}</div>
                ) : tariffs.length === 0 ? (
                  <div className="text-sm text-white/70">Тарифы пока не добавлены.</div>
                ) : (
                  <div className="space-y-3">
                    {tariffs.map((t, idx) => {
                      const title = t.title || t.id || `Тариф #${idx + 1}`;
                      const price = moneySom(t.price);

                      return (
                        <div
                          key={t.id}
                          className={[
                            "rounded-2xl border p-4",
                            "border-white/10 bg-black/25",
                            "transition hover:border-white/20 hover:bg-black/35",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-white truncate">{title}</div>
                              </div>

                              <div className="mt-2 flex items-end gap-2">
                                <div className="text-2xl font-extrabold text-[#FFD70A]">{price}</div>
                              </div>

                              {t.description ? (
                                <div className="mt-2 text-sm text-white/70 line-clamp-3">{t.description}</div>
                              ) : null}

                              <div className="mt-3 grid gap-2 text-sm text-white/80">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                  Доступ к урокам курса
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                  Домашние задания
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                  Активация токеном после оплаты
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <a
                              href={generateWhatsAppTariffLink(t)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Button className="w-full gap-2 h-11 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">
                                <ShoppingCart className="w-4 h-4" />
                                Купить тариф
                              </Button>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-sm font-extrabold text-white">Как это работает</div>
                  <div className="mt-2 text-sm text-white/75 space-y-2">
                    <div>1) Выбираешь тариф.</div>
                    <div>2) Оплачиваешь.</div>
                    <div>3) Тебе дают токен — активируешь в кабинете.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* =========================
          MODALS
         ========================= */}
      {isPreviewOpen && (
        <>
          {/* 1) MODAL: VIDEO PREVIEW */}
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
                  {/* VIDEO */}
                  {(() => {
                    const rawOriginal = String(activeLesson?.videoUrl || pickLessonVideo(activeLesson?._raw) || "").trim();
                    const raw = isDirectVideoUrl(rawOriginal) ? toAbsUrl(rawOriginal) : rawOriginal;
                    const ytId = getYouTubeId(raw);
                    const isDirect = isDirectVideoUrl(raw) && !ytId;

                    if (ytId) {
                      if (fallbackIframeId) {
                        return (
                          <iframe
                            key={iframeKey}
                            title="lesson-video"
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube-nocookie.com/embed/${fallbackIframeId}?autoplay=1&mute=${
                              isMuted ? 1 : 0
                            }&rel=0&modestbranding=1&playsinline=1`}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      }
                      return <div ref={ytMountRef} className="absolute inset-0 w-full h-full" />;
                    }

                    if (isDirect) {
                      return (
                        <video
                          key={iframeKey}
                          ref={htmlVideoRef}
                          src={raw}
                          className="absolute inset-0 w-full h-full object-cover bg-black"
                          muted={isMuted}
                          controls={false}
                          playsInline
                          autoPlay
                          preload="metadata"
                          onCanPlay={() => setIsVideoReady(true)}
                          onError={() => {
                            setVideoError("Не удалось воспроизвести видео файл.");
                            setIsVideoReady(false);
                          }}
                        />
                      );
                    }

                    return null;
                  })()}

                  {/* ✅ SHIELD: видео НЕ кликабельным (но кнопка звука работает) */}
                  {!videoError && (
                    <div
                      className="absolute inset-0 z-20"
                      aria-hidden="true"
                      style={{
                        cursor: "not-allowed",
                        pointerEvents: "auto",
                        background: "transparent",
                      }}
                    />
                  )}

                  {/* ✅ BUTTON: включить звук */}
                  {!videoError && isVideoReady && isMuted && (
                    <div className="absolute z-30 left-4 bottom-4">
                      <Button onClick={enableSound} className="gap-2">
                        <Volume2 className="w-4 h-4" />
                        Включить звук
                      </Button>
                    </div>
                  )}

                  {/* ERROR */}
                  {videoError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center z-30">
                      <div className="text-base font-semibold mb-2">Видео не загрузилось</div>
                      <div className="text-sm text-white/70 break-words">{videoError}</div>
                    </div>
                  )}

                  {/* LOADING */}
                  {!videoError && !isVideoReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm z-10">
                      Загрузка видео...
                    </div>
                  )}

                  {isVideoEnded ? null : null}
                </div>
              </div>
            </div>
          </div>

          {/* 2) MODAL: PAYWALL */}
          {!videoError && isPaywallOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={closePreview}
                role="button"
                tabIndex={-1}
                aria-label="Закрыть"
              />

              <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-gray-900">Доступ ограничен</div>
                  </div>

                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 rounded-xl hover:bg-gray-100 transition"
                    aria-label="Закрыть"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-900">Что дальше?</div>
                  <div className="mt-2 text-sm text-gray-700 space-y-2">
                    <div>1) Выбираешь тариф справа.</div>
                    <div>2) Оплачиваешь.</div>
                    <div>3) Получаешь токен и активируешь — уроки откроются.</div>
                  </div>
                </div>

                <div className=" text-gray-900 mt-5 grid grid-cols-2 gap-3">
                  <Button  variant="outline" onClick={closePreview}>
                    Закрыть
                  </Button>
                  <Button
                    onClick={() => {
                      closePreview();
                      setTimeout(() => scrollToTariffs(), 120);
                    }}
                  >
                    Выбрать тариф
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CoursePage;
