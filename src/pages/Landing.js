import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

const HIGHLIGHTS = [
  { icon: '👥', bg: '#EEEDFF', color: '#5B4DFF', title: 'Student Management', text: 'Keep all student details in one place' },
  { icon: '▦', bg: '#E4F8EC', color: '#16A860', title: 'Batch Management', text: 'Create and manage batches easily' },
  { icon: '🗓', bg: '#FFF1E2', color: '#E8792B', title: 'Attendance Tracking', text: 'Track daily attendance with reports' },
  { icon: '₹', bg: '#FFEDEE', color: '#E14B5A', title: 'Fees & Payments', text: 'Record payments & generate receipts' },
  { icon: '💬', bg: '#E7F1FF', color: '#2B6DEF', title: 'Enquiry Management', text: 'Convert enquiries to students' },
  { icon: '📊', bg: '#EFEBFF', color: '#7C3AED', title: 'Reports & Analytics', text: 'Get insights and grow faster' },
];

const WHY = [
  { icon: '⏱', title: 'Save Time', text: 'Automate your daily tasks and reduce manual work.', bg: '#EAF9EF' },
  { icon: '📈', title: 'Grow Faster', text: 'Get insights and make better decisions.', bg: '#EAF1FF' },
  { icon: '♡', title: 'Loved by Teachers', text: 'Simple, powerful and easy to use.', bg: '#FFEEEE' },
];

const PLANS = [
  { name: 'Starter', monthly: 499, yearly: 399, desc: 'For new single-batch tuitions getting organized.', cta: 'Start Free Trial', featured: false, features: ['Up to 100 students', '3 batches', 'Attendance + Fees', 'Enquiry tracking', 'Email support'] },
  { name: 'Pro', monthly: 999, yearly: 799, desc: 'For growing institutes that need automation.', cta: 'Start Free Trial', featured: true, features: ['Up to 500 students', 'Unlimited batches', 'Receipts + Reminders', 'Reports & Analytics', 'WhatsApp alerts', 'Priority support'] },
  { name: 'Institute', monthly: 1999, yearly: 1599, desc: 'For multi-branch institutes & teams.', cta: 'Start Free Trial', featured: false, features: ['Unlimited students', 'Multi-branch + Staff roles', 'Advanced reports', 'Data backup', 'Dedicated manager'] },
];

const TESTIMONIALS = [
  { name: 'Mehta Classes', person: 'Rakesh Mehta, Owner', init: 'RM', quote: 'We shifted from registers to TuitionPro in one weekend. Fee collection is 2x faster and parents love the receipts.' },
  { name: 'Bright Future Tutorials', person: 'Sneha Kulkarni, Founder', init: 'SK', quote: 'Attendance used to take 20 minutes per batch. Now it takes 2 minutes. My teachers actually enjoy using it.' },
  { name: 'Achievers Academy', person: 'Imran Sheikh, Director', init: 'IS', quote: 'Enquiry follow-ups doubled our admissions in 3 months. The dashboard tells me exactly what is happening daily.' },
];

