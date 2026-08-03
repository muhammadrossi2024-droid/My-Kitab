import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Firebase's own floor is 6 characters; modern projects also have
// email-enumeration protection on by default, which collapses
// wrong-password/user-not-found into a single invalid-credential code — the
// wider mapping below is kept anyway for older projects / defensiveness.
function mapFirebaseError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "That email or password doesn't look right. Please try again.";
    case "auth/user-not-found":
      return "We couldn't find an account with that email. Check the email, or sign up below.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try logging in instead.";
    case "auth/weak-password":
      return "Please choose a password with at least 8 characters.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error — please check your connection and try again.";
    case "app/not-configured":
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Sign-in isn't available right now. Please try again shortly.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const { signUpWithEmail, logInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const { settings, updateSettings } = useSettings();

  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  function switchMode(next) {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    setResetSent(false);
  }

  function validate() {
    const errors = {};
    if (!EMAIL_RE.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (mode !== "reset") {
      if (!password) {
        errors.password = "Enter your password.";
      } else if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
        errors.password = "Use at least 8 characters.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === "reset") {
        try {
          await resetPassword(email.trim());
        } catch {
          // Deliberately swallowed — see confirmation copy below, which
          // doesn't reveal whether the address is actually registered.
        }
        setResetSent(true);
        return;
      }

      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password);
      } else {
        await logInWithEmail(email.trim(), password);
      }
      // Every successful login or signup lands on Home, not wherever the
      // router happened to still be pointed (e.g. a stale route left over
      // from before the session expired).
      navigate("/");
    } catch (err) {
      const msg = mapFirebaseError(err.code);
      if (msg) setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err) {
      const msg = mapFirebaseError(err.code);
      if (msg) setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <button
        className="auth-theme-toggle"
        onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
        aria-label={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={settings.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {settings.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <img src={logoSrc} alt="My Kitab" className="auth-logo" />
      <h1 className="auth-headline">Welcome to My Kitab</h1>
      <p className="auth-subhead">
        Sign up to keep your place as we build — you'll be the first to hear about new features,
        our upcoming launch on the App Store, and special pricing on premium tools when they
        arrive.
      </p>

      <div className="card auth-card">
        {mode !== "reset" && (
          <div className="theme-toggle-group auth-mode-toggle">
            <button
              className={"theme-toggle-btn" + (mode === "login" ? " active" : "")}
              onClick={() => switchMode("login")}
              type="button"
            >
              Log in
            </button>
            <button
              className={"theme-toggle-btn" + (mode === "signup" ? " active" : "")}
              onClick={() => switchMode("signup")}
              type="button"
            >
              Sign up
            </button>
          </div>
        )}

        {mode === "reset" && resetSent ? (
          <p className="auth-reset-confirm">
            If an account exists for that email, a reset link is on its way. Check your inbox
            (and spam folder) in a few minutes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <div className="auth-field-error">{fieldErrors.email}</div>}
            </div>

            {mode !== "reset" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  className="auth-input"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {fieldErrors.password && (
                  <div className="auth-field-error">{fieldErrors.password}</div>
                )}
              </div>
            )}

            {mode === "login" && (
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => switchMode("reset")}
              >
                Forgot password?
              </button>
            )}

            {formError && <div className="auth-form-error">{formError}</div>}

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={submitting}
            >
              {mode === "signup"
                ? submitting
                  ? "Creating account…"
                  : "Create account"
                : mode === "reset"
                  ? submitting
                    ? "Sending…"
                    : "Send reset link"
                  : submitting
                    ? "Logging in…"
                    : "Log in"}
            </button>

            {mode === "reset" ? (
              <button type="button" className="auth-switch-mode" onClick={() => switchMode("login")}>
                Back to log in
              </button>
            ) : (
              <>
                <div className="auth-divider">
                  <span>or</span>
                </div>
                <button
                  type="button"
                  className="btn auth-google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                >
                  <img src="/google-logo.svg" className="auth-google-icon" alt="" />
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="auth-switch-mode"
                  onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
                >
                  {mode === "signup"
                    ? "Already have an account? Log in"
                    : "Don't have an account? Sign up"}
                </button>
              </>
            )}
          </form>
        )}
      </div>

      <p className="auth-fineprint">We'll only email you about My Kitab — no spam, unsubscribe anytime.</p>
    </div>
  );
}
