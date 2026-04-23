// Shell: sidebar, topbar, command palette
const { useState: useStateSh, useEffect: useEffectSh } = React;

const NAV = [
  { id: "home",      label: "Inicio",         icon: "Home" },
  { id: "tasks",     label: "Tareas",         icon: "Tasks" },
  { id: "log",       label: "Bitácora",       icon: "Log" },
  { id: "mentor",    label: "Mentoría",       icon: "Mentor" },
  { id: "eval",      label: "Evaluaciones",   icon: "Eval" },
  { id: "analytics", label: "Analítica",      icon: "Analytics", roles: ["lead","hr"] },
  { id: "onboard",   label: "Onboarding",     icon: "Onboard" },
  { id: "people",    label: "Personas",       icon: "People", roles: ["lead","hr"] },
  { id: "auto",      label: "Automatización", icon: "Auto", roles: ["lead","hr"] },
];

const ROLES = {
  intern: { label: "Practicante", user: { name: "Valentina Cruz", initials: "VC", tone: "#c8532b", role: "Practicante · Diseño" } },
  lead:   { label: "Líder",       user: { name: "Lucía Ramírez",  initials: "LR", tone: "#456b7a", role: "Líder · Producto" } },
  hr:     { label: "RH",          user: { name: "Mara Villalobos",initials: "MV", tone: "#5a7a3f", role: "People Ops" } },
};

const Sidebar = ({ active, onNav, role, onToggleRole }) => {
  const items = NAV.filter(n => !n.roles || n.roles.includes(role));
  const u = ROLES[role].user;
  return (
    <aside style={{
      width: "var(--sb-w)", flex: "none",
      borderRight: "1px solid var(--line)",
      background: "var(--bg-2)",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "var(--ink)", color: "var(--bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="serif" style={{ fontSize: 18, lineHeight: 1, fontStyle: "italic" }}>m</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>Mentorly</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3, letterSpacing: 0.5 }}>AXIS / Prácticas</div>
        </div>
        <div style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
          <I.ChevronDn size={14}/>
        </div>
      </div>

      {/* Workspace switcher card */}
      <button onClick={onToggleRole} style={{
        margin: "6px 10px 10px", padding: "8px 10px", textAlign: "left",
        background: "var(--surface-raised)", border: "1px solid var(--line)",
        borderRadius: "var(--r-2)", display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer",
      }} title="Cambiar rol (Tweak)">
        <Avatar u={u} size={26}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.role}</div>
        </div>
        <Badge tone="accent" style={{ fontSize: 10 }}>{ROLES[role].label}</Badge>
      </button>

      {/* Nav */}
      <nav style={{ padding: "4px 8px", flex: 1, overflow: "auto" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: 0.6, padding: "10px 10px 6px", textTransform: "uppercase" }}>Espacio</div>
        {items.map(n => {
          const Icn = I[n.icon];
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => onNav(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "7px 10px", marginBottom: 1,
              border: "none", background: on ? "var(--surface-raised)" : "transparent",
              borderRadius: "var(--r-2)", textAlign: "left", cursor: "pointer",
              color: on ? "var(--ink)" : "var(--ink-2)",
              fontSize: 13, fontWeight: on ? 600 : 500,
              boxShadow: on ? "var(--shadow-1)" : "none",
              borderLeft: on ? "2px solid var(--accent)" : "2px solid transparent",
              paddingLeft: 10,
            }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              <Icn size={16}/>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "tasks" && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>12</span>}
              {n.id === "mentor" && <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }}/>}
            </button>
          );
        })}

        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: 0.6, padding: "16px 10px 6px", textTransform: "uppercase" }}>Favoritos</div>
        {[
          { t: "Sprint 12 — Producto", c: "#c8532b" },
          { t: "Cohorte abril 2026", c: "#3e7a6b" },
          { t: "Plan de crecimiento — Ana", c: "#8a6b9e" },
        ].map((f,i) => (
          <button key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "6px 12px", marginBottom: 1,
            border: "none", background: "transparent", borderRadius: "var(--r-2)",
            textAlign: "left", cursor: "pointer", color: "var(--ink-2)", fontSize: 12.5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: f.c, flex: "none" }}/>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.t}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center" }}>
        <button style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid var(--line)", background: "var(--surface-raised)", borderRadius: "var(--r-2)", fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
          <I.Settings size={14}/> Ajustes
        </button>
        <button style={{ padding: "6px 8px", border: "1px solid var(--line)", background: "var(--surface-raised)", borderRadius: "var(--r-2)", cursor: "pointer", color: "var(--ink-2)" }} title="Ayuda">
          ?
        </button>
      </div>
    </aside>
  );
};

