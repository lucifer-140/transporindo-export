import { NavLink, Outlet } from "react-router-dom";
import { useAuth, useLogout } from "../hooks/useAuth.js";
import { useTheme } from "../hooks/useTheme.js";
import { useSSE } from "../hooks/useSSE.js";
import { IconBook, IconBox, IconUsers, IconActivity, IconShipper, IconArrow, IconExternal, LogoMark } from "./Icons.jsx";

export default function Layout() {
  const { user, isAdmin, isFinance } = useAuth();
  const logout = useLogout();
  const { theme, toggle } = useTheme();
  useSSE();

  const initials = (user?.full_name || user?.username || "U")
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleChipClass =
    user?.role === "finance" ? "sb-user__role-chip--finance" :
    user?.role === "worker"  ? "sb-user__role-chip--worker" : "";

  const sections = [
    {
      label: "Operasional",
      links: [
        { to: "/", end: true, label: "Buku",     icon: <IconBook size={15} /> },
        { to: "/bookings",    label: "Bookings",  icon: <IconBox size={15} />, adminOnly: true },
        { to: "/shippers",   label: "Shippers",  icon: <IconShipper size={15} />, adminOnly: true },
      ],
    },
    {
      label: "Finance",
      links: [
        { to: "/piutang", label: "Piutang", icon: <IconArrow size={15} />,  financeOnly: true },
        { to: "/hutang",  label: "Hutang",  icon: <IconArrow size={15} style={{ transform: "rotate(180deg)" }} />, financeOnly: true },
      ],
    },
    {
      label: "Admin",
      links: [
        { to: "/users",    label: "Users",      icon: <IconUsers size={15} />,    adminOnly: true },
        { to: "/audit",    label: "Audit Log",  icon: <IconActivity size={15} />, adminOnly: true },
        { to: "/settings", label: "Pengaturan", icon: <IconActivity size={15} />, adminOnly: true },
      ],
    },
  ];

  const visible = sections
    .map((s) => ({ ...s, links: s.links.filter((l) => (!l.adminOnly || isAdmin) && (!l.financeOnly || isFinance)) }))
    .filter((s) => s.links.length > 0);

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/" className="sb-brand" style={{ textDecoration: "none" }}>
          <LogoMark size={40} accent="var(--accent)" />
          <div className="sb-brand__wm">
            <b>TAS</b>
            <small>Logistics</small>
          </div>
        </NavLink>

        {visible.map((sec) => (
          <div key={sec.label} className="sb-section">
            <div className="sb-section__lbl">{sec.label}</div>
            {sec.links.map((l) => (
              <NavLink
                key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => `sb-link${isActive ? " is-active" : ""}`}
              >
                {l.icon}
                <span>{l.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-user">
          <div className="sb-user__avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-user__name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.full_name || user?.username}
            </div>
            <span className={`sb-user__role-chip ${roleChipClass}`}>{user?.role}</span>
          </div>
          <button className="sb-user__signout" onClick={toggle} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
          <button className="sb-user__signout" onClick={logout} title="Sign out">
            <IconExternal size={14} />
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
