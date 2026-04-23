// Screens — part 1: Home, Tasks, Bitácora, Mentoría, Onboarding
const { useState: useStateA, useMemo: useMemoA } = React;

// ============ HOME ==========================================================
const HomeScreen = ({ role, onNav }) => {
  const { INTERNS, TASKS, ACTIVITY } = window.mentorlyData;
  const me = role === "intern" ? INTERNS[2] : null; // Valentina = VC
  const myTasks = me ? TASKS.filter(t => t.assignee === me.id) : TASKS.filter(t => t.status !== "done").slice(0, 6);

  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1360, margin: "0 auto" }}>
      <SectionTitle
        kicker={role === "intern" ? "Hola, Valentina" : role === "lead" ? "Equipo · Producto" : "People Ops"}
        title={role === "intern" ? "Buenos días — listo para seguir" : role === "lead" ? "Resumen de tu equipo hoy" : "Panorama de la cohorte"}
        sub={
          role === "intern"
            ? "Tienes 4 tareas activas, una evaluación esta semana y una sesión 1:1 mañana."
            : role === "lead"
              ? "6 practicantes activos · 12 tareas en curso · 2 bloqueos reportados"
              : "48 practicantes en 7 equipos — 3 requieren atención esta semana"
        }
        right={<>
          <Btn kind="outline" icon={<I.Cal size={13}/>}>Hoy</Btn>
          <Btn kind="primary" icon={<I.Plus size={13}/>}>Nueva tarea</Btn>
        </>}
      />

      {/* AI summary strip */}
      <div style={{
        display: "flex", gap: 12, padding: "12px 16px", marginBottom: 18,
        background: "linear-gradient(180deg, #fbf8f1, #f3efe7)",
        border: "1px solid var(--line)", borderRadius: "var(--r-3)",
        alignItems: "flex-start",
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--ink)", color: "var(--bg)", display: "grid", placeItems: "center", flex: "none" }}>
          <I.Sparkles size={14}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 2 }} className="mono">RESUMEN · generado 08:14</div>
          <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>
            {role === "intern"
              ? <>Tu ritmo esta semana es <b>+18%</b> vs promedio. <b>T-112</b> está en revisión — Lucía debería responder hoy. <b>T-118</b> vence el viernes: aún te quedan ~3 h estimadas.</>
              : role === "lead"
                ? <>Dos practicantes muestran señales de atraso: <b>Mateo I.</b> (streak 0 días) y <b>Joaquín P.</b> (48% de avance vs 70% del equipo). <b>Valentina</b> lidera con +21% en productividad.</>
                : <>La cohorte de abril mantiene 84% de cumplimiento (+4 vs marzo). Atención: <b>Ing.</b> tiene 2 bloqueos sin resolver hace &gt;24h.</>
            }
          </div>
        </div>
        <Btn kind="ghost" size="sm">Ver detalles →</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(role === "intern" ? [
              { k: "Tareas activas", v: "4", d: "+1", trend: [3,3,4,4,4,3,4] },
              { k: "Horas esta semana", v: "21h", d: "+3h", trend: [4,5,4,6,7,5,6] },
              { k: "Racha bitácora", v: "14 días", d: "", trend: [1,1,1,1,1,1,1] },
              { k: "Cumplimiento", v: "92%", d: "+4%", trend: [6,7,7,8,8,9,9] },
            ] : [
              { k: "Tareas en curso", v: "12", d: "—", trend: [8,9,10,11,11,12,12] },
              { k: "Bloqueos abiertos", v: "2", d: "+1", trend: [0,1,0,1,1,2,2] },
              { k: "Avance del sprint", v: "68%", d: "+12%", trend: [3,4,5,6,6,7,7] },
              { k: "NPS del equipo", v: "8.4", d: "+0.2", trend: [7,7,8,8,8,9,8] },
            ]).map((s, i) => (
              <div key={i} style={{
                background: "var(--surface-raised)", border: "1px solid var(--line)",
                borderRadius: "var(--r-3)", padding: 14,
              }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.3, marginBottom: 4 }}>{s.k}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: "space-between" }}>
                  <div className="serif" style={{ fontSize: 28, lineHeight: 1, letterSpacing: -0.5 }}>{s.v}</div>
                  <Spark data={s.trend} w={64} h={22}/>
                </div>
                {s.d && <div style={{ fontSize: 11, color: s.d.startsWith("+") ? "#3d5428" : "var(--ink-3)", marginTop: 6 }}>{s.d} esta semana</div>}
              </div>
            ))}
          </div>

          {/* My tasks / Team tasks */}
          <Card title={role === "intern" ? "Mis tareas activas" : "Tareas del equipo que requieren atención"}
            right={<><Btn kind="ghost" size="sm" icon={<I.Filter size={12}/>}>Filtrar</Btn><Btn kind="ghost" size="sm" onClick={() => onNav("tasks")}>Ver todas →</Btn></>}
            noPad>
            <div>
              {myTasks.slice(0, 6).map((t, i) => {
                const u = INTERNS.find(x => x.id === t.assignee);
                return (
                  <div key={t.id} style={{
                    display: "grid", gridTemplateColumns: "28px 1fr auto auto auto auto",
                    gap: 12, alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: i < 5 ? "1px solid var(--line-soft)" : "none",
                    fontSize: 13,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Prio p={t.prio}/>
                      <input type="checkbox" checked={t.status==="done"} readOnly style={{ accentColor: "var(--accent)" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "var(--ink-3)" : "var(--ink)" }}>{t.t}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, display: "flex", gap: 8 }}>
                        <span className="mono">{t.id}</span>
                        {t.tags.map(tg => <Badge key={tg} tone="neutral" style={{ fontSize: 10, padding: "1px 6px" }}>{tg}</Badge>)}
                      </div>
                    </div>
                    <StatusChip s={t.status}/>
                    <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{t.due}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.spent}h / {t.est}h</span>
                    <Avatar u={u} size={22}/>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Cohort / team grid (lead & hr) */}
          {role !== "intern" && (
            <Card title="Practicantes — pulso semanal"
              right={<Btn kind="ghost" size="sm" onClick={() => onNav("people")}>Ver todos →</Btn>}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {INTERNS.map(u => (
                  <div key={u.id} style={{
                    padding: 12, border: "1px solid var(--line-soft)", borderRadius: "var(--r-2)",
                    background: "var(--surface)", display: "flex", gap: 10,
                  }}>
                    <Avatar u={u} size={32}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                        {u.risk === "risk" && <Badge tone="danger" style={{ fontSize: 9 }}>riesgo</Badge>}
                        {u.risk === "warn" && <Badge tone="warn"   style={{ fontSize: 9 }}>atrasado</Badge>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{u.area} · {u.mentor}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1, height: 4, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: u.progress + "%", height: "100%", background: u.tone }}/>
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{u.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Today agenda */}
          <Card title="Agenda · hoy" right={<I.More size={14} style={{ color: "var(--ink-3)" }}/>}>
            {[
              { time: "10:00", t: "1:1 con Sofía (mentora)", tag: "mentoría", tone: "tag1" },
              { time: "11:30", t: "Sprint review · Producto", tag: "equipo", tone: "tag2" },
              { time: "14:00", t: "Sesión de diseño — dashboards", tag: "diseño", tone: "accent" },
              { time: "16:00", t: "Escribir bitácora diaria", tag: "reporte", tone: "tag3" },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 42, flex: "none", paddingTop: 2 }}>{e.time}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{e.t}</div>
                  <Badge tone={e.tone} style={{ marginTop: 4, fontSize: 10 }}>{e.tag}</Badge>
                </div>
              </div>
            ))}
          </Card>

          {/* Activity */}
          <Card title="Actividad reciente" right={<span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }}/>}>
            {ACTIVITY.map((a, i) => {
              const u = INTERNS.find(x => x.id === a.who);
              return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                  <Avatar u={u} size={24}/>
                  <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
                    <div style={{ color: "var(--ink-2)" }}>
                      <b style={{ color: "var(--ink)" }}>{u.name.split(" ")[0]}</b> {a.action}{" "}
                      <span className="mono" style={{ color: "var(--ink)" }}>{a.obj}</span>
                    </div>
                    {a.preview && (
                      <div style={{ marginTop: 4, padding: "6px 8px", background: "var(--bg-2)", borderRadius: "var(--r-2)", fontSize: 12, color: "var(--ink-2)", borderLeft: "2px solid " + u.tone }}>
                        {a.preview}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{a.when}</div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============ TASKS =========================================================
const TasksScreen = ({ role }) => {
  const { TASKS, STATUSES, INTERNS } = window.mentorlyData;
  const [view, setView] = useStateA("kanban");

  const byStatus = {};
  STATUSES.forEach(s => byStatus[s.id] = []);
  TASKS.forEach(t => byStatus[t.status] && byStatus[t.status].push(t));

  return (
    <div style={{ padding: "22px 28px 40px" }}>
      <SectionTitle
        kicker="Espacio · Sprint 12"
        title="Tareas del equipo"
        sub="12 tareas · 2 bloqueadas · entrega viernes 1 may"
        right={<>
          <div style={{ display: "flex", background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-2)", padding: 2 }}>
            {[["kanban","Kanban"],["list","Lista"],["timeline","Timeline"],["cal","Calendario"]].map(([k,l]) => (
              <button key={k} onClick={() => setView(k)} style={{
                padding: "5px 10px", fontSize: 12, border: "none", cursor: "pointer",
                background: view === k ? "var(--bg-2)" : "transparent",
                color: view === k ? "var(--ink)" : "var(--ink-3)",
                borderRadius: 4, fontWeight: view === k ? 600 : 500,
              }}>{l}</button>
            ))}
          </div>
          <Btn kind="outline" icon={<I.Filter size={13}/>} size="sm">Filtros · 2</Btn>
          <Btn kind="outline" icon={<I.Sort size={13}/>} size="sm">Agrupar</Btn>
          <Btn kind="accent" icon={<I.Plus size={13}/>}>Nueva tarea</Btn>
        </>}
      />

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Badge tone="accent">Sprint 12 ×</Badge>
        <Badge tone="neutral">Asignado: equipo ×</Badge>
        <Btn kind="ghost" size="sm" icon={<I.Plus size={12}/>}>Añadir filtro</Btn>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }} className="mono">ÚLTIMA SYNC · hace 2s</span>
      </div>

      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(240px, 1fr))", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
          {STATUSES.map(s => (
            <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-3)", display: "flex", flexDirection: "column", minHeight: 420 }}>
              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line-soft)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }}/>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>{byStatus[s.id].length}</span>
                <I.Plus size={13} style={{ color: "var(--ink-3)", cursor: "pointer" }}/>
              </div>
              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {byStatus[s.id].map(t => {
                  const u = INTERNS.find(x => x.id === t.assignee);
                  return (
                    <div key={t.id} style={{
                      padding: 11, background: "var(--surface-raised)",
                      border: "1px solid var(--line)", borderRadius: "var(--r-2)",
                      boxShadow: "var(--shadow-1)", cursor: "grab",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <Prio p={t.prio}/>
                        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{t.id}</span>
                        {t.status === "blocked" && <Badge tone="danger" style={{ fontSize: 9, marginLeft: "auto" }}>BLOQUEADA</Badge>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>{t.t}</div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                        {t.tags.map((tg,i) => <Badge key={tg} tone={["tag1","tag2","tag3","tag4"][i%4]} style={{ fontSize: 10 }}>{tg}</Badge>)}
                      </div>
                      <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ width: Math.min(100, (t.spent/t.est)*100) + "%", height: "100%", background: t.spent > t.est ? "var(--danger)" : "var(--accent)" }}/>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ink-3)" }}>
                        <Avatar u={u} size={20}/>
                        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3 }}><I.Cal size={11}/>{t.due}</span>
                        <span className="mono">{t.spent}/{t.est}h</span>
                      </div>
                    </div>
                  );
                })}
                <button style={{ padding: "8px", border: "1px dashed var(--line)", background: "transparent", borderRadius: "var(--r-2)", color: "var(--ink-3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <I.Plus size={12}/> Añadir tarea
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "list" && (
        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 140px 120px 90px 120px 100px 40px", padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
            <span>ID</span><span>Tarea</span><span>Estado</span><span>Asignado</span><span>Prio.</span><span>Vence</span><span>Tiempo</span><span></span>
          </div>
          {TASKS.map((t, i) => {
            const u = INTERNS.find(x => x.id === t.assignee);
            return (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 140px 120px 90px 120px 100px 40px", padding: "9px 14px", borderBottom: i < TASKS.length-1 ? "1px solid var(--line-soft)" : "none", fontSize: 13, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.id}</span>
                <span style={{ fontWeight: 500, paddingRight: 8 }}>{t.t}</span>
                <span><StatusChip s={t.status}/></span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar u={u} size={20}/> <span style={{ fontSize: 12 }}>{u.name.split(" ")[0]}</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-2)" }}><Prio p={t.prio}/>{t.prio === "high" ? "Alta" : t.prio === "med" ? "Media" : "Baja"}</span>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{t.due}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.spent}/{t.est}h</span>
                <I.More size={14} style={{ color: "var(--ink-3)", cursor: "pointer" }}/>
              </div>
            );
          })}
        </div>
      )}

      {view === "timeline" && <TimelineView/>}
      {view === "cal" && <CalendarView/>}
    </div>
  );
};

// ---- Timeline view --------------------------------------------------------
const TimelineView = () => {
  const { TASKS, INTERNS } = window.mentorlyData;
  const days = ["Lun 21","Mar 22","Mié 23","Jue 24","Vie 25","Sáb 26","Dom 27","Lun 28","Mar 29","Mié 30"];
  const bars = TASKS.slice(0, 8).map((t, i) => ({ t, start: (i % 4), span: 2 + (i % 4) }));
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px repeat(10, 1fr)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ padding: "10px 14px", fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", borderRight: "1px solid var(--line-soft)" }}>Tarea</div>
        {days.map((d, i) => <div key={i} style={{ padding: "10px 6px", fontSize: 11, color: "var(--ink-3)", textAlign: "center", borderRight: i < 9 ? "1px solid var(--line-soft)" : "none" }}>{d}</div>)}
      </div>
      {bars.map(({ t, start, span }, i) => {
        const u = INTERNS.find(x => x.id === t.assignee);
        return (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "220px repeat(10, 1fr)", borderBottom: i < bars.length-1 ? "1px solid var(--line-soft)" : "none", minHeight: 44, alignItems: "center", position: "relative" }}>
            <div style={{ padding: "8px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8, borderRight: "1px solid var(--line-soft)" }}>
              <Avatar u={u} size={20}/>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.t}</span>
            </div>
            <div style={{ gridColumn: `${start + 2} / span ${span}`, background: u.tone + "28", border: `1px solid ${u.tone}77`, borderRadius: 6, margin: "8px 4px", padding: "4px 10px", fontSize: 11, color: u.tone, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 600 }} className="mono">{t.id}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {t.spent}/{t.est}h</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CalendarView = () => {
  const days = Array.from({length: 35}, (_, i) => i - 2);
  const events = { 5: [{t:"T-104",c:"#c8532b"}], 7: [{t:"T-112",c:"#8a6b9e"}], 10: [{t:"1:1 Sofía",c:"#3e7a6b"}], 14: [{t:"T-118",c:"#c8532b"},{t:"T-128",c:"#a8432e"}], 21: [{t:"Eval.",c:"#b8892a"}], 23: [{t:"T-121",c:"#456b7a"}], 27: [{t:"Sprint",c:"#5a7a3f"}] };
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)" }}>
        {["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map(d => <div key={d} style={{ padding: "10px", fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "96px" }}>
        {days.map((d, i) => {
          const isMonth = d > 0 && d <= 30;
          const evts = events[d] || [];
          return (
            <div key={i} style={{ padding: 8, borderRight: (i % 7 !== 6) ? "1px solid var(--line-soft)" : "none", borderBottom: "1px solid var(--line-soft)", background: d === 22 ? "var(--bg-2)" : "transparent" }}>
              <div style={{ fontSize: 12, fontWeight: d === 22 ? 700 : 500, color: isMonth ? (d === 22 ? "var(--accent)" : "var(--ink)") : "var(--ink-muted)" }}>{isMonth ? d : (d < 1 ? 30 + d : d - 30)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                {evts.map((e, j) => (
                  <div key={j} style={{ fontSize: 10, padding: "2px 5px", background: e.c + "22", color: e.c, borderRadius: 3, borderLeft: `2px solid ${e.c}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.t}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { HomeScreen, TasksScreen });
