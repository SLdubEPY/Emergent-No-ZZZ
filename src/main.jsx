import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, BarChart3, Bell, Bot, BriefcaseBusiness, Check, ChevronDown,
  CircleDollarSign, Clock3, Compass, Globe2, Layers3,
  Menu, MessageSquare, MousePointer2, PackageCheck, Play,
  Rocket, Search, Settings2, ShieldCheck, Sparkles, Store, Target, TrendingUp,
  Users, WandSparkles, X, Zap, BrainCircuit, Headphones, Megaphone,
  LockKeyhole, SlidersHorizontal, Activity, Send, Database, Code2, Palette, CheckCircle2
} from 'lucide-react';
import './styles.css';
import './enhancements.css';
import './hardening.css';
import './quality.css';
import { api, initializeSession } from './api.js';

const ideas = [
  { id: 1, name: 'CreatorOps AI', type: 'Micro-SaaS', desc: 'An intelligent back office for independent creators — automating sponsorships, invoices, and deal flow.', score: 94, market: '$2.4B', speed: '14 days', price: '$39/mo', tag: 'Best match', color: '#d8ff49' },
  { id: 2, name: 'LocalRank Studio', type: 'Productized Service', desc: 'AI-powered local search content and reputation management for multi-location businesses.', score: 91, market: '$1.8B', speed: '9 days', price: '$799/mo', tag: 'Fast revenue', color: '#8f7cff' },
  { id: 3, name: 'Briefly Legal', type: 'Digital Product', desc: 'Plain-English contract intelligence and document workflows for freelancers and agencies.', score: 87, market: '$940M', speed: '7 days', price: '$19/mo', tag: 'Low overhead', color: '#ff9867' },
  { id: 4, name: 'CareLoop', type: 'B2B Marketplace', desc: 'A vetted retention and scheduling layer for independent wellness clinics and practitioners.', score: 85, market: '$3.1B', speed: '21 days', price: '$149/mo', tag: 'Rising demand', color: '#74d9b0' },
  { id: 5, name: 'CourseSignal', type: 'Data Product', desc: 'Competitive intelligence that shows educators what audiences are searching for before they create.', score: 83, market: '$760M', speed: '12 days', price: '$49/mo', tag: 'AI native', color: '#72a8ff' },
  { id: 6, name: 'OpsKit Commerce', type: 'Template Business', desc: 'Battle-tested operating systems and AI workflows for growing ecommerce teams.', score: 81, market: '$520M', speed: '5 days', price: '$129 once', tag: 'Quick launch', color: '#f4ce59' },
];

const tasks = [
  { icon: Globe2, title: 'Landing page deployed', meta: 'nozzz.site/creatorops', status: 'Live', accent: 'green' },
  { icon: MessageSquare, title: 'Outbound sequence running', meta: '238 leads · 42% opened', status: 'Active', accent: 'purple' },
  { icon: MousePointer2, title: 'Ad campaign optimizing', meta: '$18.40 spent · 6 trials', status: 'Learning', accent: 'orange' },
];

const steps = [
  { n: '01', icon: Compass, title: 'Discover', text: 'AI scans markets, communities, trends, and unmet demand.' },
  { n: '02', icon: WandSparkles, title: 'Create', text: 'Select a venture. We build the brand, product, site, and stack.' },
  { n: '03', icon: Rocket, title: 'Launch', text: 'Infrastructure, payments, campaigns, and sales go live.' },
  { n: '04', icon: Bot, title: 'Operate', text: 'Autonomous agents market, sell, support, and optimize 24/7.' },
];


const agentRoles = [
  { icon: BrainCircuit, title: 'Venture Strategist', state: 'Scanning 84 signals', text: 'Validates demand, positioning, economics, and risk before a dollar is spent.' },
  { icon: Palette, title: 'Brand Director', state: '2 assets in review', text: 'Creates the name, identity, voice, landing pages, and campaign creative.' },
  { icon: Code2, title: 'Product Engineer', state: 'Build passing', text: 'Ships the product, automations, analytics, billing, and production infrastructure.' },
  { icon: Megaphone, title: 'Growth Operator', state: '3 campaigns live', text: 'Runs content, outbound, SEO, partnerships, experiments, and conversion loops.' },
  { icon: Headphones, title: 'Customer Success', state: 'Inbox at zero', text: 'Onboards customers, resolves support, captures insights, and protects retention.' },
  { icon: CircleDollarSign, title: 'Finance Controller', state: 'Margins healthy', text: 'Monitors cash, forecasts runway, catches anomalies, and prepares weekly decisions.' },
];

