// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import { useData } from "../contexts/DataContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { Card, CardContent } from "../components/ui/card.jsx";

const FALLBACK_HERO_BG =
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=2000&q=80";
const FALLBACK_TEACHER_BG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_CAT_BG =
  "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_COURSE_BG =
  "https://images.unsplash.com/photo-1556228724-4b1b4b3b6d12?auto=format&fit=crop&w=1600&q=80";

const str = (v) => String(v ?? "").trim();

function getApiBase() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return str(raw).replace(/\/+$/, "");
}

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

function extractSettings(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.results)) return payload.results[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return payload;
}

function extractArrayAny(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const keys = ["results", "items", "data", "list"];
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

async function tryGet(api, url, config = {}) {
  try {
    const r = await api.get(url, config);
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e };
  }
}

const getTeacherImg = (teacher) => {
  const img =
    teacher?.avatarUrl ||
    teacher?.photoUrl ||
    teacher?.image ||
    teacher?.avatar ||
    teacher?.photo ||
    teacher?.profile_photo ||
    teacher?.profilePhoto ||
    "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_TEACHER_BG;
};

const getCategoryImg = (category) => {
  const img =
    category?.photo ||
    category?.imageUrl ||
    category?.coverUrl ||
    category?.image ||
    category?.cover ||
    "";
  const abs = toAbsUrl(img);
  return abs || FALLBACK_CAT_BG;
};

const getCourseImg = (course, teacher) => {
  const img = course?.photo || course?.imageUrl || course?.coverUrl || course?.image || course?.cover || "";
  const abs = toAbsUrl(img);
  if (abs) return abs;
  const tImg = teacher ? getTeacherImg(teacher) : "";
  return tImg || FALLBACK_COURSE_BG;
};

// ✅ имя преподавателя из ЛЮБОГО места
function getTeacherNameFromAny(obj) {
  const first = str(obj?.first_name || obj?.firstName);
  const last = str(obj?.last_name || obj?.lastName);
  const fullParts = str(`${first} ${last}`.trim());

  return (
    fullParts ||
    str(obj?.full_name) ||
    str(obj?.fullName) ||
    str(obj?.name) ||
    str(obj?.username) ||
    str(obj?.email) ||
    str(obj?.title) ||
    ""
  );
}

// ✅ имя преподавателя из курса (если teacher объекта нет)
function getTeacherNameFromCourse(course) {
  const tObj = course?.teacher && typeof course.teacher === "object" ? course.teacher : null;
  const tObj2 = course?.instructor && typeof course.instructor === "object" ? course.instructor : null;

  const fromObj = getTeacherNameFromAny(tObj || tObj2);
  if (fromObj) return fromObj;

  return (
    str(course?.teacher_name) ||
    str(course?.teacherName) ||
    str(course?.instructor_name) ||
    str(course?.instructorName) ||
    str(course?.author_name) ||
    str(course?.authorName) ||
    ""
  );
}

