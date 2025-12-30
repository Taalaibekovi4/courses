// src/contexts/DataContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  timeout: 25000,
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
    if (v === undefined || v === null) return;

    if (Array.isArray(v)) {
      v.forEach((item) => {
        if (item === undefined || item === null) return;
        fd.append(`${k}[]`, item);
      });
      return;
    }

    fd.append(k, v);
  });
  return fd;
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
  const keys = [
    "video_url",
    "videoUrl",
    "video",
    "file_url",
    "fileUrl",
    "youtube_video_id",
    "youtubeVideoId",
    "youtube_id",
    "youtubeId",
  ];
  keys.forEach((k) => {
    if (d?.[k] != null && d?.[k] !== "") out[k] = d[k];
  });
  return out;
}

function pickBestVideoUrl(obj) {
  const o = obj || {};
  return (
    o.video_url ||
    o.videoUrl ||
    o.video ||
    o.file_url ||
    o.fileUrl ||
    o.youtube_video_id ||
    o.youtubeVideoId ||
    o.youtube_id ||
    o.youtubeId ||
    ""
  );
}

/**
 * ✅ НОРМАЛИЗАЦИЯ me/courses/
 * Бэк может вернуть:
 * A) обычный список курсов [{id,title,...}]
 * B) список доступов [{ access:{course, course_title...}, lessons:[...] }]
 */
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

    // если вдруг уроки содержат course (иногда так бывает)
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

