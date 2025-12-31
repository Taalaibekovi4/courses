import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { api as authApi } from "../lib/api.js";

import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { PlayCircle, CheckCircle, X, BookOpen, GraduationCap, ShoppingCart } from "lucide-react";

const WHATSAPP_NUMBER = "996221000953";
const PREVIEW_SECONDS = 5;

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";

const fullBleed = "w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]";
const norm = (s) => String(s ?? "").trim();

function pickCourseIdFromParams(params) {
  return String(params?.id ?? params?.slug ?? params?.courseId ?? params?.pk ?? "").trim();
}

function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
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
function getCourseTeacherId(obj) {
  return (
    obj?.instructor_id ??
    obj?.instructorId ??
    obj?.teacherId ??
    obj?.teacher_id ??
    obj?.teacher ??
    obj?.teacher?.id ??
    obj?.instructor ??
    obj?.instructor?.id ??
    null
  );
}
function getCourseCategoryId(obj) {
  return obj?.categoryId ?? obj?.category_id ?? obj?.category ?? obj?.category?.id ?? null;
}

/**
 * ✅ Берём видео строго из youtube_video_id (или совместимых полей),
 * т.к. по твоей схеме /lessons/{id} — это основной источник.
 */
function pickLessonVideo(obj) {
  const v =
    obj?.youtube_video_id ||
    obj?.youtubeVideoId ||
    obj?.youtube_id ||
    obj?.video_url ||
    obj?.videoUrl ||
    obj?.video ||
    obj?.url ||
    "";
  return String(v || "").trim();
}

function normalizeLessonCourseId(l) {
  const cid = l?.courseId ?? l?.course_id ?? l?.course ?? l?.course?.id ?? "";
  return String(cid || "");
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

  const arr = extractArray(raw);
  if (!arr.length) return [];
  return arr.map((l, idx) => ({
    id: l?.id ?? l?.pk ?? `embedded-${idx + 1}`,
    title: l?.title || l?.name || `Урок ${idx + 1}`,
    description: l?.description || "",
    order: l?.order ?? idx + 1,
    videoUrl: pickLessonVideo(l), // ✅ уже учитывает youtube_video_id
    youtubeStatus: String(l?.youtube_status || ""),
    youtubeError: String(l?.youtube_error || ""),
    homeworkDescription: l?.homework_description || "",
    courseId: normalizeLessonCourseId(l),
    _raw: l,
  }));
}

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

function getAccessTokenAny() {
  try {
    const ls = window.localStorage;
    return (
      ls.getItem("access") ||
      ls.getItem("token") ||
      ls.getItem("jwt_access") ||
      ls.getItem("authToken") ||
      ""
    );
  } catch (_) {
    return "";
  }
}

async function tryGet(apiInstance, paths, config = {}) {
  let last = null;
  for (const p of paths) {
    try {
      const r = await apiInstance.get(p, config);
      return { ok: true, data: r.data, path: p };
    } catch (e) {
      last = e;
      const code = e?.response?.status;
      if (code === 401) break;
    }
  }
  return { ok: false, error: last?.message || "Ошибка запроса" };
}

async function tryPost(apiInstance, paths, payload, config = {}) {
  let last = null;
  for (const p of paths) {
    try {
      const r = await apiInstance.post(p, payload, config);
      return { ok: true, data: r.data, path: p };
    } catch (e) {
      last = e;
      const code = e?.response?.status;
      if (code === 401) break;
    }
  }
  return { ok: false, error: last?.message || "Ошибка запроса" };
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

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

function moneySom(v) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return `${s} сом`;
}

function normalizeTariff(t) {
  return {
    id: String(t?.id ?? ""),
    title: String(t?.title ?? ""),
    price: String(t?.price ?? ""),
    limitType: String(t?.limit_type ?? t?.limitType ?? ""),
    limitValue: Number(t?.limit_value ?? t?.limitValue ?? 0),
    videoLimit: Number(t?.video_limit ?? t?.videoLimit ?? 0),
    courseId: String(t?.course ?? t?.course_id ?? t?.courseId ?? ""),
    courseTitle: String(t?.course_title ?? t?.courseTitle ?? ""),
    _raw: t,
  };
}