// ---- Topbar ---------------------------------------------------------------
const Topbar = ({ crumbs = [], right, onOpenCmd, role }) => {
  const u = ROLES[role].user;
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 5,
      background: "rgba(243,239,231,0.85)", backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--line)",
      padding: "10px 24px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-2)" }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <I.Chevron size={12} style={{ opacity: 0.5 }}/>}
            <span style={{ color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)", fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <button onClick={onOpenCmd} style={{
        marginLeft: "auto",
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--surface-raised)", border: "1px solid var(--line)",
        borderRadius: "var(--r-2)", padding: "6px 10px 6px 10px", cursor: "pointer",
        color: "var(--ink-3)", fontSize: 12.5, minWidth: 260,
      }}>
        <I.Search size={14}/>
        <span>Buscar tareas, personas, proyectos…</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
          <Kbd>⌘</Kbd><Kbd>K</Kbd>
        </span>
      </button>

      <button style={{ padding: 8, border: "1px solid var(--line)", background: "var(--surface-raised)", borderRadius: "var(--r-2)", cursor: "pointer", color: "var(--ink-2)", position: "relative" }} title="Notificaciones">
        <I.Bell size={15}/>
        <span style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: 3, background: "var(--accent)", border: "1px solid var(--surface-raised)" }}/>
      </button>
      {right}
      <Avatar u={u} size={28}/>
    </header>
  );
};

// ---- Command Palette ------------------------------------------------------
const CommandPalette = ({ open, onClose, onNav }) => {
  const [q, setQ] = useStateSh("");
  const items = [
    { cat: "Ir a", t: "Inicio",               nav: "home",  icon: "Home" },
    { cat: "Ir a", t: "Tareas — Kanban",      nav: "tasks", icon: "Tasks" },
    { cat: "Ir a", t: "Bitácora diaria",      nav: "log",   icon: "Log" },
    { cat: "Ir a", t: "Mentoría 1:1",         nav: "mentor",icon: "Mentor" },
    { cat: "Ir a", t: "Evaluaciones",         nav: "eval",  icon: "Eval" },
    { cat: "Ir a", t: "Analítica (HR)",       nav: "analytics", icon: "Analytics" },
    { cat: "Ir a", t: "Onboarding",           nav: "onboard", icon: "Onboard" },
    { cat: "Ir a", t: "Automatizaciones",     nav: "auto",  icon: "Auto" },
    { cat: "Acciones", t: "Crear tarea nueva",     icon: "Plus" },
    { cat: "Acciones", t: "Escribir bitácora de hoy", icon: "Log" },
    { cat: "Acciones", t: "Programar 1:1",         icon: "Cal" },
    { cat: "Acciones", t: "Reportar bloqueo",      icon: "Flag" },
    { cat: "Personas", t: "Ana Paredes",      icon: "People" },
    { cat: "Personas", t: "Diego Herrera",    icon: "People" },
    { cat: "Personas", t: "Valentina Cruz",   icon: "People" },
  ];
  const filtered = q ? items.filter(i => i.t.toLowerCase().includes(q.toLowerCase())) : items;
  const grouped = {};
  filtered.forEach(it => { (grouped[it.cat] = grouped[it.cat] || []).push(it); });

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(42,35,32,0.35)", backdropFilter: "blur(4px)",
      zIndex: 100, display: "flex", justifyContent: "center", paddingTop: "10vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 600, maxWidth: "92vw",
        background: "var(--surface-raised)", border: "1px solid var(--line)",
        borderRadius: "var(--r-4)", boxShadow: "var(--shadow-3)", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line-soft)" }}>
          <I.Search size={16} style={{ color: "var(--ink-3)" }}/>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Escribe un comando o busca…" style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 14, color: "var(--ink)", fontFamily: "inherit",
          }}/>
          <Kbd>esc</Kbd>
        </div>
        <div style={{ maxHeight: 360, overflow: "auto", padding: 6 }}>
          {Object.keys(grouped).map(cat => (
            <div key={cat}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: 0.6, padding: "10px 10px 4px", textTransform: "uppercase" }}>{cat}</div>
              {grouped[cat].map((it, i) => {
                const Icn = I[it.icon];
                return (
                  <button key={i} onClick={() => { if (it.nav) { onNav(it.nav); onClose(); } }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "8px 10px", border: "none", background: "transparent",
                      borderRadius: "var(--r-2)", cursor: "pointer", textAlign: "left",
                      fontSize: 13, color: "var(--ink)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Icn size={15} style={{ color: "var(--ink-3)" }}/>
                    <span style={{ flex: 1 }}>{it.t}</span>
                    <I.Chevron size={12} style={{ color: "var(--ink-3)" }}/>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Sin resultados</div>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--line-soft)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-3)" }}>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}><Kbd>↵</Kbd> abrir</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}><I.Sparkles size={11}/> IA sugiere acciones contextuales</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar, CommandPalette, ROLES });
