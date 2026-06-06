export const getMe = () => fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json());

export const logout = () => fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
}).then((r) => r.json());

export const loginWithGoogle = (returnTo = '/') => {
  window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
};
