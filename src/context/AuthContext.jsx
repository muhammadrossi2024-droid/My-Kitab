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

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    // This first callback normally fires almost instantly — it's a local
    // IndexedDB check, no network round-trip. But if the browser's IndexedDB
    // for this origin is ever in a wedged state (seen in the wild: a prior
    // tab/session left a connection or transaction that never settles),
    // Firebase's persistence bootstrap can hang indefinitely with no error
    // at all — which previously left the whole app stuck on the splash
    // screen forever, since nothing else was driving `authLoading` to
    // false. This bounds the wait: if the real callback hasn't fired within
    // 5s, fall through as logged-out (the safe default — it never reveals
    // an authenticated view it hasn't confirmed) so the app always loads.
    // If the real callback does eventually fire after that, it still
    // updates state normally.
    const fallback = setTimeout(() => setAuthLoading(false), 5000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(fallback);
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

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
