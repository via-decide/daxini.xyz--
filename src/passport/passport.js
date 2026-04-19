export function authenticatePassport(userId) {
  localStorage.setItem('passport_user', userId);
}

export function getCurrentUser() {
  return localStorage.getItem('passport_user');
}

export function clearPassportSession() {
  localStorage.removeItem('passport_user');
}
