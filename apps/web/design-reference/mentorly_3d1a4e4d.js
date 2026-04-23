// Screens — part 3: Evaluaciones, Analítica, Automatizaciones, Mobile
const { useState: useStateC } = React;

// ============ EVALUACIONES ================================================
const EvalScreen = () => {
  const { KPI_SCORES, INTERNS } = window.mentorlyData;
  const me = INTERNS[2];
  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <SectionTitle kicker="Evaluación de desempeño · Q1 2026" title="Scorecard de Valentina"
        sub="Evaluación cerrada el 18 abr · siguiente: 18 jul · ponderada 60% líder / 30% mentor / 10% autoevaluación"
        right={<><Btn kind="outline" size="sm" icon={<I.Attach size={12}/>}>Descargar PDF</Btn><Btn kind="accent" size="sm">Nueva evaluación</Btn></>}/>

      {/* Top row: score card + radar */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 22 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6 }}>RESULTADO GLOBAL</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 8 }}>
            <div className="serif" style={{ fontSize: 68, lineHeight: 0.9, letterSpacing: -2 }}>84</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", paddingBottom: 10 }}>/ 100</div>
            <Badge tone="ok" style={{ marginLeft: "auto", marginBottom: 12 }}>+6 vs. anterior</Badge>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.55 }}>
            <b style={{ color: "var(--ink)" }}>Excelente desempeño</b> — por encima del objetivo (80). Liderazgo informal reconocido por el equipo.
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
            <div><div style={{ color: "var(--ink-3)" }}>Líder</div><div style={{ fontWeight: 600, marginTop: 2 }}>88 / 100</div></div>
            <div><div style={{ color: "var(--ink-3)" }}>Mentora</div><div style={{ fontWeight: 600, marginTop: 2 }}>82 / 100</div></div>
            <div><div style={{ color: "var(--ink-3)" }}>Pares</div><div style={{ fontWeight: 600, marginTop: 2 }}>80 / 100</div></div>
            <div><div style={{ color: "var(--ink-3)" }}>Auto</div><div style={{ fontWeight: 600, marginTop: 2 }}>78 / 100</div></div>
          </div>
        </div>

        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>KPIs · vista radar</div>
            <Badge tone="neutral">Q1 vs Q4 2025</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "center" }}>
            <svg width="240" height="240" viewBox="0 0 240 240">
              {/* axes */}
              {[0.25, 0.5, 0.75, 1].map(r => (
                <polygon key={r} points={KPI_SCORES.map((_, i) => {
                  const a = (Math.PI * 2 * i) / KPI_SCORES.length - Math.PI / 2;
                  return (120 + Math.cos(a) * 100 * r) + "," + (120 + Math.sin(a) * 100 * r);
                }).join(" ")} fill="none" stroke="var(--line)" strokeWidth="1"/>
              ))}
              {KPI_SCORES.map((_, i) => {
                const a = (Math.PI * 2 * i) / KPI_SCORES.length - Math.PI / 2;
                return <line key={i} x1="120" y1="120" x2={120 + Math.cos(a)*100} y2={120 + Math.sin(a)*100} stroke="var(--line)"/>;
              })}
              {/* previous */}
              <polygon points={KPI_SCORES.map((s, i) => {
                const a = (Math.PI * 2 * i) / KPI_SCORES.length - Math.PI / 2;
                const v = (s.v - (s.d || 0)) / 100;
                return (120 + Math.cos(a)*100*v) + "," + (120 + Math.sin(a)*100*v);
              }).join(" ")} fill="var(--ink-3)" fillOpacity="0.1" stroke="var(--ink-3)" strokeDasharray="3 3" strokeWidth="1.2"/>
              {/* current */}
              <polygon points={KPI_SCORES.map((s, i) => {
                const a = (Math.PI * 2 * i) / KPI_SCORES.length - Math.PI / 2;
                return (120 + Math.cos(a)*100*(s.v/100)) + "," + (120 + Math.sin(a)*100*(s.v/100));
              }).join(" ")} fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="2"/>
              {KPI_SCORES.map((s, i) => {
                const a = (Math.PI * 2 * i) / KPI_SCORES.length - Math.PI / 2;
                return <circle key={i} cx={120 + Math.cos(a)*100*(s.v/100)} cy={120 + Math.sin(a)*100*(s.v/100)} r="3.5" fill="var(--accent)"/>;
              })}
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {KPI_SCORES.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 40px 60px", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5 }}>{s.k}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{s.v}</span>
                  <span style={{ fontSize: 11, color: s.d > 0 ? "#3d5428" : "var(--danger)" }}>
                    {s.d > 0 ? <I.ArrowUp size={10}/> : <I.ArrowDn size={10}/>} {Math.abs(s.d)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback + Goals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Feedback 360°">
          {[
            { who: "Lucía R. · Líder", tone: "#456b7a", role: "Líder",
              text: "Valentina tiene una claridad estructural notable — presenta ideas con storytelling. Próximo nivel: tomar más riesgos en exploraciones tempranas." },
            { who: "Sofía B. · Mentora", tone: "#8a6b9e", role: "Mentora",
              text: "Gran evolución en systems thinking. Buena autoconsciencia sobre sus sesgos. Recomiendo un proyecto donde lidere facilitación con un equipo cross-funcional." },
            { who: "Diego H. · Par", tone: "#3e7a6b", role: "Par",
              text: "Muy colaborativa, revisa PRs con cuidado y siempre deja el código mejor. A veces se compromete con más de lo que puede entregar." },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: f.tone + "22", color: f.tone, border: `1px solid ${f.tone}66`, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flex: "none" }}>{f.who.slice(0,2)}</div>
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>{f.who}</div>
                <div className="serif" style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)" }}>“{f.text}”</div>
              </div>
            </div>
          ))}
        </Card>

        <Card title="OKRs · Q2 2026" right={<Badge tone="accent">En curso</Badge>}>
          {[
            { o: "Elevar consistencia visual del producto", p: 62, kr: [
              { t: "Auditar 100% de los componentes críticos", p: 90 },
              { t: "Proponer 3 mejoras priorizadas", p: 66 },
              { t: "Implementar 1 mejora de punta a punta", p: 30 },
            ]},
            { o: "Fortalecer habilidades de facilitación", p: 40, kr: [
              { t: "Liderar 2 sesiones de crítica", p: 50 },
              { t: "Co-facilitar un workshop externo", p: 20 },
            ]},
          ].map((okr, i) => (
            <div key={i} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>O{i+1}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{okr.o}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{okr.p}%</span>
              </div>
              <div style={{ paddingLeft: 26 }}>
                {okr.kr.map((k, j) => (
                  <div key={j} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-2)", marginBottom: 3 }}>
                      <span><span className="mono" style={{ color: "var(--ink-3)", marginRight: 6 }}>KR{j+1}</span>{k.t}</span>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>{k.p}%</span>
                    </div>
                    <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: k.p + "%", height: "100%", background: "var(--accent)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ============ ANALÍTICA (HR) ==============================================
const AnalyticsScreen = () => {
  const { INTERNS } = window.mentorlyData;
  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1360, margin: "0 auto" }}>
      <SectionTitle kicker="People Ops · cohorte abril" title="Analítica ejecutiva" sub="48 practicantes · 7 equipos · periodo 1 abr – 22 abr 2026"
        right={<><Btn kind="outline" size="sm" icon={<I.Cal size={13}/>}>Últimos 30 días</Btn><Btn kind="outline" size="sm" icon={<I.Filter size={12}/>}>Equipo: todos</Btn><Btn kind="accent" size="sm" icon={<I.Attach size={12}/>}>Exportar reporte</Btn></>}/>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { k: "Cumplimiento global", v: "84%", d: "+4", tone: "ok" },
          { k: "Bitácora diaria", v: "91%", d: "+2", tone: "ok" },
          { k: "Tareas en riesgo", v: "7", d: "-3", tone: "warn" },
          { k: "Horas promedio/día", v: "6.8", d: "—", tone: "neutral" },
          { k: "Retención esperada", v: "94%", d: "+1", tone: "ok" },
        ].map((s, i) => (
          <div key={i} style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.k}</div>
            <div className="serif" style={{ fontSize: 30, lineHeight: 1, marginTop: 6, letterSpacing: -0.5 }}>{s.v}</div>
            <Badge tone={s.tone} style={{ marginTop: 10, fontSize: 10 }}>{s.d !== "—" ? (s.d > 0 ? "↑" : "↓") : ""} {s.d}</Badge>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Productivity by team */}
        <Card title="Productividad por equipo · últimos 30 días">
          {[
            { n: "Producto",     v: 88, c: "#c8532b" },
            { n: "Diseño",       v: 82, c: "#8a6b9e" },
            { n: "Ingeniería",   v: 74, c: "#3e7a6b" },
            { n: "Marketing",    v: 61, c: "#b8892a" },
            { n: "Operaciones",  v: 69, c: "#456b7a" },
            { n: "Data",         v: 86, c: "#5a7a3f" },
            { n: "Finanzas",     v: 78, c: "#a8432e" },
          ].map((t, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 50px", gap: 10, alignItems: "center", padding: "7px 0" }}>
              <span style={{ fontSize: 12.5 }}>{t.n}</span>
              <div style={{ height: 16, background: "var(--line-soft)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                <div style={{ width: t.v + "%", height: "100%", background: t.c, opacity: 0.85 }}/>
                <span style={{ position: "absolute", left: 8, top: 0, bottom: 0, fontSize: 10.5, color: "#fff", display: "flex", alignItems: "center", fontWeight: 600 }}>{t.v >= 30 ? t.n : ""}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>{t.v}%</span>
            </div>
          ))}
        </Card>

        {/* Risk list */}
        <Card title="Practicantes que requieren atención" right={<Badge tone="danger">3</Badge>}>
          {INTERNS.filter(u => u.risk !== "ok").concat([{ id: "xx", name: "Carlos Paz", initials: "CP", tone: "#a8432e", area: "Data", progress: 41, risk: "warn", mentor: "Sofía B.", reason: "2 bitácoras faltantes esta semana" }]).map((u, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
              <Avatar u={u} size={30}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                  <Badge tone={u.risk === "risk" ? "danger" : "warn"} style={{ fontSize: 9 }}>{u.risk === "risk" ? "riesgo alto" : "atención"}</Badge>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{u.area} · {u.mentor}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <I.Sparkles size={11} style={{ color: "var(--accent)" }}/>
                  {u.reason || (u.risk === "risk" ? "Streak 0 días + 38% de avance" : "Productividad bajó 14% esta semana")}
                </div>
              </div>
              <Btn kind="ghost" size="sm">Abrir →</Btn>
            </div>
          ))}
        </Card>
      </div>

      {/* Heatmap */}
      <Card title="Mapa de actividad · por día × hora" right={<Badge tone="neutral">último mes</Badge>}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10 }}>
          <div/>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", fontSize: 9, color: "var(--ink-3)", marginBottom: 4 }}>
            {Array.from({length: 24}, (_, i) => <span key={i} style={{ textAlign: "center" }}>{i % 3 === 0 ? i : ""}</span>)}
          </div>
          {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d, di) => (
            <React.Fragment key={di}>
              <span style={{ fontSize: 11, color: "var(--ink-3)", alignSelf: "center" }}>{d}</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 2 }}>
                {Array.from({length: 24}, (_, h) => {
                  const base = (d >= 5) ? 0.1 : (h >= 9 && h <= 19) ? 0.6 + Math.random()*0.4 : 0.1 + Math.random()*0.2;
                  return <div key={h} style={{ aspectRatio: "1", background: "var(--accent)", opacity: base, borderRadius: 2 }} title={`${d} ${h}:00`}/>;
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ============ AUTOMATIZACIONES ============================================
const AutoScreen = () => {
  const autos = [
    { t: "Alertar bloqueo sin respuesta en 24h", on: true,  runs: 42, when: "Si una tarea está en 'Bloqueada' > 24h → notificar al líder y mentor" },
    { t: "Resumir bitácora semanal con IA",      on: true,  runs: 18, when: "Cada viernes 16:00 → generar resumen de la semana y enviar a RH" },
    { t: "Escalar tarea vencida +3 días",        on: true,  runs: 9,  when: "Si due_date + 3d y estado ≠ 'Hecha' → reasignar a líder + marcar roja" },
    { t: "Mensaje de bienvenida a practicantes", on: false, runs: 0,  when: "Cuando un practicante se añade → enviar DM por Slack con checklist" },
    { t: "Feedback post-sesión 1:1",             on: true,  runs: 24, when: "10 min después de cada 1:1 → pedir rating + nota al practicante" },
    { t: "Detectar baja productividad",          on: true,  runs: 7,  when: "Si bitácora < 3 días/semana × 2 semanas → alerta a RH" },
  ];
  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionTitle kicker="Automatización" title="Reglas y flujos inteligentes" sub="6 reglas activas · 100 ejecuciones este mes · ahorran ~14 h/semana"
        right={<><Btn kind="outline" size="sm" icon={<I.Auto size={12}/>}>Plantillas</Btn><Btn kind="accent" size="sm" icon={<I.Plus size={12}/>}>Nueva regla</Btn></>}/>

      {/* Visual recipe */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Badge tone="accent">Plantilla</Badge>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Cuando un practicante reporta un bloqueo…</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }} className="mono">v2 · últimas 24h</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 10, alignItems: "stretch" }}>
          {[
            { icon: "Flag", label: "Disparador", title: "Se crea un bloqueo", meta: "cualquier tarea · cualquier practicante", tone: "#c8532b" },
            { icon: "Clock", label: "Condición", title: "No resuelto en 4 horas", meta: "en horario laboral", tone: "#b8892a" },
            { icon: "Msg", label: "Acción", title: "Notificar líder + mentor", meta: "vía Slack + email", tone: "#3e7a6b" },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ padding: 14, background: "var(--surface)", border: `1px solid ${s.tone}66`, borderRadius: "var(--r-2)", borderLeft: `3px solid ${s.tone}` }}>
                <div className="mono" style={{ fontSize: 10, color: s.tone, textTransform: "uppercase", letterSpacing: 0.6 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{s.meta}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
                  <I.Chevron size={16}/>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Rules list */}
      <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 90px 40px", padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
          <span></span><span>Regla</span><span>Ejecuciones</span><span>Estado</span><span></span>
        </div>
        {autos.map((a, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 90px 40px", padding: "13px 14px", borderBottom: i < autos.length - 1 ? "1px solid var(--line-soft)" : "none", alignItems: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: a.on ? "var(--accent-soft)" : "var(--line-soft)", color: a.on ? "var(--accent-ink)" : "var(--ink-3)", display: "grid", placeItems: "center" }}>
              <I.Auto size={14}/>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.t}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{a.when}</div>
            </div>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{a.runs} / mes</span>
            <span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <span style={{ position: "relative", width: 28, height: 16, background: a.on ? "var(--accent)" : "var(--line)", borderRadius: 10, display: "inline-block" }}>
                  <span style={{ position: "absolute", top: 2, left: a.on ? 14 : 2, width: 12, height: 12, background: "#fff", borderRadius: "50%", transition: "left 150ms" }}/>
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{a.on ? "On" : "Off"}</span>
              </label>
            </span>
            <I.More size={14} style={{ color: "var(--ink-3)", cursor: "pointer" }}/>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ MOBILE ======================================================
const MobileScreen = () => {
  return (
    <div style={{ padding: "40px 28px", background: "var(--bg-2)", minHeight: "100%" }}>
      <SectionTitle kicker="Diseño responsive" title="Mobile · Reporte diario"
        sub="Flujo clave para practicantes en movimiento. iOS 17, 390×844."/>

      <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { title: "Inicio rápido", screen: "home" },
          { title: "Bitácora del día", screen: "log" },
          { title: "Tareas", screen: "tasks" },
        ].map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <Phone kind={m.screen}/>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>{m.title}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 3 }}>390 × 844</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Phone = ({ kind }) => (
  <div style={{
    width: 300, height: 620,
    background: "#1a1614", padding: 10, borderRadius: 40,
    boxShadow: "var(--shadow-2)", position: "relative",
  }}>
    <div style={{
      width: "100%", height: "100%", borderRadius: 30,
      background: "var(--bg)", overflow: "hidden", position: "relative",
    }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 22px 8px", fontSize: 12, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ width: 80, height: 22, background: "#1a1614", borderRadius: 14, position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)" }}/>
        <span className="mono" style={{ fontSize: 10 }}>●●● 5G</span>
      </div>
      {kind === "home" && <PhoneHome/>}
      {kind === "log"  && <PhoneLog/>}
      {kind === "tasks"&& <PhoneTasks/>}
    </div>
  </div>
);

const PhoneHome = () => {
  const { INTERNS, TASKS } = window.mentorlyData;
  const me = INTERNS[2];
  return (
    <div style={{ padding: "8px 16px 16px", overflow: "hidden", height: "calc(100% - 42px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Avatar u={me} size={34}/>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Miér 22 abr</div>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.1 }}>Hola, Valentina</div>
        </div>
        <I.Bell size={16} style={{ marginLeft: "auto", color: "var(--ink-2)" }}/>
      </div>
      <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "var(--bg-2)", textTransform: "uppercase", letterSpacing: 0.6 }} className="mono">Tu ritmo</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 6 }}>
          <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}>+18%</div>
          <span style={{ fontSize: 10, color: "var(--bg-2)", paddingBottom: 6 }}>vs promedio</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--bg-2)", marginTop: 6 }}>Llevas 14 días reportando bitácora. Sigue así.</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }} className="mono">PARA HOY</div>
      {TASKS.filter(t => t.assignee === "u3").slice(0, 3).map(t => (
        <div key={t.id} style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--ink-3)", marginBottom: 3 }}>
            <Prio p={t.prio}/> <span className="mono">{t.id}</span>
            <span style={{ marginLeft: "auto" }}>{t.due}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{t.t}</div>
        </div>
      ))}
      <button style={{ width: "100%", padding: "12px", marginTop: 10, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <I.Log size={13}/> Escribir bitácora de hoy
      </button>
    </div>
  );
};

const PhoneLog = () => (
  <div style={{ padding: "8px 16px 16px", height: "calc(100% - 42px)", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <I.Chevron size={18} style={{ transform: "rotate(180deg)" }}/>
      <div className="serif" style={{ fontSize: 17 }}>Bitácora · miér 22</div>
    </div>
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {["😕","😐","🙂","😊","🤩"].map((m, i) => (
        <div key={i} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid " + (i === 3 ? "var(--accent)" : "var(--line)"), background: i === 3 ? "var(--accent-soft)" : "var(--surface-raised)", display: "grid", placeItems: "center", fontSize: 16 }}>{m}</div>
      ))}
    </div>
    <div style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }} className="mono">AVANCES</div>
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, minHeight: 80, marginBottom: 10 }}>
      • Maqueté la sección de KPIs<br/>• Sincronicé con Lucía sobre copy<br/>• Revisé componentes del DS
    </div>
    <div style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }} className="mono">HORAS · ⏱ 7.5h</div>
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {["4h","5h","6h","7.5h","8h"].map((h,i) => (
        <div key={i} style={{ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 11, borderRadius: 8, border: "1px solid " + (i === 3 ? "var(--accent)" : "var(--line)"), background: i === 3 ? "var(--accent-soft)" : "transparent", color: i === 3 ? "var(--accent-ink)" : "var(--ink-2)" }}>{h}</div>
      ))}
    </div>
    <button style={{ marginTop: "auto", padding: "13px", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>Publicar entrada</button>
  </div>
);

const PhoneTasks = () => {
  const { TASKS, INTERNS } = window.mentorlyData;
  const me = TASKS.filter(t => t.assignee === "u3");
  return (
    <div style={{ padding: "8px 16px 16px", height: "calc(100% - 42px)", overflow: "hidden" }}>
      <div className="serif" style={{ fontSize: 18, marginBottom: 12 }}>Tareas</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["Todas","En curso","Revisión","Hecha"].map((t,i) => (
          <div key={t} style={{ padding: "6px 10px", fontSize: 11, borderRadius: 999, background: i === 1 ? "var(--ink)" : "var(--surface-raised)", color: i === 1 ? "var(--bg)" : "var(--ink-2)", border: "1px solid " + (i === 1 ? "var(--ink)" : "var(--line)") }}>{t}</div>
        ))}
      </div>
      {me.map(t => {
        const st = window.mentorlyData.STATUSES.find(s => s.id === t.status);
        return (
          <div key={t.id} style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <Prio p={t.prio}/>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{t.id}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: st.color, background: st.bg, padding: "2px 6px", borderRadius: 4 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, marginBottom: 8 }}>{t.t}</div>
            <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: Math.min(100, (t.spent/t.est)*100) + "%", height: "100%", background: "var(--accent)" }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
};

Object.assign(window, { EvalScreen, AnalyticsScreen, AutoScreen, MobileScreen });
