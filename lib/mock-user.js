/**
 * Dynamic Auth User Client Helper.
 * Reads active logged-in user from localStorage (auth_session),
 * falling back to null when not logged in.
 */

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const rawSession = localStorage.getItem('auth_session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.user) {
        return {
          id: session.user.id || 'usr_active',
          name: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email,
          email: session.user.email,
          role: session.user.role || 'customer',
          token: session.access_token,
        };
      }
    }
  } catch (e) {
    console.error('Error reading auth session from localStorage', e);
  }
  return null;
}

export function setCurrentUser(user, token) {
  if (typeof window === 'undefined') return;
  const session = {
    user,
    access_token: token,
  };
  localStorage.setItem('auth_session', JSON.stringify(session));
  window.dispatchEvent(new Event('auth-change'));
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_session');
  window.dispatchEvent(new Event('auth-change'));
}

/**
 * Proxy export for backward compatibility with existing components.
 */
export const currentUser = new Proxy({}, {
  get(target, prop) {
    const user = getCurrentUser();
    if (!user) return undefined;
    return user[prop];
  }
});
