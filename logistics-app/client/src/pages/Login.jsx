import { useState } from "react";
import { useLogin } from "../hooks/useAuth.js";
import { LogoHero } from "../components/Icons.jsx";
import { Button, Field, Input } from "../components/ui.jsx";
import { IconArrow, IconRefresh } from "../components/Icons.jsx";

export default function Login() {
  const login = useLogin();
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
            <LogoHero size={180} accent="var(--accent)" />
          </div>
          <div className="auth__wm">
            <h1>TAS</h1>
            <p className="auth__tag">Logistics Booking &amp; Finance</p>
          </div>
          <div className="auth__divider" />
          <p className="auth__copy">
            Catat shipment ekspor, kelola piutang shipper, dan pantau hutang vendor — semua dalam satu sistem.
          </p>
        </div>
        <div className="auth__legal">© 2026 PT TAS Logistics · <span className="muted">Belawan, Medan</span></div>
      </aside>

      <main className="auth__form-wrap">
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
