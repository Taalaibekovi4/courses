// src/contexts/DataContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/**
 * .env:
 * VITE_API_URL=http://127.0.0.1:8000/api/
 *
 * baseURL должен быть без хвостового "/".
 */
const rawBase =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "";

const API_BASE = String(rawBase || "").trim().replace(/\/+$/, "");

const LS_ACCESS = "access";

function getAccessToken() {
  try {
    return localStorage.getItem(LS_ACCESS) || "";
  } catch (_) {
    return "";
  }
}

export function setAccessToken(token) {
  try {
    if (token) localStorage.setItem(LS_ACCESS, token);
  } catch (_) {}
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(LS_ACCESS);
  } catch (_) {}
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 11125000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function getErrMsg(e) {
  const data = e?.response?.data;
  const code = e?.response?.status;

  if (code === 0 || e?.message === "Network Error") return "Сеть/сервер недоступен";
  if (!data) return e?.message || "Ошибка запроса";

  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);

  try {
    const keys = Object.keys(data);
    if (keys.length) {
      const k = keys[0];
      const v = data[k];
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      return `${k}: ${String(v)}`;
    }
  } catch (_) {}

  return "Ошибка запроса";
}

function asList(x) {
  if (Array.isArray(x)) return x;
  if (x?.results && Array.isArray(x.results)) return x.results;
  return [];
}

const norm = (s) => String(s ?? "").trim();

function hasFileLike(v) {
  if (!v) return false;
  if (typeof File !== "undefined" && v instanceof File) return true;
  if (typeof Blob !== "undefined" && v instanceof Blob) return true;
  return false;
}

function buildFormData(payload) {
  const fd = new FormData();

  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined) return;

    if (v === null) {
      fd.append(k, "");
      return;
    }

    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item === undefined || item === null) return;
        fd.append(k, item);
      });
      return;
    }

    fd.append(k, v);
  });

  return fd;
}

function stripContentTypeForFormData(config) {
  const cfg = config && typeof config === "object" ? { ...config } : {};
  const headers = cfg.headers && typeof cfg.headers === "object" ? { ...cfg.headers } : {};

  Object.keys(headers).forEach((k) => {
    if (String(k).toLowerCase() === "content-type") delete headers[k];
  });

  cfg.headers = headers;
  return cfg;
}

async function tryMany(requests) {
  let lastErr = null;
  for (const fn of requests) {
    try {
      const res = await fn();
      return { ok: true, res };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, error: lastErr };
}

function pickVideoFields(data) {
  const d = data || {};
  const out = {};
  const keys = ["video_url", "youtube_video_id", "youtube_status", "youtube_error"];
  keys.forEach((k) => {
    if (d?.[k] != null && d?.[k] !== "") out[k] = d[k];
  });
  return out;
}

function pickBestVideoUrl(obj) {
  const o = obj || {};
  return o.video_url || o.youtube_video_id || "";
}

/* =========================
 * ВЫРЕЗАЕМ ВИДЕО ИЗ LESSON В СПИСКАХ СТУДЕНТА
 * ========================= */
function stripVideoFieldsFromLesson(lesson) {
  const l = { ...(lesson || {}) };
  delete l.video_url;
  delete l.youtube_video_id;
  delete l.youtube_status;
  delete l.youtube_error;
  return l;
}

function stripVideoFromLessonsList(lessons) {
  const arr = Array.isArray(lessons) ? lessons : [];
  return arr.map(stripVideoFieldsFromLesson);
}

function extractLessonIdFromAny(x) {
  const candidates = [x?.id, x?.pk, x?.lesson_id, x?.lessonId];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s && s !== "0" && s !== "null" && s !== "undefined") return s;
  }
  if (typeof x === "number" || typeof x === "string") {
    const s = String(x ?? "").trim();
    if (s) return s;
  }
  return "";
}

/* =========================
 * АКТИВАЦИЯ ДОСТУПА
 * ========================= */
function extractAccessActivatedFromAny(item) {
  const a = item?.access || item || {};

  const boolCandidates = [
    a?.activated,
    a?.is_activated,
    a?.isActivated,
    a?.token_activated,
    a?.tokenActivated,
    a?.active,
    a?.is_active,
    a?.isActive,
  ];
  for (const c of boolCandidates) {
    if (c === true) return true;
  }

  const dateCandidates = [
    a?.activated_at,
    a?.activatedAt,
    a?.token_activated_at,
    a?.tokenActivatedAt,
    a?.purchased_at,
    a?.purchasedAt,
  ];
  for (const c of dateCandidates) {
    const s = String(c ?? "").trim();
    if (s) return true;
  }

  const tokenCandidates = [a?.token, a?.token_code, a?.tokenCode, a?.access_token, a?.accessToken];
  for (const c of tokenCandidates) {
    const s = String(c ?? "").trim();
    if (s) return true;
  }

  if (a?.remaining_videos != null) return true;

  return false;
}

