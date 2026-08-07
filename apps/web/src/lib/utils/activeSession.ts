// Shared with SessionClient (owns writes) and ActiveSessionBar (reads it from anywhere in the
// app, since navigating away from /session unmounts SessionClient and would otherwise strand the
// session with no way to resume or complete it — see ACTIVE_SESSION_KEY history in SessionClient).
export const ACTIVE_SESSION_KEY = "studyai:activeSession";

export interface StoredActiveSession {
  sessionId: string;
  disciplineId: string;
  moduleId: string;
  disciplineName: string;
  moduleName: string;
  methodology: string;
  duration: string;
}

export function readActiveSession(): StoredActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredActiveSession) : null;
  } catch {
    return null;
  }
}

export function writeActiveSession(data: StoredActiveSession) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode, storage full) — session still works,
    // it just won't survive a reload or be resumable from elsewhere in the app.
  }
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // nothing to do
  }
}
