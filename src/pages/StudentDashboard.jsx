// src/pages/StudentDashboard.jsx
import React, { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Key,
  Archive,
  RotateCcw,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Volume2,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useData } from "../contexts/DataContext.jsx";

import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/card.jsx";
import { Badge } from "../components/ui/badge.jsx";
import { Progress } from "../components/ui/progress.jsx";

const TAB_VALUES = new Set(["courses", "homework", "activate", "archive"]);
const LS_HW_ARCHIVE = "student_hw_archive_v1";

// ⚠️ как в CoursePage — превью 5 сек
const PREVIEW_SECONDS = 5;

// ===== utils =====
const norm = (s) => String(s ?? "").trim();
const str = (v) => String(v ?? "").trim();

const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "";
const API_ORIGIN = norm(API_BASE_RAW).replace(/\/api\/?$/i, "").replace(/\/$/, "");

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

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
  return String(
    hw?.lesson ?? hw?.lesson_id ?? hw?.lessonId ?? hw?.lesson?.id ?? hw?.lesson?.pk ?? ""
  );
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

// ====== YOUTUBE / VIDEO logic (как в CoursePage) ======
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

// пытаемся достать видео из hw (поддержка разных полей)
function pickHwVideo(hw) {
  const raw =
    hw?.video_url ||
    hw?.videoUrl ||
    hw?.lesson_video_url ||
    hw?.lessonVideoUrl ||
    hw?.lesson?.video_url ||
    hw?.lesson?.videoUrl ||
    hw?.lesson?.video ||
    hw?.lesson?.url ||
    hw?.lesson?.youtube_video_id ||
    hw?.lesson?.youtubeId ||
    hw?.youtube_video_id ||
    hw?.youtubeId ||
    "";
  const s = String(raw || "").trim();
  if (!s) return "";
  // если это файл и начинается с /media — делаем абсолютным
  return isDirectVideoUrl(s) ? toAbsUrl(s) : s;
}

function getAccessToken() {
  try {
    return localStorage.getItem("access") || localStorage.getItem("token") || "";
  } catch (_) {
    return "";
  }
}

