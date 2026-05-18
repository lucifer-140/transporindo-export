import { useState } from "react";
import { useLogin } from "../hooks/useAuth.js";
import { useTheme } from "../hooks/useTheme.js";
import { LogoHero } from "../components/Icons.jsx";
import { Button, Field, Input } from "../components/ui.jsx";
import { IconArrow, IconRefresh } from "../components/Icons.jsx";

export default function Login() {
  const login = useLogin();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Username atau password salah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__brand-inner">
          <div className="auth__mark">
            <LogoHero size={180} accent="var(--accent)" surface="#0A0A0B" />
          </div>
          <div className="auth__wm">
            <h1>TAS</h1>
            <p className="auth__legal-name">PT. Transporindo Agung Sejahtera</p>
            <p className="auth__tag">Export</p>
          </div>
          <div className="auth__divider" />
          <p className="auth__copy">
            Catat shipment ekspor, kelola piutang shipper, dan pantau hutang vendor — semua dalam satu sistem.
          </p>
        </div>
        <div className="auth__legal">© 2026 PT. Transporindo Agung Sejahtera · <span className="muted">Belawan, Medan</span></div>
      </aside>

      <main className="auth__form-wrap">
        <button className="auth__theme-toggle" onClick={toggle} title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          {theme === "light" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>
        <form className="auth__form" onSubmit={handleSubmit} autoComplete="off">
          <div className="auth__form-hd">
            <div className="auth__form-eyebrow">Welcome back</div>
            <h2>Sign in to your workspace</h2>
            <p className="muted">Masuk dengan akun yang diberikan admin.</p>
          </div>

          <div className="col" style={{ gap: 14 }}>
            <Field label="Username" required>
              <Input
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="username" autoFocus required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
              />
            </Field>

            {error && <div className="auth__err">{error}</div>}

            <Button variant="primary" size="lg" full type="submit" disabled={loading}
              icon={loading ? <IconRefresh size={14} /> : <IconArrow size={14} />}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
