(function (global) {
  'use strict';

  const SESSION_KEY = 'zayvora_student_session';
  const STUDENT_CREDENTIALS = Object.freeze({
    student001: { password: 'learn2026', role: 'student' },
    student002: { password: 'orbit2026', role: 'student' },
    admin001: { password: 'mentor2026', role: 'admin' },
  });

  function normalizeStudentId(studentId) {
    return String(studentId || '').trim().toLowerCase();
  }

  function validateInputs(studentId, password) {
    const normalizedStudentId = normalizeStudentId(studentId);
    const normalizedPassword = String(password || '');

    if (!/^[a-z0-9_-]{3,32}$/.test(normalizedStudentId)) {
      return { ok: false, message: 'Enter a valid student ID.' };
    }

    if (normalizedPassword.length < 6 || normalizedPassword.length > 64) {
      return { ok: false, message: 'Password must be 6-64 characters.' };
    }

    return { ok: true, studentId: normalizedStudentId, password: normalizedPassword };
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {return null;}
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user_id || !parsed.login_time || !parsed.role) {
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function login(username, password) {
    const validation = validateInputs(username, password);
    if (!validation.ok) {
      return { success: false, message: validation.message };
    }

    const record = STUDENT_CREDENTIALS[validation.studentId];
    if (!record || record.password !== validation.password) {
      return { success: false, message: 'Invalid student ID or password.' };
    }

    const session = {
      user_id: validation.studentId,
      login_time: new Date().toISOString(),
      role: record.role,
    };
    saveSession(session);

    return { success: true, session };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function getCurrentUser() {
    return getSession();
  }

  global.AuthManager = {
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
  };
})(window);
