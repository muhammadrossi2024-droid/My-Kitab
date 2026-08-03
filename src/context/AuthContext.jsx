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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
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
