import { emit } from '../router/events/eventBus.js';

export function handlePassportLoginSuccess(userId) {
  emit('user-login', {
    user: userId,
    time: Date.now()
  });
}

export function authenticatePassport(userId) {
  localStorage.setItem('passport_user', userId);
}

export function getCurrentUser() {
  return localStorage.getItem('passport_user');
}

export function clearPassportSession() {
  localStorage.removeItem('passport_user');
}
