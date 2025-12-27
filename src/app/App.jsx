import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "../contexts/AuthContext.jsx";
import { DataProvider } from "../contexts/DataContext.jsx";

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

// ✅ вот так (без файлов ui/sonner.jsx)
import { Toaster } from "sonner";

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
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* ✅ контейнер для всего сайта */}
      <main className="flex-1">
        <div className="container mx-auto px-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/courses" element={<CoursesListPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />

            <Route path="/course/:slug" element={<CoursePage />} />

            {/* Student */}
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

            {/* Teacher */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <Footer />

      {/* ✅ Sonner toaster */}
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
