import { Fragment } from "react";
import { IconDown, IconX, IconChevron } from "./Icons.jsx";

// ── Formatters ───────────────────────────────────────────────────────────────
export const fmtRp = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "Rp. 0.00";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "-Rp. " : "Rp. ") + formatted;
};
export const fmtRpShort = (n) => {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  if (n >= 1000) return "Rp " + (n / 1000).toFixed(0) + "rb";
  return fmtRp(n);
};
export const fmtDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};
export const monthLabel = (m) =>
  ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][m];

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  belum:       { label: "Belum Bayar", tone: "danger" },
  belum_bayar: { label: "Belum Bayar", tone: "danger" },
  sebagian:    { label: "Sebagian",    tone: "warn" },
  lunas:       { label: "Lunas",       tone: "ok" },
  kosong:      { label: "—",           tone: "muted" },
  none:        { label: "—",           tone: "muted" },
  open:        { label: "Open",        tone: "ok" },
  closed:      { label: "Closed",      tone: "muted" },
  in_progress: { label: "In Progress", tone: "warn" },
  done:        { label: "Done",        tone: "ok" },
  admin:       { label: "Admin",       tone: "accent" },
  finance:     { label: "Finance",     tone: "ok" },
  worker:      { label: "Worker",      tone: "muted" },
  aktif:       { label: "Aktif",       tone: "ok" },
  nonaktif:    { label: "Nonaktif",    tone: "muted" },
};

// ── Components ────────────────────────────────────────────────────────────────
export const Badge = ({ status, label, tone, dot = true, solid = false }) => {
  const meta = status ? STATUS_META[status] : { label, tone: tone || "muted" };
  const t = meta?.tone || "muted";
  return (
    <span className={`badge badge--${t}${solid ? " badge--solid" : ""}`}>
      {dot && <span className="badge__dot" />}
      {meta?.label ?? label}
    </span>
  );
};

export const Button = ({ children, variant = "default", size = "md", icon, onClick, type = "button", disabled, full = false, title }) => (
  <button type={type} disabled={disabled} title={title} onClick={onClick}
    className={`btn btn--${variant} btn--${size}${full ? " btn--full" : ""}${!children ? " btn--icon" : ""}`}>
    {icon}{children && <span>{children}</span>}
  </button>
);

export const Field = ({ label, hint, children, required, span = 1 }) => (
  <label className="field" style={{ gridColumn: `span ${span}` }}>
    <span className="field__lbl">{label}{required && <em>*</em>}</span>
    {children}
    {hint && <span className="field__hint">{hint}</span>}
  </label>
);

export const Input = (p) => <input {...p} className={`inp${p.className ? " " + p.className : ""}`} />;

export const Select = ({ value, onChange, children, ...p }) => (
  <div className="sel-wrap">
    <select value={value} onChange={onChange} className="inp" {...p}>{children}</select>
    <IconDown size={14} />
  </div>
);

export const Textarea = (p) => <textarea {...p} className={`inp inp--ta${p.className ? " " + p.className : ""}`} />;

export const Card = ({ title, action, children, pad = true, className = "", muted = false }) => (
  <section className={`card${muted ? " card--muted" : ""}${className ? " " + className : ""}`}>
    {(title || action) && (
      <header className="card__hd">
        <h3>{title}</h3>
        {action}
      </header>
    )}
    <div className={`card__body${pad ? "" : " card__body--flush"}`}>{children}</div>
  </section>
);

export const Stat = ({ label, value, sub, tone = "default", trend }) => (
  <div className={`stat stat--${tone}`}>
    <div className="stat__lbl">{label}</div>
    <div className="stat__val">{value}</div>
    {sub && <div className="stat__sub">{sub}</div>}
    {trend && <div className="stat__trend">{trend}</div>}
  </div>
);

export const Progress = ({ value, max, tone = "accent" }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`prog prog--${tone}`}>
      <div className="prog__fill" style={{ width: pct + "%" }} />
    </div>
  );
};

export const Empty = ({ title, sub, action }) => (
  <div className="empty">
    <div className="empty__title">{title}</div>
    {sub && <div className="empty__sub">{sub}</div>}
    {action && <div style={{ marginTop: 12 }}>{action}</div>}
  </div>
);

export const Modal = ({ open, onClose, title, children, footer, width = 480 }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <header className="modal__hd">
          <h3>{title}</h3>
          <button className="modal__x" onClick={onClose}><IconX size={16} /></button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__ft">{footer}</footer>}
      </div>
    </div>
  );
};

export const PageHeader = ({ crumbs, title, meta, actions }) => (
  <header className="phdr">
    {crumbs && (
      <nav className="phdr__crumbs">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <IconChevron size={12} />}
            {c.onClick ? <a onClick={c.onClick} style={{ cursor: "default" }}>{c.label}</a> : <span>{c.label}</span>}
          </Fragment>
        ))}
      </nav>
    )}
    <div className="phdr__row">
      <div>
        <h1 className="phdr__title">{title}</h1>
        {meta && <div className="phdr__meta">{meta}</div>}
      </div>
      {actions && <div className="phdr__actions">{actions}</div>}
    </div>
  </header>
);
