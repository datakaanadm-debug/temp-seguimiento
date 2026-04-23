// Shared UI primitives for Mentorly
// (hooks accessed as React.useState etc. to avoid global collisions)

// ---- Avatar ---------------------------------------------------------------
const Avatar = ({ u, size = 24 }) => {
  if (!u) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: u.tone + "22", color: u.tone,
      border: `1px solid ${u.tone}55`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: 0.3,
      flex: "none",
    }}>{u.initials}</div>
  );
};

// ---- Badge / Pill ---------------------------------------------------------
const Badge = ({ children, tone = "neutral", solid, style }) => {
  const tones = {
    neutral: { fg: "var(--ink-2)", bg: "var(--line-soft)" },
    accent:  { fg: "var(--accent-ink)", bg: "var(--accent-soft)" },
    ok:      { fg: "#3d5428", bg: "var(--ok-soft)" },
    warn:    { fg: "#8a6420", bg: "var(--warn-soft)" },
    danger:  { fg: "var(--danger)", bg: "var(--danger-soft)" },
    info:    { fg: "var(--info)", bg: "var(--info-soft)" },
    tag1:    { fg: "var(--tag-1)", bg: "var(--tag-1-soft)" },
    tag2:    { fg: "var(--tag-2)", bg: "var(--tag-2-soft)" },
    tag3:    { fg: "var(--tag-3)", bg: "var(--tag-3-soft)" },
    tag4:    { fg: "var(--tag-4)", bg: "var(--tag-4-soft)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
      padding: "2px 7px", borderRadius: 999,
      color: solid ? "#fff" : t.fg,
      background: solid ? t.fg : t.bg,
      lineHeight: 1.5,
      ...style,
    }}>{children}</span>
  );
};

// ---- Button ---------------------------------------------------------------
const Btn = ({ children, kind = "ghost", size = "md", icon, onClick, style, disabled, title }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1px solid transparent", borderRadius: "var(--r-2)",
    fontSize: size === "sm" ? 12 : 13, fontWeight: 500, lineHeight: 1,
    padding: size === "sm" ? "5px 8px" : "7px 11px",
    transition: "background 120ms, border-color 120ms, color 120ms",
    color: "var(--ink)", background: "transparent",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
  };
  const kinds = {
    primary: { background: "var(--ink)", color: "#fbf8f1", borderColor: "var(--ink)" },
    accent:  { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" },
    outline: { background: "var(--surface-raised)", borderColor: "var(--line)" },
    ghost:   { background: "transparent" },
    subtle:  { background: "var(--line-soft)", borderColor: "transparent" },
  };
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ ...base, ...kinds[kind], ...style }}
      onMouseEnter={e => { if (kind === "ghost") e.currentTarget.style.background = "var(--line-soft)"; }}
      onMouseLeave={e => { if (kind === "ghost") e.currentTarget.style.background = "transparent"; }}>
      {icon}
      {children}
    </button>
  );
};

// ---- Kbd ------------------------------------------------------------------
const Kbd = ({ children }) => (
  <span className="mono" style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 18, height: 18, padding: "0 4px", fontSize: 10.5,
    color: "var(--ink-2)", background: "var(--surface-raised)",
    border: "1px solid var(--line)", borderBottomWidth: 2,
    borderRadius: 4, letterSpacing: 0.3,
  }}>{children}</span>
);

// ---- Priority dot ---------------------------------------------------------
const Prio = ({ p }) => {
  const map = { high: "#a8432e", med: "#b8892a", low: "#8a7e73" };
  return (
    <span title={`Prioridad ${p}`} style={{
      width: 7, height: 7, borderRadius: "50%", background: map[p] || map.low,
      flex: "none", display: "inline-block",
    }}/>
  );
};

// ---- Status chip ----------------------------------------------------------
const StatusChip = ({ s }) => {
  const st = window.mentorlyData.STATUSES.find(x => x.id === s);
  if (!st) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 500,
      padding: "2px 7px 2px 6px", borderRadius: 4,
      color: st.color, background: st.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }}/>
      {st.label}
    </span>
  );
};

// ---- Spark (bar sparkline) -----------------------------------------------
const Spark = ({ data, w = 60, h = 20, tone = "var(--accent)" }) => {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = Math.max(1, (v / max) * (h - 2));
        return <rect key={i} x={i * bw + 1} y={h - bh} width={bw - 2} height={bh} rx={1} fill={tone} opacity={0.2 + 0.8 * (v/max)}/>;
      })}
    </svg>
  );
};

// ---- Section card ---------------------------------------------------------
const Card = ({ title, right, children, style, noPad }) => (
  <div style={{
    background: "var(--surface-raised)", border: "1px solid var(--line)",
    borderRadius: "var(--r-3)", boxShadow: "var(--shadow-1)", ...style,
  }}>
    {(title || right) && (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", borderBottom: "1px solid var(--line-soft)",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{right}</div>
      </div>
    )}
    <div style={{ padding: noPad ? 0 : "var(--pad-3)" }}>{children}</div>
  </div>
);

// ---- Section title --------------------------------------------------------
const SectionTitle = ({ kicker, title, sub, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, gap: 16 }}>
    <div>
      {kicker && (
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
          {kicker}
        </div>
      )}
      <h1 className="serif" style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 30, margin: 0, letterSpacing: -0.3, lineHeight: 1.1 }}>
        {title}
      </h1>
      {sub && <div style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 13 }}>{sub}</div>}
    </div>
    {right && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{right}</div>}
  </div>
);

Object.assign(window, { Avatar, Badge, Btn, Kbd, Prio, StatusChip, Spark, Card, SectionTitle });
