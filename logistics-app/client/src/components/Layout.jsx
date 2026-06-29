import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useLogout } from "../hooks/useAuth.js";
import { useSSE } from "../hooks/useSSE.js";

// Classic collapsible menu group (PeopleSoft-style tree)
function MenuGroup({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ps-menu__group">
      <button className="ps-menu__hd" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ps-menu__caret">{open ? "▾" : "▸"}</span>
        <span>{label}</span>
      </button>
      {open && <div className="ps-menu__items">{children}</div>}
    </div>
  );
}

function MenuItem({ to, end, label, level = 1 }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `ps-menu__item ps-menu__item--l${level}${isActive ? " is-active" : ""}`}
    >
      <span className="ps-menu__bullet">•</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { user, isAdmin } = useAuth();
  const logout = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  useSSE();

  // Show the Bookings → (tabs) sub-tree contextually when inside a buku/booking.
  const inBuku = /^\/(buku\/[^/]+|bookings\/)/.test(location.pathname);

  return (
    <div className="app classic">
      <aside className="sidebar ps-sidebar">
        <div className="ps-titlebar">TAS — Transporindo Export</div>

        <nav className="ps-menu" aria-label="Menu">
          <MenuGroup label="Menu" defaultOpen>
            <MenuItem to="/" end label="Buku" level={1} />
            {inBuku && (
              <div className="ps-menu__sub">
                <MenuItem to={location.pathname} label="Bookings" level={2} />
              </div>
            )}
          </MenuGroup>

          {isAdmin && (
            <MenuGroup label="Admin" defaultOpen={false}>
              <MenuItem to="/users" label="Users" level={1} />
              <MenuItem to="/audit" label="Audit Log" level={1} />
              <MenuItem to="/settings" label="Pengaturan" level={1} />
              <MenuItem to="/backup" label="Backup" level={1} />
            </MenuGroup>
          )}
        </nav>

        <div className="ps-userbar">
          <span className="ps-userbar__name">{user?.full_name || user?.username}</span>
          <button className="ps-userbar__link" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main ps-main">
        {location.pathname !== "/" && (
          <button
            className="ps-back"
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginBottom: 12, padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
              color: "var(--fg-2)", background: "var(--bg-2)",
              border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer",
            }}
          >
            ← Kembali
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
}