const FAQS = [
  { q: 'Is there really a free 14-day trial?', a: 'Yes. Every plan starts with a free 14-day trial. No credit card required. Import students during the trial.' },
  { q: 'How long does setup take?', a: 'Most institutes go live in under 30 minutes. Import from Excel, create batches, start attendance the same day.' },
  { q: 'Is my tuition data safe?', a: 'Yes. Your data is owner-scoped, backed up, and only visible to your account. Export everything anytime.' },
  { q: 'Does it work on mobile?', a: 'Absolutely. TuitionPro is fully responsive on phones, tablets, and desktops with no app install needed.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans cancel anytime. Yearly plans get 2 months free plus migration support.' },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [billing, setBilling] = useState('monthly');
  useReveal();
  return (
    <div className="landing-page" id="home">
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" className="lp-logo" aria-label="TuitionPro home">
            <span className="lp-logo-mark" aria-hidden="true">🎓</span>
            <span>Tuition<strong>Pro</strong></span>
          </Link>
          <nav className={`lp-links ${menuOpen ? 'open' : ''}`} aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className={l.label === 'Home' ? 'active' : ''}>{l.label}</a>
            ))}
            <span className="lp-mobile-ctas">
              <Link to="/login" className="lp-btn lp-btn-ghost">Login</Link>
              <Link to="/register" className="lp-btn lp-btn-primary">Get Started Free Trial →</Link>
            </span>
          </nav>
          <div className="lp-nav-ctas">
            <Link to="/login" className="lp-btn lp-btn-ghost">Login</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">Get Started Free Trial <span aria-hidden="true">→</span></Link>
          </div>
          <button className="lp-hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>☰</button>
        </div>
      </header>
      <section className="lp-hero">
        <div className="lp-blob lp-blob-1" aria-hidden="true" />
        <div className="lp-blob lp-blob-2" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy reveal">
            <span className="lp-pill">✨ Trusted by 500+ Tuition Institutes</span>
            <h1>Run Your Tuition Institute Smarter with <span className="lp-gradient">TuitionPro</span></h1>
            <p className="lp-sub">Manage students, batches, attendance, fees, enquiries and more — all in one easy and powerful platform.</p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">Get Started Free Trial <span aria-hidden="true">→</span></Link>
              <a href="#demo" className="lp-btn lp-btn-white lp-btn-lg"><span className="lp-play" aria-hidden="true">▶</span> Watch Demo</a>
            </div>
            <ul className="lp-ticks">
              <li><i aria-hidden="true">✓</i> No credit card required</li>
              <li><i aria-hidden="true">✓</i> Free 14-day trial</li>
              <li><i aria-hidden="true">✓</i> Easy setup</li>
            </ul>
          </div>
          <div className="lp-hero-visual reveal" id="demo">
            <div className="lp-dash-note">Manage Everything<br />in One Place <span aria-hidden="true">⤵</span></div>
            <div className="lp-dash">
              <aside className="lp-dash-side">
                <div className="lp-dash-brand">🎓 TuitionPro</div>
                <span className="on">👤 Dashboard</span>
                <span>👥 Students</span>
                <span>▦ Batches</span>
                <span>🗓 Attendance</span>
                <span>₹ Fees &amp; Payments</span>
                <span>✉ Enquiries</span>
                <span>📊 Reports</span>
                <span>⚙ Settings</span>
                <div className="lp-dash-tip">💡</div>
              </aside>
              <div className="lp-dash-main">
                <div className="lp-dash-top"><span className="lp-search">⌕ Search students, batches...</span><span className="lp-bell">🔔</span><span className="lp-owner">🙂 Owner ▾</span></div>
                <div className="lp-dash-hello"><div><strong>Good morning, Owner! 👋</strong><small>Here&apos;s what&apos;s happening at your institute today.</small></div><span className="lp-chip">📅 This Month ▾</span></div>
                <div className="lp-stats">
                  <div><small>Total Students</small><strong>248</strong><em className="up">+12% from last month</em></div>
                  <div><small>Active Batches</small><strong>16</strong><em className="up">+2 new</em></div>
                  <div><small>Fees Collected</small><strong>₹1,25,000</strong><em className="up">+18% from last month</em></div>
                  <div><small>Pending Fees</small><strong className="red">₹32,000</strong><em>18 students</em></div>
                </div>
                <div className="lp-dash-grid">
                  <div className="lp-chart"><div className="lp-chart-head"><strong>Admissions &amp; Growth</strong><span>Last 6 Months ▾</span></div><div className="lp-bars"><i style={{ height: '34%' }} /><i style={{ height: '45%' }} /><i style={{ height: '52%' }} /><i style={{ height: '64%' }} /><i style={{ height: '74%' }} /><i style={{ height: '92%' }} /></div><div className="lp-bar-labels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div></div>
                  <div className="lp-activity"><div className="lp-chart-head"><strong>Recent Activities</strong><Link to="/register">View All</Link></div><ul><li><b>👤</b><span>New student enrolled<small>Rahul Patel • 2 hrs ago</small></span></li><li><b>₹</b><span>Fee payment received<small>₹5,000 Priya Shah • 4 hrs ago</small></span></li><li><b>✉</b><span>New enquiry<small>Mehta Family • 6 hrs ago</small></span></li><li><b>▦</b><span>Batch created<small>Class 10 Science • 1 day ago</small></span></li></ul></div>
                </div>
              </div>
            </div>
            <div className="lp-float lp-float-a">✓ Attendance Saved</div>
            <div className="lp-float lp-float-b">₹ Fee Received +₹5,000</div>
          </div>
        </div>
        <div className="lp-strip">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="lp-strip-item reveal">
              <span className="lp-strip-icon" style={{ background: h.bg, color: h.color }} aria-hidden="true">{h.icon}</span>
              <strong>{h.title}</strong>
              <small>{h.text}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="lp-why" id="features">
        <div className="lp-section-inner">
          <div className="lp-why-copy reveal">
            <span className="lp-pill lp-pill-small">✦ WHY TUITIONPRO?</span>
            <h2>Everything You Need<br />To <span className="lp-gradient">Grow Your Institute</span></h2>
            <p>TuitionPro helps you save time, stay organized, and focus on what matters most — your students.</p>
            <Link to="/register" className="lp-btn lp-btn-primary">Get Started Free Trial →</Link>
          </div>
          <div className="lp-why-cards">
            {WHY.map((w) => (
              <article key={w.title} className="lp-why-card reveal" style={{ background: w.bg }}>
                <span aria-hidden="true">{w.icon}</span>
                <strong>{w.title}</strong>
                <p>{w.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="lp-section" id="pricing">
        <div className="lp-section-inner lp-center reveal">
          <span className="lp-pill lp-pill-small">PRICING</span>
          <h2>Simple pricing that pays for itself</h2>
          <p className="lp-muted">Start free for 14 days. No credit card. Cancel anytime.</p>
          <div className="lp-toggle" role="tablist" aria-label="Billing period">
            <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
            <button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>Yearly <em>-20%</em></button>
          </div>
          <div className="lp-plans">
            {PLANS.map((p) => (
              <article key={p.name} className={`lp-plan reveal ${p.featured ? 'featured' : ''}`}>
                {p.featured && <span className="lp-pop">MOST POPULAR</span>}
                <h3>{p.name}</h3>
                <p className="lp-muted">{p.desc}</p>
                <div className="lp-price"><strong>₹{(billing === 'monthly' ? p.monthly : p.yearly).toLocaleString('en-IN')}</strong><small>/month{billing === 'yearly' ? ', billed yearly' : ''}</small></div>
                <ul>{p.features.map((f) => <li key={f}><i aria-hidden="true">✓</i> {f}</li>)}</ul>
                <Link to="/register" className={`lp-btn ${p.featured ? 'lp-btn-primary' : 'lp-btn-ghost'} lp-btn-block`}>{p.cta} →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="lp-section lp-alt" id="testimonials">
        <div className="lp-section-inner lp-center reveal">
          <span className="lp-pill lp-pill-small">TESTIMONIALS</span>
          <h2>Loved by tuition owners</h2>
          <div className="lp-tests">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="lp-test">
                <div className="lp-stars" aria-label="5 star rating">★★★★★</div>
                <blockquote>“{t.quote}”</blockquote>
                <figcaption><span className="lp-avatar" aria-hidden="true">{t.init}</span><span><strong>{t.name}</strong><small>{t.person}</small></span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="lp-section" id="faq">
        <div className="lp-section-inner lp-center reveal">
          <span className="lp-pill lp-pill-small">FAQ</span>
          <h2>Questions? Answered.</h2>
          <div className="lp-faq">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`lp-faq-item ${openFaq === i ? 'open' : ''}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>{f.q}<span>{openFaq === i ? '−' : '+'}</span></button>
                {openFaq === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="lp-cta reveal">
        <div className="lp-cta-inner">
          <h2>Ready to run your institute smarter?</h2>
          <p>Join 500+ tuition institutes already growing with TuitionPro.</p>
          <div className="lp-hero-actions lp-center-row">
            <Link to="/register" className="lp-btn lp-btn-white lp-btn-lg">Get Started Free Trial →</Link>
            <Link to="/login" className="lp-btn lp-btn-outline-light lp-btn-lg">Login →</Link>
          </div>
          <small>No credit card required • Free 14-day trial • Cancel anytime</small>
        </div>
      </section>
      <footer className="lp-footer">
        <div className="lp-section-inner lp-foot-grid">
          <div><Link to="/" className="lp-logo"><span className="lp-logo-mark" aria-hidden="true">🎓</span><span>Tuition<strong>Pro</strong></span></Link><p className="lp-muted">All-in-one platform for tuition institutes to manage students, batches, fees, and growth.</p></div>
          <div><strong>Product</strong><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#demo">Live Demo</a><a href="#faq">FAQ</a></div>
          <div><strong>Company</strong><a href="#testimonials">Customers</a><a href="#home">About</a><a href="#pricing">Plans</a></div>
          <div><strong>Get started</strong><Link to="/register">Get Started Free Trial →</Link><Link to="/login">Login →</Link><Link to="/register">Free 14-day trial</Link></div>
        </div>
        <div className="lp-foot-base">© {new Date().getFullYear()} TuitionPro • Made for tuition institutes in India</div>
      </footer>
    </div>
  );
}