function normalizeMyCourses(raw) {
  const list = asList(raw);
  const arr = Array.isArray(list) ? list : [];

  // case B: access + lessons
  const looksLikeAccessShape =
    arr.length > 0 &&
    typeof arr[0] === "object" &&
    arr[0] &&
    ("access" in arr[0] || "lessons" in arr[0]);

  if (!looksLikeAccessShape) {
    // case A: обычные курсы
    return arr
      .filter((c) => {
        const cid = extractCourseIdFromAny(c);
        return !!cid;
      })
      .map((c) => {
        const cid = extractCourseIdFromAny(c);
        return { ...c, id: cid, course_id: cid };
      });
  }

  // case B: нормализуем в курсы
  return arr
    .map((item) => {
      const cid = extractCourseIdFromAny(item);
      const title = extractCourseTitleFromAny(item);
      const lessons = Array.isArray(item?.lessons) ? item.lessons : [];

      return {
        id: cid, // важно для UI
        course_id: cid,
        title,
        name: title,
        access: item?.access || null,
        lessons,
      };
    })
    .filter((c) => !!String(c?.id || "").trim());
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

  // public lessons fallback (если нужно)
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
  });

  const [error, setError] = useState({
    public: "",
    teacherLessons: "",
    teacherHomeworks: "",

    myCourses: "",
    myHomeworks: "",
    activateToken: "",
  });

  /* =========================
   * PUBLIC LOADERS
   * ========================= */
  const loadPublic = useCallback(async () => {
    setLoading((p) => ({ ...p, public: true }));
    setError((p) => ({ ...p, public: "" }));
    try {
      const [catsRes, coursesRes, tariffsRes] = await Promise.all([
        api.get("categories/").catch((e) => ({ __err: e })),
        api.get("courses/").catch((e) => ({ __err: e })),
        api.get("tariffs/").catch((e) => ({ __err: e })),
      ]);

      if (catsRes?.__err) throw catsRes.__err;
      if (coursesRes?.__err) throw coursesRes.__err;
      if (tariffsRes?.__err) throw tariffsRes.__err;

      setCategories(asList(catsRes.data));
      setCourses(asList(coursesRes.data));
      setTariffs(asList(tariffsRes.data));
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
      const res = await api.get("teacher/lessons/");
      setTeacherLessons(asList(res.data));
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
      const res = await api.get("teacher/homeworks/");
      setTeacherHomeworks(asList(res.data));
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
   * STUDENT
   * ========================= */
  const loadMyCourses = useCallback(async () => {
    setLoading((p) => ({ ...p, myCourses: true }));
    setError((p) => ({ ...p, myCourses: "" }));

    try {
      const res = await api.get("me/courses/");
      const normalized = normalizeMyCourses(res.data);
      setMyCourses(normalized);
      return { ok: true, data: res.data, list: normalized };
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

        // ✅ сразу после активации подтягиваем список курсов/уроков
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

  /**
   * Публичные уроки (fallback). Обычно не нужны, если me/courses/ отдаёт lessons.
   */
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
        () => api.get("lessons/", { params: { courseId: cid } }),
        () => api.get("lessons/", { params: { course: cid } }),
      ]);

      const list = attempt.ok ? asList(attempt.res.data) : [];
      setLessonsByCourse((prev) => ({ ...(prev || {}), [cid]: Array.isArray(list) ? list : [] }));
      return { ok: true, data: list };
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

  /**
   * Открыть урок: POST lessons/open/
   */
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
      const attempt = await tryMany([() => api.post("lessons/open/", { lesson_id: idNum })]);
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

      // ✅ чтобы is_opened обновился на UI без ожидания
      setMyCourses((prev) =>
        (Array.isArray(prev) ? prev : []).map((c) => {
          const lessons = Array.isArray(c?.lessons) ? c.lessons : [];
          const nextLessons = lessons.map((l) =>
            String(l?.id ?? l?.pk ?? "") === key ? { ...l, is_opened: true } : l
          );
          return { ...c, lessons: nextLessons };
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

  /**
   * Отправить ДЗ: POST homeworks/
   */
  const submitHomework = useCallback(
    async ({ lessonId, content }) => {
      setLoading((p) => ({ ...p, submitHomework: true }));
      try {
        const idNum = Number(lessonId);
        if (!Number.isFinite(idNum)) return { ok: false, error: "Неверный lessonId" };

        const payload = {
          lesson: idNum,
          content: norm(content),
        };

        const res = await api.post("homeworks/", payload);
        await loadMyHomeworks();
        return { ok: true, data: res.data };
      } catch (e) {
        return { ok: false, error: getErrMsg(e) };
      } finally {
        setLoading((p) => ({ ...p, submitHomework: false }));
      }
    },
    [loadMyHomeworks]
  );

  /* =========================
   * TEACHER ACTIONS (минимум)
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
        (Array.isArray(prev) ? prev : []).map((h) =>
          String(h?.id) === id ? { ...h, ...res.data } : h
        )
      );

      return { ok: true, data: res.data };
    } catch (e) {
      return { ok: false, error: getErrMsg(e) };
    }
  }, []);

  const archiveHomework = useCallback(async () => {
    return { ok: false, error: "Архивирование ДЗ: эндпоинт не найден на бэке" };
  }, []);
  const unarchiveHomework = useCallback(async () => {
    return { ok: false, error: "Разархивирование ДЗ: эндпоинт не найден на бэке" };
  }, []);

  const addLesson = useCallback(
    async (payload) => {
      try {
        const p = payload || {};
        const needsFD = Object.values(p).some((v) => hasFileLike(v));
        const body = needsFD ? buildFormData(p) : p;

        const attempt = await tryMany([
          () => api.post("teacher/lessons/create-with-upload/", body),
          () => api.post("teacher/lessons/", body),
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
    async (lessonId, payload) => {
      const id = String(lessonId || "");
      if (!id) return { ok: false, error: "Нет lessonId" };

      try {
        const p = payload || {};
        const needsFD = Object.values(p).some((v) => hasFileLike(v));
        const body = needsFD ? buildFormData(p) : p;

        const attempt = await tryMany([
          () => api.patch(`teacher/lessons/${encodeURIComponent(id)}/`, body),
          () => api.patch(`teacher/lessons/${encodeURIComponent(id)}`, body),
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

  const addCourse = useCallback(
    async (payload) => {
      try {
        const attempt = await tryMany([() => api.post("courses/", payload), () => api.post("courses", payload)]);
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
        const attempt = await tryMany([
          () => api.patch(`courses/${encodeURIComponent(id)}/`, payload),
          () => api.patch(`courses/${encodeURIComponent(id)}`, payload),
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
      addCourse,
      updateCourse,

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
      addCourse,
      updateCourse,

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
