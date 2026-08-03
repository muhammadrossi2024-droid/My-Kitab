import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase.js";

const AuthContext = createContext(null);

const SKIP_KEY = "quran-app:auth-skipped";

function loadSkipped() {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

function requireAuth() {
  if (!auth) {
    throw Object.assign(new Error("Sign-in isn't available right now."), {
      code: "app/not-configured",
    });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Lets a visitor dismiss the login/signup screen and browse without an
  // account — remembered across visits (like the tour-seen flag) so they
  // aren't re-prompted every time, but cleared the moment they do sign in,
  // so a later logout takes them back to a real login screen rather than
  // silently skipping past it again.
  const [skipped, setSkipped] = useState(loadSkipped);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        try {
          localStorage.removeItem(SKIP_KEY);
        } catch {
          // Ignored — worst case the flag lingers unused since `user` alone
          // already satisfies the App.jsx gate.
        }
        setSkipped(false);
      }
    });
    return unsubscribe;
  }, []);

  const skipAuth = () => {
    try {
      localStorage.setItem(SKIP_KEY, "1");
    } catch {
      // localStorage unavailable — the choice just won't be remembered next
      // visit, which is a fine fallback (same as the tour-seen flag).
    }
    setSkipped(true);
  };

  const returnToAuth = () => {
    try {
      localStorage.removeItem(SKIP_KEY);
    } catch {
      // See skipAuth — non-fatal either way.
    }
    setSkipped(false);
  };

  const signUpWithEmail = async (email, password) => {
    requireAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return { isNewUser: true, user: cred.user };
  };

  const logInWithEmail = async (email, password) => {
    requireAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { isNewUser: false, user: cred.user };
  };

  const signInWithGoogle = async () => {
    requireAuth();
    const cred = await signInWithPopup(auth, googleProvider);
    const info = getAdditionalUserInfo(cred);
    return { isNewUser: !!info?.isNewUser, user: cred.user };
  };

  const resetPassword = (email) => {
    requireAuth();
    return sendPasswordResetEmail(auth, email);
  };

  const logOut = () => (auth ? signOut(auth) : Promise.resolve());

  const value = {
    user,
    authLoading,
    skipped,
    skipAuth,
    returnToAuth,
    signUpWithEmail,
    logInWithEmail,
    signInWithGoogle,
    resetPassword,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