function getInitials(name) {
  const s = str(name);
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

const scrollToId = (id) => {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (_) {}
};

const HomePage = () => {
  const data = useData();

  const categoriesFromCtx = Array.isArray(data?.categories) ? data.categories : [];
  const coursesFromCtx = Array.isArray(data?.courses) ? data.courses : [];
  const teachersFromCtx = Array.isArray(data?.teachers) ? data.teachers : [];

  const categories = categoriesFromCtx;
  const courses = coursesFromCtx;

  // ✅ settings
  const settingsFromCtx = data?.settings || null;
  const [settings, setSettings] = useState(settingsFromCtx);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (settingsFromCtx) setSettings(settingsFromCtx);
  }, [settingsFromCtx]);

  const loadSettings = useCallback(async () => {
    if (settingsFromCtx) return;
    setSettingsLoading(true);
    try {
      const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });
      const r = await api.get("/settings/");
      setSettings(extractSettings(r.data) || null);
    } catch (e) {
      console.error(e);
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [settingsFromCtx]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ✅ TEACHERS: максимально надёжно
  const [teachersDirect, setTeachersDirect] = useState([]);
  const [teachersDirectLoading, setTeachersDirectLoading] = useState(false);

  const loadTeachersDirect = useCallback(async () => {
    if (teachersFromCtx.length) return;

    setTeachersDirectLoading(true);
    try {
      const api = axios.create({ baseURL: getApiBase(), timeout: 20000 });

      const candidates = ["/teachers/", "/teacher/", "/users/teachers/", "/users/?role=teacher"];
      let list = [];

      for (const url of candidates) {
        const res = await tryGet(api, url);
        if (!res.ok) continue;
        const arr = extractArrayAny(res.data);
        if (arr.length) {
          list = arr;
          break;
        }
      }

      setTeachersDirect(list);
    } catch (e) {
      console.error(e);
      setTeachersDirect([]);
    } finally {
      setTeachersDirectLoading(false);
    }
  }, [teachersFromCtx.length]);

  useEffect(() => {
    loadTeachersDirect();
  }, [loadTeachersDirect]);

  // ✅ fallback teachers из courses
  const teachersFromCourses = useMemo(() => {
    const map = new Map();

    for (const c of courses || []) {
      const tObj = c?.teacher && typeof c.teacher === "object" ? c.teacher : null;
      const tObj2 = c?.instructor && typeof c.instructor === "object" ? c.instructor : null;
      const t = tObj || tObj2;

      const nameFromCourse = getTeacherNameFromCourse(c);
      if (!t && !nameFromCourse) continue;

      const id =
        t?.id ??
        t?.user_id ??
        t?.userId ??
        c?.teacherId ??
        c?.teacher_id ??
        (nameFromCourse ? `t_${nameFromCourse}` : `t_${map.size}`);

      if (!map.has(String(id))) {
        map.set(String(id), {
          id,
          ...t,
          name: getTeacherNameFromAny(t) || nameFromCourse || "",
        });
      }
    }

    return Array.from(map.values());
  }, [courses]);

  const teachers = useMemo(() => {
    const base = teachersFromCtx.length ? teachersFromCtx : teachersDirect;
    return base.length ? base : teachersFromCourses;
  }, [teachersFromCtx, teachersDirect, teachersFromCourses]);

  // maps
  const teacherById = useMemo(() => {
    const m = new Map();
    for (const t of teachers || []) {
      const id = t?.id ?? t?.user_id ?? t?.userId;
      if (id != null) m.set(String(id), t);
    }
    return m;
  }, [teachers]);

  // ✅ HERO background (из бэка) — один и тот же для обоих фонов
  const bannerUrl = useMemo(() => toAbsUrl(settings?.banner), [settings]);
  const heroBg = useMemo(() => (bannerUrl ? bannerUrl : FALLBACK_HERO_BG), [bannerUrl]);

  const heroBigTitle = useMemo(() => str(settings?.hero_big_title) || "МАССАЖ", [settings]);
  const heroBigTitle2 = useMemo(() => str(settings?.hero_big_title2) || "КУРСЫ", [settings]);
  const heroVersion = useMemo(() => str(settings?.hero_version) || "PRO", [settings]);

  const heroSub = useMemo(
    () =>
      str(settings?.hero_subtitle_ru) ||
      "Освой массаж с нуля до уверенной практики.\nКороткие уроки + домашние задания + обратная связь от преподавателей.",
    [settings]
  );

  // ✅ Правый квадрат — ТОЖЕ тот же banner
  const heroRightImg = useMemo(() => heroBg || FALLBACK_HERO_BG, [heroBg]);

  const forWhoCards = useMemo(
    () => [
      {
        title: "НОВИЧКАМ",
        desc: "Начнёшь с базы: постановка рук, безопасность, анатомия простым языком.",
        img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80",
      },
      {
        title: "ПРАКТИКУЮЩИМ",
        desc: "Систематизируешь знания и добавишь техники: спина, шея, триггеры, миофасциальные подходы.",
        img: "https://images.unsplash.com/photo-1616394584738-fc6e612e71d3?auto=format&fit=crop&w=900&q=80",
      },
      {
        title: "САЛОНАМ",
        desc: "Поднимешь качество сервиса: протоколы, консультация, план процедур, удержание клиентов.",
        img: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=900&q=80",
      },
      {
        title: "ТЕМ, КТО ХОЧЕТ ДОХОД",
        desc: "Научишься правильно упаковать услугу и выстроить стабильный поток клиентов.",
        img: "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=900&q=80",
      },
    ],
    []
  );

  const benefits = useMemo(
    () => [
      { n: "01", title: "Пошаговая программа", text: "Уроки от простого к сложному: техника, анатомия, противопоказания, практика." },
      { n: "02", title: "Короткие уроки", text: "10–20 минут — удобно учиться каждый день без перегруза." },
      { n: "03", title: "Домашние задания", text: "Практика после каждого блока: закрепляешь навык сразу." },
      { n: "04", title: "Проверка и обратная связь", text: "Преподаватель принимает / отправляет на доработку — всё прозрачно." },
      { n: "05", title: "Доступ к материалам", text: "Смотри уроки в любое время с телефона или ноутбука." },
      { n: "06", title: "Результат", text: "Ты уверенно проводишь сеанс по понятному протоколу и понимаешь, что делаешь." },
    ],
    []
  );

  // ✅ связь: преподаватель -> курсы (чтобы в карточке показывать, что он ведёт)
  const teacherCoursesMap = useMemo(() => {
    const map = new Map();

    const add = (key, course) => {
      if (!key) return;
      const k = String(key);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(course);
    };

    for (const c of courses || []) {
      const tid = c?.teacherId ?? c?.teacher_id ?? c?.teacher?.id ?? c?.instructor?.id ?? null;
      const tname = getTeacherNameFromCourse(c);

      if (tid != null) add(`id:${tid}`, c);
      if (tname) add(`name:${tname.toLowerCase()}`, c);
    }

    // убираем дубли курсов по id
    for (const [k, arr] of map.entries()) {
      const seen = new Set();
      const uniq = [];
      for (const item of arr) {
        const id = item?.id ?? item?.pk ?? item?.uuid ?? `${item?.title || ""}-${uniq.length}`;
        const sid = String(id);
        if (seen.has(sid)) continue;
        seen.add(sid);
        uniq.push(item);
      }
      map.set(k, uniq);
    }

    return map;
  }, [courses]);

  // ✅ speakers: БЕЗ фото, только имя + курсы
  const speakers = useMemo(() => {
    return (teachers || [])
      .map((t, idx) => {
        const idRaw = t?.id ?? t?.user_id ?? t?.userId ?? null;
        const name = getTeacherNameFromAny(t) || str(t?.name) || `Преподаватель ${idx + 1}`;

        const listById = idRaw != null ? teacherCoursesMap.get(`id:${idRaw}`) || [] : [];
        const listByName = name ? teacherCoursesMap.get(`name:${name.toLowerCase()}`) || [] : [];
        const merged = [...listById, ...listByName];

        // уникальные курсы
        const seen = new Set();
        const coursesUniq = [];
        for (const c of merged) {
          const cid = c?.id ?? c?.pk ?? c?.uuid ?? c?.title;
          const key = String(cid ?? "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          coursesUniq.push(c);
        }

        const courseTitles = coursesUniq
          .map((c) => str(c?.title || c?.name || c?.course_title || c?.courseName))
          .filter(Boolean);

        return {
          id: idRaw ?? `t-${idx}`,
          name,
          initials: getInitials(name),
          coursesCount: courseTitles.length,
          courseTitles,
        };
      })
      .filter((x) => x && x.name);
  }, [teachers, teacherCoursesMap]);

  const teachersCount = speakers.length;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white overflow-x-hidden">
      {/* HERO */}
      <section
        id="home"
        className="relative w-screen min-h-[100svh] overflow-hidden"
        style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,214,10,.20),transparent_55%),radial-gradient(circle_at_70%_20%,rgba(255,214,10,.10),transparent_55%)]" />
        </div>

        <div className="relative z-10">
          <div className="app-container">
            <div className="pt-10 sm:pt-14 lg:pt-20 pb-14 sm:pb-16">
              <div className="grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7">
                  <div className="leading-none">
                    <div className="text-[52px] sm:text-[74px] lg:text-[92px] font-extrabold tracking-[0.08em] uppercase">
                      {heroBigTitle}
                    </div>
                    <div className="mt-1 flex items-end gap-4">
                      <div className="text-[52px] sm:text-[74px] lg:text-[92px] font-extrabold tracking-[0.08em] text-white/80 uppercase">
                        {heroBigTitle2}
                      </div>
                      <div className="text-[56px] sm:text-[84px] lg:text-[110px] font-extrabold text-white uppercase">
                        {heroVersion}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 text-white/80 text-lg sm:text-xl leading-relaxed whitespace-pre-line max-w-2xl">
                    {heroSub}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button
                      size="lg"
                      className="h-12 px-8 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold shadow-[0_10px_30px_rgba(255,215,10,0.15)]"
                      onClick={() => scrollToId("catalog")}
                    >
                      Выбрать курс
                    </Button>

                    <Button
                      variant="outline"
                      className="h-12 px-8 rounded-xl border-white/20 text-white bg-white/0 hover:bg-white/10"
                      onClick={() => scrollToId("contacts")}
                    >
                      Связаться
                    </Button>
                  </div>

                  {settingsLoading || teachersDirectLoading ? (
                    <div className="mt-3 text-xs text-white/60">Загрузка…</div>
                  ) : null}

                  <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/65">
                    <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                      Курсов: {courses.length}
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                      Категорий: {categories.length}
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                      Преподов: {teachersCount}
                    </div>
                  </div>
                </div>

                {/* right square */}
                <div className="lg:col-span-5">
                  <div className="relative aspect-square w-full max-w-[520px] ml-auto rounded-[22px] overflow-hidden border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                    <img
                      src={heroRightImg}
                      alt="Hero"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_HERO_BG;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/65 via-black/15 to-black/65" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_25%,rgba(255,214,10,.22),transparent_55%)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ❌ убрал нижнюю “полосу/линию” */}
        </div>
      </section>

      {/* 2) FOR WHO */}
      <section
        id="forwho"
        className="relative w-screen"
        style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
      >
        <div className="relative py-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(255,214,10,.10),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/45 to-black/15" />

          <div className="relative app-container">
            <div className="text-center">
              <div className="text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
                ДЛЯ КОГО ЭТОТ КУРС?
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {forWhoCards.map((c, idx) => (
                <div
                  key={idx}
                  className="rounded-[18px] border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden"
                >
                  <div className="p-4 bg-white text-black">
                    <div className="text-center font-extrabold leading-tight uppercase">{c.title}</div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-[14px] overflow-hidden border border-white/10 bg-black/30">
                      <img
                        src={c.img}
                        alt={c.title}
                        className="w-full h-[190px] object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_CAT_BG;
                        }}
                      />
                    </div>

                    <div className="mt-4 text-white/75 text-sm leading-relaxed text-center">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
        </div>
      </section>

      {/* 3) CATEGORIES */}
      <section id="categories" className="app-container py-16 sm:py-20">
        <div className="text-center">
          <div className="text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
            КАТЕГОРИИ
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {categories.map((category) => {
            const img = getCategoryImg(category);
            return (
              <Link key={category.id} to={`/category/${category.id}`} className="block h-full">
                <Card className="h-full hover:shadow-lg transition cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="h-[140px] w-full bg-black/30">
                    <img
                      src={img}
                      alt={category?.name || "Категория"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_CAT_BG;
                      }}
                    />
                  </div>

                  <CardContent className="p-5">
                    <div className="text-lg font-extrabold leading-snug text-white">{category?.name}</div>
                    {category?.description ? (
                      <div className="mt-2 text-sm text-white/70 line-clamp-3">{category.description}</div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4) BENEFITS */}
      <section id="benefits" className="app-container py-16 sm:py-20">
        <div className="text-center">
          <div className="text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
            ЧТО ТЫ ПОЛУЧИШЬ?
          </div>
        </div>

        <div className="mt-10">
          <div className="rounded-[18px] border border-white/10 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="p-6 sm:p-10 text-black">
              <div className="space-y-10">
                {benefits.map((b) => (
                  <div key={b.n} className="grid md:grid-cols-12 gap-6">
                    <div className="md:col-span-2 flex md:block items-start gap-4">
                      <div className="text-[#FFD70A] font-extrabold text-6xl sm:text-7xl leading-none">
                        {b.n}
                      </div>
                      <div className="hidden md:block w-[3px] h-20 bg-[#FFD70A]" />
                    </div>

                    <div className="md:col-span-10">
                      <div className="text-2xl sm:text-3xl font-extrabold leading-snug">{b.title}</div>
                      <div className="mt-4 text-gray-700 leading-relaxed">{b.text}</div>
                    </div>

                    <div className="md:col-span-12">
                      <div className="h-[1px] bg-black/10" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  className="h-12 px-8 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold"
                  onClick={() => scrollToId("catalog")}
                >
                  Перейти к курсам
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5) COURSES */}
      <section id="catalog" className="app-container py-16 sm:py-20">
        <div className="text-center">
          <div className="text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
            КУРСЫ
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.slice(0, 6).map((course) => {
            const teacher =
              course?.teacherId != null
                ? teacherById.get(String(course.teacherId))
                : course?.teacher_id != null
                ? teacherById.get(String(course.teacher_id))
                : course?.teacher || course?.instructor || null;

            const teacherName = getTeacherNameFromAny(teacher) || getTeacherNameFromCourse(course) || "—";
            const courseImg = getCourseImg(course, teacher);

            return (
              <Link key={course.id} to={`/course/${course.id}`} className="block h-full">
                <Card className="hover:shadow-lg transition cursor-pointer h-full flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="h-[160px] w-full bg-black/30">
                    <img
                      src={courseImg}
                      alt={course?.title || "Курс"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const tImg = teacher ? getTeacherImg(teacher) : "";
                        if (tImg && e.currentTarget.src !== tImg) {
                          e.currentTarget.src = tImg;
                          return;
                        }
                        e.currentTarget.src = FALLBACK_COURSE_BG;
                      }}
                    />
                  </div>

                  <CardContent className="p-5 flex-1">
                    <div className="text-lg font-extrabold text-white">{course?.title}</div>
                    {course?.description ? (
                      <div className="mt-2 text-sm text-white/70 line-clamp-3">{course.description}</div>
                    ) : null}

                    <div className="mt-4 text-xs text-white/60">
                      Преподаватель: <span className="text-white/90 font-semibold">{teacherName}</span>
                    </div>
                  </CardContent>

                  <div className="p-5 pt-0">
                    <Button className="w-full h-11 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold">
                      Подробнее
                    </Button>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6) SPEAKERS (КРАСИВО, БЕЗ ФОТО) */}
      <section id="speakers" className="app-container py-16 sm:py-20">
        <div className="text-center">
          <div className="text-[#FFD70A] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.08em] uppercase">
            ПРЕПОДАВАТЕЛИ
          </div>
          <div className="mt-3 text-white/70">
            Кто ведёт обучение и какие курсы преподаёт
          </div>
        </div>

        <div className="mt-10">
          <div className="rounded-[18px] border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="p-6 sm:p-10">
              {speakers.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {speakers.slice(0, 9).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.55)] hover:shadow-[0_22px_70px_rgba(0,0,0,0.70)] transition"
                    >
                      <div className="flex items-start gap-4">
                        {/* ✅ вместо фото — инициалы */}
                        <div className="shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,214,10,.35),transparent_65%)] border border-white/10 flex items-center justify-center shadow-[0_16px_40px_rgba(0,0,0,0.60)]">
                            <div className="text-black font-extrabold bg-[#FFD70A] px-3 py-2 rounded-xl">
                              {s.initials}
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-white font-extrabold text-lg leading-tight truncate">
                            {s.name}
                          </div>

                          <div className="mt-2 text-xs text-white/60">
                            Курсов ведёт:{" "}
                            <span className="text-white/90 font-semibold">{s.coursesCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* ✅ список курсов */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(s.courseTitles.length ? s.courseTitles : ["Курс(ы) скоро появятся"])
                          .slice(0, 4)
                          .map((t, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/85"
                            >
                              {t}
                            </span>
                          ))}
                      </div>

                      {s.courseTitles.length > 4 ? (
                        <div className="mt-2 text-xs text-white/55">
                          + ещё {s.courseTitles.length - 4} курса
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/70">
                  Преподаватели не найдены (проверь эндпоинт /teachers/ или доступ).
                </div>
              )}

              <div className="mt-10 flex justify-center">
                <Button
                  className="h-12 px-8 rounded-xl bg-[#FFD70A] text-black hover:bg-[#ffde33] font-bold"
                  onClick={() => scrollToId("catalog")}
                >
                  Смотреть курсы
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7) CONTACTS */}
      <footer
        id="contacts"
        className="relative w-screen"
        style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
      >
        {/* футер оставь как у тебя */}
      </footer>
    </div>
  );
};

export { HomePage };
export default HomePage;
