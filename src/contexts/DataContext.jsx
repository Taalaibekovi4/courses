import React, { createContext, useContext, useMemo, useState } from "react";
import {
  mockCategories,
  mockTeachers,
  mockCourses,
  mockTariffs,
  mockLessons,
  mockTokens,
  mockHomeworks,
  mockUsers,
} from "../data/mockData.js";

const DataContext = createContext(null);

const norm = (s) => String(s ?? "").trim();
const asArr = (v) => (Array.isArray(v) ? v : []);

export function DataProvider({ children }) {
  const [users] = useState(mockUsers);
  const [categories] = useState(mockCategories);
  const [teachers] = useState(mockTeachers);
  const [courses, setCourses] = useState(mockCourses);
  const [tariffs] = useState(mockTariffs);
  const [lessons, setLessons] = useState(mockLessons);
  const [tokens, setTokens] = useState(mockTokens);
  const [homeworks, setHomeworks] = useState(mockHomeworks);

  // ===== getters =====
  const getCourseWithDetails = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return undefined;

    const category = categories.find((cat) => cat.id === course.categoryId);
    const teacher = teachers.find((t) => t.id === course.teacherId);
    const courseLessons = lessons.filter((l) => l.courseId === courseId);
    const courseTariffs = tariffs.filter((t) => t.courseId === courseId);

    if (!category || !teacher) return undefined;

    return {
      ...course,
      category,
      teacher,
      lessonsCount: courseLessons.length,
      tariffs: courseTariffs,
    };
  };

  const getLessonsByCourse = (courseId) => {
    return lessons
      .filter((l) => l.courseId === courseId)
      .slice()
      .sort((a, b) => a.order - b.order);
  };

  const getTariffsByCourse = (courseId) => tariffs.filter((t) => t.courseId === courseId);

  const getUserTokens = (userId) => tokens.filter((t) => t.userId === userId && t.isActive);

  const getUserHomeworks = (userId) => homeworks.filter((hw) => hw.userId === userId);

  const findUserById = (id) => users.find((u) => u.id === id);

  // ===== actions =====
  const activateToken = (userId, tokenStr) => {
    const token = tokens.find((t) => t.token === tokenStr && !t.isActive);
    if (!token) return false;

    setTokens(tokens.map((t) => (t.token === tokenStr ? { ...t, userId, isActive: true } : t)));
    return true;
  };

  const markLessonAsOpened = (tokenId, lessonId) => {
    setTokens((prev) =>
      prev.map((t) => {
        if (t.id !== tokenId) return t;
        if (t.openedLessons.includes(lessonId)) return t;

        return {
          ...t,
          openedLessons: [...t.openedLessons, lessonId],
          videosUsed: t.videosUsed + 1,
        };
      })
    );
  };

  const submitHomework = ({ lessonId, userId, courseId, content, attachments }) => {
    const newHomework = {
      id: `hw_${Date.now()}`,
      lessonId,
      userId,
      courseId,
      content: norm(content),
      attachments: asArr(attachments),
      status: "submitted",
      submittedAt: new Date(),
      reviewedAt: null,
      teacherComment: "",
      isArchived: false, // архив преподавателя
      isStudentArchived: false, // ✅ архив студента
    };

    setHomeworks((prev) => [newHomework, ...prev]);
  };

  const reviewHomework = (homeworkId, status, comment) => {
    setHomeworks((prev) =>
      prev.map((hw) =>
        hw.id === homeworkId
          ? {
              ...hw,
              status,
              teacherComment: norm(comment),
              reviewedAt: new Date(),
            }
          : hw
      )
    );
  };

  // Архив преподавателя (у тебя уже было: только accepted)
  const archiveHomework = (homeworkId) => {
    setHomeworks((prev) =>
      prev.map((hw) => {
        if (hw.id !== homeworkId) return hw;
        if (hw.status !== "accepted") return hw;
        return { ...hw, isArchived: true };
      })
    );
  };

  const unarchiveHomework = (homeworkId) => {
    setHomeworks((prev) =>
      prev.map((hw) => (hw.id === homeworkId ? { ...hw, isArchived: false } : hw))
    );
  };

  // ✅ студент: обновить ДЗ (редактирование/повторная отправка)
  const updateHomework = (homeworkId, patch) => {
    setHomeworks((prev) =>
      prev.map((hw) => (hw.id === homeworkId ? { ...hw, ...patch } : hw))
    );
  };

  // ✅ студент: архивировать “Принято”
  const archiveStudentHomework = (homeworkId) => {
    setHomeworks((prev) =>
      prev.map((hw) => {
        if (hw.id !== homeworkId) return hw;
        if (hw.status !== "accepted") return hw;
        return { ...hw, isStudentArchived: true };
      })
    );
  };

  const unarchiveStudentHomework = (homeworkId) => {
    setHomeworks((prev) =>
      prev.map((hw) => (hw.id === homeworkId ? { ...hw, isStudentArchived: false } : hw))
    );
  };

  // ===== lessons CRUD (Teacher) =====
  const addLesson = ({ courseId, title, description, videoUrl, homeworkDescription, homeworkAttachments }) => {
    const courseLessons = lessons.filter((l) => l.courseId === courseId);
    const nextOrder = courseLessons.length ? Math.max(...courseLessons.map((l) => l.order)) + 1 : 1;

    const newLesson = {
      id: `lesson_${Date.now()}`,
      title: norm(title) || "Новый урок",
      description: norm(description),
      videoUrl: norm(videoUrl),
      order: nextOrder,
      courseId,
      homeworkDescription: norm(homeworkDescription),
      homeworkAttachments: asArr(homeworkAttachments),
    };

    setLessons((prev) => [...prev, newLesson]);
    return newLesson.id;
  };

  const updateLesson = (lessonId, patch) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, ...patch } : l))
    );
  };

  const value = useMemo(
    () => ({
      users,
      categories,
      teachers,
      courses,
      tariffs,
      lessons,
      tokens,
      homeworks,

      getCourseWithDetails,
      getLessonsByCourse,
      getTariffsByCourse,
      getUserTokens,
      getUserHomeworks,
      findUserById,

      submitHomework,
      reviewHomework,
      archiveHomework,
      unarchiveHomework,

      updateHomework, // ✅
      archiveStudentHomework, // ✅
      unarchiveStudentHomework, // ✅

      activateToken,
      markLessonAsOpened,

      addLesson,
      updateLesson,
    }),
    [users, categories, teachers, courses, tariffs, lessons, tokens, homeworks]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