export function CoursePage() {
  const params = useParams();
  const courseId = pickCourseIdFromParams(params);

  const location = useLocation();
  const preview = location?.state?.coursePreview || null;

  const publicApi = useMemo(() => axios.create({ baseURL: "/api", timeout: 20000 }), []);
  const privateApi = useMemo(() => authApi, []);

  const [course, setCourse] = useState(() => {
    const pid = getCourseId(preview);
    if (pid != null && String(pid) === String(courseId)) return preview;
    if (preview?.slug && String(preview.slug) === String(courseId)) return preview;
    return null;
  });

  const [courseLoading, setCourseLoading] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsState, setLessonsState] = useState({ mode: "idle", message: "" });

  const [tariffs, setTariffs] = useState([]);
  const [tariffsLoading, setTariffsLoading] = useState(false);
  const [tariffsError, setTariffsError] = useState("");

  const [selectedLessonIds, setSelectedLessonIds] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [fallbackIframeId, setFallbackIframeId] = useState("");

  const tariffsRef = useRef(null);
  const playRequestedRef = useRef(false);

  const ytWrapRef = useRef(null);
  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);
  const uiTimerRef = useRef(null);
  const progTimerRef = useRef(null);

  // ---------------------------
  // LOAD COURSE (public) + merge with preview
  // ---------------------------
  const loadCourse = useCallback(async () => {
    const cid = String(courseId || "").trim();
    if (!cid) return;

    setCourseLoading(true);
    try {
      const res = await tryGet(publicApi, [`/courses/${cid}/`, `/vitrina/courses/${cid}/`]);
      if (!res.ok || !res.data) {
        setCourse(null);
        return;
      }

      const fetched = res.data;

      const merged = {
        id: getCourseId(fetched) ?? preview?.id ?? cid,
        title: getCourseTitle(fetched) || preview?.title || "Курс",
        description: getCourseDesc(fetched) || preview?.description || "",
        lessonsCount: fetched?.lessonsCount ?? fetched?.lessons_count ?? preview?.lessonsCount ?? 0,
        teacherId: getCourseTeacherId(fetched) ?? preview?.teacherId ?? null,
        categoryId: getCourseCategoryId(fetched) ?? preview?.categoryId ?? null,
        teacherName:
          getTeacherNameFromAny(fetched) !== "—"
            ? getTeacherNameFromAny(fetched)
            : preview?.teacherName || "—",
        categoryName: getCategoryNameFromAny(fetched) || preview?.categoryName || "",
        _raw: fetched,
      };

      setCourse(merged);
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, publicApi, preview]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const categoryName = useMemo(
    () => getCategoryNameFromAny(course) || course?.categoryName || "Категория",
    [course]
  );
  const teacherName = useMemo(() => getTeacherNameFromAny(course) || course?.teacherName || "—", [course]);

  // ---------------------------
  // LOAD TARIFFS
  // ---------------------------
  const loadTariffs = useCallback(async () => {
    const cid = getCourseId(course) ?? courseId;
    if (!cid) return;

    setTariffsLoading(true);
    setTariffsError("");

    try {
      let res = await tryGet(publicApi, ["/tariffs/", "/vitrina/tariffs/"], { params: { course_id: cid } });
      let arr = extractArray(res?.data);

      if (!arr.length) {
        res = await tryGet(publicApi, ["/tariffs/", "/vitrina/tariffs/"], { params: { course: cid } });
        arr = extractArray(res?.data);
      }

      const normed = (arr || []).map(normalizeTariff).filter((t) => t.id);
      const filtered = normed.filter((t) => String(t.courseId || "") === String(cid));

      setTariffs(filtered);
    } catch (e) {
      console.error(e);
      setTariffsError("Не удалось загрузить тарифы");
      setTariffs([]);
    } finally {
      setTariffsLoading(false);
    }
  }, [publicApi, course, courseId]);

  useEffect(() => {
    loadTariffs();
  }, [loadTariffs]);

  // ---------------------------
  // LOAD LESSONS (строго для курса)
  // ---------------------------
  const loadLessons = useCallback(async () => {
    const cid = getCourseId(course);
    if (!cid) return;

    setLessonsLoading(true);
    setLessonsState({ mode: "idle", message: "" });

    try {
      const embedded = extractLessonsFromCourse(course);
      if (embedded.length) {
        const filtered = embedded.filter((l) => String(l.courseId || cid) === String(cid));
        filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(filtered);
        setLessonsState({ mode: "ok", message: "" });
        return;
      }

      let pub = await tryGet(
        publicApi,
        ["/lessons/public/", "/vitrina/lessons/public/", "/lessons/", "/vitrina/lessons/"],
        { params: { course_id: cid } }
      );

      let pubArr = extractArray(pub?.data);

      if (!pubArr.length) {
        pub = await tryGet(
          publicApi,
          ["/lessons/public/", "/vitrina/lessons/public/", "/lessons/", "/vitrina/lessons/"],
          { params: { course: cid } }
        );
        pubArr = extractArray(pub?.data);
      }

      if (pubArr.length) {
        const normalized = pubArr.map((l, idx) => ({
          id: l?.id ?? l?.pk ?? `lesson-${idx + 1}`,
          title: l?.title || l?.name || `Урок ${idx + 1}`,
          description: l?.description || "",
          order: l?.order ?? idx + 1,
          videoUrl: pickLessonVideo(l), // ✅ включает youtube_video_id
          youtubeStatus: String(l?.youtube_status || ""),
          youtubeError: String(l?.youtube_error || ""),
          homeworkDescription: l?.homework_description || "",
          courseId: normalizeLessonCourseId(l),
          _raw: l,
        }));

        const filtered = normalized.filter((l) => String(l.courseId || "") === String(cid));
        filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setLessons(filtered);
        setLessonsState({ mode: "ok", message: "" });
        return;
      }

      const access = getAccessTokenAny();
      if (access) {
        let priv = await tryGet(
          privateApi,
          ["/lessons/", "/my/lessons/", "/my-courses/lessons/", "/student/lessons/"],
          { params: { course_id: cid } }
        );

        let privArr = extractArray(priv?.data);

        if (!privArr.length) {
          priv = await tryGet(
            privateApi,
            ["/lessons/", "/my/lessons/", "/my-courses/lessons/", "/student/lessons/"],
            { params: { course: cid } }
          );
          privArr = extractArray(priv?.data);
        }

        if (privArr.length) {
          const normalized = privArr.map((l, idx) => ({
            id: l?.id ?? l?.pk ?? `lesson-${idx + 1}`,
            title: l?.title || l?.name || `Урок ${idx + 1}`,
            description: l?.description || "",
            order: l?.order ?? idx + 1,
            videoUrl: pickLessonVideo(l), // ✅
            youtubeStatus: String(l?.youtube_status || ""),
            youtubeError: String(l?.youtube_error || ""),
            homeworkDescription: l?.homework_description || "",
            courseId: normalizeLessonCourseId(l),
            _raw: l,
          }));

          const filtered = normalized.filter((l) => String(l.courseId || "") === String(cid));
          filtered.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
          setLessons(filtered);
          setLessonsState({ mode: "ok", message: "" });
          return;
        }
      }

      const count = Number(course?.lessonsCount ?? course?._raw?.lessons_count ?? 0);
      if (count > 0) {
        setLessons([]);
        setLessonsState({
          mode: "backend_not_ready",
          message:
            "Уроки есть, но сервер не отдаёт их для витрины. Нужно: либо вернуть lessons в /courses/{id}/, либо сделать public endpoint списка уроков.",
        });
        return;
      }

      setLessons([]);
      setLessonsState({ mode: "course_empty", message: "" });
    } finally {
      setLessonsLoading(false);
    }
  }, [course, publicApi, privateApi]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // ---------------------------
  // LESSON UI
  // ---------------------------
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

  // ---------------------------
  // YT timers
  // ---------------------------
  const stopYouTubeTimer = useCallback(() => {
    if (ytTimerRef.current) {
      clearInterval(ytTimerRef.current);
      ytTimerRef.current = null;
    }
  }, []);
  const stopProgTimer = useCallback(() => {
    if (progTimerRef.current) {
      clearInterval(progTimerRef.current);
      progTimerRef.current = null;
    }
  }, []);
  const stopUiTimer = useCallback(() => {
    if (uiTimerRef.current) {
      clearTimeout(uiTimerRef.current);
      uiTimerRef.current = null;
    }
  }, []);

  const destroyYouTubePlayer = useCallback(() => {
    stopYouTubeTimer();
    stopProgTimer();
    stopUiTimer();
    const p = ytPlayerRef.current;
    ytPlayerRef.current = null;
    if (p && typeof p.destroy === "function") {
      try {
        p.destroy();
      } catch (_) {}
    }
  }, [stopYouTubeTimer, stopProgTimer, stopUiTimer]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");

    setIsPlaying(false);
    setIsMuted(false);
    setCurTime(0);
    setDuration(0);
    setControlsVisible(true);

    playRequestedRef.current = false;
    destroyYouTubePlayer();
  }, [destroyYouTubePlayer]);

  const openPreview = useCallback((lessonId) => {
    setActiveLessonId(lessonId);
    setIsPaywallOpen(false);
    setIsPreviewOpen(true);

    setIsVideoReady(false);
    setVideoError("");
    setIsVideoEnded(false);
    setFallbackIframeId("");

    setIsPlaying(false);
    setIsMuted(false);
    setCurTime(0);
    setDuration(0);
    setControlsVisible(true);

    playRequestedRef.current = true;
  }, []);

  useEffect(() => {
    return () => destroyYouTubePlayer();
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

  // ---------------------------
  // ✅ OPEN LESSON DETAIL (вытаскиваем youtube_video_id из /lessons/{id}/)
  // ---------------------------
  const fetchLessonDetail = useCallback(
    async (lessonId) => {
      const idNum = Number(lessonId);
      if (!Number.isFinite(idNum)) return { ok: false, lesson: null };

      const res = await tryGet(privateApi, [
        `/lessons/${idNum}/`,
        `/student/lessons/${idNum}/`,
        `/teacher/lessons/${idNum}/`,
      ]);

      if (!res.ok) return { ok: false, lesson: null };
      return { ok: true, lesson: res.data };
    },
    [privateApi]
  );

  // ---------------------------
  // OPEN LESSON (fallback POST)
  // ---------------------------
  const openLessonViaApi = useCallback(
    async (lessonId) => {
      const idNum = Number(lessonId);
      if (!Number.isFinite(idNum)) return { ok: false, lesson: null };

      const res = await tryPost(
        privateApi,
        ["/lessons/open/", "/open-lesson/", "/lessons/open-lesson/", "/student/open-lesson/"],
        { lesson_id: idNum }
      );

      if (!res.ok) return { ok: false, lesson: null };
      const lessonObj = res?.data?.lesson || res?.data || null;
      return { ok: true, lesson: lessonObj };
    },
    [privateApi]
  );

  // ---------------------------
  // PREVIEW CONTROL
  // ---------------------------
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
      setIsPlaying(false);
      stopYouTubeTimer();
    }
  }, [stopYouTubeTimer]);

  const startYouTubeTimer = useCallback(() => {
    stopYouTubeTimer();
    ytTimerRef.current = setInterval(clampPreviewYouTube, 200);
  }, [clampPreviewYouTube, stopYouTubeTimer]);

  const pullPlayerState = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p) return;
    try {
      if (typeof p.getCurrentTime === "function") setCurTime(Number(p.getCurrentTime() || 0));
      if (typeof p.getDuration === "function") setDuration(Number(p.getDuration() || 0));
      if (typeof p.isMuted === "function") setIsMuted(Boolean(p.isMuted()));
    } catch (_) {}
  }, []);

  const startProgTimer = useCallback(() => {
    stopProgTimer();
    progTimerRef.current = setInterval(pullPlayerState, 250);
  }, [pullPlayerState, stopProgTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    stopUiTimer();
    uiTimerRef.current = setTimeout(() => setControlsVisible(false), 2000);
  }, [stopUiTimer]);

  const togglePlay = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p || isPaywallOpen || isVideoEnded || videoError || fallbackIframeId) return;

    try {
      const state = typeof p.getPlayerState === "function" ? p.getPlayerState() : null;
      const isCurrentlyPlaying = window.YT && state === window.YT.PlayerState.PLAYING;

      if (isCurrentlyPlaying) {
        p.pauseVideo();
        setIsPlaying(false);
      } else {
        p.playVideo();
        setIsPlaying(true);
      }
    } catch (_) {}

    showControls();
  }, [isPaywallOpen, isVideoEnded, videoError, showControls, fallbackIframeId]);

  const toggleMute = useCallback(() => {
    const p = ytPlayerRef.current;
    if (!p || isPaywallOpen || isVideoEnded || videoError || fallbackIframeId) return;

    try {
      if (typeof p.isMuted === "function" && p.isMuted()) {
        p.unMute();
        setIsMuted(false);
      } else {
        p.mute();
        setIsMuted(true);
      }
    } catch (_) {}

    showControls();
  }, [isPaywallOpen, isVideoEnded, videoError, showControls, fallbackIframeId]);

  const seekTo = useCallback(
    (t) => {
      const p = ytPlayerRef.current;
      if (!p || isPaywallOpen || isVideoEnded || videoError || fallbackIframeId) return;

      const next = Math.max(0, Math.min(Number(t) || 0, duration || 0));
      try {
        p.seekTo(next, true);
        setCurTime(next);
      } catch (_) {}

      showControls();
    },
    [duration, isPaywallOpen, isVideoEnded, videoError, showControls, fallbackIframeId]
  );

  const toggleFullscreen = useCallback(() => {
    const el = ytWrapRef.current;
    if (!el) return;

    const doc = document;
    const fsEl = doc.fullscreenElement;

    if (!fsEl) {
      const req =
        el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) req.call(el);
    } else {
      const exit =
        doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exit) exit.call(doc);
    }
    showControls();
  }, [showControls]);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------------------------
  // INIT PLAYER
  // ---------------------------
  const initYouTubePlayer = useCallback(
    async (videoId) => {
      const ok = await ensureYouTubeScriptWithTimeout(3500);

      if (!ok) {
        setFallbackIframeId(videoId);
        setIsVideoReady(true);
        setVideoError("");
        setIsPlaying(true);
        setCurTime(0);
        setDuration(0);
        return;
      }

      if (!ytMountRef.current) return;

      destroyYouTubePlayer();

      setFallbackIframeId("");
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);
      setIsPlaying(false);
      setCurTime(0);
      setDuration(0);
      setIsMuted(false);
      setControlsVisible(true);

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
                e.target.playVideo();
              } catch (_) {}

              try {
                setDuration(Number(e.target.getDuration?.() || 0));
                setIsMuted(Boolean(e.target.isMuted?.() || false));
              } catch (_) {}

              setIsPlaying(true);
              startYouTubeTimer();
              startProgTimer();
              showControls();
            },
            onStateChange: (e) => {
              if (!window.YT) return;

              if (e?.data === window.YT.PlayerState.PLAYING) {
                setIsVideoReady(true);
                setIsVideoEnded(false);
                setIsPlaying(true);
                startYouTubeTimer();
                startProgTimer();
                return;
              }

              if (e?.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                return;
              }

              if (e?.data === window.YT.PlayerState.ENDED) {
                stopYouTubeTimer();
                stopProgTimer();
                setIsVideoEnded(true);
                setIsPlaying(false);
                try {
                  e.target.stopVideo();
                  e.target.seekTo(0, true);
                } catch (_) {}
              }
            },
            onError: () => {
              setVideoError("Видео не воспроизводится. Проверь youtube_video_id на бэке.");
              setIsVideoReady(false);
              setIsVideoEnded(false);
              setIsPlaying(false);
              stopYouTubeTimer();
              stopProgTimer();
            },
          },
        });
      } catch (_) {
        setVideoError("Не удалось загрузить плеер.");
        setIsVideoReady(false);
        setIsVideoEnded(false);
        setIsPlaying(false);
        stopYouTubeTimer();
        stopProgTimer();
      }
    },
    [destroyYouTubePlayer, startYouTubeTimer, stopYouTubeTimer, startProgTimer, stopProgTimer, showControls]
  );

  // при открытии превью: берем видео из урока, если пусто — тянем detail /lessons/{id}/ и только потом fallback openLesson
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!isPreviewOpen) return;

      setIsPaywallOpen(false);
      setIsVideoReady(false);
      setVideoError("");
      setIsVideoEnded(false);
      setIsPlaying(false);
      setCurTime(0);
      setDuration(0);
      setIsMuted(false);
      setControlsVisible(true);
      setFallbackIframeId("");

      const l = activeLesson;
      if (!l) {
        setVideoError("Урок не найден.");
        return;
      }

      let raw = String(l?.videoUrl || pickLessonVideo(l?._raw) || "").trim();
      let ytId = getYouTubeId(raw);

      // ✅ если в списке уроков нет youtube_video_id — берём из /lessons/{id}/
      if (!ytId) {
        const access = getAccessTokenAny();
        if (!access) {
          setIsPaywallOpen(true);
          setVideoError("Чтобы открыть видео, нужен вход/токен.");
          return;
        }

        const detail = await fetchLessonDetail(l.id);
        if (!alive) return;

        const detailVideo = pickLessonVideo(detail?.lesson);
        raw = String(detailVideo || raw || "").trim();
        ytId = getYouTubeId(raw);
      }

      // ✅ fallback: если detail недоступен — пробуем твой openLesson POST
      if (!ytId) {
        const access = getAccessTokenAny();
        if (!access) {
          setIsPaywallOpen(true);
          setVideoError("Чтобы открыть видео, нужен вход/токен.");
          return;
        }

        const opened = await openLessonViaApi(l.id);
        if (!alive) return;

        const openedVideo = pickLessonVideo(opened?.lesson);
        raw = String(openedVideo || raw || "").trim();
        ytId = getYouTubeId(raw);
      }

      if (!raw) {
        setVideoError("В этом уроке нет видео (youtube_video_id пустой на сервере).");
        return;
      }

      if (!ytId) {
        setVideoError("Неверная ссылка/ID. Нужен YouTube URL или videoId (11 символов).");
        return;
      }

      if (playRequestedRef.current) {
        setTimeout(() => initYouTubePlayer(ytId), 50);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isPreviewOpen, activeLesson, fetchLessonDetail, openLessonViaApi, initYouTubePlayer]);

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

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  function generateWhatsAppSelectedLessonsLink() {
    const count = selectedLessons.length;
    if (!count) return "#";

    const list = selectedLessons.map((l, i) => `${i + 1}) ${l.title}`).join("\n");

    const msg = `Хочу доступ к урокам курса: ${getCourseTitle(course)}
Преподаватель: ${teacherName}
Нужно уроков: ${count}

Список уроков:
${list}`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  if (!course && !courseLoading) {
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

  const coverUrl = FALLBACK_COVER;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <section className={`relative text-white overflow-hidden ${fullBleed}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700/85 to-purple-700/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />

        <div className="relative app-container py-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/20" variant="secondary">
                {categoryName}
              </Badge>

              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <BookOpen className="w-4 h-4" />
                {Number(course?.lessonsCount ?? course?._raw?.lessons_count ?? lessons.length ?? 0)} уроков
              </span>

              <span className="inline-flex items-center gap-2 text-sm bg-white/10 border border-white/15 rounded-md px-3 py-2">
                <GraduationCap className="w-4 h-4" />
                {teacherName}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl mt-4 leading-tight">{getCourseTitle(course)}</h1>
            <p className="text-lg sm:text-xl text-white/90 mt-3 max-w-3xl">{getCourseDesc(course)}</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      <div className="app-container py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Программа курса</CardTitle>
                <Button variant="outline" onClick={() => loadLessons()} disabled={lessonsLoading}>
                  Обновить
                </Button>
              </CardHeader>

              <CardContent>
                {lessonsLoading && (
                  <div className="py-6 text-center text-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto" />
                    <div className="mt-2">Загружаем уроки...</div>
                  </div>
                )}

                {!lessonsLoading && lessons.length === 0 && lessonsState.mode === "backend_not_ready" && (
                  <div className="py-6 text-center">
                    <div className="text-gray-900 font-semibold">Уроки скрыты сервером</div>
                    <div className="mt-2 text-sm text-gray-600">{lessonsState.message}</div>
                    <div className="mt-4">
                      <Button onClick={() => loadLessons()}>Проверить снова</Button>
                    </div>
                  </div>
                )}

                {!lessonsLoading && lessons.length === 0 && lessonsState.mode === "course_empty" && (
                  <div className="py-6 text-center text-gray-600">Пока уроки не добавлены.</div>
                )}

                {!lessonsLoading && lessons.length > 0 && (
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm lg:sticky lg:top-24">
              <CardHeader>
                <CardTitle>Тарифы</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div ref={tariffsRef} />

                {tariffsLoading ? (
                  <div className="py-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700" />
                    <div className="mt-2">Загрузка тарифов...</div>
                  </div>
                ) : tariffsError ? (
                  <div className="text-sm text-red-600">{tariffsError}</div>
                ) : tariffs.length === 0 ? (
                  <div className="text-sm text-gray-600">Тарифы пока не добавлены.</div>
                ) : (
                  <div className="space-y-3">
                    {tariffs.map((t) => (
                      <div key={t.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{t.title || `Тариф #${t.id}`}</div>
                            <div className="text-sm text-gray-600 mt-1">{moneySom(t.price)}</div>
                          </div>

                          <a href={generateWhatsAppTariffLink(t)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <Button variant="outline" className="gap-2">
                              <ShoppingCart className="w-4 h-4" />
                              Купить
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                    <p className="mt-2 text-sm text-gray-600">Выбери уроки слева — и купи их одним сообщением.</p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" />

          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold truncate pr-3">{activeLesson?.title || "Просмотр урока"}</div>
              <button type="button" onClick={closePreview} className="p-2 rounded-xl hover:bg-gray-100 transition" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-gray-950">
              <div ref={ytWrapRef} className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {fallbackIframeId ? (
                  <iframe
                    title="lesson-video"
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${fallbackIframeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div ref={ytMountRef} className="absolute inset-0 w-full h-full" />
                )}

                {!videoError && !isPaywallOpen && !isVideoEnded && !fallbackIframeId && (
                  <div
                    className="absolute inset-0 z-20"
                    onMouseMove={showControls}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePlay();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    aria-hidden="true"
                    style={{ cursor: "pointer" }}
                  />
                )}

                {!isVideoReady && !videoError && !fallbackIframeId && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                  </div>
                )}

                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center z-30">
                    <div className="text-base font-semibold mb-2">Видео не загрузилось</div>
                    <div className="text-sm text-white/70 break-words">{videoError}</div>
                  </div>
                )}

                {!videoError && !isPaywallOpen && !isVideoEnded && !fallbackIframeId && (
                  <div
                    className={[
                      "absolute left-0 right-0 bottom-0 z-40 px-3 pb-3 pt-10",
                      "transition-opacity",
                      controlsVisible ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.0))",
                      pointerEvents: "none",
                    }}
                  >
                    <div className="flex items-center gap-3" style={{ pointerEvents: "auto" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePlay();
                        }}
                        className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center"
                        aria-label={isPlaying ? "Пауза" : "Плей"}
                      >
                        <PlayCircle className="w-6 h-6" />
                      </button>

                      <div className="text-xs text-white/80 whitespace-nowrap">
                        {fmtTime(curTime)} / {fmtTime(duration)}
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, Math.floor(duration || 0))}
                        value={Math.min(Math.floor(curTime || 0), Math.floor(duration || 0))}
                        onChange={(e) => seekTo(e.target.value)}
                        className="flex-1"
                        style={{ accentColor: "white" }}
                        aria-label="Прогресс"
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white"
                        aria-label={isMuted ? "Включить звук" : "Выключить звук"}
                      >
                        {isMuted ? "🔇" : "🔊"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                        className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white"
                        aria-label="Полноэкранный режим"
                      >
                        {isFs ? "⤡" : "⤢"}
                      </button>
                    </div>
                  </div>
                )}

                {isPaywallOpen && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-30">
                    <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-xl">
                      <div className="text-lg font-semibold">Нужен доступ</div>
                      <p className="text-sm text-gray-600 mt-1">Для просмотра нужен токен/вход.</p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={closePreview}>
                          Закрыть
                        </Button>
                        <Button
                          onClick={() => {
                            closePreview();
                            setTimeout(() => scrollToTariffs(), 100);
                          }}
                        >
                          Тарифы
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursePage;
