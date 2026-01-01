// src/pages/AnalysticPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BarChart3,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Layers,
  BookOpen,
  TrendingUp,
  CalendarDays,
  Lock,
  Users,
  ShoppingCart,
  Wallet,
  Info,
  ArrowUpRight,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext.jsx";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Badge } from "../components/ui/badge.jsx";

const norm = (s) => String(s ?? "").trim();
const normLow = (s) => norm(s).toLowerCase();

const toNum = (v) => {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function safeObj(v) {
  return v && typeof v === "object" ? v : {};
}

function pickId(x) {
  const v = x?.id ?? x?.pk ?? x?.course_id ?? x?.courseId ?? x?.course ?? "";
  return String(v ?? "").trim();
}

function pickTitle(x) {
  return (
    x?.title ||
    x?.name ||
    x?.course_title ||
    x?.courseTitle ||
    x?.lesson_title ||
    x?.lessonTitle ||
    x?.label ||
    "—"
  );
}

function moneySom(v) {
  const n = toNum(v);
  return `${n.toFixed(2)} сом`;
}

function percentFromRate(v) {
  const n = toNum(v);
  const p = n <= 1 ? n * 100 : n;
  const clamped = Math.max(0, Math.min(100, p));
  return `${clamped.toFixed(0)}%`;
}

function formatDate(d) {
  const s = norm(d);
  return s || "—";
}

/** достаёт число по нескольким путям (поддерживает вложенность через ".") */
function pickNumberAny(obj, paths) {
  const root = safeObj(obj);
  for (const p of paths) {
    const path = String(p || "").trim();
    if (!path) continue;
    const parts = path.split(".").filter(Boolean);
    let cur = root;
    let ok = true;
    for (const key of parts) {
      if (!cur || typeof cur !== "object" || !(key in cur)) {
        ok = false;
        break;
      }
      cur = cur[key];
    }
    if (!ok) continue;
    const n = toNum(cur);
    // учитываем даже 0 как валидное
    if (n !== 0 || cur === 0 || cur === "0") return n;
  }
  return 0;
}

function normalizeCourseDetail(raw) {
  const obj = safeObj(raw);
  const courseObj = safeObj(obj.course) && Object.keys(obj.course || {}).length ? obj.course : obj;

  const courseId = String(courseObj.course_id ?? courseObj.id ?? courseObj.pk ?? obj.course_id ?? "") || "";
  const title = String(courseObj.course_title ?? courseObj.title ?? courseObj.name ?? obj.course_title ?? "Курс");

  const totalPurchases = Number(courseObj.total_purchases ?? obj.total_purchases ?? 0) || 0;
  const totalRevenue = String(courseObj.total_revenue ?? obj.total_revenue ?? "0");
  const totalStudents = Number(courseObj.total_students ?? obj.total_students ?? 0) || 0;
  const completionRate = courseObj.completion_rate ?? obj.completion_rate ?? 0;

  const dailyRaw = obj.daily ?? courseObj.daily ?? [];
  const daily = extractArray(dailyRaw).map((r) => ({
    date: r?.date ?? "",
    purchases: Number(r?.purchases ?? 0) || 0,
    revenue: String(r?.revenue ?? "0"),
    openedLessons: Number(r?.opened_lessons ?? 0) || 0,
    uniqueStudents: Number(r?.unique_students ?? 0) || 0,
    homeworksSubmitted: Number(r?.homeworks_submitted ?? 0) || 0,
    homeworksAccepted: Number(r?.homeworks_accepted ?? 0) || 0,
  }));

  daily.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    courseId,
    title,
    totalPurchases,
    totalRevenue,
    totalStudents,
    completionRate,
    daily,
    _raw: raw,
  };
}