function extractAllowedLessonIdsFromAccess(access) {
  const a = access || {};
  const candidates = [
    a?.lesson_ids,
    a?.lessonIds,
    a?.lessons_ids,
    a?.lessonsIds,
    a?.allowed_lessons,
    a?.allowedLessons,
    a?.allowed_lesson_ids,
    a?.allowedLessonIds,
    a?.lessons,
  ];

  let arr = null;
  for (const c of candidates) {
    if (Array.isArray(c)) {
      arr = c;
      break;
    }
  }

  const set = new Set();
  if (!Array.isArray(arr)) return set;

  arr.forEach((x) => {
    const id = extractLessonIdFromAny(x);
    if (id) set.add(String(id));
  });

  return set;
}

/* =========================
 * НОРМАЛИЗАЦИЯ me/courses/
 * ========================= */
function extractCourseIdFromAny(x) {
  const candidates = [
    x?.id,
    x?.course,
    x?.course_id,
    x?.courseId,
    x?.course_pk,

    x?.access?.course,
    x?.access?.course_id,
    x?.access?.courseId,
    x?.access?.course_pk,

    x?.course_detail?.id,
    x?.course_detail?.course_id,
    x?.course_detail?.courseId,

    x?.lessons?.[0]?.course,
    x?.lessons?.[0]?.course_id,
    x?.lessons?.[0]?.courseId,
  ];

  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s && s !== "0" && s !== "null" && s !== "undefined") return s;
  }
  return "";
}

function extractCourseTitleFromAny(x) {
  const candidates = [
    x?.title,
    x?.name,
    x?.course_title,
    x?.courseTitle,
    x?.access?.course_title,
    x?.access?.courseTitle,
  ];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (s) return s;
  }
  return "Курс";
}

function pickTeacherFromAny(x) {
  return (
    x?.teacher_name ||
    x?.instructor_name ||
    x?.access?.teacher_name ||
    x?.access?.instructor_name ||
    x?.teacher?.full_name ||
    x?.instructor?.full_name ||
    ""
  );
}

function pickCategoryFromAny(x) {
  return x?.category_name || x?.category?.name || x?.access?.category_name || x?.access?.category?.name || "";
}

function normalizeMyCourses(raw) {
  const list = asList(raw);
  const arr = Array.isArray(list) ? list : [];

  const looksLikeAccessShape =
    arr.length > 0 && typeof arr[0] === "object" && arr[0] && ("access" in arr[0] || "lessons" in arr[0]);

  if (!looksLikeAccessShape) {
    return arr
      .filter((c) => !!extractCourseIdFromAny(c))
      .map((c) => {
        const cid = extractCourseIdFromAny(c);
        return { ...c, id: cid, course_id: cid, __activated: extractAccessActivatedFromAny(c) };
      });
  }

  return arr
    .map((item) => {
      const cid = extractCourseIdFromAny(item);
      const title = extractCourseTitleFromAny(item);

      const lessonsRaw = Array.isArray(item?.lessons) ? item.lessons : [];
      const lessons = stripVideoFromLessonsList(lessonsRaw);

      const activated = extractAccessActivatedFromAny(item);

      return {
        id: cid,
        course_id: cid,
        title,
        name: title,
        access: item?.access || null,
        lessons,

        teacher_name: pickTeacherFromAny(item) || undefined,
        instructor_name: pickTeacherFromAny(item) || undefined,
        category_name: pickCategoryFromAny(item) || undefined,

        __activated: activated,
      };
    })
    .filter((c) => !!String(c?.id || "").trim());
}

async function fetchLessonsForCourseId(courseId) {
  const cid = norm(courseId);
  if (!cid) return [];

  const attempt = await tryMany([
    () => api.get("lessons/", { params: { course_id: cid } }),
    () => api.get("lessons", { params: { course_id: cid } }),
    () => api.get("lessons/", { params: { courseId: cid } }),
    () => api.get("lessons/", { params: { course: cid } }),
  ]);

  if (!attempt.ok) return [];
  const list = asList(attempt.res.data);
  return stripVideoFromLessonsList(list);
}

function normalizeLessonsForCourse(lessons, courseId) {
  const cid = String(courseId || "").trim();
  const arr = Array.isArray(lessons) ? lessons : [];
  return arr
    .map((l) => {
      const id = extractLessonIdFromAny(l);
      if (!id) return null;
      return {
        ...(typeof l === "object" && l ? l : {}),
        id,
        pk: id,
        course_id: cid || (l?.course_id ?? l?.course ?? ""),
        course: cid || (l?.course ?? l?.course_id ?? ""),
      };
    })
    .filter(Boolean);
}

