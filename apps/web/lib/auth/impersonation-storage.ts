'use client';

const IMPERSONATION_RESTORE_TOKEN_KEY = 'agentmou-impersonation-restore-token';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function getImpersonationRestoreToken() {
  if (!canUseSessionStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(IMPERSONATION_RESTORE_TOKEN_KEY);
}

export function setImpersonationRestoreToken(token: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(IMPERSONATION_RESTORE_TOKEN_KEY, token);
}

export function clearImpersonationRestoreToken() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(IMPERSONATION_RESTORE_TOKEN_KEY);
}