/* ============ SearchableSelectSingle (без <select>) ============ */
function SearchableSelectSingle({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  disabled = false,
  getLabel = (o) => o?.label ?? "",
  getValue = (o) => o?.value ?? "",
  className = "",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    const v = String(value ?? "");
    return (Array.isArray(options) ? options : []).find((o) => String(getValue(o)) === v) || null;
  }, [value, options, getValue]);

  const filtered = useMemo(() => {
    const q = normLow(query);
    const list = Array.isArray(options) ? options : [];
    if (!q) return list;
    return list.filter((o) => normLow(getLabel(o)).includes(q));
  }, [options, query, getLabel]);

  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      const w = wrapRef.current;
      if (w && w.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const pick = (val) => {
    onChange?.(val);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((p) => !p);
        }}
        className={[
          "w-full border rounded-md px-3 py-2 bg-white flex items-center justify-between gap-2",
          "hover:bg-gray-50 transition",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-sm ${selected ? "text-gray-900" : "text-gray-500"} truncate`}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-sm outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-md hover:bg-gray-100 transition"
                  aria-label="Очистить"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-64 overflow-auto">
            <button
              type="button"
              onClick={() => pick("")}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {placeholder}
            </button>

            {filtered.map((o) => {
              const v = String(getValue(o));
              const label = getLabel(o);
              const isActive = String(value ?? "") === v;

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pick(v)}
                  className={[
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                    isActive ? "bg-blue-50" : "",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}

            {filtered.length === 0 && <div className="px-3 py-3 text-sm text-gray-500">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Scrollbar hidden wrapper ============ */
function ScrollHidden({ className = "", style = {}, children }) {
  return (
    <div
      className={`sb-scroll-hidden ${className}`}
      style={{
        ...style,
        overflow: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        .sb-scroll-hidden::-webkit-scrollbar { width: 0px; height: 0px; }
      `}</style>
      {children}
    </div>
  );
}

/* ============ UI ============ */
function BigLoader({ title = "Загрузка…", subtitle = "Пожалуйста, не выходите" }) {
  return (
    <div className="py-12 text-center text-gray-800">
      <div className="mx-auto h-16 w-16 rounded-full border-4 border-gray-300 border-t-gray-900 animate-spin" />
      <div className="mt-4 text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
    </div>
  );
}

function ErrorBox({ text }) {
  if (!text) return null;
  return <div className="text-sm text-red-600">{text}</div>;
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 text-lg font-semibold text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500">{label}</div>
        {hint ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5" />
            {hint}
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-lg font-semibold text-gray-900 truncate">{value}</div>
    </div>
  );
}

function DailyTable({ rows }) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return <div className="text-sm text-gray-600">Нет дневной статистики.</div>;

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <ScrollHidden className="max-h-[55vh]">
        <div className="min-w-[900px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 border-b text-gray-600 font-medium">Дата</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">Покупки</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">Выручка</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">Открыли уроки</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">Уник. студенты</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">ДЗ отправлено</th>
                <th className="text-left p-3 border-b text-gray-600 font-medium">ДЗ принято</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, idx) => (
                <tr key={`${r.date || "d"}-${idx}`} className="hover:bg-gray-50">
                  <td className="p-3 border-b text-gray-900">{formatDate(r.date)}</td>
                  <td className="p-3 border-b text-gray-900">{r.purchases}</td>
                  <td className="p-3 border-b text-gray-900">{moneySom(r.revenue)}</td>
                  <td className="p-3 border-b text-gray-900">{r.openedLessons}</td>
                  <td className="p-3 border-b text-gray-900">{r.uniqueStudents}</td>
                  <td className="p-3 border-b text-gray-900">{r.homeworksSubmitted}</td>
                  <td className="p-3 border-b text-gray-900">{r.homeworksAccepted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollHidden>
    </div>
  );
}

/* ============ Top lessons metric picker ============ */
function pickBestMetric(row) {
  const r = safeObj(row);

  const candidates = [
    "opens",
    "opened",
    "opened_count",
    "open_count",
    "opens_count",
    "total_opens",
    "views",
    "view_count",
    "views_count",
    "total_views",
    "count",
    "total",
    "value",
    "metric",
  ];

  for (const k of candidates) {
    const v = r?.[k];
    const n = toNum(v);
    if (n !== 0 || v === 0 || v === "0") return { value: n, key: k };
  }

  const ignore = new Set([
    "id",
    "pk",
    "course",
    "course_id",
    "courseId",
    "course_title",
    "courseTitle",
    "title",
    "name",
    "lesson",
    "lesson_id",
    "lessonId",
    "lesson_title",
    "lessonTitle",
    "date",
    "created_at",
    "updated_at",
  ]);

  for (const k of Object.keys(r)) {
    if (ignore.has(k)) continue;
    const n = toNum(r[k]);
    if (n !== 0 || r[k] === 0 || r[k] === "0") return { value: n, key: k };
  }

  return { value: 0, key: "" };
}

