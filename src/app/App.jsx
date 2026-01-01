// src/app/App.jsx
import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";

import { AuthProvider, useAuth } from "../contexts/AuthContext.jsx";
import { DataProvider, useData } from "../contexts/DataContext.jsx";

import { Header } from "../components/Header.jsx";
import { Footer } from "../components/Footer.jsx";

import { HomePage } from "../pages/HomePage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { CoursesListPage } from "../pages/CoursesListPage.jsx";
import { CategoriesPage } from "../pages/CategoriesPage.jsx";
import { CategoryPage } from "../pages/CategoryPage.jsx";
import { CoursePage } from "../pages/CoursePage.jsx";

import { StudentDashboard } from "../pages/StudentDashboard.jsx";
import { StudentCoursePage } from "../pages/StudentCoursePage.jsx";
import { TeacherDashboard } from "../pages/TeacherDashboard.jsx";

import { Toaster } from "sonner";
import RegisterPage from "../pages/RegisterPage.jsx";
import AnalysticPage from "../pages/AnalysticPage.jsx";

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash]);

  return null;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  }

  return children;
}

function ContainerLayout() {
  return (
    <div className="app-container">
      <Outlet />
    </div>
  );
}

function AppRoutes() {
  const data = useData();
  const didInitRef = useRef(false);

  useEffect(() => {
    // ✅ защита от бесконечного цикла
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (data?.loadPublic) {
      Promise.resolve(data.loadPublic()).catch((e) => {
        console.error(e);
      });
    }
    // намеренно без зависимостей, чтобы не ловить цикл от "data"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <Header />
      <ScrollToTop />

      <main className="flex-1">
        <Routes>
          {/* full-width страницы */}
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesListPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/course/:id" element={<CoursePage />} />

          {/* контейнерные страницы */}
          <Route element={<ContainerLayout />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/Analystic" element={<AnalysticPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/course/:courseId"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentCoursePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </main>

      <Footer />
      <Toaster richColors />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
