import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// getAuth() throws synchronously when the config is missing/invalid (e.g. the
// VITE_FIREBASE_* env vars aren't set on the host this was built on). Left
// unguarded, that throw happens at module-evaluation time — before React
// ever mounts — which blanks the entire page instead of just leaving sign-in
// unavailable. auth/googleProvider stay null in that case; AuthContext
// checks for that and fails individual auth calls with a clear error rather
// than letting the whole app crash.
let auth = null;
let googleProvider = null;
try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  // browserLocalPersistence is already the web SDK's default (sessions
  // survive browser restarts until explicit sign-out) — set explicitly so a
  // returning user never has to log in again, and so that intent is
  // documented in source rather than relying on an undocumented default.
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Falls back to the SDK's in-memory persistence in restricted storage
    // contexts (e.g. some private-browsing modes) — auth still works for the
    // current tab, it just won't survive a restart there.
  });
} catch (err) {
  console.error("Firebase failed to initialize — check VITE_FIREBASE_* env vars.", err);
}

export { auth, googleProvider };