/* ============ Modal (адаптив + не вылезает + скролл без полосы) ============ */
function CourseDailyModal({ open, onClose, detail }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const d = detail || null;
  const dailyCount = d?.daily?.length || 0;

  const daily = Array.isArray(d?.daily) ? d.daily : [];
  const totalOpened = daily.reduce((s, x) => s + (Number(x.openedLessons) || 0), 0);
  const totalSubmitted = daily.reduce((s, x) => s + (Number(x.homeworksSubmitted) || 0), 0);
  const totalAccepted = daily.reduce((s, x) => s + (Number(x.homeworksAccepted) || 0), 0);
  const bestDay = daily.reduce(
    (best, x) => {
      const rev = toNum(x.revenue);
      if (!best) return { date: x.date, revenue: rev };
      return rev > best.revenue ? { date: x.date, revenue: rev } : best;
    },
    null
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          className={[
            "relative z-10 w-full bg-white overflow-hidden shadow-xl border border-white/10",
            "rounded-2xl sm:max-w-6xl",
            "h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{d?.title || "Курс"}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                ID: {d?.courseId || "—"} • Дней: {dailyCount}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* скролл есть, полоса скрыта */}
          <ScrollHidden className="h-[calc(100%-56px)]">
            <div className="p-3 sm:p-4 bg-gray-50">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Покупок" value={String(d?.totalPurchases ?? 0)} />
                <StatCard label="Выручка" value={moneySom(d?.totalRevenue ?? 0)} />
                <StatCard label="Студентов" value={String(d?.totalStudents ?? 0)} />
                <StatCard label="Завершили курс" value={percentFromRate(d?.completionRate ?? 0)} hint="Процент завершения" />
              </div>

              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Открытий уроков (за период)" value={String(totalOpened)} />
                <StatCard label="ДЗ отправлено (за период)" value={String(totalSubmitted)} />
                <StatCard label="ДЗ принято (за период)" value={String(totalAccepted)} />
                <StatCard
                  label="Лучший день по выручке"
                  value={bestDay ? `${formatDate(bestDay.date)} • ${moneySom(bestDay.revenue)}` : "—"}
                />
              </div>

              <div className="mt-4 rounded-2xl border bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <CalendarDays className="w-4 h-4" />
                    Дневная статистика
                  </div>

                  <Badge variant="secondary" className="gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {dailyCount} дней
                  </Badge>
                </div>

                <DailyTable rows={d?.daily || []} />
              </div>
            </div>
          </ScrollHidden>
        </div>
      </div>
    </div>
  );
}

/* ============ Page ============ */
export function AnalysticPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ доступ только админам
  useEffect(() => {
    const role = normLow(user?.role);
    const allowed = new Set(["admin", "Analystic", "superadmin", "owner"]);
    if (!role || !allowed.has(role)) {
      toast.error("Доступ запрещён (только для админов)");
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // ✅ API: timeout отключён
  const api = useMemo(() => {
    const inst = axios.create({ baseURL: "/api", timeout: 0 });
    inst.interceptors.request.use((config) => {
      try {
        const t =
          localStorage.getItem("access") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt_access") ||
          localStorage.getItem("authToken") ||
          "";
        if (t) config.headers.Authorization = `Bearer ${t}`;
      } catch (_) {}
      return config;
    });
    return inst;
  }, []);

  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [topLessons, setTopLessons] = useState([]);

  const [courseDetails, setCourseDetails] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [modalCourseId, setModalCourseId] = useState("");

  const [loading, setLoading] = useState({
    overview: false,
    courses: false,
    topLessons: false,
    allCourseDetails: false,
  });

  const [error, setError] = useState({
    overview: "",
    courses: "",
    topLessons: "",
    allCourseDetails: "",
  });

  const setL = (k, v) => setLoading((p) => ({ ...p, [k]: v }));
  const setE = (k, v) => setError((p) => ({ ...p, [k]: v }));

  const extractErr = (e, fallback) => {
    const d = e?.response?.data;
    if (typeof d === "string") return d;
    if (d?.detail) return String(d.detail);
    if (d?.message) return String(d.message);
    return fallback;
  };

  const loadOverview = useCallback(async () => {
    setL("overview", true);
    setE("overview", "");
    try {
      const { data } = await api.get("/analystic/overview/", { timeout: 0 });
      setOverview(data);
    } catch (e) {
      setOverview(null);
      setE("overview", extractErr(e, "Не удалось загрузить общий обзор"));
    } finally {
      setL("overview", false);
    }
  }, [api]);

  const loadCourses = useCallback(async () => {
    setL("courses", true);
    setE("courses", "");
    try {
      const { data } = await api.get("/analystic/courses/", { timeout: 0 });
      setCourses(extractArray(data));
    } catch (e) {
      setCourses([]);
      setE("courses", extractErr(e, "Не удалось загрузить курсы"));
    } finally {
      setL("courses", false);
    }
  }, [api]);

  const loadTopLessons = useCallback(async () => {
    setL("topLessons", true);
    setE("topLessons", "");
    try {
      const { data } = await api.get("/analystic/lessons/top/", { timeout: 0 });
      setTopLessons(extractArray(data));
    } catch (e) {
      setTopLessons([]);
      setE("topLessons", extractErr(e, "Не удалось загрузить топ уроков"));
    } finally {
      setL("topLessons", false);
    }
  }, [api]);

  const loadCourseDetail = useCallback(
    async (courseId) => {
      const cid = norm(courseId);
      if (!cid) return null;
      const { data } = await api.get(`/analystic/courses/${cid}/`, { timeout: 0 });
      return normalizeCourseDetail(data);
    },
    [api]
  );

  const loadAllCourseDetails = useCallback(
    async (list) => {
      const arr = Array.isArray(list) ? list : [];
      const ids = arr.map((c) => pickId(c)).filter(Boolean);

      if (!ids.length) {
        setCourseDetails({});
        return;
      }

      setL("allCourseDetails", true);
      setE("allCourseDetails", "");

      const next = {};
      for (const id of ids) {
        try {
          const normed = await loadCourseDetail(id);
          next[id] = normed;
        } catch (e) {
          next[id] = { __error: extractErr(e, `Ошибка аналитики курса ID=${id}`) };
        }
      }
      setCourseDetails(next);
      setL("allCourseDetails", false);
    },
    [loadCourseDetail]
  );

  const reloadAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadCourses(), loadTopLessons()]);
  }, [loadOverview, loadCourses, loadTopLessons]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!courses.length) return;
    loadAllCourseDetails(courses);
  }, [courses, loadAllCourseDetails]);

  const courseOptions = useMemo(() => {
    return (courses || [])
      .map((c) => ({ value: pickId(c), label: String(pickTitle(c)) }))
      .filter((x) => x.value && x.label);
  }, [courses]);

  const selectedDetail = useMemo(() => {
    const cid = norm(selectedCourseId);
    if (!cid) return null;
    const d = courseDetails?.[cid];
    if (!d || d.__error) return null;
    return d;
  }, [selectedCourseId, courseDetails]);

  const modalDetail = useMemo(() => {
    const cid = norm(modalCourseId);
    if (!cid) return null;
    const d = courseDetails?.[cid];
    if (!d || d.__error) return null;
    return d;
  }, [modalCourseId, courseDetails]);

  // ✅ KPI сверху (сумма по курсам)
  const topKpi = useMemo(() => {
    const map = safeObj(courseDetails);
    const details = Object.values(map).filter((d) => d && !d.__error);

    const totalPurchases = details.reduce((s, d) => s + (Number(d.totalPurchases) || 0), 0);
    const totalRevenue = details.reduce((s, d) => s + toNum(d.totalRevenue), 0);
    const totalStudents = details.reduce((s, d) => s + (Number(d.totalStudents) || 0), 0);

    return {
      totalPurchases,
      totalRevenue,
      totalStudents,
      totalCourses: (courses || []).length,
    };
  }, [courseDetails, courses]);

  // ✅ OVERVIEW: убрали 2 карточки и поставили 2 рабочих (покупки+выручка)
  const overviewCards = useMemo(() => {
    const o = safeObj(overview);

    const purchases = pickNumberAny(o, [
      "total_purchases",
      "purchases",
      "overview.total_purchases",
      "data.total_purchases",
    ]);

    const revenue = pickNumberAny(o, [
      "total_revenue",
      "revenue",
      "overview.total_revenue",
      "data.total_revenue",
    ]);

    const uniqueStudents = pickNumberAny(o, [
      "unique_students",
      "total_students",
      "students",
      "overview.unique_students",
      "data.unique_students",
    ]);

    const accepted = pickNumberAny(o, [
      "accepted_homeworks",
      "homeworks_accepted",
      "total_accepted_homeworks",
      "accepted",
      "overview.accepted_homeworks",
      "homeworks.accepted",
      "homework.accepted",
    ]);

    // fallback, если overview пустой/кривой
    const purchasesVal = purchases || topKpi.totalPurchases;
    const revenueVal = revenue || topKpi.totalRevenue;

    return [
      { label: "Покупок (за период)", value: String(purchasesVal) },
      { label: "Выручка (за период)", value: moneySom(revenueVal) },
      { label: "Уникальных студентов", value: String(uniqueStudents) },
      { label: "ДЗ принято", value: String(accepted) },
    ];
  }, [overview, topKpi]);

  const topLessonRows = useMemo(() => {
    const arr = extractArray(topLessons);
    return arr.map((x, idx) => {
      const row = safeObj(x);
      const { value: metricValue } = pickBestMetric(row);

      return {
        id: row.id ?? row.pk ?? idx + 1,
        title: pickTitle(row),
        courseTitle: row.course_title ?? row.courseTitle ?? row.course_name ?? "—",
        metric: metricValue,
      };
    });
  }, [topLessons]);

  const anyLoading = loading.overview || loading.courses || loading.topLessons || loading.allCourseDetails;

  const openCourseModal = useCallback((courseId) => {
    const cid = norm(courseId);
    if (!cid) return;
    setSelectedCourseId(cid);
    setModalCourseId(cid);
    setIsCourseModalOpen(true);
  }, []);

  const closeCourseModal = useCallback(() => {
    setIsCourseModalOpen(false);
    setModalCourseId("");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* px-3 чтобы влезало даже на 320 */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl">Аналитика (Админ)</h1>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Доступ только для администраторов
            </div>
          </div>

          {/* кнопки не ломают 320: на мобиле = в колонку */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Назад
            </Button>

            <Button variant="outline" onClick={reloadAll} disabled={anyLoading} className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${anyLoading ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </div>
        </div>

        {/* TOP KPI */}
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={ShoppingCart} label="Общие покупки" value={String(topKpi.totalPurchases)} />
          <KPI icon={Wallet} label="Общая выручка" value={moneySom(topKpi.totalRevenue)} />
          <KPI icon={Users} label="Общие студенты" value={String(topKpi.totalStudents)} />
          <KPI icon={BookOpen} label="Курсов" value={String(topKpi.totalCourses)} />
        </div>

        {/* OVERVIEW */}
        <Card className="mt-6">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Общий обзор
            </CardTitle>

            <Button variant="outline" size="sm" onClick={loadOverview} disabled={loading.overview} className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading.overview ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <ErrorBox text={error.overview} />
            {loading.overview ? (
              <BigLoader title="Загрузка общего обзора…" />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {overviewCards.map((c) => (
                  <StatCard key={c.label} label={c.label} value={c.value} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COURSES */}
        <Card className="mt-6">
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Аналитика по курсам
            </CardTitle>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={loadCourses} disabled={loading.courses} className="w-full sm:w-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.courses ? "animate-spin" : ""}`} />
                Курсы
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAllCourseDetails(courses)}
                disabled={loading.allCourseDetails || !courses.length}
                className="w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.allCourseDetails ? "animate-spin" : ""}`} />
                Аналитика
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <ErrorBox text={error.courses || error.allCourseDetails} />

            {loading.courses ? (
              <BigLoader title="Загрузка курсов…" />
            ) : !courses.length ? (
              <div className="text-sm text-gray-600">Курсов пока нет.</div>
            ) : loading.allCourseDetails ? (
              <BigLoader title="Загрузка аналитики курсов…" />
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* left */}
                <div className="lg:col-span-2 space-y-4">
                  {courses.map((c) => {
                    const id = pickId(c);
                    const title = pickTitle(c);
                    const d = courseDetails?.[id];

                    if (d?.__error) {
                      return (
                        <div key={id} className="rounded-2xl border bg-white p-5">
                          <div className="font-semibold text-gray-900 truncate">{title}</div>
                          <div className="text-xs text-gray-500 mt-1">ID: {id}</div>
                          <div className="mt-3 text-sm text-red-600">{String(d.__error)}</div>
                        </div>
                      );
                    }

                    return (
                      <div key={id} className="rounded-2xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{title}</div>
                            <div className="text-xs text-gray-500 mt-1">ID: {id}</div>

                            {d && !d.__error ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary">Покупок: {d.totalPurchases}</Badge>
                                <Badge variant="secondary">Выручка: {moneySom(d.totalRevenue)}</Badge>
                                <Badge variant="secondary">Студентов: {d.totalStudents}</Badge>
                                <Badge variant="secondary">Завершили: {percentFromRate(d.completionRate)}</Badge>
                              </div>
                            ) : (
                              <div className="mt-3 text-sm text-gray-600">Нет аналитики по курсу.</div>
                            )}
                          </div>

                          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => openCourseModal(id)}>
                            <BookOpen className="w-4 h-4" />
                            Открыть
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* right */}
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Выбранный курс</div>
                    <SearchableSelectSingle
                      value={selectedCourseId}
                      onChange={(v) => setSelectedCourseId(String(v || ""))}
                      options={courseOptions}
                      placeholder="Выберите курс"
                      searchPlaceholder="Найти курс..."
                      disabled={loading.courses}
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      Здесь видно подробную статистику по одному курсу.
                    </div>
                  </div>

                  {selectedCourseId && selectedDetail ? (
                    <div className="rounded-2xl border bg-white p-4">
                      <div className="font-semibold text-gray-900 truncate">{selectedDetail.title}</div>
                      <div className="text-xs text-gray-500 mt-1">ID: {selectedDetail.courseId}</div>

                      <div className="mt-4 grid sm:grid-cols-2 gap-3">
                        <StatCard label="Покупок" value={String(selectedDetail.totalPurchases)} />
                        <StatCard label="Выручка" value={moneySom(selectedDetail.totalRevenue)} />
                        <StatCard label="Студентов" value={String(selectedDetail.totalStudents)} />
                        <StatCard label="Завершили курс" value={percentFromRate(selectedDetail.completionRate)} />
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => openCourseModal(selectedDetail.courseId)}
                        >
                          <CalendarDays className="w-4 h-4" />
                          Дневная статистика
                        </Button>
                      </div>
                    </div>
                  ) : selectedCourseId ? (
                    <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
                      Нет данных по курсу (или ещё не загрузилось).
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TOP LESSONS */}
        <Card className="mt-6">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Топ уроков
            </CardTitle>

            <Button variant="outline" size="sm" onClick={loadTopLessons} disabled={loading.topLessons} className="w-full sm:w-auto">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading.topLessons ? "animate-spin" : ""}`} />
              Обновить
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <ErrorBox text={error.topLessons} />

            {loading.topLessons ? (
              <BigLoader title="Загрузка топ-уроков…" />
            ) : !topLessonRows.length ? (
              <div className="text-sm text-gray-600">Нет данных.</div>
            ) : (
              <div className="overflow-auto border rounded-xl bg-white">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 border-b text-gray-600 font-medium">Урок</th>
                      <th className="text-left p-3 border-b text-gray-600 font-medium">Курс</th>
                      <th className="text-left p-3 border-b text-gray-600 font-medium">Показатель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLessonRows.map((r) => (
                      <tr key={String(r.id)} className="hover:bg-gray-50">
                        <td className="p-3 border-b text-gray-900">{r.title}</td>
                        <td className="p-3 border-b text-gray-900">{r.courseTitle}</td>
                        <td className="p-3 border-b text-gray-900">{String(r.metric ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <CourseDailyModal open={isCourseModalOpen} onClose={closeCourseModal} detail={modalDetail} />
      </div>
    </div>
  );
}

export default AnalysticPage;
