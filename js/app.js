/**
 * Общие функции AudioDream
 */

(function () {
  'use strict';

  // ===== ПРОВЕРКА АВТОРИЗАЦИИ НА ЗАЩИЩЁННЫХ СТРАНИЦАХ =====

  function protectPage(requiredRole) {
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (!user) {
      window.location.href = 'auth.html';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'profile.html';
      }
      return null;
    }

    return user;
  }

  // ===== ОБНОВЛЕНИЕ ШАПКИ =====

  function updateUserHeader() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const navLinks = document.querySelectorAll('.nav a');

    navLinks.forEach(link => {
      // Пункт "Кабинет" — меняем ссылку в зависимости от авторизации
      if (link.textContent.trim() === 'Кабинет') {
        if (user) {
          link.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
        } else {
          link.href = 'auth.html';
        }
      }

      // Пункт "Вход" — если авторизован, меняем на "Выйти"
      if (link.textContent.trim() === 'Вход') {
        if (user) {
          link.textContent = 'Выйти';
          link.href = '#';
          link.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            showToast('Вы вышли из аккаунта', 'info');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 600);
          };
        } else {
          link.textContent = 'Вход';
          link.href = 'auth.html';
          link.onclick = null;
        }
      }
    });
  }

  // ===== ВЫХОД ИЗ КАБИНЕТА (кнопка в сайдбаре) =====

  function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        showToast('Вы вышли из аккаунта', 'info');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      });
    }
  }

  // ===== TOAST (fallback) =====

  function showToast(message, type = 'info') {
    if (window.AudioAuth && window.AudioAuth.showToast) {
      window.AudioAuth.showToast(message, type);
      return;
    }
    alert(message);
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  document.addEventListener('DOMContentLoaded', () => {
    updateUserHeader();
    initLogout();

    // Защита страниц по роли
    if (document.body.contains(document.querySelector('.admin-layout'))) {
      protectPage('admin');
    } else if (document.body.contains(document.querySelector('.profile-top'))) {
      protectPage('client');
    }
  });

  // Экспорт
  window.AudioApp = {
    protectPage,
    showToast,
    getCurrentUser: () => JSON.parse(localStorage.getItem('currentUser'))
  };

})();