// ====== VIDEO MODAL (для ДЗ) ======
function VideoPreviewModal({ open, title, videoSrc, onClose }) {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [fallbackIframeId, setFallbackIframeId] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytTimerRef = useRef(null);

  const htmlVideoRef = useRef(null);
  const htmlVideoTimerRef = useRef(null);

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

  const close = useCallback(() => {
    setIsPaywallOpen(false);
    setIsVideoReady(false);
    setVideoError("");
    setFallbackIframeId("");
    setIsMuted(true);
    setIframeKey((k) => k + 1);
    destroyYouTubePlayer();
    destroyHtmlVideo();
    onClose?.();
  }, [destroyYouTubePlayer, destroyHtmlVideo, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
            onError: () => {
              setVideoError("Видео не воспроизводится. Проверь youtube_video_id на бэке.");
              setIsVideoReady(false);
              stopYouTubeTimer();
            },
          },
        });
      } catch (_) {
        setVideoError("Не удалось загрузить плеер.");
        setIsVideoReady(false);
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
    if (!open) return;

    let alive = true;

    (async () => {
      setIsPaywallOpen(false);
      setIsVideoReady(false);
      setVideoError("");
      setFallbackIframeId("");
      setIsMuted(true);

      destroyYouTubePlayer();
      destroyHtmlVideo();

      const rawOriginal = String(videoSrc || "").trim();
      const raw = isDirectVideoUrl(rawOriginal) ? toAbsUrl(rawOriginal) : rawOriginal;

      if (!raw) {
        setVideoError("Видео не найдено.");
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
        setVideoError("Неверная ссылка/ID. Нужен YouTube URL/ID или прямой mp4/webm/ogg.");
        return;
      }

      setTimeout(() => initYouTubePlayer(ytId), 50);
    })();

    return () => {
      alive = false;
    };
  }, [open, videoSrc, initYouTubePlayer, destroyYouTubePlayer, destroyHtmlVideo, startHtmlVideoTimer]);

  if (!open) return null;

  const rawOriginal = String(videoSrc || "").trim();
  const raw = isDirectVideoUrl(rawOriginal) ? toAbsUrl(rawOriginal) : rawOriginal;
  const ytId = getYouTubeId(raw);
  const isDirect = isDirectVideoUrl(raw) && !ytId;

  return (
    <>
      {/* VIDEO MODAL */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/70" onClick={close} role="button" tabIndex={-1} aria-label="Закрыть" />

        <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold truncate pr-3">{title || "Просмотр"}</div>
            <button type="button" onClick={close} className="p-2 rounded-xl hover:bg-gray-100 transition" aria-label="Закрыть">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative bg-gray-950">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              {/* VIDEO */}
              {ytId ? (
                fallbackIframeId ? (
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
                ) : (
                  <div ref={ytMountRef} className="absolute inset-0 w-full h-full" />
                )
              ) : isDirect ? (
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
              ) : null}

              {/* SHIELD (как у тебя) */}
              {!videoError && (
                <div
                  className="absolute inset-0 z-20"
                  aria-hidden="true"
                  style={{ cursor: "not-allowed", pointerEvents: "auto", background: "transparent" }}
                />
              )}

              {/* SOUND BTN */}
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
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm z-10">Загрузка видео...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAYWALL */}
      {!videoError && isPaywallOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={close} role="button" tabIndex={-1} aria-label="Закрыть" />

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-gray-900">Доступ ограничен</div>
              </div>

              <button type="button" onClick={close} className="p-2 rounded-xl hover:bg-gray-100 transition" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Что дальше?</div>
              <div className="mt-2 text-sm text-gray-700 space-y-2">
                <div>1) Купи доступ к курсу.</div>
                <div>2) Получи токен.</div>
                <div>3) Активируй токен — уроки откроются.</div>
              </div>
            </div>

            <div className="text-gray-900 mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={close}>
                Закрыть
              </Button>
              <Link to="/courses">
                <Button className="w-full">К курсам</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
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

  const myCoursesRaw = useMemo(() => (Array.isArray(data.myCourses) ? data.myCourses : []), [data.myCourses]);

  // ====== подтягиваем преподавателя (и прочее) по /courses/{id}/ ======
  const [courseExtra, setCourseExtra] = useState({}); // { [courseId]: fetchedCourse }
  const API_BASE = useMemo(() => getApiBase(), []);
  const authApi = useMemo(() => {
    const token = getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return axios.create({ baseURL: API_BASE, timeout: 20000, headers });
  }, [API_BASE]);

  useEffect(() => {
    if (!user?.id) return;
    const ids = myCoursesRaw.map(getCourseId).filter(Boolean);
    if (!ids.length) return;

    let alive = true;

    (async () => {
      const next = {};
      for (const cid of ids) {
        try {
          const r = await authApi.get(`/courses/${encodeURIComponent(String(cid))}/`);
          if (!alive) return;
          next[String(cid)] = r.data || null;
        } catch (_) {
          // не ломаем UI — просто пропускаем
        }
      }
      if (!alive) return;
      setCourseExtra((prev) => ({ ...prev, ...next }));
    })();

    return () => {
      alive = false;
    };
  }, [user?.id, myCoursesRaw, authApi]);

  // объединённый список курсов (не меняем остальную логику)
  const myCourses = useMemo(() => {
    return myCoursesRaw.map((c) => {
      const cid = getCourseId(c);
      const extra = cid ? courseExtra[String(cid)] : null;
      // extra может содержать teacher_name / teacher / instructor_name и т.д.
      return extra ? { ...c, ...extra, _extra: extra } : c;
    });
  }, [myCoursesRaw, courseExtra]);

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

  // ====== video modal state (для ДЗ) ======
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalTitle, setVideoModalTitle] = useState("");
  const [videoModalSrc, setVideoModalSrc] = useState("");

  const openHwVideo = useCallback((hw) => {
    const src = pickHwVideo(hw);
    if (!src) {
      toast.error("Видео для этого задания не найдено");
      return;
    }
    setVideoModalTitle(`${hw?.course_title || "Курс"} — ${getHwTitle(hw)}`);
    setVideoModalSrc(src);
    setVideoModalOpen(true);
  }, []);

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

                // ✅ подтянули препода (если сервер отдаёт в /courses/{id}/)
                const teacher = getTeacherName(course) || "—";
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

                const hwVideo = pickHwVideo(hw); // может быть пустым — тогда кнопку не показываем

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

                        {/* ✅ видео-превью (как CoursePage) */}
                        {hwVideo ? (
                          <Button
                            variant="outline"
                            onClick={() => openHwVideo(hw)}
                            className="gap-2"
                            title="Посмотреть превью видео (5 секунд)"
                          >
                            <PlayCircle className="w-4 h-4" />
                            Смотреть
                          </Button>
                        ) : null}

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

      {/* VIDEO MODAL (homework preview) */}
      <VideoPreviewModal
        open={videoModalOpen}
        title={videoModalTitle}
        videoSrc={videoModalSrc}
        onClose={() => setVideoModalOpen(false)}
      />
    </div>
  );
}

export default StudentDashboard;
