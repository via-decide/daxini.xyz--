const STORAGE_KEY = "passport_user";

export function authenticatePassport(userId) {
  if (!userId) return null;
  localStorage.setItem(STORAGE_KEY, userId);
  console.log("Passport user authenticated:", userId);
  return userId;
}

export function getCurrentUser() {
  return localStorage.getItem(STORAGE_KEY);
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
}

export function requireAuth(onMissing) {
  const user = getCurrentUser();
  if (!user && typeof onMissing === "function") onMissing();
  return user;
}
