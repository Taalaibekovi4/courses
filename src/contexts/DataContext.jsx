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
 * VITE_API_URL=https://vostok-massage.webtm.ru/api/
 *
 * baseURL должен быть без двойных слэшей.
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

function setAccessToken(token) {
  try {
    if (token) localStorage.setItem(LS_ACCESS, token);
  } catch (_) {}
}

function clearAccessToken() {
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

function getLessonCourseId(lesson) {
  return String(lesson?.course ?? lesson?.course_id ?? lesson?.courseId ?? "");
}

function pickVideoFields(data) {
  const d = data || {};
  const out = {};
  const keys = [
    "video_url",
    "videoUrl",
    "video",
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

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // public
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tariffs, setTariffs] = useState([]);

  // teacher
  const [teacherLessons, setTeacherLessons] = useState([]);
  const [teacherHomeworks, setTeacherHomeworks] = useState([]);

  // student (me/*)
  const [myCourses, setMyCourses] = useState([]);
  const [myHomeworks, setMyHomeworks] = useState([]);

  // lessons per course (student)
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [openedLessons, setOpenedLessons] = useState({});

  const openedLessonsRef = useRef({});
  useEffect(() => {
    openedLessonsRef.current = openedLessons || {};
  }, [openedLessons]);

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
        api.get("/categories/").catch((e) => ({ __err: e })),
        api.get("/courses/").catch((e) => ({ __err: e })),
        api.get("/tariffs/").catch((e) => ({ __err: e })),
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
      const res = await api.get("/teacher/lessons/");
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
      const res = await api.get("/teacher/homeworks/");
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
   * STUDENT (ME/*)
   * ========================= */
  const loadMyCourses = useCallback(async () => {
    setLoading((p) => ({ ...p, myCourses: true }));
    setError((p) => ({ ...p, myCourses: "" }));

    try {
      const res = await api.get("/me/courses/");
      const list = asList(res.data);
      setMyCourses(list);
      return { ok: true, data: res.data };
    } catch (e) {
      const msg = getErrMsg(e);
      setError((p) => ({ ...p, myCourses: msg }));
      setMyCourses([]);
      return { ok: false, error: msg };
    } finally {
      setLoading((p) => ({ ...p, myCourses: false }));
    }
  }, []);

  const loadMyHomeworks = useCallback(async () => {
    setLoading((p) => ({ ...p, myHomeworks: true }));
    setError((p) => ({ ...p, myHomeworks: "" }));

    try {
      const res = await api.get("/me/homeworks/");
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

  /**
   * Активировать токен: POST /api/access/activate-token/
   */
  const activateToken = useCallback(
    async (token) => {
      setLoading((p) => ({ ...p, activateToken: true }));
      setError((p) => ({ ...p, activateToken: "" }));

      try {
        const payload = { token: norm(token) };
        const res = await api.post("/access/activate-token/", payload);

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
   * ✅ ВАЖНО: у тебя эндпоинт один: GET /api/lessons/
   * И фильтр ?course= может НЕ работать.
   *
   * Поэтому:
   * 1) пробуем /lessons/?course=<id>
   * 2) если пусто или ошибка — грузим /lessons/ и фильтруем на фронте
   */
  const loadLessonsPublicByCourse = useCallback(async (courseId) => {
    const cid = norm(courseId);
    if (!cid) return { ok: false, error: "Нет courseId" };

    setLoading((p) => ({
      ...p,
      lessonsByCourse: { ...(p.lessonsByCourse || {}), [cid]: true },
    }));

    try {
      // 1) пробуем фильтр
      let list = [];
      const first = await tryMany([
        () => api.get("/lessons/", { params: { course: cid } }),
        () => api.get("/lessons/", { params: { course_id: cid } }),
        () => api.get("/lessons/", { params: { courseId: cid } }),
      ]);

      if (first.ok) list = asList(first.res.data);

      // 2) fallback: грузим всё и фильтруем
      if (!Array.isArray(list) || list.length === 0) {
        const allRes = await api.get("/lessons/");
        const all = asList(allRes.data);
        list = (Array.isArray(all) ? all : []).filter((l) => getLessonCourseId(l) === cid);
      }

      setLessonsByCourse((prev) => ({ ...(prev || {}), [cid]: list }));
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
   * Открыть урок (получить видео): POST /api/lessons/open/ { lesson_id }
   * ✅ делаем устойчиво: видео может быть в data, а lesson внутри data.lesson
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
      const attempt = await tryMany([() => api.post("/lessons/open/", { lesson_id: idNum })]);
      if (!attempt.ok) throw attempt.error;

      const data = attempt.res?.data || null;

      const baseLesson =
        data?.lesson && typeof data.lesson === "object"
          ? data.lesson
          : data && typeof data === "object"
          ? data
          : null;

      const lessonObj = baseLesson ? { ...baseLesson, ...pickVideoFields(data) } : null;

      if (lessonObj) {
        setOpenedLessons((prev) => ({ ...(prev || {}), [key]: lessonObj }));
      }

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
   * Отправить ДЗ: POST /api/homeworks/
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

        const res = await api.post("/homeworks/", payload);
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
   * TEACHER ACTIONS
   * ========================= */

  const reviewHomework = useCallback(async (homeworkId, status, comment) => {
    try {
      const id = String(homeworkId);

      const attempt = await tryMany([
        () => api.patch(`/teacher/homeworks/${encodeURIComponent(id)}/`, { status, comment: comment ?? null }),
        () => api.patch(`/teacher/homeworks/${encodeURIComponent(id)}`, { status, comment: comment ?? null }),
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

  // Эти 2 эндпоинта у тебя НЕТ в списке — оставляю как "мягкие" (чтобы TeacherDashboard не падал)
  const archiveHomework = useCallback(async () => {
    return { ok: false, error: "Архивирование ДЗ: эндпоинт не найден на бэке" };
  }, []);
  const unarchiveHomework = useCallback(async () => {
    return { ok: false, error: "Разархивирование ДЗ: эндпоинт не найден на бэке" };
  }, []);

  // lesson create-with-upload существует: /teacher/lessons/create-with-upload/
  const addLesson = useCallback(
    async (payload) => {
      try {
        const p = payload || {};
        const needsFD = Object.values(p).some((v) => hasFileLike(v));
        const body = needsFD ? buildFormData(p) : p;

        const attempt = await tryMany([
          () => api.post("/teacher/lessons/create-with-upload/", body),
          () => api.post("/teacher/lessons/", body),
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
          () => api.patch(`/teacher/lessons/${encodeURIComponent(id)}/`, body),
          () => api.patch(`/teacher/lessons/${encodeURIComponent(id)}`, body),
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

  // курсы учителя у тебя отдельного эндпоинта нет — оставляю мягко через /courses/
  const addCourse = useCallback(
    async (payload) => {
      try {
        const attempt = await tryMany([() => api.post("/courses/", payload), () => api.post("/courses", payload)]);
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
          () => api.patch(`/courses/${encodeURIComponent(id)}/`, payload),
          () => api.patch(`/courses/${encodeURIComponent(id)}`, payload),
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

  /* =========================
   * HELPERS for TeacherDashboard
   * ========================= */
  const lessons = teacherLessons;
  const homeworks = teacherHomeworks;

  const findUserById = useCallback(
    (userId) => {
      const uid = String(userId ?? "");
      if (!uid) return null;

      const list = Array.isArray(teacherHomeworks) ? teacherHomeworks : [];
      const hit = list.find((x) => String(x?.user ?? x?.userId ?? "") === uid) || null;

      const name =
        hit?.student_username ||
        hit?.studentUsername ||
        hit?.username ||
        hit?.student_name ||
        hit?.studentName ||
        "";

      return { id: uid, name, username: name };
    },
    [teacherHomeworks]
  );

  const getCourseWithDetails = useCallback(
    (courseId) => {
      const cid = String(courseId ?? "");
      const list = Array.isArray(courses) ? courses : [];
      return list.find((c) => String(c?.id ?? c?.pk ?? c?.course_id ?? "") === cid) || null;
    },
    [courses]
  );

  const getLessonsByCourse = useCallback(
    (courseId) => {
      const cid = String(courseId ?? "");
      const list = Array.isArray(teacherLessons) ? teacherLessons : [];
      return list.filter((l) => getLessonCourseId(l) === cid);
    },
    [teacherLessons]
  );

  const value = useMemo(
    () => ({
      // public
      categories,
      courses,
      tariffs,
      loadPublic,

      // teacher
      teacherLessons,
      teacherHomeworks,
      loadTeacherLessons,
      loadTeacherHomeworks,
      reviewHomework,

      // teacher aliases
      lessons,
      homeworks,

      // teacher extras
      archiveHomework,
      unarchiveHomework,
      addLesson,
      updateLesson,
      addCourse,
      updateCourse,
      findUserById,
      getCourseWithDetails,
      getLessonsByCourse,

      // student
      myCourses,
      myHomeworks,
      loadMyCourses,
      loadMyHomeworks,
      activateToken,
      submitHomework,

      // lessons/video
      lessonsByCourse,
      loadLessonsPublicByCourse,
      openLesson,
      openedLessons,

      // misc
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
      lessons,
      homeworks,
      archiveHomework,
      unarchiveHomework,
      addLesson,
      updateLesson,
      addCourse,
      updateCourse,
      findUserById,
      getCourseWithDetails,
      getLessonsByCourse,
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
