const I = ({ d, size = 16, fill = "none", strokeWidth = 1.5, children, viewBox = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, display: "block" }}>
    {d ? <path d={d} /> : children}
  </svg>
);

export const IconBook     = (p) => <I {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></I>;
export const IconBox      = (p) => <I {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></I>;
export const IconList     = (p) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></I>;
export const IconUsers    = (p) => <I {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></I>;
export const IconActivity = (p) => <I {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></I>;
export const IconShipper  = (p) => <I {...p}><path d="M3 21h18" /><path d="M5 21V8l5-3 5 3v13" /><path d="M9 21v-5h2v5" /><path d="M19 21V12l-4-2" /></I>;
export const IconPlus     = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconSearch   = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></I>;
export const IconChevron  = (p) => <I {...p}><path d="m9 18 6-6-6-6" /></I>;
export const IconDown     = (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>;
export const IconBack     = (p) => <I {...p}><path d="m15 18-6-6 6-6" /></I>;
export const IconCheck    = (p) => <I {...p}><path d="M20 6 9 17l-5-5" /></I>;
export const IconX        = (p) => <I {...p}><path d="M18 6 6 18M6 6l12 12" /></I>;
export const IconDot      = (p) => <I {...p} fill="currentColor" strokeWidth={0}><circle cx="12" cy="12" r="5" /></I>;
export const IconCalendar = (p) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>;
export const IconShip     = (p) => <I {...p}><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /><path d="M19.4 13 22 11l-3-4H5L2 11l2.6 2" /><path d="M12 11V3h7" /></I>;
export const IconTruck    = (p) => <I {...p}><rect x="1" y="6" width="15" height="11" rx="1" /><path d="M16 9h4l3 4v4h-7" /><circle cx="6" cy="20" r="2" /><circle cx="19" cy="20" r="2" /></I>;
export const IconDownload = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></I>;
export const IconUpload   = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></I>;
export const IconTrash    = (p) => <I {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></I>;
export const IconEdit     = (p) => <I {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></I>;
export const IconMore     = (p) => <I {...p}><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/></I>;
export const IconExternal = (p) => <I {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></I>;
export const IconArrow    = (p) => <I {...p}><path d="M5 12h14M12 5l7 7-7 7" /></I>;
export const IconFilter   = (p) => <I {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></I>;
export const IconRefresh  = (p) => <I {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></I>;

export const LogoMark = ({ size = 28 }) => (
  <img src="/logo.svg" width={size} height={size}
    style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
    alt="TAS Logistics" />
);

export const LogoHero = ({ size = 120 }) => (
  <img src="/logo-dark.svg" width={size} height={size}
    style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
    alt="TAS Logistics" />
);
