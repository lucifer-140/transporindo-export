import { NavLink, Outlet } from "react-router-dom";
import { useAuth, useLogout } from "../hooks/useAuth.js";
import { IconBook, IconBox, IconUsers, IconActivity, IconShipper, IconArrow, IconExternal, LogoMark } from "./Icons.jsx";

export default function Layout() {
  const { user, isAdmin, isFinance } = useAuth();
  const logout = useLogout();

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
        { to: "/users", label: "Users",     icon: <IconUsers size={15} />,    adminOnly: true },
        { to: "/audit", label: "Audit Log", icon: <IconActivity size={15} />, adminOnly: true },
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