async function enrichCoursesLessonsByAllowedIds(coursesArr) {
  const courses = Array.isArray(coursesArr) ? coursesArr : [];
  if (!courses.length) return courses;

  const need = courses.filter((c) => {
    const allowed = extractAllowedLessonIdsFromAccess(c?.access);
    if (allowed.size === 0) return false;

    const lessons = Array.isArray(c?.lessons) ? c.lessons : [];
    if (lessons.length === 0) return true;

    const hasObjects = lessons.some((l) => typeof l === "object" && l && Object.keys(l).length > 2);
    if (!hasObjects) return true;

    const ids = new Set(lessons.map((l) => extractLessonIdFromAny(l)).filter(Boolean));
    if (ids.size === 0) return true;

    if (allowed.size > ids.size) return true;

    return false;
  });

  if (!need.length) return courses;

  const updates = await Promise.all(
    need.map(async (c) => {
      const cid = c?.id;
      const allowed = extractAllowedLessonIdsFromAccess(c?.access);

      const publicLessons = await fetchLessonsForCourseId(cid);
      const normalizedPublic = normalizeLessonsForCourse(publicLessons, cid);

      const filtered = allowed.size
        ? normalizedPublic.filter((l) => allowed.has(String(extractLessonIdFromAny(l))))
        : normalizedPublic;

      return { courseId: String(cid), lessons: filtered };
    })
  );

  const map = new Map(updates.map((u) => [String(u.courseId), u.lessons]));

  return courses.map((c) => {
    const cid = String(c?.id ?? "");
    if (!map.has(cid)) return c;
    return { ...c, lessons: map.get(cid) };
  });
}

/* =========================
 * Teacher lesson payload (Swagger) + ✅ order
 * ========================= */
function sanitizeTeacherLessonPayload(payload) {
  const p = payload || {};
  const out = {};

  const hasKey = (k) => Object.prototype.hasOwnProperty.call(p, k);

  const course =
    p.course ??
    p.course_id ??
    p.courseId ??
    p.courseID ??
    p.coursePk ??
    p.course_pk ??
    p.coursePkId ??
    null;

  if (course != null && String(course).trim()) out.course = Number(course) || String(course);

  if (p.title != null) out.title = p.title;
  if (p.description != null) out.description = p.description;

  // ✅ order
  const order = p.order ?? p.lesson_order ?? p.lessonOrder ?? null;
  if (order !== null && order !== undefined && String(order).trim() !== "") {
    const n = Number(order);
    if (Number.isFinite(n)) out.order = n;
  } else if (hasKey("order")) {
    // если явно передали пусто — не шлем
  }

  const videoUrl = p.video_url ?? p.videoUrl;
  const youtubeId = p.youtube_video_id ?? p.youtubeVideoId;

  if (videoUrl === null || hasKey("video_url") || hasKey("videoUrl")) {
    out.video_url = videoUrl === null ? null : String(videoUrl || "").trim() ? String(videoUrl).trim() : undefined;
  } else if (videoUrl != null && String(videoUrl).trim()) {
    out.video_url = String(videoUrl).trim();
  }

  if (youtubeId === null || hasKey("youtube_video_id") || hasKey("youtubeVideoId")) {
    out.youtube_video_id =
      youtubeId === null ? null : String(youtubeId || "").trim() ? String(youtubeId).trim() : undefined;
  } else if (youtubeId != null && String(youtubeId).trim()) {
    out.youtube_video_id = String(youtubeId).trim();
  }

  const hwTitle = p.homework_title ?? p.homeworkTitle;
  const hwDesc = p.homework_description ?? p.homeworkDescription;
  const hwLink = p.homework_link ?? p.homeworkLink;

  if (hwTitle != null) {
    const s = String(hwTitle ?? "").trim();
    if (s) out.homework_title = s;
  }
  if (hwDesc != null) {
    const s = String(hwDesc ?? "").trim();
    if (s) out.homework_description = s;
  }
  if (hwLink != null) {
    const s = String(hwLink ?? "").trim();
    if (s) out.homework_link = s;
  }

  const videoFile = p.video_file ?? p.videoFile ?? p.file ?? null;
  const homeworkFile = p.homework_file ?? p.homeworkFile ?? null;

  if (videoFile != null) out.video_file = videoFile;
  if (homeworkFile != null) out.homework_file = homeworkFile;

  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });

  return out;
}

/* =========================
 * Course payload (photo upload)
 * ========================= */
