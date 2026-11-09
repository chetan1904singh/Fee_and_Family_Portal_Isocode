import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleAlert, ClipboardList, CreditCard,
  FileCheck2, FileSpreadsheet, GraduationCap, IndianRupee, LayoutDashboard, LogOut,
  Menu, MessageCircle, Search, ShieldCheck, Sparkles, Users, X,
} from 'lucide-react';
import './style.css';

const money = (value = 0) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);
const shortDate = (value, locale = 'en-IN') => value
  ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
  : '—';

async function request(path, { token, ...options } = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Something went wrong. Please try again.');
  }
  if (response.headers.get('content-type')?.includes('text/csv')) return response.blob();
  return response.json();
}

function Logo({ small = false }) {
  return (
    <div className={`brand ${small ? 'brand-small' : ''}`}>
      <div className="brand-mark"><GraduationCap size={19} strokeWidth={2.2} /></div>
      <span>saarthi<span className="brand-dot">.</span></span>
    </div>
  );
}

function Login({ onLogin }) {
  const [mode, setMode] = useState('accounts');
  const [email, setEmail] = useState('accounts@companya.demo');
  const [password, setPassword] = useState('Demo@123');
  const [phone, setPhone] = useState('9876500102');
  const [language, setLanguage] = useState('hi');
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'accounts') {
        const result = await request('/api/auth/accounts', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        onLogin(result);
      } else if (!otpSent) {
        const result = await request('/api/auth/parent/request-otp', {
          method: 'POST', body: JSON.stringify({ phone, language, consentConfirmed: consent }),
        });
        setOtpSent(true);
        setDemoCode(result.demoCode ?? '');
      } else {
        const result = await request('/api/auth/parent/verify', {
          method: 'POST', body: JSON.stringify({ phone, code: otp }),
        });
        onLogin(result);
      }
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next) => {
    setMode(next);
    setError('');
    setOtpSent(false);
    setOtp('');
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-story-inner">
          <Logo />
          <div className="story-copy">
            <div className="eyebrow-light"><span className="pulse-dot" /> ONE CLEAR VIEW. EVERY CENTRE.</div>
            <h1>Better learning<br />starts with <em>clarity.</em></h1>
            <p>Fees, progress, and the next step — together, in one place.</p>
            <div className="story-proof">
              <div><strong>4</strong><span>centres, one view</span></div>
              <i />
              <div><strong>₹0</strong><span>surprise balances</span></div>
            </div>
          </div>
          <div className="story-footer"><ShieldCheck size={15} /> Built for families. Designed for trust.</div>
        </div>
        <div className="story-orbit story-orbit-one" />
        <div className="story-orbit story-orbit-two" />
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="mobile-logo"><Logo /></div>
          <div className="login-welcome">
            <div className="eyebrow">WELCOME TO SAARTHI</div>
            <h2>Good to have you here.</h2>
            <p>Sign in to see what matters today.</p>
          </div>
          <div className="login-tabs" role="tablist" aria-label="Choose sign-in type">
            <button type="button" className={mode === 'accounts' ? 'active' : ''} onClick={() => changeMode('accounts')}>Centre team</button>
            <button type="button" className={mode === 'parent' ? 'active' : ''} onClick={() => changeMode('parent')}>Parent portal</button>
          </div>
          <form onSubmit={submit} className="login-form">
            {mode === 'accounts' ? (
              <>
                <label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
                <button className="button button-primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button>
                <div className="demo-hint"><span className="demo-dot" /> Demo account pre-filled for review</div>
              </>
            ) : (
              <>
                {!otpSent ? (
                  <>
                    <label>Parent's registered mobile number<div className="phone-input"><span>+91</span><input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" required /></div></label>
                    <label>Language preference<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en">English</option><option value="hi">हिन्दी</option></select></label>
                    <label className="consent-label"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required /><span>I am the parent / guardian and consent to access this student's information.</span></label>
                    <button className="button button-primary login-submit" disabled={busy || !consent}>{busy ? 'Sending code…' : 'Send one-time code'} <ArrowRight size={17} /></button>
                    <div className="demo-hint"><ShieldCheck size={14} /> Your phone is used only to verify your account.</div>
                  </>
                ) : (
                  <>
                    <div className="otp-sent"><CheckCircle2 size={17} /> Code sent to +91 {phone}</div>
                    <label>Six-digit one-time code<input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus required /></label>
                    {demoCode && <div className="demo-hint">Local demo code: <strong>{demoCode}</strong></div>}
                    <button className="button button-primary login-submit" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue'} <ArrowRight size={17} /></button>
                    <button type="button" className="text-button" onClick={() => setOtpSent(false)}>Use a different number</button>
                  </>
                )}
              </>
            )}
            {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
          </form>
          <div className="login-privacy"><ShieldCheck size={15} /> Secure access · Your data stays private</div>
        </div>
      </section>
    </main>
  );
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'ledger', label: 'Fee ledger', icon: FileSpreadsheet },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'refunds', label: 'Refunds', icon: FileCheck2 },
];

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('saarthi-session') ?? 'null'); } catch { return null; }
  });
  const [active, setActive] = useState('overview');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const isParent = session?.user?.role === 'parent';
  const loadData = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      if (isParent) {
        const me = await request('/api/me', { token: session.token });
        setData({ student: me.student });
        setSelected(me.student);
      } else {
        const [dashboard, students, reminders, refunds, risk] = await Promise.all([
          request('/api/dashboard', { token: session.token }),
          request('/api/students', { token: session.token }),
          request('/api/reminders', { token: session.token }),
          request('/api/refunds', { token: session.token }),
          request('/api/risks', { token: session.token }),
        ]);
        setData({ ...dashboard, students: students.students, reminders: reminders.reminders, refunds: refunds.refunds, risks: risk.risks });
        setSelected((current) => current
          ? students.students.find((student) => student.id === current.id) ?? null
          : null);
      }
    } catch (caught) {
      setError(caught.message);
      if (caught.message.toLowerCase().includes('session')) logout();
    } finally {
      setLoading(false);
    }
  }, [session?.token, isParent]);

  useEffect(() => {
    if (session?.token) loadData();
  }, [session?.token, loadData]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const login = (value) => {
    sessionStorage.setItem('saarthi-session', JSON.stringify(value));
    setSession(value);
    setActive('overview');
  };
  function logout() {
    sessionStorage.removeItem('saarthi-session');
    setSession(null);
    setData(null);
    setSelected(null);
  }
  const navigate = (page) => {
    setActive(page);
    setSelected(null);
    setMobileNav(false);
  };

  if (!session?.token) return <Login onLogin={login} />;

  const performPayment = async (studentId, installmentId) => {
    try {
      const result = await request('/api/payments/mock', {
        token: session.token,
        method: 'POST',
        body: JSON.stringify({ studentId, installmentId }),
      });
      setNotice(`Payment received · ${result.receipt.reference}`);
      await loadData();
    } catch (caught) { setError(caught.message); }
  };

  const mainContent = isParent ? (
    <ParentPortal student={data?.student} loading={loading} onPay={performPayment} />
  ) : (
    <>
      {active === 'overview' && <Overview data={data} loading={loading} onSelect={setSelected} onNavigate={navigate} token={session.token} onRefresh={loadData} onNotice={setNotice} />}
      {active === 'ledger' && <Ledger students={data?.students ?? []} loading={loading} onSelect={setSelected} onRefresh={loadData} token={session.token} onNotice={setNotice} />}
      {active === 'reminders' && <Reminders reminders={data?.reminders ?? []} loading={loading} token={session.token} onRefresh={loadData} onNotice={setNotice} />}
      {active === 'refunds' && <Refunds students={data?.students ?? []} refunds={data?.refunds ?? []} loading={loading} token={session.token} onRefresh={loadData} onNotice={setNotice} />}
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><Logo /></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${active === id ? 'selected' : ''}`} onClick={() => navigate(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'reminders' && data?.reminders?.length > 0 && <span className="nav-count">{data.reminders.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><MessageCircle size={16} /></div><strong>Need a hand?</strong><span>Your centre team is one message away.</span><button onClick={() => setNotice('Contact your centre administrator for support.')}>Get support <ArrowRight size={13} /></button></div>
          <button className="user-profile" onClick={logout}>
            <div className="avatar">{(session.user.displayName ?? 'A').split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div className="profile-copy"><strong>{session.user.displayName}</strong><span>{isParent ? 'Parent account' : 'Accounts executive'}</span></div>
            <LogOut size={16} className="logout-icon" />
          </button>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav((open) => !open)} aria-label="Toggle menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>{isParent ? 'Family portal' : 'Accounts'}</span><ChevronRight size={14} /><strong>{isParent ? 'Fee overview' : navItems.find((item) => item.id === active)?.label}</strong></div>
          <div className="topbar-right">
            {!isParent && <div className="centre-chip"><span className="green-dot" /> All centres <ChevronDown size={14} /></div>}
            <button className="topbar-avatar" title="Sign out" onClick={logout}>{(session.user.displayName ?? 'A').split(' ').map((part) => part[0]).slice(0, 2).join('')}</button>
          </div>
        </header>
        {error && <div className="page-error"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {mainContent}
        <footer className="workspace-footer"><span>© 2026 Saarthi · Company A</span><span><ShieldCheck size={13} /> Secure &amp; private</span></footer>
      </main>
      {selected && !isParent && <StudentDrawer student={selected} onClose={() => setSelected(null)} onPay={performPayment} />}
      {notice && <div className="toast"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon = ClipboardList, title, text }) {
  return <div className="empty-state"><div><Icon size={22} /></div><strong>{title}</strong><span>{text}</span></div>;
}

function Skeleton({ wide = false }) {
  return <div className={`skeleton ${wide ? 'skeleton-wide' : ''}`} />;
}

function MetricCard({ label, value, note, icon: Icon, tone = 'green' }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Overview({ data, loading, onSelect, onNavigate, token, onRefresh, onNotice }) {
  const stats = data?.stats;
  const runReminders = async () => {
    try {
      const result = await request('/api/reminders/run', { token, method: 'POST' });
      onNotice(result.message);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
  };
  const downloadExport = async () => {
    try {
      const blob = await request('/api/exports/tally.csv', { token });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'saarthi-tally-export.csv';
      link.click();
      URL.revokeObjectURL(url);
      onNotice('Tally-ready dues export downloaded.');
    } catch (error) { onNotice(error.message); }
  };
  const collectionMax = Math.max(1, ...(data?.centres ?? []).map((centre) => centre.billed));
  const ageingTotal = Object.values(data?.ageing ?? {}).reduce((sum, amount) => sum + amount, 0);

  return (
    <section className="page-content">
      <PageHeading eyebrow={new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()} title="Good morning, Ananya" description="Here’s how fees are looking across your centres." actions={
        <><button className="button button-secondary" onClick={downloadExport}><ArrowDownToLine size={16} /> Tally export</button><button className="button button-primary" onClick={runReminders}><Bell size={16} /> Run reminders</button></>
      } />
      <div className="metric-grid">
        {loading || !stats ? <><Skeleton /><Skeleton /><Skeleton /><Skeleton /></> : <>
          <MetricCard label="Total outstanding" value={money(stats.outstanding)} note={`${money(stats.dueSoon)} due in the next 30 days`} icon={IndianRupee} />
          <MetricCard label="Overdue fees" value={money(stats.overdue)} note={`${stats.students} active student accounts`} icon={CalendarDays} tone="amber" />
          <MetricCard label="Collected this year" value={`${stats.collectionRate}%`} note={`${money(stats.collected)} of ${money(stats.billed)} billed`} icon={Activity} tone="blue" />
          <MetricCard label="Students at risk" value={data?.risks?.filter((risk) => risk.taskStatus !== 'false_flag').length ?? 0} note="Counsellor follow-up only" icon={Sparkles} tone="purple" />
        </>}
      </div>
      <div className="dashboard-grid">
        <section className="panel collection-panel">
          <div className="panel-heading"><div><h2>Centre collection</h2><p>Collected vs. annual fee plan</p></div><button className="subtle-link" onClick={() => onNavigate('ledger')}>View ledger <ArrowRight size={14} /></button></div>
          {loading ? <div className="chart-skeleton"><Skeleton wide /><Skeleton wide /><Skeleton wide /></div> : !data?.centres?.length ? <EmptyState title="No centre data yet" text="Add student records to see collections here." /> : (
            <div className="centre-bars">
              {data.centres.map((centre) => <div className="centre-bar-row" key={centre.centre}>
                <div className="bar-label"><span>{centre.centre}</span><strong>{money(centre.collected)} <small>of {money(centre.billed)}</small></strong></div>
                <div className="bar-track"><div style={{ width: `${Math.min(100, (centre.collected / Math.max(centre.billed, 1)) * 100)}%` }} /></div>
                <div className="bar-subline"><span>{Math.round(centre.collected / Math.max(centre.billed, 1) * 100)}% collected</span><span>{money(centre.overdue)} overdue</span></div>
              </div>)}
            </div>
          )}
          <div className="chart-legend"><span><i className="legend-green" /> Collected</span><span><i className="legend-gray" /> Balance in plan</span></div>
        </section>
        <section className="panel ageing-panel">
          <div className="panel-heading"><div><h2>Ageing at a glance</h2><p>Outstanding by days past due</p></div><span className="mini-badge">{money(ageingTotal)}</span></div>
          {Object.entries(data?.ageing ?? {}).map(([label, amount], index) => (
            <div className="ageing-row" key={label}><div className="ageing-label"><span className={`age-dot age-${index}`} />{label}<strong>{money(amount)}</strong></div><div className="age-track"><span className={`age-fill age-fill-${index}`} style={{ width: `${ageingTotal ? Math.max(amount ? 4 : 0, (amount / ageingTotal) * 100) : 0}%` }} /></div></div>
          ))}
          <div className="ageing-note"><ShieldCheck size={14} /> Reminders stop automatically when a payment clears.</div>
        </section>
      </div>
      <section className="panel batch-panel">
        <div className="panel-heading"><div><h2>Batch dues</h2><p>Keep an eye on the next conversations</p></div><button className="subtle-link" onClick={() => onNavigate('ledger')}>All students <ArrowRight size={14} /></button></div>
        {!data?.batches?.length ? <EmptyState title="No batch dues yet" text="Batch summaries will appear once students are added." /> : (
          <div className="batch-table-wrap"><table className="data-table"><thead><tr><th>Batch</th><th>Students</th><th>Outstanding</th><th>Overdue</th><th /></tr></thead><tbody>
            {data.batches.map((batch) => <tr key={batch.batch}><td className="batch-name">{batch.batch}</td><td>{batch.students}</td><td>{money(batch.outstanding)}</td><td className={batch.overdue ? 'text-amber' : 'text-muted'}>{money(batch.overdue)}</td><td><button className="row-arrow" onClick={() => onNavigate('ledger')} aria-label={`View ${batch.batch}`}><ArrowRight size={16} /></button></td></tr>)}
          </tbody></table></div>
        )}
      </section>
      <RiskPanel risks={data?.risks ?? []} students={data?.students ?? []} token={token} onRefresh={onRefresh} onSelect={onSelect} onNotice={onNotice} />
    </section>
  );
}

function RiskPanel({ risks, students, token, onRefresh, onSelect, onNotice }) {
  const activeRisks = risks.filter((risk) => risk.taskStatus === 'open');
  const clearFlag = async (risk) => {
    try {
      const result = await request(`/api/risks/${risk.taskId}/false-flag`, { token, method: 'PATCH', body: '{}' });
      onNotice(result.message);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
  };
  const completeTask = async (risk) => {
    try {
      const result = await request(`/api/risks/${risk.taskId}/complete`, { token, method: 'PATCH', body: '{}' });
      onNotice(result.message);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
  };
  return (
    <section className="panel risk-panel">
      <div className="panel-heading"><div><h2><Sparkles size={17} /> A little extra care</h2><p>Signals for a counsellor to review — never an automatic fee action.</p></div><span className="ai-pill"><span /> SUPPORT SIGNAL</span></div>
      {!activeRisks.length ? <div className="risk-clear"><CheckCircle2 size={19} /><span>No open counsellor call tasks. Keep checking as attendance and tests are updated.</span></div> : (
        <div className="risk-list">{activeRisks.map((risk) => <article className="risk-row" key={risk.studentId}>
          <div className="risk-avatar">{risk.studentName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <div className="risk-student"><button onClick={() => {
            const student = students.find((item) => item.id === risk.studentId);
            if (student) onSelect(student);
          }}>{risk.studentName}</button><span>{risk.batch} · {risk.level} support signal</span><small>{risk.reasons.join(' · ')}</small></div>
          <button className="button button-quiet" onClick={() => clearFlag(risk)}>Mark as incorrect</button>
          <button className="button button-secondary small-action" onClick={() => completeTask(risk)}>Mark called</button>
        </article>)}</div>
      )}
      <div className="risk-disclaimer"><ShieldCheck size={14} /> An incorrect flag only closes the counsellor task. It never contacts a family or changes a fee.</div>
    </section>
  );
}

function Ledger({ students, loading, onSelect, onRefresh, token, onNotice }) {
  const [search, setSearch] = useState('');
  const [centre, setCentre] = useState('All centres');
  const [batch, setBatch] = useState('All batches');
  const uploadRef = useRef(null);
  const centres = useMemo(() => ['All centres', ...new Set(students.map((student) => student.centre))], [students]);
  const batches = useMemo(() => ['All batches', ...new Set(students.map((student) => student.batch))], [students]);
  const filtered = students.filter((student) => (
    (centre === 'All centres' || student.centre === centre)
    && (batch === 'All batches' || student.batch === batch)
    && `${student.name} ${student.id} ${student.batch}`.toLowerCase().includes(search.toLowerCase())
  ));
  const uploadAcademic = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter((line) => line.trim()).slice(1);
      const attendance = [];
      const scores = [];
      for (const row of rows) {
        const [type, studentId, batchName, date, value, test] = row.split(',').map((field) => field.trim());
        if (type?.toLowerCase() === 'attendance') {
          if (!['present', 'absent'].includes(value?.toLowerCase())) throw new Error('Attendance value must be present or absent.');
          attendance.push({ studentId, batch: batchName, date, present: value.toLowerCase() === 'present' });
        } else if (type?.toLowerCase() === 'score') {
          scores.push({ studentId, batch: batchName, date, score: Number(value), test });
        } else throw new Error(`Unknown row type "${type}". Use attendance or score.`);
      }
      const result = await request('/api/bulk/academic', {
        token, method: 'POST', body: JSON.stringify({ attendance, scores }),
      });
      onNotice(`${result.attendanceAdded} attendance and ${result.scoresAdded} score records imported.`);
      await onRefresh();
    } catch (error) { onNotice(error.message || 'Could not read the file. Check its CSV format.'); }
    finally { uploadRef.current.value = ''; }
  };
  const downloadTemplate = () => {
    const content = 'type,studentId,batch,date,value,test\nattendance,STU-0412,JEE 2027 Morning,2026-11-01,present,\nscore,STU-0412,JEE 2027 Morning,2026-11-02,82,Mock 07\n';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    link.download = 'saarthi-academic-upload-template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="page-content">
      <PageHeading eyebrow="STUDENT ACCOUNTS" title="Fee ledger" description="Every instalment, payment, and balance — all in one place." actions={
        <>
          <button className="button button-secondary" onClick={downloadTemplate}><ArrowDownToLine size={16} /> CSV template</button>
          <input ref={uploadRef} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={(event) => uploadAcademic(event.target.files?.[0])} />
          <button className="button button-primary" onClick={() => uploadRef.current?.click()}><ArrowDownToLine size={16} /> Upload attendance &amp; tests</button>
        </>
      } />
      <div className="ledger-toolbar">
        <div className="search-field"><Search size={16} /><input placeholder="Search name, ID, or batch…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select value={centre} onChange={(e) => setCentre(e.target.value)} aria-label="Filter by centre">{centres.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter by batch">{batches.map((value) => <option key={value}>{value}</option>)}</select>
      </div>
      <section className="panel ledger-panel">
        <div className="panel-heading"><div><h2>Student fee plans</h2><p>{loading ? 'Loading records…' : `${filtered.length} student${filtered.length === 1 ? '' : 's'}`}</p></div><span className="ledger-private"><ShieldCheck size={14} /> Secure ledger</span></div>
        {loading ? <div className="loading-table"><Skeleton wide /><Skeleton wide /><Skeleton wide /></div> : !filtered.length ? <EmptyState icon={Search} title="No students found" text={students.length ? 'Try another name or remove a filter.' : 'Student records will appear here after setup.'} /> : (
          <div className="table-scroll"><table className="data-table student-table"><thead><tr><th>Student</th><th>Batch / centre</th><th>Fee plan</th><th>Paid</th><th>Balance</th><th>Next due</th><th>Status</th><th /></tr></thead><tbody>
            {filtered.map((student) => <tr key={student.id} onClick={() => onSelect(student)} className="clickable-row">
              <td><div className="student-cell"><div className="avatar avatar-soft">{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{student.name}</strong><small>{student.id}</small></div></div></td>
              <td><div className="table-stack">{student.batch}<small>{student.centre}</small></div></td>
              <td><div className="table-stack">{money(student.annualFee)}<small>{student.discount ? `${money(student.discount)} discount · ${money(student.feeTotal)} net` : `${money(student.feeTotal)} after discount`}</small></div></td><td>{money(student.paidTotal)}</td>
              <td className={student.balance ? 'balance-cell' : ''}>{money(student.balance)}</td>
              <td>{shortDate(student.nextDue)}</td><td><StatusBadge student={student} /></td>
              <td><button className="row-arrow" aria-label={`Open ${student.name}`}><ChevronRight size={17} /></button></td>
            </tr>)}
          </tbody></table></div>
        )}
        <div className="table-footer"><span>Discounts are reflected in the fee plan. Select a student for instalment detail.</span><span><ShieldCheck size={13} /> GST shown on receipts</span></div>
      </section>
    </section>
  );
}

function StatusBadge({ student, instalment }) {
  const row = instalment ?? student.installments.find((item) => item.balance > 0);
  const status = !student.balance ? 'Paid' : row?.daysOverdue > 0 ? 'Overdue' : row?.paid > 0 ? 'Part paid' : 'Upcoming';
  const classes = { Paid: 'status-paid', Overdue: 'status-overdue', 'Part paid': 'status-partial', Upcoming: 'status-upcoming' };
  return <span className={`status-badge ${classes[status]}`}><i />{status}</span>;
}

function StudentDrawer({ student, onClose, onPay }) {
  const [tab, setTab] = useState('instalments');
  const [busyId, setBusyId] = useState('');
  const pay = async (installment) => {
    setBusyId(installment.id);
    await onPay(student.id, installment.id);
    setBusyId('');
  };
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="student-drawer">
        <header className="drawer-header"><div><span className="eyebrow">FEE LEDGER</span><button className="icon-button drawer-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="drawer-student-heading"><div className="avatar avatar-large">{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><h2>{student.name}</h2><p>{student.id} · {student.batch}</p></div></div></header>
        <div className="drawer-summary"><div><span>Annual fee</span><strong>{money(student.annualFee)}</strong><small>{money(student.discount)} discount</small></div><div><span>Fee after discount</span><strong>{money(student.feeTotal)}</strong></div><div><span>Paid so far</span><strong>{money(student.paidTotal)}</strong></div><div className="drawer-balance"><span>Remaining balance</span><strong>{money(student.balance)}</strong></div></div>
        <div className="drawer-contact"><div className="contact-avatar">{student.parent?.name?.slice(0, 1)}</div><div><span>Parent / guardian</span><strong>{student.parent?.name}</strong></div><span className="lang-tag">{student.parent?.language === 'hi' ? 'हिन्दी' : 'English'}</span></div>
        <div className="drawer-tabs"><button className={tab === 'instalments' ? 'selected' : ''} onClick={() => setTab('instalments')}>Instalments</button><button className={tab === 'receipts' ? 'selected' : ''} onClick={() => setTab('receipts')}>Receipts</button><button className={tab === 'progress' ? 'selected' : ''} onClick={() => setTab('progress')}>Progress</button></div>
        <div className="drawer-body">
          {tab === 'instalments' && student.installments.map((installment, index) => <div className="installment-row" key={installment.id}>
            <div className={`installment-number ${installment.balance === 0 ? 'done' : ''}`}>{installment.balance === 0 ? <Check size={14} /> : `0${index + 1}`}</div>
            <div className="installment-copy"><strong>{installment.label}</strong><span>Due {shortDate(installment.dueDate)}{installment.daysOverdue > 0 ? ` · ${installment.daysOverdue} days overdue` : ''}</span><small>{installment.paid > 0 && installment.balance > 0 ? `${money(installment.paid)} paid · ` : ''}{installment.balance > 0 ? `${money(installment.balance)} remaining` : 'Paid in full'}</small></div>
            {installment.balance > 0 && <button className="pay-small" disabled={busyId === installment.id} onClick={() => pay(installment)}>{busyId === installment.id ? '…' : 'Pay'}</button>}
          </div>)}
          {tab === 'receipts' && (student.receipts?.length ? student.receipts.map((receipt) => <div className="receipt-row" key={receipt.reference}><div className="receipt-icon"><FileCheck2 size={17} /></div><div><strong>{money(receipt.amount)} received</strong><span>{shortDate(receipt.paidAt)} · GST 18% {money(receipt.gstAmount ?? receipt.amount * 0.18)}</span><small>Ref. {receipt.reference}</small></div><CheckCircle2 size={17} className="receipt-check" /></div>) : <EmptyState icon={FileCheck2} title="No receipts yet" text="Receipts appear when a payment is recorded." />)}
          {tab === 'progress' && <ProgressSummary student={student} />}
        </div>
        <div className="drawer-footer"><ShieldCheck size={14} /> A mock payment updates this ledger immediately.</div>
      </aside>
    </div>
  );
}

function ProgressSummary({ student }) {
  return <div className="progress-summary"><div className="progress-section"><h3>Attendance</h3><div className="progress-percent">{student.attendance?.length ? `${Math.round(student.attendance.filter((day) => day.present).length / student.attendance.length * 100)}%` : '—'}</div><p>Across {student.attendance?.length ?? 0} recent classes</p></div><div className="progress-section"><h3>Test scores</h3>{student.scores?.length ? [...student.scores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map((score) => <div className="score-row" key={score.test}><span>{score.test}</span><strong>{score.score}%</strong></div>) : <span className="text-muted">No tests recorded.</span>}</div></div>;
}

function Reminders({ reminders, loading, token, onRefresh, onNotice }) {
  const run = async () => {
    try {
      const result = await request('/api/reminders/run', { token, method: 'POST' });
      onNotice(result.message);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
  };
  return (
    <section className="page-content">
      <PageHeading eyebrow="AUTOMATIC FOLLOW-UP" title="Reminders" description="The right nudge, in the right language, at the right time." actions={<button className="button button-primary" onClick={run}><Bell size={16} /> Run today's reminders</button>} />
      <div className="reminder-rules">
        <article><span className="rule-icon rule-blue"><CalendarDays size={18} /></span><div><strong>3 days before</strong><p>A friendly heads-up about the upcoming instalment.</p></div><span className="rule-step">01</span></article>
        <article><span className="rule-icon rule-green"><CheckCircle2 size={18} /></span><div><strong>On the due date</strong><p>A clear reminder with the amount and due date.</p></div><span className="rule-step">02</span></article>
        <article><span className="rule-icon rule-amber"><MessageCircle size={18} /></span><div><strong>After the due date</strong><p>Follow-ups weekly in the family's chosen language.</p></div><span className="rule-step">03</span></article>
      </div>
      <section className="panel messages-panel">
        <div className="panel-heading"><div><h2>Message history</h2><p>Mock message queue · paid instalments are skipped</p></div><span className="history-count">{reminders.length} messages</span></div>
        {loading ? <div className="loading-table"><Skeleton wide /><Skeleton wide /></div> : !reminders.length ? <EmptyState icon={MessageCircle} title="All caught up" text="No reminders have been queued yet. Reminders are generated for open instalments on their scheduled dates." /> : <div className="message-list">{reminders.map((item) => <article className="message-row" key={item._id}><div className="message-avatar">{item.studentName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="message-main"><div><strong>{item.studentName}</strong><span className={`message-language ${item.language}`}>{item.language === 'hi' ? 'हिन्दी' : 'EN'}</span><span className="message-stage">{item.stage.replaceAll('-', ' ')}</span></div><p>{item.message}</p><small>{item.installmentLabel} · {shortDate(item.sentAt)}</small></div><span className="message-sent"><CheckCircle2 size={14} /> Queued</span></article>)}</div>}
        <div className="automation-note"><ShieldCheck size={15} /><span>Payments are rechecked before every send. Once an instalment is paid, no further reminder is created for it.</span></div>
      </section>
    </section>
  );
}

function Refunds({ students, refunds, loading, token, onRefresh, onNotice }) {
  const [studentId, setStudentId] = useState('');
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const selected = students.find((student) => student.id === studentId);
  const requestRefund = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request('/api/refunds', {
        token, method: 'POST', body: JSON.stringify({ studentId, cancellationDate }),
      });
      onNotice(`Estimated refund ${money(result.refund.amount)} saved for accounts review.`);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
    finally { setBusy(false); }
  };
  const decide = async (refund, status) => {
    try {
      await request(`/api/refunds/${refund._id}`, { token, method: 'PATCH', body: JSON.stringify({ status }) });
      onNotice(`Refund request ${status}. This does not initiate a payment.`);
      await onRefresh();
    } catch (error) { onNotice(error.message); }
  };
  return (
    <section className="page-content">
      <PageHeading eyebrow="PUBLISHED REFUND POLICY" title="Refunds, made fair." description="A transparent pro-rata estimate — reviewed by accounts before any action." />
      <div className="refund-layout">
        <section className="panel refund-calculator">
          <div className="panel-heading"><div><h2><CalculatorIcon /> Pro-rata calculator</h2><p>Estimate only · every request stays in review</p></div><span className="policy-badge"><ShieldCheck size={13} /> POLICY</span></div>
          <form onSubmit={requestRefund}>
            <label>Student<select required value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Choose a student…</option>{students.map((student) => <option value={student.id} key={student.id}>{student.name} · {student.id}</option>)}</select></label>
            <label>Last day of classes<input type="date" value={cancellationDate} onChange={(e) => setCancellationDate(e.target.value)} required /></label>
            <div className="refund-input-summary">{selected ? <><div><span>Fee after discount</span><strong>{money(selected.feeTotal)}</strong></div><div><span>Payments received</span><strong>{money(selected.paidTotal)}</strong></div></> : <span>Select a student to see the fee and paid total.</span>}</div>
            {selected && <div className="refund-estimate"><span>Estimated pro-rata refund</span><strong>{money(previewRefund(selected, cancellationDate))}</strong><small>Unused course days ÷ total course days, capped at amount paid.</small></div>}
            <button className="button button-primary refund-submit" disabled={busy || !selected}>{busy ? 'Calculating…' : 'Calculate & send for review'} <ArrowRight size={16} /></button>
          </form>
        </section>
        <aside className="policy-card">
          <div className="policy-icon"><FileCheck2 size={19} /></div><div className="eyebrow">OUR COMMITMENT</div><h3>A clear policy.<br />No guesswork.</h3>
          <p>Refunds are calculated pro-rata using the course days left, then routed to accounts for review.</p>
          <div className="policy-points"><div><CheckCircle2 size={16} /><span>Refund due within 10 calendar days of leaving</span></div><div><CheckCircle2 size={16} /><span>Unused days ÷ total course days</span></div><div><CheckCircle2 size={16} /><span>Capped at fees already paid</span></div></div>
          <div className="policy-footnote">Late entries stay visible as overdue. No processing deduction is applied; approval never triggers a payment.</div>
        </aside>
      </div>
      <section className="panel refunds-list">
        <div className="panel-heading"><div><h2>Refund requests</h2><p>Centre and batch review queue</p></div><span className="history-count">{refunds.length} requests</span></div>
        {loading ? <Skeleton wide /> : !refunds.length ? <EmptyState icon={FileCheck2} title="No refund requests" text="New calculations will appear here for accounts review." /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Student</th><th>Centre / batch</th><th>Leaving date</th><th>Refund due by</th><th>Estimate</th><th>Status</th><th>Review</th></tr></thead><tbody>{refunds.map((refund) => <tr key={refund._id}><td><strong>{refund.studentName}</strong><small className="table-id">{refund.studentId}</small></td><td><div className="table-stack">{refund.centre}<small>{refund.batch}</small></div></td><td>{shortDate(refund.cancellationDate)}</td><td><div className={`table-stack ${refund.isOverdue ? 'text-amber' : ''}`}>{shortDate(refund.dueBy)}{refund.isOverdue && <small className="text-amber">Past 10-day deadline</small>}</div></td><td className="balance-cell">{money(refund.amount)}</td><td><span className={`status-badge ${refund.status === 'review' ? 'status-upcoming' : refund.status === 'approved' ? 'status-paid' : 'status-overdue'}`}><i />{refund.status === 'review' ? 'Review' : refund.status}</span></td><td>{refund.status === 'review' ? <div className="decision-actions"><button onClick={() => decide(refund, 'approved')}>Approve</button><button onClick={() => decide(refund, 'rejected')}>Decline</button></div> : <span className="text-muted">No payment sent</span>}</td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}

function CalculatorIcon() {
  return <IndianRupee size={17} />;
}

function previewRefund(student, cancellationDate) {
  const start = Date.parse(`${new Date(student.courseStart).toISOString().slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${new Date(student.courseEnd).toISOString().slice(0, 10)}T00:00:00Z`);
  const leaving = Date.parse(`${cancellationDate}T00:00:00Z`);
  const duration = (end - start) / 86_400_000;
  if (!duration || leaving < start || leaving > end) return 0;
  return Math.round(Math.min(student.paidTotal, student.feeTotal) * (end - leaving) / (end - start));
}

function ParentPortal({ student, loading, onPay }) {
  const [busyId, setBusyId] = useState('');
  const [showReceipts, setShowReceipts] = useState(false);
  const next = student?.installments?.find((item) => item.balance > 0);
  const hindi = student?.parent?.language === 'hi';
  const pay = async (installment) => {
    setBusyId(installment.id);
    await onPay(student.id, installment.id);
    setBusyId('');
  };
  if (loading || !student) return <section className="page-content parent-loading"><Skeleton wide /><Skeleton wide /></section>;
  return (
    <section className="page-content parent-content">
      <PageHeading eyebrow={`${hindi ? 'स्वागत है' : 'WELCOME'}, ${student.parent?.name?.split(' ')[0]?.toUpperCase() ?? 'PARENT'}`} title={hindi ? `${student.name.split(' ')[0]} के लिए हर जानकारी साफ़।` : `A clear picture for ${student.name.split(' ')[0]}.`} description={`${student.batch} · ${student.course}`} actions={<span className="parent-consent"><ShieldCheck size={14} /> {hindi ? 'सत्यापित अभिभावक' : 'Verified parent access'}</span>} />
      <div className="parent-pay-card">
        <div className="parent-pay-copy"><span className="eyebrow">{hindi ? 'अगली किश्त' : 'NEXT INSTALMENT'}</span>{next ? <><h2>{money(next.balance)}</h2><p>{next.daysOverdue > 0 ? (hindi ? `${shortDate(next.dueDate, 'hi-IN')} से ${next.daysOverdue} दिन की देरी` : `Was due ${shortDate(next.dueDate)} · ${next.daysOverdue} days ago`) : (hindi ? `देय तिथि ${shortDate(next.dueDate, 'hi-IN')}` : `Due ${shortDate(next.dueDate)}`)}</p></> : <><h2>{hindi ? 'सब जमा है।' : 'All caught up.'}</h2><p>{hindi ? 'अभी कोई किश्त बाकी नहीं है।' : 'There are no unpaid instalments right now.'}</p></>}</div>
        {next && <button className="button button-primary parent-pay-button" disabled={busyId === next.id} onClick={() => pay(next)}><CreditCard size={17} />{busyId === next.id ? (hindi ? 'भुगतान हो रहा है…' : 'Processing…') : (hindi ? 'अभी भुगतान करें' : 'Pay now')}</button>}
        <div className="parent-pay-stamp"><span><ShieldCheck size={14} /> {hindi ? 'डेमो सुरक्षित भुगतान' : 'Secure mock checkout'}</span></div>
      </div>
      <div className="parent-secondary-grid">
        <section className="panel parent-ledger-panel"><div className="panel-heading"><div><h2>{hindi ? 'फ़ीस योजना' : 'Fee plan'}</h2><p>{hindi ? `एक वर्ष · छूट के बाद ${money(student.feeTotal)}` : `One year · ${money(student.feeTotal)} after discount`}</p><p className="plan-detail">{hindi ? `फ़ीस ${money(student.annualFee)} − छूट ${money(student.discount)}` : `Fee ${money(student.annualFee)} − discount ${money(student.discount)}`}</p></div><span className="plan-tag">{hindi ? '4 किश्तें' : '4 instalments'}</span></div>
          {student.installments.map((item, index) => <div className="parent-installment" key={item.id}><span className={`parent-step ${item.balance === 0 ? 'paid' : ''}`}>{item.balance === 0 ? <Check size={13} /> : index + 1}</span><div><strong>{hindi ? `किश्त ${index + 1}` : item.label}</strong><small>{shortDate(item.dueDate, hindi ? 'hi-IN' : 'en-IN')}{item.daysOverdue > 0 && item.balance > 0 ? ` · ${hindi ? `${item.daysOverdue} दिन की देरी` : `${item.daysOverdue} days overdue`}` : ''}</small></div><div className="parent-amount"><strong>{money(item.amount)}</strong><span className={item.balance ? 'amount-balance' : 'amount-paid'}>{item.balance ? `${money(item.balance)} ${hindi ? 'बाकी' : 'due'}` : (hindi ? 'जमा' : 'Paid')}</span></div></div>)}
          <div className="parent-total"><span>{hindi ? 'कुल बाकी' : 'Total remaining'}</span><strong>{money(student.balance)}</strong></div>
        </section>
        <div className="parent-side-column">
          <section className="panel parent-progress-panel"><div className="panel-heading"><div><h2>{hindi ? 'पढ़ाई की झलक' : 'Learning snapshot'}</h2><p>{hindi ? 'हर दिन थोड़ी प्रगति' : 'A little progress at a time'}</p></div><Activity size={17} className="muted-icon" /></div>
            <div className="attendance-snapshot"><div className="attendance-ring"><span>{student.attendance?.length ? `${Math.round(student.attendance.filter((day) => day.present).length / student.attendance.length * 100)}%` : '—'}</span></div><div><strong>{hindi ? 'उपस्थिति' : 'Attendance'}</strong><span>{hindi ? 'हाल की कक्षाओं में' : 'Recent classes attended'}</span></div></div>
            <div className="test-list">{student.scores?.length ? [...student.scores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2).map((score) => <div className="test-row" key={score.test}><span>{score.test}<small>{shortDate(score.date, hindi ? 'hi-IN' : 'en-IN')}</small></span><strong>{score.score}%</strong></div>) : <span className="text-muted">{hindi ? 'अभी कोई टेस्ट अंक उपलब्ध नहीं हैं।' : 'No test scores available yet.'}</span>}</div>
          </section>
          <section className="panel receipt-summary"><div className="receipt-summary-icon"><FileCheck2 size={17} /></div><div><strong>{hindi ? 'आपकी रसीदें' : 'Your receipts'}</strong><span>{student.receipts?.length ?? 0} {hindi ? 'रिकॉर्ड · GST 18%' : 'records · GST shown at 18%'}</span></div><button className="row-arrow" onClick={() => setShowReceipts((show) => !show)} aria-label={hindi ? 'रसीदें दिखाएँ' : 'Show receipts'}>{showReceipts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button></section>
          {showReceipts && <section className="panel parent-receipts">{student.receipts?.length ? student.receipts.map((receipt) => <div className="parent-receipt" key={receipt.reference}><span>{shortDate(receipt.paidAt, hindi ? 'hi-IN' : 'en-IN')}<small>{receipt.reference}</small></span><strong>{money(receipt.amount)}<small>+ GST 18% {money(receipt.gstAmount)}</small></strong></div>) : <span className="text-muted">{hindi ? 'अभी कोई रसीद नहीं है।' : 'No receipts yet.'}</span>}</section>}
        </div>
      </div>
      <div className="parent-footer-note"><ShieldCheck size={15} /><span>{hindi ? 'फ़ीस स्पष्ट रूप से दिखाई जाती है। भुगतान दर्ज होते ही रिमाइंडर रुक जाते हैं।' : 'Fees are shown clearly, GST is shown on receipts, and reminders stop as soon as your payment is recorded.'}</span></div>
    </section>
  );
}

const appRoot = createRoot(document.getElementById('root'));
appRoot.render(<App />);
if (import.meta.hot) import.meta.hot.dispose(() => appRoot.unmount());
