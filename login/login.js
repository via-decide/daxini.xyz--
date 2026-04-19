(function () {
  'use strict';

  const loginForm = document.getElementById('loginForm');
  const studentIdInput = document.getElementById('studentId');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('errorMessage');

  if (window.AuthManager && window.AuthManager.isAuthenticated()) {
    window.location.replace('../zayvora/index.html');
  }

  function showError(message) {
    errorMessage.textContent = message;
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;

    if (!studentId || !password) {
      showError('Please fill in student ID and password.');
      return;
    }

    const result = window.AuthManager.login(studentId, password);
    if (!result.success) {
      showError(result.message || 'Login failed.');
      return;
    }

    showError('');
    window.location.replace('../zayvora/index.html');
  });
})();
