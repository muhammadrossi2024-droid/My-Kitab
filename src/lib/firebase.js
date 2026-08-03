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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// browserLocalPersistence is already the web SDK's default (sessions survive
// browser restarts until explicit sign-out) — set explicitly so a returning
// user never has to log in again, and so that intent is documented in source
// rather than relying on an undocumented default.
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Falls back to the SDK's in-memory persistence in restricted storage
  // contexts (e.g. some private-browsing modes) — auth still works for the
  // current tab, it just won't survive a restart there.
});