const deliverables = [
  ['Market intelligence', 'Audience, pain points, competitors, and demand signals'],
  ['Brand system', 'Name, positioning, visual direction, and messaging'],
  ['Production website', 'Conversion-ready pages, copy, analytics, and SEO'],
  ['Revenue engine', 'Offer, pricing, payments, CRM, and sales sequences'],
  ['AI workforce', 'Six agents with goals, guardrails, and approval policies'],
  ['90-day operating plan', 'Weekly milestones, experiments, KPIs, and budget'],
];

function Logo() {
  return <div className="logo"><span>NO</span><span className="prohibit"><span></span></span><span>ZZZ</span></div>;
}

class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return <div className="crash-screen" role="alert">
        <div className="logo"><span>NO</span><span className="prohibit"><span></span></span><span>ZZZ</span></div>
        <h1>Something went wrong.</h1>
        <p>NO ZZZ hit an unexpected error. Reload to keep building — your ventures are stored securely on the server, never in this browser.</p>
        <button className="primary" onClick={() => window.location.reload()}>Reload NO ZZZ</button>
      </div>;
    }
    return this.props.children;
  }
}

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function App() {
  const [active, setActive] = useState('Discover');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [mobile, setMobile] = useState(false);
  const [filter, setFilter] = useState('For you');
  const [visibleCount, setVisibleCount] = useState(3);
  const [builderStep, setBuilderStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [operatorText, setOperatorText] = useState('');
  const [messages, setMessages] = useState([{ from: 'ai', text: 'What are we building today? I can research a market, pressure-test an idea, or create a launch plan.' }]);
  const [dashTab, setDashTab] = useState('Overview');
  const [workspace, setWorkspace] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [authBusy, setAuthBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [buildRoom, setBuildRoom] = useState(null);
  const [saving, setSaving] = useState(false);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [deletingVenture, setDeletingVenture] = useState(false);
  const toastTimer = useRef(null);
  const priorFocus = useRef(null);
  const [form, setForm] = useState({ idea: '', budget: 'Under $1,000', time: 'Under 5 hours', goal: '$5k MRR', autonomy: 'Approval required' });
  const filtered = useMemo(() => ideas.filter(i => {
    const match = (i.name + i.type + i.desc).toLowerCase().includes(query.toLowerCase());
    if (!match) return false;
    if (filter === 'Fast to revenue') return parseInt(i.speed) <= 10;
    if (filter === 'Under $1k to start') return ['Digital Product','Template Business','Micro-SaaS'].includes(i.type);
    if (filter === 'AI-native') return i.desc.toLowerCase().includes('ai') || i.name.includes('AI') || i.name === 'CourseSignal';
    if (filter === 'Recurring revenue') return i.price.includes('/mo');
    return true;
  }), [query, filter]);

  useEffect(() => {
    let live = true;
    initializeSession().then(session => { if (live) setUser(session.user); return api.listVentures(); }).then(data => { if (live) { setWorkspace(data.ventures); setApiReady(true); } }).catch(() => notify('Secure API is reconnecting…'));
    return () => { live = false; if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);
  useEffect(() => { if (!modal) { setBuilderStep(1); setGenerating(false); setBlueprint(null); } }, [modal]);
  useEffect(() => { if (!buildRoom) setDeletingVenture(false); }, [buildRoom]);
  useEffect(() => {
    const overlayOpen = Boolean(modal || authOpen || buildRoom);
    document.body.style.overflow = overlayOpen ? 'hidden' : '';
    if (!overlayOpen) return undefined;
    priorFocus.current = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const dialog = document.querySelector('.modal-backdrop .modal');
      const target = dialog?.querySelector('[autofocus], input, select, button:not([disabled])');
      target?.focus();
    });
    const trapFocus = event => {
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector('.modal-backdrop .modal');
      const focusable = [...(dialog?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', trapFocus);
    return () => {
      cancelAnimationFrame(frame); document.body.style.overflow = '';
      window.removeEventListener('keydown', trapFocus);
      if (priorFocus.current instanceof HTMLElement) priorFocus.current.focus();
    };
  }, [modal, authOpen, buildRoom]);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') { if (!generating && !saving) setModal(false); if (!authBusy) setAuthOpen(false); setBuildRoom(null); setOperatorOpen(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [generating, saving, authBusy]);

  const closeBuilder = () => { if (!generating && !saving) setModal(false); };
  const closeAuth = () => { if (!authBusy) { setAuthOpen(false); setDeletePassword(''); setAuthForm(f => ({...f,password:''})); } };
  const notify = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 2800); };
  const choose = (idea) => { setSelected(idea); setForm(f => ({ ...f, idea: idea.name })); setModal(true); };
  const openBuilder = () => { setSelected(null); setForm(f => ({...f, idea: ''})); setModal(true); };
  const generateBlueprint = async () => {
    if (!form.idea.trim()) { notify('Add a business idea to continue'); return; }
    setGenerating(true);
    try {
      const data = await api.createBlueprint(form);
      setBlueprint(data.blueprint); setBuilderStep(2); setApiReady(true);
    } catch (error) { notify(error.message); }
    finally { setGenerating(false); }
  };
  const saveVenture = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await api.createVenture(form);
      setWorkspace(w => [data.venture, ...w.filter(v => v.id !== data.venture.id)]);
      setModal(false); notify(`${form.idea} securely added to your command center`);
      setTimeout(() => document.querySelector('#command-center')?.scrollIntoView({behavior:'smooth'}), 200);
    } catch (error) { notify(error.message); } finally { setSaving(false); }
  };
  const sendOperator = async () => {
    if (!operatorText.trim() || operatorBusy) return;
    setOperatorBusy(true);
    const prompt = operatorText.trim(); setMessages(m => [...m, {from:'user', text:prompt}]); setOperatorText('');
    try { const data = await api.operator(prompt); setMessages(m => [...m, {from:'ai', text:data.reply.text}]); }
    catch (error) { setMessages(m => [...m, {from:'ai', text:error.message}]); }
    finally { setOperatorBusy(false); }
  };
  const submitAuth = async () => {
    setAuthBusy(true);
    try {
      const data = authMode === 'signup' ? await api.signUp(authForm) : await api.login({email:authForm.email,password:authForm.password});
      setUser(data.user); setAuthOpen(false); setAuthForm({name:'',email:'',password:''}); notify(`Welcome${data.user?.name ? `, ${data.user.name}` : ''}`);
      const ventures = await api.listVentures(); setWorkspace(ventures.ventures);
    } catch (error) { notify(error.message); } finally { setAuthBusy(false); }
  };
  const logout = async () => { try { await api.logout(); setUser(null); setWorkspace([]); setAuthOpen(false); notify('Signed out securely'); } catch (error) { notify(error.message); } };
  const downloadJson = (name, data) => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})); const link = document.createElement('a'); link.href=url; link.download=name; link.hidden=true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000); };
  const exportAccount = async () => { try { const data = await api.exportAccount(); downloadJson('nozzz-account-export.json', data); notify('Account data export downloaded'); } catch (error) { notify(error.message); } };
  const removeVenture = async venture => {
    if (!deletingVenture) { setDeletingVenture(true); return; }
    try { await api.deleteVenture(venture.id); setWorkspace(w=>w.filter(v=>v.id!==venture.id)); setBuildRoom(null); setDeletingVenture(false); notify(`${venture.name} deleted`); }
    catch (error) { setDeletingVenture(false); notify(error.message); }
  };
  const deleteAccount = async () => { if (!deletePassword) return notify('Enter your password to delete the account'); try { await api.deleteAccount(deletePassword); setUser(null); setWorkspace([]); setBuildRoom(null); setAuthOpen(false); setDeletePassword(''); notify('Account and ventures permanently deleted'); } catch (error) { notify(error.message); } };
  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) return notify('New passwords do not match');
    if (pwForm.next.length < 10 || !/[A-Za-z]/.test(pwForm.next) || !/\d/.test(pwForm.next)) return notify('New password needs 10+ characters with letters and numbers');
    setPwBusy(true);
    try { await api.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next }); setPwForm({ current: '', next: '', confirm: '' }); notify('Password updated — other devices signed out'); }
    catch (error) { notify(error.message); } finally { setPwBusy(false); }
  };

  return <div className="app">
    <a className="skip-link" href="#discover">Skip to venture discovery</a>
    <header>
      <a href="#top" aria-label="NO ZZZ home"><Logo /></a>
      <nav className={mobile ? 'open' : ''}>
        {['Discover','How it works','Workforce','Command center'].map(x => <a key={x} href={'#' + x.toLowerCase().replaceAll(' ','-')} onClick={() => {setActive(x); setMobile(false)}} className={active === x ? 'active' : ''}>{x}</a>)}
      </nav>
      <div className="header-actions">
        <button className="login" onClick={()=>{setAuthMode(user?'account':'login');setAuthOpen(true)}}>{user ? user.name : 'Log in'}</button>
        <button className="top-cta" onClick={openBuilder}>Build a business <ArrowRight size={15}/></button>
        <button className="menu" onClick={() => setMobile(!mobile)} aria-label="Menu" aria-expanded={mobile}>{mobile ? <X/> : <Menu/>}</button>
      </div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse"></span> AUTONOMOUS VENTURE STUDIO <span className="line"></span></div>
          <h1>Ideas don't sleep.<br/><em>Neither do we.</em></h1>
          <p>Discover your next online business. Then let AI build, launch, and run the whole thing — while you stay in control.</p>
          <div className="hero-buttons">
            <button className="primary" onClick={() => document.querySelector('#discover').scrollIntoView({behavior:'smooth'})}>Find my venture <Sparkles size={17}/></button>
            <button className="watch" onClick={() => document.querySelector('#command-center').scrollIntoView({behavior:'smooth'})}><span><Play size={13} fill="currentColor"/></span> See NO ZZZ in action</button>
          </div>
          <div className="proof"><div className="avatars"><i>AI</i><i>6</i><i>24</i><i>✓</i></div><div><b>Approval-first AI operations</b><span>six specialists · always accountable</span></div></div>
        </div>
        <div className="hero-visual">
          <img src="/nozzz-venture-core.png" alt="AI venture operating system" />
          <div className="float-card live-card"><div><span className="live-dot"></span> VENTURE LIVE</div><b>CreatorOps AI</b><small><TrendingUp size={12}/> +28.4% this week</small></div>
          <div className="float-card agent-card"><div className="agent-icon"><Bot size={17}/></div><div><small>AGENTS WORKING</small><b>12 <span>/ 12</span></b></div><div className="bars"><i></i><i></i><i></i></div></div>
          <div className="orbit-tag one"><Zap size={12}/> Research</div>
          <div className="orbit-tag two"><CircleDollarSign size={12}/> Revenue</div>
        </div>
      </section>

      <section className="ticker"><span>YOUR AI CO-FOUNDER</span><i></i><span>FROM ZERO TO LIVE</span><i></i><span>BUILT TO COMPOUND</span><i></i><span>ALWAYS ON</span></section>

      <section className="discover section" id="discover">
        <div className="section-heading">
          <div><span className="kicker">VENTURE DISCOVERY ENGINE</span><h2>Find what to build <em>next.</em></h2><p>Real opportunities, scored against your skills, budget, and appetite. No generic idea lists.</p></div>
          <button className="outline" onClick={() => { setVisibleCount(6); notify('Opportunity set refreshed'); }}>Refresh signals <Sparkles size={15}/></button>
        </div>
        <div className="searchbox"><Search size={19}/><input aria-label="Search venture opportunities" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search industries, skills, business models..."/><button onClick={()=>{setQuery('');setFilter('For you');setVisibleCount(3)}} aria-label="Reset venture filters"><Settings2 size={16}/> Reset <span>{filter==='For you'&&!query?0:1}</span></button></div>
        <div className="chips">{['For you','Under $1k to start','Fast to revenue','AI-native','Recurring revenue'].map(x=><button className={filter===x?'chosen':''} key={x} onClick={()=>{setFilter(x);setVisibleCount(6)}}>{x}</button>)}</div>
        <div className="idea-grid">
          {filtered.slice(0, visibleCount).map((idea, index) => <article className="idea-card" key={idea.id}>
            <div className="card-top"><div className="idea-num">0{index+1}</div><span className="tag" style={{'--tag':idea.color}}>{idea.tag}</span></div>
            <div className="idea-icon" style={{'--accent':idea.color}}>{index===0?<BriefcaseBusiness/>:index===1?<Target/>:<ShieldCheck/>}</div>
            <span className="idea-type">{idea.type}</span><h3>{idea.name}</h3><p>{idea.desc}</p>
            <div className="data-row"><div><small>NO ZZZ SCORE</small><strong>{idea.score}<span>/100</span></strong></div><div><small>MARKET</small><strong>{idea.market}</strong></div><div><small>TO LAUNCH</small><strong>{idea.speed}</strong></div></div>
            <div className="scorebar"><i style={{width:`${idea.score}%`}}></i></div>
            <button className="build-btn" onClick={()=>choose(idea)}>Build this venture <ArrowRight size={16}/></button>
          </article>)}
        </div>
        {!filtered.length && <div className="empty"><Sparkles/><h3>Turn this search into a venture</h3><p>We don't have a preset match for “{query}” — let the Venture Strategist research it from scratch.</p><button className="primary" onClick={()=>{setSelected(null);setForm(f=>({...f,idea:query}));setModal(true)}}>Research this market <ArrowRight size={15}/></button></div>}
        {filtered.length > visibleCount && <button className="load-more" onClick={()=>setVisibleCount(6)}>Show 3 more opportunities <ArrowRight size={15}/></button>}
      </section>

      <section className="process section" id="how-it-works">
        <div className="process-intro"><span className="kicker light">ZERO TO OPERATING BUSINESS</span><h2>You choose the destination.<br/><em>We build the machine.</em></h2><p>NO ZZZ brings specialized agents, proven playbooks, and production tools together in one relentless operating system.</p><button className="primary" onClick={openBuilder}>Start from an idea <ArrowRight size={16}/></button></div>
        <div className="steps">{steps.map(s=><div className="step" key={s.n}><span className="step-num">{s.n}</span><div className="step-icon"><s.icon/></div><div><h3>{s.title}</h3><p>{s.text}</p></div><ArrowRight className="step-arrow"/></div>)}</div>
      </section>

      <section className="workforce-section section" id="workforce">
        <div className="section-heading workforce-heading"><div><span className="kicker light">THE TEAM THAT NEVER CLOCKS OUT</span><h2>Six specialists.<br/><em>One shared brain.</em></h2><p>Not a chatbot wrapper. A coordinated operating team with memory, tools, budgets, and explicit boundaries.</p></div><div className="system-status"><span></span><div><small>SYSTEM STATUS</small><b>All agents operational</b></div></div></div>
        <div className="agent-grid">{agentRoles.map((agent, i) => <article className="agent-role" key={agent.title}><div className="role-top"><span>0{i+1}</span><agent.icon/></div><h3>{agent.title}</h3><p>{agent.text}</p><div className="role-state"><Activity size={11}/>{agent.state}</div></article>)}</div>
        <div className="control-strip"><div><LockKeyhole/><span><b>Approval gates</b><small>You decide what can publish, spend, send, or deploy.</small></span></div><div><Database/><span><b>Shared memory</b><small>Every agent works from the same customer and business context.</small></span></div><div><SlidersHorizontal/><span><b>Budget controls</b><small>Hard limits, alerts, audit trails, and a global kill switch.</small></span></div></div>
      </section>

      <section className="command section" id="command-center">
        <div className="section-heading"><div><span className="kicker">COMMAND CENTER</span><h2>One view. <em>Full control.</em></h2><p>Your ventures, agents, money, and decisions — organized in a single operating view.</p></div><div className="secure"><ShieldCheck size={15}/> Human approval built in</div></div>
        {workspace.length>0 && <div className="venture-shelf"><div><span>YOUR VENTURES</span><small>{workspace.length} secure build room{workspace.length===1?'':'s'}</small></div>{workspace.map(venture=><button key={venture.id} onClick={()=>{setDeletingVenture(false);setBuildRoom(venture)}}><span className="venture-badge"><Rocket/></span><span><b>{venture.name}</b><small>{venture.stage} · {venture.progress}%</small></span><strong>{venture.score}</strong><ArrowRight/></button>)}</div>}
        <div className="dashboard">
          <aside className="dash-nav"><Logo/><div className="org"><div>NZ</div><span><small>WORKSPACE</small>No ZZZ Labs</span><ChevronDown size={14}/></div>{[[Layers3,'Overview'],[Store,'Ventures'],[Bot,'AI workforce'],[BarChart3,'Analytics'],[PackageCheck,'Assets']].map(([I,t])=><button key={t} onClick={()=>{setDashTab(t);notify(`${t} view selected`)}} className={dashTab===t?'selected':''}><I size={16}/>{t}{t==='AI workforce'&&<span>12</span>}{t==='Ventures'&&workspace.length>0&&<span>{workspace.length}</span>}</button>)}<div className="dash-bottom"><button><Settings2 size={16}/>Settings</button><div className="profile">DS <span><b>Devon S.</b><small>Founder</small></span></div></div></aside>
          <div className="dash-content">
            <div className="dash-head"><div><small>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date()).toUpperCase()} · {dashTab.toUpperCase()}</small><h3>{workspace.length ? `${workspace[0].name} is taking shape.` : `Good morning${user?.name ? `, ${user.name}` : ''}.`}</h3></div><button onClick={()=>notify('Decision center is ready')} aria-label="Notifications"><Bell size={16}/><i></i></button></div>{workspace.length>0 && <div className="workspace-venture"><div className="venture-badge"><Rocket/></div><div><small>NEW VENTURE</small><b>{workspace[0].name}</b><span>{workspace[0].stage} · {workspace[0].progress}% complete</span></div><div className="venture-progress"><i style={{width:`${workspace[0].progress}%`}}></i></div><button onClick={()=>setBuildRoom(workspace[0])}>Open build room <ArrowRight size={12}/></button></div>}
            <div className="stats"><div><span>MONTHLY REVENUE</span><b>$12,840</b><small className="up"><TrendingUp size={11}/> 18.2%</small></div><div><span>ACTIVE VENTURES</span><b>3</b><small>2 profitable</small></div><div><span>AI HOURS SAVED</span><b>186</b><small>this month</small></div></div>
            <p className="demo-note">Illustrative operating preview — connect live tools, payments, and approval gates to operate real ventures.</p>
            <div className="dash-grid"><div className="revenue panel"><div className="panel-head"><div><small>REVENUE</small><b>$12.8k</b></div><select aria-label="Revenue period"><option>Last 30 days</option><option>Last 7 days</option></select></div><div className="chart"><div className="y"><span>12k</span><span>8k</span><span>4k</span><span>0</span></div><svg viewBox="0 0 500 150" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d8ff49" stopOpacity=".35"/><stop offset="1" stopColor="#d8ff49" stopOpacity="0"/></linearGradient></defs><path d="M0 135 C45 130 55 105 95 111 S155 85 190 91 S245 72 275 77 S330 52 360 58 S410 42 430 44 S470 17 500 22 L500 150 L0 150Z" fill="url(#fill)"/><path d="M0 135 C45 130 55 105 95 111 S155 85 190 91 S245 72 275 77 S330 52 360 58 S410 42 430 44 S470 17 500 22" fill="none" stroke="#c8ed3a" strokeWidth="3"/></svg><div className="x"><span>Jul 20</span><span>Jul 28</span><span>Aug 05</span><span>Aug 13</span><span>Aug 20</span></div></div></div>
            <div className="workforce panel"><div className="panel-title"><span><Bot size={15}/> AI workforce</span><small>12 ACTIVE</small></div>{tasks.map(t=><div className="task" key={t.title}><div className={'task-icon '+t.accent}><t.icon/></div><div><b>{t.title}</b><small>{t.meta}</small></div><span className={t.accent}>{t.status}</span></div>)}<button onClick={()=>setOperatorOpen(true)}>Ask the workforce <ArrowRight size={14}/></button></div></div>
          </div>
        </div>
      </section>

      <section className="cta section" id="pricing"><div><span className="kicker light">THE CLOCK IS RUNNING</span><h2>Your next business<br/>could be live <em>this month.</em></h2><p>Don't just save another idea. Put an AI team behind it.</p></div><button onClick={openBuilder}>Build your first venture <Rocket size={18}/></button><span className="giant">NO ZZZ</span></section>
    </main>
    <footer><Logo/><p>Ain't no sleepin'. © 2026 NO ZZZ Labs.</p><div><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/api/health">System status</a></div></footer>

    {buildRoom && <div className="modal-backdrop" onMouseDown={()=>{setDeletingVenture(false);setBuildRoom(null)}}><div className="modal build-room-modal" role="dialog" aria-modal="true" aria-labelledby="build-room-title" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>{setDeletingVenture(false);setBuildRoom(null)}} aria-label="Close build room"><X/></button><div className="build-room-head"><span className="venture-badge"><Rocket/></span><div><span className="kicker">SECURE BUILD ROOM</span><h2 id="build-room-title">{buildRoom.name}</h2><p>{buildRoom.stage} · Created {new Date(buildRoom.created).toLocaleDateString()}</p></div><strong>{buildRoom.score}<small>/100</small></strong></div><div className="room-progress"><div><b>Venture foundation</b><span>{buildRoom.progress}% complete</span></div><i><span style={{width:`${buildRoom.progress}%`}}></span></i></div><div className="room-brief"><div><small>BUDGET</small><b>{buildRoom.brief?.budget}</b></div><div><small>90-DAY GOAL</small><b>{buildRoom.brief?.goal}</b></div><div><small>HUMAN TIME</small><b>{buildRoom.brief?.time}</b></div><div><small>AUTONOMY</small><b>{buildRoom.brief?.autonomy}</b></div></div><h3>Production roadmap</h3><div className="room-roadmap">{deliverables.map(([title,text],i)=><div key={title} className={i===0?'active':''}><span>{i===0?<Activity/>:<LockKeyhole/>}</span><div><b>{title}</b><small>{text}</small></div><em>{i===0?'Ready':'Approval gated'}</em></div>)}</div><div className="room-footer"><button className={deletingVenture?'delete-confirm':''} onClick={()=>removeVenture(buildRoom)}>{deletingVenture?'Confirm delete':'Delete venture'}</button><small><ShieldCheck/> No agent can publish, spend, or contact customers without approval.</small><button onClick={()=>{downloadJson(`${slugify(buildRoom.name)}-blueprint.json`,buildRoom);notify('Venture blueprint downloaded')}}>Download blueprint <ArrowRight/></button></div></div></div>}
    {authOpen && <div className="modal-backdrop" onMouseDown={closeAuth}><div className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={e=>e.stopPropagation()}><button className="close" disabled={authBusy} onClick={closeAuth} aria-label="Close"><X/></button>{authMode==='account'&&user?<><span className="modal-mark"><ShieldCheck/></span><span className="kicker">FOUNDER ACCOUNT</span><h2 id="account-title">Your data. Your control.</h2><p>Signed in as <b>{user.email}</b>. Export a complete machine-readable copy or securely end this session.</p><div className="account-card"><div>{user.name.slice(0,2).toUpperCase()}</div><span><b>{user.name}</b><small>Founder · protected workspace</small></span></div><div className="account-actions"><button onClick={exportAccount}><Database/> Export my data <ArrowRight/></button><button onClick={logout}><LockKeyhole/> Log out this device <ArrowRight/></button></div><div className="account-password"><b>Change password</b><p>Rotate your password to keep your workspace secure. Other signed-in devices are signed out immediately.</p><label htmlFor="pw-current">Current password</label><input id="pw-current" type="password" autoComplete="current-password" value={pwForm.current} onChange={e=>setPwForm({...pwForm,current:e.target.value})} placeholder="Current password"/><label htmlFor="pw-next">New password</label><input id="pw-next" type="password" autoComplete="new-password" value={pwForm.next} onChange={e=>setPwForm({...pwForm,next:e.target.value})} placeholder="10+ characters, letters and numbers"/><label htmlFor="pw-confirm">Confirm new password</label><input id="pw-confirm" type="password" autoComplete="new-password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} onKeyDown={e=>e.key==='Enter'&&changePassword()} placeholder="Repeat new password"/><button disabled={pwBusy||!pwForm.current||!pwForm.next||!pwForm.confirm} onClick={changePassword}>{pwBusy?<><span className="spinner"></span> Updating...</>:<>Update password <ArrowRight size={13}/></>}</button></div><div className="danger-zone"><b>Delete account</b><p>Permanently removes your account, sessions, and every venture. This cannot be undone.</p><label className="sr-only" htmlFor="delete-password">Confirm password</label><input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} placeholder="Confirm with your password"/><button disabled={!deletePassword} onClick={deleteAccount}>Permanently delete account</button></div></>:<><span className="modal-mark"><LockKeyhole/></span><span className="kicker">SECURE FOUNDER ACCOUNT</span><h2 id="account-title">{authMode==='signup'?'Create your command center':'Welcome back'}</h2><p>{authMode==='signup'?'Save ventures, preserve agent context, and operate from any device.':'Sign in to continue building and operating your ventures.'}</p>{authMode==='signup'&&<><label htmlFor="founder-name">Your name</label><input id="founder-name" autoComplete="name" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Founder name"/></>}<label htmlFor="founder-email">Email address</label><input id="founder-email" type="email" autoComplete="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@company.com"/><label htmlFor="founder-password">Password</label><input id="founder-password" type="password" autoComplete={authMode==='signup'?'new-password':'current-password'} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} onKeyDown={e=>e.key==='Enter'&&submitAuth()} placeholder={authMode==='signup'?'10+ characters, letters and numbers':'Your password'}/><button className="launch" disabled={authBusy} onClick={submitAuth}>{authBusy?<><span className="spinner"></span> Securing account...</>:<>{authMode==='signup'?'Create secure account':'Log in'} <ArrowRight size={16}/></>}</button><button className="auth-switch" onClick={()=>setAuthMode(authMode==='signup'?'login':'signup')}>{authMode==='signup'?'Already have an account? Log in':'New to NO ZZZ? Create an account'}</button><small className="fine"><ShieldCheck size={12}/> Encrypted venture data · HttpOnly session · CSRF protected</small></>}</div></div>}
    {modal && <div className="modal-backdrop" onMouseDown={closeBuilder}><div className="modal builder-modal" role="dialog" aria-modal="true" aria-labelledby="builder-title" onMouseDown={e=>e.stopPropagation()}>
      <button className="close" disabled={generating||saving} onClick={closeBuilder} aria-label="Close"><X/></button>
      <div className="builder-progress"><span className={builderStep>=1?'done':''}>1 <b>Brief</b></span><i className={builderStep>=2?'done':''}></i><span className={builderStep>=2?'done':''}>2 <b>Blueprint</b></span><i></i><span>3 <b>Build room</b></span></div>
      {builderStep===1 ? <>
        <span className="modal-mark"><Sparkles/></span><span className="kicker">VENTURE LAUNCHPAD</span><h2 id="builder-title">{selected ? `Build ${selected.name}` : 'Brief your AI co-founder'}</h2><p>Give us the constraints. The team will research the market and architect a business you can actually operate.</p>
        <label htmlFor="venture-idea">What do you want to build?</label><input id="venture-idea" autoFocus value={form.idea} onChange={e=>setForm({...form,idea:e.target.value})} onKeyDown={e=>e.key==='Enter'&&generateBlueprint()} placeholder="e.g. AI bookkeeping for independent designers"/>
        <div className="modal-row"><div><label htmlFor="venture-budget">Starting budget</label><select id="venture-budget" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}><option>Under $1,000</option><option>$1,000–$5,000</option><option>$5,000+</option></select></div><div><label htmlFor="venture-time">Weekly time</label><select id="venture-time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}><option>Under 5 hours</option><option>5–10 hours</option><option>10+ hours</option></select></div></div>
        <div className="modal-row"><div><label htmlFor="venture-goal">90-day goal</label><select id="venture-goal" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})}><option>$5k MRR</option><option>$10k MRR</option><option>First 100 users</option><option>Validate demand</option></select></div><div><label htmlFor="venture-autonomy">Agent autonomy</label><select id="venture-autonomy" value={form.autonomy} onChange={e=>setForm({...form,autonomy:e.target.value})}><option>Approval required</option><option>Balanced</option><option>High autonomy</option></select></div></div>
        <button className="launch" disabled={generating} onClick={generateBlueprint}>{generating ? <><span className="spinner"></span> Analyzing market & economics...</> : <>Generate venture blueprint <ArrowRight size={17}/></>}</button><small className="fine"><ShieldCheck size={12}/> {apiReady ? 'Secure session active · ' : ''}No publishing or spending without your approval.</small>
      </> : <div className="blueprint">
        <div className="blueprint-head"><span className="modal-mark"><CheckCircle2/></span><div><span className="kicker">BLUEPRINT READY</span><h2>{form.idea}</h2></div><strong>{blueprint?.score || 92}<span>/100</span><small>VIABILITY</small></strong></div>
        <div className="thesis"><small>VENTURE THESIS</small><p>{blueprint?.thesis || `A focused recurring-revenue business designed for a lean launch under ${form.budget.toLowerCase()}, with a path to ${form.goal}.`}</p></div>
        <div className="deliverables">{deliverables.map(([title,text])=><div key={title}><Check size={13}/><span><b>{title}</b><small>{text}</small></span></div>)}</div>
        <div className="blueprint-meta"><span><Clock3/>{blueprint?.launchDays || 14}-day launch</span><span><Users/>6 AI agents</span><span><ShieldCheck/>{form.autonomy}</span></div>
        <div className="blueprint-actions"><button className="back" onClick={()=>setBuilderStep(1)}>Edit brief</button><button className="launch" disabled={saving} onClick={saveVenture}>{saving?'Creating secure build room…':<>Create build room <Rocket size={16}/></>}</button></div>
      </div>}
    </div></div>}
    <button className="operator-trigger" onClick={()=>setOperatorOpen(!operatorOpen)} aria-label={operatorOpen?"Close AI operator":"Open AI operator"} aria-expanded={operatorOpen}>{operatorOpen?<X/>:<><Bot/><span>ASK NO ZZZ</span></>}</button>
    {operatorOpen && <div className="operator" role="dialog" aria-label="NO ZZZ Operator"><div className="operator-head"><div className="agent-icon"><Bot/></div><div><b>NO ZZZ Operator</b><small><i></i> Online · has venture context</small></div><button onClick={()=>setOperatorOpen(false)} aria-label="Close AI operator"><X/></button></div><div className="operator-messages">{messages.map((m,i)=><div key={i} className={m.from}>{m.text}</div>)}</div><div className="quick-prompts">{['Find a niche','Pressure-test idea','Plan my launch'].map(x=><button key={x} onClick={()=>setOperatorText(x)}>{x}</button>)}</div><div className="operator-input"><input aria-label="Message the NO ZZZ Operator" disabled={operatorBusy} value={operatorText} onChange={e=>setOperatorText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendOperator()} placeholder="Ask your AI co-founder..."/><button disabled={operatorBusy||!operatorText.trim()} onClick={sendOperator} aria-label="Send message">{operatorBusy?<span className="spinner"></span>:<Send/>}</button></div><small className="operator-note">AI output can be wrong. You approve every consequential action.</small></div>}
    {toast && <div className="toast" role="status" aria-live="polite"><Check size={16}/>{toast}</div>}
  </div>
}

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
