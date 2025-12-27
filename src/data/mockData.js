// src/data/mockData.js

// Пользователи (2 студента + учитель)
export const mockUsers = [
  { id: "student1", name: "Иван Петров", email: "student@example.com", role: "student" },
  { id: "student2", name: "Айдана К.", email: "student2@example.com", role: "student" },

  // ВАЖНО: teacher.id должен совпадать с course.teacherId
  { id: "teacher1", name: "Александр Волков", email: "teacher@example.com", role: "teacher" },
];

// Категории (4 штуки)
export const mockCategories = [
  { id: "cat1", name: "Программирование", description: "Курсы по разработке ПО", slug: "programming" },
  { id: "cat2", name: "Дизайн", description: "UI/UX, Figma", slug: "design" },
  { id: "cat3", name: "Маркетинг", description: "Реклама и продвижение", slug: "marketing" },
  { id: "cat4", name: "Карьера", description: "Резюме и собеседования", slug: "career" },
];

// Преподаватели
export const mockTeachers = [
  {
    id: "teacher1",
    name: "Александр Волков",
    bio: "Senior разработчик с 10-летним опытом в веб-разработке",
    email: "teacher@example.com",
  },
  {
    id: "teacher2",
    name: "Елена Козлова",
    bio: "UI/UX дизайнер, специалист по Figma и Adobe XD",
    email: "kozlova@example.com",
  },
];

// Курсы (у учителя teacher1 — 2 курса)
export const mockCourses = [
  {
    id: "course1",
    title: "React с нуля до профи",
    description: "Полный курс по React для начинающих и продвинутых",
    categoryId: "cat1",
    teacherId: "teacher1",
    slug: "react-from-zero",
  },
  {
    id: "course2",
    title: "TypeScript Pro",
    description: "Продвинутый TypeScript для больших проектов",
    categoryId: "cat1",
    teacherId: "teacher1",
    slug: "typescript-pro",
  },

  // Доп. курс для витрины (чтобы сайт не выглядел пустым)
  {
    id: "course3",
    title: "UI/UX основы",
    description: "Понятная база по интерфейсам",
    categoryId: "cat2",
    teacherId: "teacher2",
    slug: "ui-ux-basics",
  },
];

// Тарифы (минимум)
export const mockTariffs = [
  { id: "tariff1", name: "5 видео", videoCount: 5, price: 1990, courseId: "course1" },
  { id: "tariff2", name: "Все видео курса", videoCount: -1, price: 5990, courseId: "course1" },

  { id: "tariff3", name: "5 видео", videoCount: 5, price: 2490, courseId: "course2" },
  { id: "tariff4", name: "Все видео курса", videoCount: -1, price: 6990, courseId: "course2" },
];

// Уроки (у каждого курса по 3 видео)
export const mockLessons = [
  // course1 React (3 урока)
  {
    id: "lesson1",
    title: "Введение в React",
    description: "Окружение, установка, структура",
    videoUrl: "dQw4w9WgXcQ",
    order: 1,
    courseId: "course1",
    homeworkDescription: "Установите React и создайте первое приложение",
  },
  {
    id: "lesson2",
    title: "Компоненты и Props",
    description: "Компоненты, props, композиция",
    videoUrl: "dQw4w9WgXcQ",
    order: 2,
    courseId: "course1",
    homeworkDescription: "Сделайте 3 компонента с разными props",
  },
  {
    id: "lesson3",
    title: "State и события",
    description: "useState, обработчики, обновления",
    videoUrl: "dQw4w9WgXcQ",
    order: 3,
    courseId: "course1",
    homeworkDescription: "Сделайте счетчик +/− и сброс",
  },

  // course2 TS (3 урока)
  {
    id: "lesson10",
    title: "Типы и narrowing",
    description: "Union, narrowing, guards",
    videoUrl: "dQw4w9WgXcQ",
    order: 1,
    courseId: "course2",
    homeworkDescription: "Опишите типы Course/Lesson и используйте в коде",
  },
  {
    id: "lesson11",
    title: "Generics на практике",
    description: "Generic функции и компоненты",
    videoUrl: "dQw4w9WgXcQ",
    order: 2,
    courseId: "course2",
    homeworkDescription: "Напишите fetch<T>() и используйте",
  },
  {
    id: "lesson12",
    title: "Utility types",
    description: "Pick/Partial/Record и т.д.",
    videoUrl: "dQw4w9WgXcQ",
    order: 3,
    courseId: "course2",
    homeworkDescription: "Сделайте 3 примера utility types",
  },

  // доп курс витрины (1 урок)
  {
    id: "lesson20",
    title: "Композиция в UI",
    description: "Сетки, отступы, визуальная иерархия",
    videoUrl: "dQw4w9WgXcQ",
    order: 1,
    courseId: "course3",
  },
];