function sanitizeCoursePayload(payload) {
  const p = payload || {};
  const out = {};

  if (p.title != null) out.title = p.title;
  if (p.description != null) out.description = p.description;

  const cat = p.category ?? p.category_id ?? p.categoryId ?? null;
  if (cat != null && String(cat).trim()) out.category = Number(cat) || String(cat);

  const photo = p.photo ?? p.image ?? p.file ?? null;
  if (photo != null) out.photo = photo;

  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });

  return out;
}

/* =========================
 * YouTube endpoints
 * ========================= */
async function youtubeGet(url) {
  const attempt = await tryMany([() => api.get(url), () => api.get(url.replace(/\/$/, ""))]);
  if (!attempt.ok) throw attempt.error;
  return attempt.res;
}

async function youtubePost(url, body) {
  const attempt = await tryMany([
    () => api.post(url, body),
    () => api.post(url.replace(/\/$/, ""), body),
  ]);
  if (!attempt.ok) throw attempt.error;
  return attempt.res;
}

function mergeLessonIntoTeacherLessons(prev, lessonId, patch) {
  const id = String(lessonId || "");
  if (!id) return Array.isArray(prev) ? prev : [];
  const list = Array.isArray(prev) ? prev : [];
  return list.map((l) => (String(l?.id ?? l?.pk ?? "") === id ? { ...l, ...(patch || {}) } : l));
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // public
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tariffs, setTariffs] = useState([]);

  // teacher
  const [teacherLessons, setTeacherLessons] = useState([]);
  const [teacherHomeworks, setTeacherHomeworks] = useState([]);

  // student
  const [myCourses, setMyCourses] = useState([]);
  const [myHomeworks, setMyHomeworks] = useState([]);

  // video/open cache
  const [openedLessons, setOpenedLessons] = useState({});
  const openedLessonsRef = useRef({});
  useEffect(() => {
    openedLessonsRef.current = openedLessons || {};
  }, [openedLessons]);

  // public lessons fallback
  const [lessonsByCourse, setLessonsByCourse] = useState({});

  const [loading, setLoading] = useState({
    public: false,
    teacherLessons: false,
    teacherHomeworks: false,

    myCourses: false,
    myHomeworks: false,
    activateToken: false,

    lessonsByCourse: {},
    openLesson: {},

    submitHomework: false,

    youtube: false,
  });

  const [error, setError] = useState({
    public: "",
    teacherLessons: "",
    teacherHomeworks: "",

    myCourses: "",
    myHomeworks: "",
    activateToken: "",

    youtube: "",
  });

  /* =========================
   * PUBLIC LOADERS
   * ========================= */
  const loadPublic = useCallback(async () => {
    setLoading((p) => ({ ...p, public: true }));
    setError((p) => ({ ...p, public: "" }));
    try {
      const [catsRes, coursesRes, tariffsRes] = await Promise.all([
        tryMany([() => api.get("categories/"), () => api.get("categories")]),
        tryMany([() => api.get("courses/"), () => api.get("courses")]),
        tryMany([() => api.get("tariffs/"), () => api.get("tariffs")]),
      ]);

      if (!catsRes.ok) throw catsRes.error;
      if (!coursesRes.ok) throw coursesRes.error;
      if (!tariffsRes.ok) throw tariffsRes.error;

      setCategories(asList(catsRes.res.data));
      setCourses(asList(coursesRes.res.data));
      setTariffs(asList(tariffsRes.res.data));
      return true;
    } catch (e) {
      setError((p) => ({ ...p, public: getErrMsg(e) }));
      return false;
    } finally {
      setLoading((p) => ({ ...p, public: false }));
    }
  }, []);

  /* =========================
   * TEACHER LOADERS
   * ========================= */
  const loadTeacherLessons = useCallback(async () => {
    setLoading((p) => ({ ...p, teacherLessons: true }));
    setError((p) => ({ ...p, teacherLessons: "" }));
    try {
      const attempt = await tryMany([() => api.get("teacher/lessons/"), () => api.get("teacher/lessons")]);
      if (!attempt.ok) throw attempt.error;

      setTeacherLessons(asList(attempt.res.data));
      return true;
    } catch (e) {
      setError((p) => ({ ...p, teacherLessons: getErrMsg(e) }));
      setTeacherLessons([]);
      return false;
    } finally {
      setLoading((p) => ({ ...p, teacherLessons: false }));
    }
  }, []);

  const loadTeacherHomeworks = useCallback(async () => {
    setLoading((p) => ({ ...p, teacherHomeworks: true }));
    setError((p) => ({ ...p, teacherHomeworks: "" }));
    try {
      const attempt = await tryMany([() => api.get("teacher/homeworks/"), () => api.get("teacher/homeworks")]);
      if (!attempt.ok) throw attempt.error;

      setTeacherHomeworks(asList(attempt.res.data));
      return true;
    } catch (e) {
      setError((p) => ({ ...p, teacherHomeworks: getErrMsg(e) }));
      setTeacherHomeworks([]);
      return false;
    } finally {
      setLoading((p) => ({ ...p, teacherHomeworks: false }));
    }
  }, []);

  /* =========================
   * YOUTUBE
   * ========================= */
  const youtubeProjectStatus = useCallback(async () => {
    setLoading((p) => ({ ...p, youtube: true }));
    setError((p) => ({ ...p, youtube: "" }));
    try {
      const res = await youtubeGet("youtube/project/status/");
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, youtube: msg }));
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, youtube: false }));
    }
  }, []);

  const youtubeProjectOauthStart = useCallback(async () => {
    setLoading((p) => ({ ...p, youtube: true }));
    setError((p) => ({ ...p, youtube: "" }));
    try {
      const res = await youtubeGet("youtube/project/oauth/start/");
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, youtube: msg }));
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, youtube: false }));
    }
  }, []);

  // callback обычно дергает браузер, но на всякий
  const youtubeProjectOauthCallback = useCallback(async () => {
    setLoading((p) => ({ ...p, youtube: true }));
    setError((p) => ({ ...p, youtube: "" }));
    try {
      const res = await youtubeGet("youtube/project/oauth/callback/");
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, youtube: msg }));
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, youtube: false }));
    }
  }, []);

  const youtubeRefreshLessonStatus = useCallback(async (lessonId) => {
    const id = String(lessonId || "").trim();
    if (!id) return { ok: false, error: "Нет lessonId" };

    setLoading((p) => ({ ...p, youtube: true }));
    setError((p) => ({ ...p, youtube: "" }));
    try {
      const res = await youtubeGet(`youtube/lessons/${encodeURIComponent(id)}/refresh-status/`);
      const patch = res?.data && typeof res.data === "object" ? res.data : {};
      // обновим teacherLessons локально
      setTeacherLessons((prev) => mergeLessonIntoTeacherLessons(prev, id, patch));
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, youtube: msg }));
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, youtube: false }));
    }
  }, []);

  const youtubeRefreshStatusBatch = useCallback(async (lessonIds = []) => {
    const ids = (Array.isArray(lessonIds) ? lessonIds : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    setLoading((p) => ({ ...p, youtube: true }));
    setError((p) => ({ ...p, youtube: "" }));
    try {
      // пробуем разные ключи — чтобы попасть в бэк без угадываний
      const payloadA = ids.length ? { lesson_ids: ids } : {};
      const payloadB = ids.length ? { lessons: ids } : {};
      const payloadC = ids.length ? { ids } : {};

      const attempt = await tryMany([
        () => youtubePost("youtube/lessons/refresh-status-batch/", payloadA),
        () => youtubePost("youtube/lessons/refresh-status-batch/", payloadB),
        () => youtubePost("youtube/lessons/refresh-status-batch/", payloadC),
        () => youtubePost("youtube/lessons/refresh-status-batch/", {}),
      ]);

      if (!attempt.ok) throw attempt.error;

      const data = attempt.res.data;

      // если бэк вернул список уроков — мержим
      const list = asList(data);
      if (list.length) {
        setTeacherLessons((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const map = new Map(base.map((l) => [String(l?.id ?? l?.pk ?? ""), l]));
          list.forEach((it) => {
            const id = String(it?.id ?? it?.pk ?? "").trim();
            if (!id) return;
            const old = map.get(id) || {};
            map.set(id, { ...old, ...it });
          });
          return Array.from(map.values());
        });
      }

      return { ok: true, data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, youtube: msg }));
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, youtube: false }));
    }
  }, []);

  /* =========================
   * STUDENT
   * ========================= */
  const loadMyCourses = useCallback(async () => {
    setLoading((p) => ({ ...p, myCourses: true }));
    setError((p) => ({ ...p, myCourses: "" }));

    try {
      const res = await api.get("me/courses/");
      const normalizedAll = normalizeMyCourses(res.data);

      const onlyActivated = (Array.isArray(normalizedAll) ? normalizedAll : []).filter((c) => c?.__activated);

      let safe = onlyActivated.map((c) => ({
        ...c,
        lessons: stripVideoFromLessonsList(c?.lessons),
      }));

      safe = await enrichCoursesLessonsByAllowedIds(safe);

      setMyCourses(safe);
      return { ok: true, data: res.data, list: safe };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, myCourses: msg }));
      setMyCourses([]);
      return { ok: false, error: msg, list: [] };
    } finally {
      setLoading((p) => ({ ...p, myCourses: false }));
    }
  }, []);

  const loadMyHomeworks = useCallback(async () => {
    setLoading((p) => ({ ...p, myHomeworks: true }));
    setError((p) => ({ ...p, myHomeworks: "" }));

    try {
      const res = await api.get("me/homeworks/");
      setMyHomeworks(asList(res.data));
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, myHomeworks: msg }));
      setMyHomeworks([]);
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, myHomeworks: false }));
    }
  }, []);

  const activateToken = useCallback(
    async (token) => {
      setLoading((p) => ({ ...p, activateToken: true }));
      setError((p) => ({ ...p, activateToken: "" }));

      try {
        const payload = { token: norm(token) };
        const res = await api.post("access/activate-token/", payload);

        await loadMyCourses();
        await loadMyHomeworks();

        return { ok: true, data: res.data };
      } catch (e) {
        const msg = getErrMsg(e);
        setError((p) => ({ ...p, activateToken: msg }));
        return { ok: false, error: msg };
      } finally {
        setLoading((p) => ({ ...p, activateToken: false }));
      }
    },
    [loadMyCourses, loadMyHomeworks]
  );

  const loadLessonsPublicByCourse = useCallback(async (courseId) => {
    const cid = norm(courseId);
    if (!cid) return { ok: false, error: "Нет courseId" };

    setLoading((p) => ({
      ...p,
      lessonsByCourse: { ...(p.lessonsByCourse || {}), [cid]: true },
    }));

    try {
      const attempt = await tryMany([
        () => api.get("lessons/", { params: { course_id: cid } }),
        () => api.get("lessons", { params: { course_id: cid } }),
        () => api.get("lessons/", { params: { courseId: cid } }),
        () => api.get("lessons/", { params: { course: cid } }),
      ]);

      const list = attempt.ok ? asList(attempt.res.data) : [];
      const safeList = stripVideoFromLessonsList(list);

      setLessonsByCourse((prev) => ({ ...(prev || {}), [cid]: safeList }));
      return { ok: true, data: safeList };
    } catch (e) {
      setLessonsByCourse((prev) => ({ ...(prev || {}), [cid]: [] }));
      return { ok: false, error: getErrMsg(e) };
    } finally {
      setLoading((p) => ({
        ...p,
        lessonsByCourse: { ...(p.lessonsByCourse || {}), [cid]: false },
      }));
    }
  }, []);

  const openLesson = useCallback(async (lessonId, { force = false } = {}) => {
    const idNum = Number(lessonId);
    if (!Number.isFinite(idNum)) return { ok: false, error: "Неверный lessonId" };

    const key = String(lessonId);
    const cached = openedLessonsRef.current?.[key] || null;
    if (!force && cached) return { ok: true, lesson: cached, cached: true };

    setLoading((p) => ({
      ...p,
      openLesson: { ...(p.openLesson || {}), [key]: true },
    }));

    try {
      const payloadA = { lesson_id: idNum, force: !!force };
      const payloadB = { lesson: idNum, force: !!force };

      const attempt = await tryMany([
        () => api.post("lessons/open/", payloadA),
        () => api.post("lessons/open/", payloadB),
      ]);
      if (!attempt.ok) throw attempt.error;

      const data = attempt.res?.data || null;

      const baseLesson =
        data?.lesson && typeof data.lesson === "object"
          ? data.lesson
          : data && typeof data === "object"
          ? data
          : null;

      if (!baseLesson) return { ok: true, data, lesson: null };

      const merged = { ...baseLesson, ...pickVideoFields(data) };
      const best = pickBestVideoUrl(merged);
      const lessonObj = { ...merged, __picked_video: best };

      setOpenedLessons((prev) => ({ ...(prev || {}), [key]: lessonObj }));

      setMyCourses((prev) =>
        (Array.isArray(prev) ? prev : []).map((c) => {
          const lessons = Array.isArray(c?.lessons) ? c.lessons : [];
          const nextLessons = lessons.map((l) =>
            String(l?.id ?? l?.pk ?? "") === key ? { ...l, is_opened: true } : l
          );
          return { ...c, lessons: stripVideoFromLessonsList(nextLessons) };
        })
      );

      return { ok: true, data, lesson: lessonObj };
    } catch (e) {
      return { ok: false, error: getErrMsg(e) };
    } finally {
      setLoading((p) => ({
        ...p,
        openLesson: { ...(p.openLesson || {}), [key]: false },
      }));
    }
  }, []);

  const submitHomework = useCallback(
    async ({ lessonId, content, homeworkId = null }) => {
      setLoading((p) => ({ ...p, submitHomework: true }));

      const pickHwId = (h) => String(h?.id ?? h?.pk ?? "").trim();
      const pickLessonId = (h) =>
        String(h?.lesson ?? h?.lesson_id ?? h?.lessonId ?? h?.lesson?.id ?? h?.lesson?.pk ?? "").trim();
      const pickStatus = (h) => String(h?.status ?? "").trim().toLowerCase();

      try {
        const idNum = Number(lessonId);
        if (!Number.isFinite(idNum)) return { ok: false, error: "Неверный lessonId" };

        const text = norm(content);
        if (!text) return { ok: false, error: "Пустой текст" };

        const list = Array.isArray(myHomeworks) ? myHomeworks : [];

        const byId =
          homeworkId != null ? list.find((h) => pickHwId(h) === String(homeworkId).trim()) || null : null;

        const byLesson = list.find((h) => pickLessonId(h) === String(idNum)) || null;

        const existing = byId || byLesson;

        if (existing && pickStatus(existing) === "accepted") {
          return { ok: false, error: "ДЗ уже принято — редактирование закрыто" };
        }

        if (!existing) {
          const payloadA = { lesson: idNum, content: text };
          const payloadB = { lesson_id: idNum, content: text };

          const attempt = await tryMany([() => api.post("homeworks/", payloadA), () => api.post("homeworks/", payloadB)]);
          if (!attempt.ok) throw attempt.error;

          await loadMyHomeworks();
          return { ok: true, data: attempt.res.data };
        }

        const hwId = pickHwId(existing);
        if (!hwId) return { ok: false, error: "Не найден homeworkId" };

        const st = pickStatus(existing);
        const payload =
          st === "rework" || st === "declined"
            ? { content: text, status: "submitted" }
            : { content: text };

        const attempt = await tryMany([() => api.patch(`me/homeworks/${encodeURIComponent(hwId)}/`, payload)]);
        if (!attempt.ok) throw attempt.error;

        await loadMyHomeworks();
        return { ok: true, data: attempt.res.data };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      } finally {
        setLoading((p) => ({ ...p, submitHomework: false }));
      }
    },
    [loadMyHomeworks, myHomeworks]
  );

  /* =========================
   * TEACHER ACTIONS
   * ========================= */
  const reviewHomework = useCallback(async (homeworkId, status, comment) => {
    try {
      const id = String(homeworkId);

      const attempt = await tryMany([
        () =>
          api.patch(`teacher/homeworks/${encodeURIComponent(id)}/`, {
            status,
            comment: comment ?? null,
          }),
        () =>
          api.patch(`teacher/homeworks/${encodeURIComponent(id)}`, {
            status,
            comment: comment ?? null,
          }),
      ]);

      if (!attempt.ok) throw attempt.error;

      const res = attempt.res;
      setTeacherHomeworks((prev) =>
        (Array.isArray(prev) ? prev : []).map((h) => (String(h?.id) === id ? { ...h, ...res.data } : h))
      );

      return { ok: true, data: res.data };
    } catch (e) {
      return { ok: false, error: getErrMsg(e) };
    }
  }, []);

  const archiveHomework = useCallback(async () => {
    return { ok: false, error: "Архивирование ДЗ: эндпоинта нет (архив локальный в UI)" };
  }, []);

  const unarchiveHomework = useCallback(async () => {
    return { ok: false, error: "Разархивирование ДЗ: эндпоинта нет (архив локальный в UI)" };
  }, []);

  const addLesson = useCallback(
    async (payload, config = {}) => {
      try {
        const clean = sanitizeTeacherLessonPayload(payload);
        const needsFD = Object.values(clean).some((v) => hasFileLike(v));

        if (needsFD) {
          const cfg = stripContentTypeForFormData(config);
          const body = buildFormData(clean);

          const attempt = await tryMany([
            () => api.post("teacher/lessons/create-with-upload/", body, cfg),
            () => api.post("teacher/lessons/create-with-upload", body, cfg),
          ]);

          if (!attempt.ok) throw attempt.error;

          await loadTeacherLessons();
          return attempt.res.data ?? attempt.res;
        }

        const attempt = await tryMany([
          () => api.post("teacher/lessons/", clean, config),
          () => api.post("teacher/lessons", clean, config),
        ]);

        if (!attempt.ok) throw attempt.error;

        await loadTeacherLessons();
        return attempt.res.data ?? attempt.res;
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadTeacherLessons]
  );

  const updateLesson = useCallback(
    async (lessonId, payload, config = {}) => {
      const id = String(lessonId || "");
      if (!id) return { ok: false, error: "Нет lessonId" };

      try {
        const clean = sanitizeTeacherLessonPayload(payload);
        const needsFD = Object.values(clean).some((v) => hasFileLike(v));

        const body = needsFD ? buildFormData(clean) : clean;
        const cfg = needsFD ? stripContentTypeForFormData(config) : config;

        const attempt = await tryMany([
          () => api.patch(`teacher/lessons/${encodeURIComponent(id)}/`, body, cfg),
          () => api.patch(`teacher/lessons/${encodeURIComponent(id)}`, body, cfg),
        ]);

        if (!attempt.ok) throw attempt.error;

        await loadTeacherLessons();
        return { ok: true, data: attempt.res.data };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadTeacherLessons]
  );

  const deleteLesson = useCallback(
    async (lessonId) => {
      const id = String(lessonId || "");
      if (!id) return { ok: false, error: "Нет lessonId" };
      try {
        const attempt = await tryMany([
          () => api.delete(`teacher/lessons/${encodeURIComponent(id)}/`),
          () => api.delete(`teacher/lessons/${encodeURIComponent(id)}`),
        ]);
        if (!attempt.ok) throw attempt.error;
        await loadTeacherLessons();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadTeacherLessons]
  );

  const addCourse = useCallback(
    async (payload) => {
      try {
        const clean = sanitizeCoursePayload(payload);
        const needsFD = Object.values(clean).some((v) => hasFileLike(v));

        const body = needsFD ? buildFormData(clean) : clean;
        const cfg = needsFD ? stripContentTypeForFormData({}) : {};

        const attempt = await tryMany([
          () => api.post("courses/", body, cfg),
          () => api.post("courses", body, cfg),
        ]);

        if (!attempt.ok) throw attempt.error;

        await loadPublic();
        return attempt.res.data ?? attempt.res;
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadPublic]
  );

  const updateCourse = useCallback(
    async (courseId, payload) => {
      const id = String(courseId || "");
      if (!id) return { ok: false, error: "Нет courseId" };

      try {
        const clean = sanitizeCoursePayload(payload);
        const needsFD = Object.values(clean).some((v) => hasFileLike(v));

        const body = needsFD ? buildFormData(clean) : clean;
        const cfg = needsFD ? stripContentTypeForFormData({}) : {};

        const attempt = await tryMany([
          () => api.patch(`courses/${encodeURIComponent(id)}/`, body, cfg),
          () => api.patch(`courses/${encodeURIComponent(id)}`, body, cfg),
        ]);

        if (!attempt.ok) throw attempt.error;

        await loadPublic();
        return { ok: true, data: attempt.res.data };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadPublic]
  );

  const deleteCourse = useCallback(
    async (courseId) => {
      const id = String(courseId || "");
      if (!id) return { ok: false, error: "Нет courseId" };

      try {
        const attempt = await tryMany([
          () => api.delete(`courses/${encodeURIComponent(id)}/`),
          () => api.delete(`courses/${encodeURIComponent(id)}`),
        ]);
        if (!attempt.ok) throw attempt.error;

        await loadPublic();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      }
    },
    [loadPublic]
  );

  const value = useMemo(
    () => ({
      categories,
      courses,
      tariffs,
      loadPublic,

      teacherLessons,
      teacherHomeworks,
      loadTeacherLessons,
      loadTeacherHomeworks,
      reviewHomework,

      archiveHomework,
      unarchiveHomework,

      addLesson,
      updateLesson,
      deleteLesson,

      addCourse,
      updateCourse,
      deleteCourse,

      // ✅ YouTube
      youtubeProjectStatus,
      youtubeProjectOauthStart,
      youtubeProjectOauthCallback,
      youtubeRefreshLessonStatus,
      youtubeRefreshStatusBatch,

      myCourses,
      myHomeworks,
      loadMyCourses,
      loadMyHomeworks,
      activateToken,
      submitHomework,

      lessonsByCourse,
      loadLessonsPublicByCourse,

      openLesson,
      openedLessons,

      loading,
      error,

      setAccessToken,
      clearAccessToken,
    }),
    [
      categories,
      courses,
      tariffs,
      loadPublic,

      teacherLessons,
      teacherHomeworks,
      loadTeacherLessons,
      loadTeacherHomeworks,
      reviewHomework,

      archiveHomework,
      unarchiveHomework,

      addLesson,
      updateLesson,
      deleteLesson,

      addCourse,
      updateCourse,
      deleteCourse,

      youtubeProjectStatus,
      youtubeProjectOauthStart,
      youtubeProjectOauthCallback,
      youtubeRefreshLessonStatus,
      youtubeRefreshStatusBatch,

      myCourses,
      myHomeworks,
      loadMyCourses,
      loadMyHomeworks,
      activateToken,
      submitHomework,

      lessonsByCourse,
      loadLessonsPublicByCourse,

      openLesson,
      openedLessons,

      loading,
      error,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
