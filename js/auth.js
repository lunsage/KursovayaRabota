/**
 * Модуль авторизации и регистрации AudioDream
 */

(function () {
  'use strict';

  const DB_PATH = 'data/db.json';
  const STORAGE_KEY = 'currentUser';
  const REDIRECT_KEY = 'redirectAfterLogin';

  // ===== УТИЛИТЫ =====

  async function loadDB() {
    try {
      const res = await fetch(DB_PATH);
      if (!res.ok) throw new Error('DB load failed');
      return await res.json();
    } catch (e) {
      console.error('Ошибка загрузки БД:', e);
      return null;
    }
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ===== TOAST-УВЕДОМЛЕНИЯ =====

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      alert(message);
      return;
    }

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || 'ℹ'}</span>
      <span class="toast__message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ===== ВАЛИДАЦИЯ =====

  const validators = {
    // Email или телефон (для входа)
    email: (value) => {
      const v = value.trim();
      if (!v) return 'Введите email или телефон';

      // Если содержит @ — проверяем как email
      if (v.includes('@')) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(v)) return 'Некорректный формат email';
        return '';
      }

      // Иначе проверяем как телефон
      const phoneDigits = v.replace(/\D/g, '');
      if (phoneDigits.length !== 11) return 'Телефон должен содержать 11 цифр';
      if (!/^[78]\d{10}$/.test(phoneDigits)) return 'Телефон должен начинаться с +7 или 8';
      return '';
    },

    // Пароль (для входа и регистрации)
    password: (value) => {
      if (!value) return 'Введите пароль';
      if (value.length < 6) return 'Пароль должен содержать минимум 6 символов';
      if (value.length > 32) return 'Пароль не должен превышать 32 символа';
      if (/\s/.test(value)) return 'Пароль не должен содержать пробелы';
      return '';
    },

    // Имя (для регистрации)
    name: (value) => {
      const v = value.trim();
      if (!v) return 'Введите имя';
      if (v.length < 2) return 'Имя должно содержать минимум 2 символа';
      if (v.length > 50) return 'Имя не должно превышать 50 символов';
      if (/^\d/.test(v)) return 'Имя не может начинаться с цифры';
      return '';
    },

    // Email (для регистрации — строго email)
    emailReg: (value) => {
      const v = value.trim();
      if (!v) return 'Введите электронную почту';
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(v)) return 'Некорректный формат email (пример: user@mail.ru)';
      return '';
    },

    // Телефон (для регистрации — строгий формат)
    phone: (value) => {
      const v = value.trim();
      if (!v) return 'Введите телефон';

      const digits = v.replace(/\D/g, '');
      if (digits.length !== 11) return 'Телефон должен содержать 11 цифр';
      if (!/^[78]\d{10}$/.test(digits)) return 'Телефон должен начинаться с +7';

      const formats = [
        /^\+7\s?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/,
        /^\+7\d{10}$/,
        /^8\d{10}$/
      ];

      const isValid = formats.some(re => re.test(v));
      if (!isValid) return 'Формат: +7 (XXX) XXX-XX-XX';

      return '';
    }
  };

  function validateField(input, errorEl, validator) {
    const error = validator(input.value);
    if (error) {
      input.classList.add('error');
      if (errorEl) errorEl.textContent = error;
      return false;
    }
    input.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
    return true;
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.form-input').forEach(i => i.classList.remove('error'));
    form.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  }

  // ===== МАСКА ТЕЛЕФОНА =====

  function applyPhoneMask(input) {
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');

      if (value.startsWith('8')) value = '7' + value.slice(1);
      if (!value.startsWith('7') && value.length > 0) value = '7' + value;

      value = value.slice(0, 11);

      let formatted = '';
      if (value.length > 0) formatted = '+7';
      if (value.length > 1) formatted += ' (' + value.slice(1, 4);
      if (value.length >= 4) formatted += ') ' + value.slice(4, 7);
      if (value.length >= 7) formatted += '-' + value.slice(7, 9);
      if (value.length >= 9) formatted += '-' + value.slice(9, 11);

      e.target.value = formatted;
    });

    input.addEventListener('focus', (e) => {
      if (!e.target.value) e.target.value = '+7';
    });

    input.addEventListener('blur', (e) => {
      if (e.target.value === '+7') e.target.value = '';
    });
  }

  // ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====

  function initTabs() {
    const tabs = document.querySelectorAll('.auth-tabs__btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('auth-tabs__btn--active'));
        btn.classList.add('auth-tabs__btn--active');

        const tab = btn.dataset.tab;
        if (tab === 'login') {
          loginForm.classList.remove('hidden');
          registerForm.classList.add('hidden');
        } else {
          loginForm.classList.add('hidden');
          registerForm.classList.remove('hidden');
        }
        clearFormErrors(loginForm);
        clearFormErrors(registerForm);
      });
    });
  }

  // ===== АВТОРИЗАЦИЯ (ВХОД) =====

  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');

    emailInput.addEventListener('blur', () => {
      validateField(emailInput, emailError, validators.email);
    });
    passwordInput.addEventListener('blur', () => {
      validateField(passwordInput, passwordError, validators.password);
    });

    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('error')) {
        emailInput.classList.remove('error');
        emailError.textContent = '';
      }
    });
    passwordInput.addEventListener('input', () => {
      if (passwordInput.classList.contains('error')) {
        passwordInput.classList.remove('error');
        passwordError.textContent = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const isEmailValid = validateField(emailInput, emailError, validators.email);
      const isPasswordValid = validateField(passwordInput, passwordError, validators.password);

      if (!isEmailValid || !isPasswordValid) {
        showToast('Проверьте правильность заполнения полей', 'error');
        return;
      }

      const loginValue = emailInput.value.trim();
      const password = passwordInput.value;

      const db = await loadDB();
      if (!db) {
        showToast('Ошибка подключения к серверу', 'error');
        return;
      }

      const user = db.users.find(u => {
        const matchEmail = u.email.toLowerCase() === loginValue.toLowerCase();
        const matchPhone = ('+' + u.phone.replace(/\D/g, '').replace(/^8/, '7')) === 
                          ('+' + loginValue.replace(/\D/g, '').replace(/^8/, '7'));
        return (matchEmail || matchPhone) && u.password === password;
      });

      if (!user) {
        showToast('Неверный email/телефон или пароль', 'error');
        passwordInput.value = '';
        return;
      }

      const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      };
      saveUser(sessionUser);

      showToast(`Добро пожаловать, ${user.name}!`, 'success');

      setTimeout(() => {
        if (user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          const redirect = sessionStorage.getItem(REDIRECT_KEY);
          if (redirect) {
            sessionStorage.removeItem(REDIRECT_KEY);
            window.location.href = redirect;
          } else {
            window.location.href = 'profile.html';
          }
        }
      }, 800);
    });
  }

  // ===== РЕГИСТРАЦИЯ =====

  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('regPhone');
    const passwordInput = document.getElementById('regPassword');

    const nameError = document.getElementById('regNameError');
    const emailError = document.getElementById('regEmailError');
    const phoneError = document.getElementById('regPhoneError');
    const passwordError = document.getElementById('regPasswordError');

    // Применяем маску телефона
    applyPhoneMask(phoneInput);

    nameInput.addEventListener('blur', () => validateField(nameInput, nameError, validators.name));
    emailInput.addEventListener('blur', () => validateField(emailInput, emailError, validators.emailReg));
    phoneInput.addEventListener('blur', () => validateField(phoneInput, phoneError, validators.phone));
    passwordInput.addEventListener('blur', () => validateField(passwordInput, passwordError, validators.password));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const v1 = validateField(nameInput, nameError, validators.name);
      const v2 = validateField(emailInput, emailError, validators.emailReg);
      const v3 = validateField(phoneInput, phoneError, validators.phone);
      const v4 = validateField(passwordInput, passwordError, validators.password);

      if (!v1 || !v2 || !v3 || !v4) {
        showToast('Проверьте правильность заполнения полей', 'error');
        return;
      }

      const db = await loadDB();
      if (!db) {
        showToast('Ошибка подключения к серверу', 'error');
        return;
      }

      // Нормализация телефона перед проверкой уникальности
      const normalizedPhone = '+' + phoneInput.value.replace(/\D/g, '').replace(/^8/, '7');

      const exists = db.users.some(u =>
        u.email.toLowerCase() === emailInput.value.trim().toLowerCase() ||
        ('+' + u.phone.replace(/\D/g, '').replace(/^8/, '7')) === normalizedPhone
      );

      if (exists) {
        showToast('Пользователь с таким email или телефоном уже существует', 'error');
        return;
      }

      const newUser = {
        id: Math.max(...db.users.map(u => u.id)) + 1,
        name: nameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        phone: normalizedPhone,
        password: passwordInput.value,
        role: 'client'
      };

      db.users.push(newUser);

      saveUser({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      });

      showToast('Регистрация успешна! Добро пожаловать!', 'success');

      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 800);
    });
  }

  // ===== ПРОВЕРКА: НЕЛЬЗЯ ВОЙТИ ЕСЛИ УЖЕ АВТОРИЗОВАН =====

  function checkAlreadyAuth() {
    const user = getCurrentUser();
    if (user) {
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'profile.html';
      }
    }
  }

  // ===== ИНИЦИАЛИЗАЦИЯ =====

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
      checkAlreadyAuth();
      initTabs();
      initLoginForm();
      initRegisterForm();
    }
  });

  // ===== ЭКСПОРТ =====
  window.AudioAuth = {
    getCurrentUser,
    saveUser,
    clearUser,
    showToast,
    requireAuth(redirectUrl) {
      const user = getCurrentUser();
      if (!user) {
        sessionStorage.setItem(REDIRECT_KEY, redirectUrl || window.location.pathname);
        window.location.href = 'auth.html';
        return null;
      }
      return user;
    },
    requireRole(role) {
      const user = getCurrentUser();
      if (!user) {
        window.location.href = 'auth.html';
        return null;
      }
      if (user.role !== role) {
        showToast('Доступ запрещён', 'error');
        window.location.href = user.role === 'admin' ? 'admin.html' : 'profile.html';
        return null;
      }
      return user;
    }
  };

})();