// Токены доступа (чтобы у студентов были курсы)
export const mockTokens = [
  // student1: React + TS
  {
    id: "token1",
    token: "ABC123XYZ",
    userId: "student1",
    courseId: "course1",
    tariffId: "tariff2",
    videoLimit: -1,
    videosUsed: 2,
    openedLessons: ["lesson1", "lesson2"],
    createdAt: new Date("2024-01-15"),
    isActive: true,
  },
  {
    id: "token2",
    token: "TS777PRO",
    userId: "student1",
    courseId: "course2",
    tariffId: "tariff3",
    videoLimit: 5,
    videosUsed: 1,
    openedLessons: ["lesson10"],
    createdAt: new Date("2024-02-01"),
    isActive: true,
  },

  // student2: React (чтобы учитель видел 2 студентов)
  {
    id: "token3",
    token: "STU2-REACT",
    userId: "student2",
    courseId: "course1",
    tariffId: "tariff1",
    videoLimit: 5,
    videosUsed: 1,
    openedLessons: ["lesson1"],
    createdAt: new Date("2024-02-10"),
    isActive: true,
  },
];

// Домашки (есть submitted/accepted/rejected + архивные)
export const mockHomeworks = [
  // student1 React
  {
    id: "hw1",
    lessonId: "lesson1",
    userId: "student1",
    courseId: "course1",
    content: "Сделал проект. Ссылка: https://github.com/example/react-app",
    attachments: [
      { type: "link", name: "GitHub", url: "https://github.com/example/react-app" },
    ],
    status: "accepted",
    submittedAt: new Date("2024-01-16"),
    reviewedAt: new Date("2024-01-17"),
    teacherComment: "Ок!",
    isArchived: false,
  },
  {
    id: "hw2",
    lessonId: "lesson2",
    userId: "student1",
    courseId: "course1",
    content: "3 компонента + props. Ссылка: https://example.com/props",
    attachments: [{ type: "link", name: "Demo", url: "https://example.com/props" }],
    status: "submitted",
    submittedAt: new Date("2024-01-18"),
    isArchived: false,
  },

  // student1 TS (уже в архиве)
  {
    id: "hw3",
    lessonId: "lesson10",
    userId: "student1",
    courseId: "course2",
    content: "Типы сделал. Репо: https://github.com/example/ts-types",
    attachments: [{ type: "link", name: "Repo", url: "https://github.com/example/ts-types" }],
    status: "rejected",
    submittedAt: new Date("2024-02-02"),
    reviewedAt: new Date("2024-02-03"),
    teacherComment: "Добавь примеры narrowing",
    isArchived: true, // ✅ уже в архиве, чтобы вкладка архив была не пустой
  },

  // student2 React
  {
    id: "hw4",
    lessonId: "lesson1",
    userId: "student2",
    courseId: "course1",
    content: "Сделал установку и первый компонент",
    attachments: [],
    status: "submitted",
    submittedAt: new Date("2024-02-11"),
    isArchived: false,
  },
];
