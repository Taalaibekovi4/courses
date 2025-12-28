import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Mail, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "996221000953"; // <-- поменяй на свой

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="app-container py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold text-white">EduPlatform</span>
            </div>
            <p className="text-sm text-gray-400">
              Онлайн-платформа видео-курсов с доступом по токенам.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Навигация</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-blue-400 transition">Главная</Link></li>
              <li><Link to="/courses" className="hover:text-blue-400 transition">Все курсы</Link></li>
              <li><Link to="/categories" className="hover:text-blue-400 transition">Категории</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition">Вход</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Студентам</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/dashboard" className="hover:text-blue-400 transition">Личный кабинет</Link></li>
              <li><Link to="/courses" className="hover:text-blue-400 transition">Каталог курсов</Link></li>
              <li><span className="text-gray-400">Активация токена</span></li>
              <li><span className="text-gray-400">Домашние задания</span></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Контакты</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  className="hover:text-blue-400 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <a href="mailto:info@eduplatform.com" className="hover:text-blue-400 transition">
                  info@eduplatform.com
                </a>
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">Оплата через WhatsApp</p>
              <p className="text-xs text-gray-500 mt-1">Доступ по токенам</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>© 2024 EduPlatform. Все права защищены.</p>
          <p className="mt-2 text-xs">Платформа онлайн-обучения с доступом по токенам</p>
        </div>
      </div>
    </footer>
  );
}
