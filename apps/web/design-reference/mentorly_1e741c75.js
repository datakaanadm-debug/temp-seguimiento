// Screens — part 2: Bitácora, Mentoría, Onboarding, Evaluaciones, Analítica, Automatizaciones
const { useState: useStateB } = React;

// ============ BITÁCORA =====================================================
const LogScreen = ({ role }) => {
  const { BITACORA, INTERNS } = window.mentorlyData;
  const me = INTERNS[2];
  const [draft, setDraft] = useStateB("");

  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 980, margin: "0 auto" }}>
      <SectionTitle
        kicker="Bitácora · Valentina Cruz"
        title="Reporte diario"
        sub="Documenta avances, próximos pasos y bloqueos. RH y tu mentora pueden verlo."
        right={<>
          <Btn kind="outline" size="sm" icon={<I.Cal size={13}/>}>Historial</Btn>
          <Btn kind="accent" size="sm" icon={<I.Plus size={13}/>}>Nueva entrada</Btn>
        </>}
      />

      {/* Composer */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Avatar u={me} size={32}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Miércoles 22 de abril 2026</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Aún no guardado · se enviará a Sofía B. y RH</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {["😕","😐","🙂","😊","🤩"].map((m, i) => (
              <button key={i} style={{ width: 30, height: 30, border: "1px solid " + (i === 3 ? "var(--accent)" : "var(--line)"), borderRadius: "50%", background: i === 3 ? "var(--accent-soft)" : "var(--surface-raised)", cursor: "pointer", fontSize: 15 }}>{m}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }} className="mono">Horas trabajadas</span>
            <input defaultValue="7.5h" style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: "var(--r-2)", fontFamily: "inherit", fontSize: 13, background: "var(--surface)" }}/>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }} className="mono">Tareas relacionadas</span>
            <div style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: "var(--r-2)", background: "var(--surface)", display: "flex", gap: 4, flexWrap: "wrap", minHeight: 30, alignItems: "center" }}>
              <Badge tone="accent" style={{ fontSize: 10 }}>T-112 ×</Badge>
              <Badge tone="accent" style={{ fontSize: 10 }}>T-118 ×</Badge>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>+ añadir</span>
            </div>
          </label>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>¿Qué avanzaste hoy?</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 4 }}><I.Sparkles size={10}/> IA puede autocompletar desde tus tareas</span>
          </div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="• Terminé el primer prototipo del dashboard ejecutivo&#10;• Sincronicé con Lucía para alinear copy…" style={{ width: "100%", minHeight: 100, padding: 12, border: "1px solid var(--line)", borderRadius: "var(--r-2)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.55, background: "var(--surface)", resize: "vertical" }}/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Próximos pasos</div>
            <textarea placeholder="• …" style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid var(--line)", borderRadius: "var(--r-2)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, background: "var(--surface)", resize: "vertical" }}/>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>Bloqueos <Badge tone="neutral" style={{ fontSize: 9 }}>opcional</Badge></div>
            <textarea placeholder="• …" style={{ width: "100%", minHeight: 70, padding: 10, border: "1px solid var(--line)", borderRadius: "var(--r-2)", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, background: "var(--surface)", resize: "vertical" }}/>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <Btn kind="ghost" size="sm" icon={<I.Attach size={12}/>}>Adjuntar</Btn>
          <Btn kind="ghost" size="sm" icon={<I.Sparkles size={12}/>}>Resumir con IA</Btn>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>Guardado automático · hace 12s</span>
          <Btn kind="outline" size="sm">Guardar borrador</Btn>
          <Btn kind="accent" size="sm">Publicar entrada</Btn>
        </div>
      </Card>

      {/* History */}
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase" }}>Entradas anteriores · 14 días</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[3,4,3,5,4,5,4,5,3,4,5,4,5,4].map((v,i) => (
            <span key={i} title="bitácora" style={{ width: 12, height: 18, background: `var(--accent)`, opacity: 0.2 + (v/5)*0.8, borderRadius: 2 }}/>
          ))}
        </div>
      </div>
      {BITACORA.map((b, i) => (
        <div key={i} style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: "16px 18px", marginBottom: 12, display: "grid", gridTemplateColumns: "90px 1fr", gap: 20 }}>
          <div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>{b.day.split(" ")[1]}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }} className="mono">{b.day.split(" ")[0]} {b.day.split(" ")[2]}</div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-2)" }}>
              <div>⏱ {b.hours}h</div>
              <div>😊 {["—","Bajo","Ok","Bien","Muy bien","Excelente"][b.mood]}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Avances</div>
            <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 10, fontSize: 13, lineHeight: 1.6 }}>{b.done.map((d,j) => <li key={j}>{d}</li>)}</ul>
            {b.next.length > 0 && <>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Próximos pasos</div>
              <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 10, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)" }}>{b.next.map((d,j) => <li key={j}>{d}</li>)}</ul>
            </>}
            {b.blockers.length > 0 && (
              <div style={{ padding: "8px 10px", background: "var(--danger-soft)", borderRadius: "var(--r-2)", fontSize: 12.5, color: "var(--danger)", display: "flex", gap: 6 }}>
                <I.Flag size={13}/> <span>{b.blockers.join(" ")}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============ MENTORÍA =====================================================
const MentorScreen = () => {
  const { INTERNS } = window.mentorlyData;
  const me = INTERNS[2];
  const mentor = { name: "Sofía Beltrán", initials: "SB", tone: "#8a6b9e", role: "Sr. Designer · Mentora" };
  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <SectionTitle kicker="Mentoría" title="Sesiones 1:1 con Sofía" sub="Quincenal · próxima sesión mañana 10:00 — 30 min"
        right={<><Btn kind="outline" icon={<I.Cal size={13}/>}>Reprogramar</Btn><Btn kind="accent" icon={<I.Plus size={13}/>}>Nueva nota</Btn></>}/>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Next session card */}
          <div style={{ background: "linear-gradient(180deg, #fbf8f1, #f3efe7)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 20, display: "flex", gap: 18 }}>
            <div style={{ flex: "none", textAlign: "center", paddingRight: 18, borderRight: "1px solid var(--line)" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6 }}>JUE</div>
              <div className="serif" style={{ fontSize: 38, lineHeight: 1, margin: "2px 0" }}>23</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>10:00 – 10:30</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }} className="mono">PRÓXIMA SESIÓN</div>
              <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>Revisión de sprint 12 + plan de crecimiento Q2</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Avatar u={mentor} size={24}/>
                <span style={{ fontSize: 13 }}>Sofía Beltrán</span>
                <span style={{ color: "var(--ink-3)", fontSize: 12 }}>· Google Meet</span>
              </div>
              <div style={{ padding: "10px 12px", background: "var(--surface)", borderRadius: "var(--r-2)", border: "1px solid var(--line-soft)", fontSize: 12.5 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Agenda sugerida</div>
                <ol style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", lineHeight: 1.6 }}>
                  <li>Retro del sprint y aprendizajes</li>
                  <li>Feedback sobre T-112 (dashboard ejecutivo)</li>
                  <li>OKR Q2 — primera propuesta</li>
                  <li>Bloqueos / preguntas</li>
                </ol>
              </div>
            </div>
          </div>

          {/* History */}
          <Card title="Historial de sesiones" right={<Btn kind="ghost" size="sm">Ver todas</Btn>}>
            {[
              { d: "Jue 9 abr", t: "Feedback sobre research & primer bocetos", topics: ["research","feedback"], has: true },
              { d: "Mié 25 mar", t: "Definición de plan de aprendizaje", topics: ["plan","objetivos"], has: true },
              { d: "Mar 11 mar", t: "Kickoff + expectativas", topics: ["onboarding"], has: true },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--accent)", marginTop: 7, flex: "none" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.d}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.t}</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                    {s.topics.map(t => <Badge key={t} tone="tag1" style={{ fontSize: 10 }}>#{t}</Badge>)}
                  </div>
                </div>
                <Btn kind="ghost" size="sm">Ver notas →</Btn>
              </div>
            ))}
          </Card>

          {/* Private notes */}
          <Card title="Notas privadas (solo tú)" right={<I.Sparkles size={13} style={{ color: "var(--ink-3)" }}/>}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.65, color: "var(--ink)" }}>
              <p style={{ margin: "0 0 10px" }}>Sofía me recomendó enfocarme en <i>micro-interacciones</i> en lugar de grandes rediseños. Piensa pequeño, itera rápido.</p>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>Pendiente: revisar referencias de Linear sobre command palettes antes del lunes.</p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Crecimiento">
            {[
              { s: "Fundamentos UX", p: 90 },
              { s: "Systems thinking", p: 68 },
              { s: "Facilitación", p: 45 },
              { s: "Escritura clara", p: 78 },
            ].map((g, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{g.s}</span>
                  <span className="mono" style={{ color: "var(--ink-3)" }}>{g.p}%</span>
                </div>
                <div style={{ height: 5, background: "var(--line-soft)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: g.p + "%", height: "100%", background: "var(--accent)" }}/>
                </div>
              </div>
            ))}
          </Card>
          <Card title="Objetivos Q2">
            {["Liderar una mini-feature de inicio a fin","Presentar research a 2+ equipos","Mentorizar a practicante junior"].map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderTop: i ? "1px solid var(--line-soft)" : "none", fontSize: 12.5 }}>
                <input type="checkbox" readOnly style={{ marginTop: 3, accentColor: "var(--accent)" }}/>
                <span>{o}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============ ONBOARDING ==================================================
const OnboardScreen = () => {
  const { ONBOARDING } = window.mentorlyData;
  const total = ONBOARDING.reduce((a,g) => a + g.items.length, 0);
  const done = ONBOARDING.reduce((a,g) => a + g.items.filter(i => i.done).length, 0);
  const pct = Math.round((done / total) * 100);

  return (
    <div style={{ padding: "22px 28px 40px", maxWidth: 1060, margin: "0 auto" }}>
      <SectionTitle kicker="Onboarding · Cohorte abril 2026" title="Checklist de ingreso" sub={`${done} de ${total} pasos completados · asignada mentora Sofía B.`}
        right={<><Btn kind="outline" size="sm" icon={<I.Attach size={12}/>}>Exportar PDF</Btn><Btn kind="accent" size="sm">Completar siguiente</Btn></>}/>

      {/* Hero progress */}
      <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", padding: 22, marginBottom: 18, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line-soft)" strokeWidth="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray={`${(pct/100)*213.6} 213.6`} strokeLinecap="round" transform="rotate(-90 40 40)"/>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }} className="serif">{pct}%</div>
        </div>
        <div>
          <div className="serif" style={{ fontSize: 22, letterSpacing: -0.2, marginBottom: 4 }}>Ya casi terminas tu onboarding</div>
          <div style={{ color: "var(--ink-2)", fontSize: 13 }}>Faltan 2 pasos para desbloquear acceso completo: <b>Credenciales de VPN</b> y <b>Formulario bancario</b>.</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {Array.from({length: total}).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 5, borderRadius: 2, background: i < done ? "var(--accent)" : "var(--line-soft)" }}/>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>DÍA</div>
          <div className="serif" style={{ fontSize: 38, lineHeight: 1 }}>12</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>de 90</div>
        </div>
      </div>

      {ONBOARDING.map((g, gi) => (
        <div key={gi} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6 }}>{String(gi+1).padStart(2,"0")}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{g.group}</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }}/>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{g.items.filter(i=>i.done).length}/{g.items.length}</span>
          </div>
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: "var(--r-3)", overflow: "hidden" }}>
            {g.items.map((it, ii) => (
              <div key={ii} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto auto", padding: "11px 14px", gap: 12, alignItems: "center", borderBottom: ii < g.items.length - 1 ? "1px solid var(--line-soft)" : "none" }}>
                <input type="checkbox" checked={it.done} readOnly style={{ accentColor: "var(--accent)", width: 16, height: 16 }}/>
                <div>
                  <div style={{ fontSize: 13, textDecoration: it.done ? "line-through" : "none", color: it.done ? "var(--ink-3)" : "var(--ink)" }}>{it.t}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Responsable: <b style={{ color: "var(--ink-2)" }}>{it.who}</b>{it.due && <> · vence <b style={{ color: "var(--ink-2)" }}>{it.due}</b></>}</div>
                </div>
                {it.due && !it.done && <Badge tone="warn" style={{ fontSize: 10 }}>pendiente</Badge>}
                {it.done && <I.Check size={14} style={{ color: "#3d5428" }}/>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { LogScreen, MentorScreen, OnboardScreen });
