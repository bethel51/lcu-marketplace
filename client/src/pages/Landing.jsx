import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ listings: 0, students: 0, categories: 6 });
  const [visibleSection, setVisibleSection] = useState({});

  useEffect(() => {
    // Fetch total listing count for the stats section
    fetch(`${API_URL}/api/products/count`)
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setStats(prev => ({
            ...prev,
            listings: data.count,
            students: Math.max(data.count * 2, 50),
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Animations trigger immediately or bypass observer if hidden
  useEffect(() => {
    setVisibleSection({
      'cats-section': true,
      'features-section': true,
      'how-section': true,
      'cta-section': true
    });
  }, []);

  const onboardingSlides = [
    { title: "Buy from students", desc: "Browse pre-loved items, gadgets, textbook materials, and services from verified peers on campus.", icon: "🛍️" },
    { title: "Sell what you no longer need", desc: "Quickly post your items, negotiate direct transaction locations, and cash out safely.", icon: "💰" },
    { title: "Swap within campus", desc: "Easily swap hostel accessories or study materials directly inside Lead City grounds.", icon: "🔄" }
  ];

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % onboardingSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: '🔒',
      title: 'Safe & Trusted',
      desc: 'Only verified Lead City University students can post. Every seller goes through our student verification flow.',
      color: '#3b82f6',
    },
    {
      icon: '🎓',
      title: 'LCU Verified Sellers',
      desc: 'Look for the LCU Verified badge on seller profiles — it means they\'re confirmed LCU students with a valid matric number.',
      color: '#10b981',
    },
    {
      icon: '📍',
      title: 'Find by Hostel & Faculty',
      desc: 'Filter listings by your hostel block or faculty. Get items from students right in your building or department.',
      color: '#f59e0b',
    },
    {
      icon: '🤝',
      title: 'Campus Meetups',
      desc: 'Set an agreed location within campus grounds to check and trade products securely face-to-face.',
      color: '#8b5cf6',
    },
    {
      icon: '📦',
      title: 'All Categories',
      desc: 'Hostel items, gadgets, textbooks, handouts, student services — everything a Lead City student needs.',
      color: '#ef4444',
    },
    {
      icon: '⚡',
      title: 'Instant Listings',
      desc: 'Post your item in under 2 minutes. Add photos, set your price, and watch the offers roll in.',
      color: '#06b6d4',
    },
  ];

  const steps = [
    { num: '01', title: 'Create Your Account', desc: 'Sign up with your LCU email. It only takes 60 seconds.' },
    { num: '02', title: 'Browse or List', desc: 'Search thousands of student listings or post your own item for free.' },
    { num: '03', title: 'Connect & Trade', desc: 'Agree on a location and exchange items safely on campus.' },
  ];

  const categories = [
    { icon: '🏠', name: 'Hostel Items', desc: 'Fridges, fans, mattresses…' },
    { icon: '💻', name: 'Gadgets', desc: 'Laptops, phones, accessories…' },
    { icon: '📚', name: 'Textbooks', desc: 'Course books, handouts, notes…' },
    { icon: '🛠️', name: 'Services', desc: 'Tutoring, printing, repairs…' },
  ];


  return (
    <div className="landing-page">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container landing-hero-inner">
          <div className="landing-hero-badge">
            <span className="badge-dot" />
            For LCU Students Only
          </div>
          <h1 className="landing-hero-title">
            Buy, Sell &amp; Swap<br />
            <span className="landing-hero-accent">On Campus</span>
          </h1>
          <p className="landing-hero-sub">
            The easiest way to buy and sell stuff at Lead City University. 
            Find phones, laptops, textbooks, and hostel items from other students.
          </p>
          <div className="landing-hero-ctas">
            {user ? (
              <>
                <Link to="/marketplace" className="btn-primary landing-btn-lg">
                  Browse Marketplace →
                </Link>
                <Link to="/post" className="btn-secondary landing-btn-lg">
                  + Post an Item
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" className="btn-primary landing-btn-lg">
                  Get Started Free →
                </Link>
                <Link to="/marketplace" className="btn-secondary landing-btn-lg">
                  Browse Listings
                </Link>
              </>
            )}
          </div>

          {/* Stats Row */}
          <div className="landing-stats">
            <div className="landing-stat">
              <span className="landing-stat-num">{stats.listings}+</span>
              <span className="landing-stat-label">Active Listings</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-num">{stats.students}+</span>
              <span className="landing-stat-label">Student Members</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-num">{stats.categories}</span>
              <span className="landing-stat-label">Categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Slider / Carousel */}
      <section className="landing-onboarding container" style={{ marginTop: '40px', marginBottom: '40px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
            {onboardingSlides[activeSlide].icon}
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px', color: 'var(--text-primary)' }}>
            {onboardingSlides[activeSlide].title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 24px auto', fontSize: '1.05rem', lineHeight: '1.6' }}>
            {onboardingSlides[activeSlide].desc}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {onboardingSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                style={{
                  width: idx === activeSlide ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: idx === activeSlide ? 'var(--gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>


      {/* ─── CATEGORY PILLS ───────────────────────────────────── */}
      <section
        id="cats-section"
        className={`landing-section observe-section${visibleSection['cats-section'] ? ' section-visible' : ''}`}
      >
        <div className="container">
          <p className="landing-section-eyebrow">What can you find?</p>
          <h2 className="landing-section-title">Everything a Student Needs</h2>
          <div className="landing-cats-grid">
            {categories.map((c, i) => (
              <Link to="/marketplace" key={c.name} className="landing-cat-card" style={{ '--i': i }}>
                <span className="landing-cat-icon">{c.icon}</span>
                <span className="landing-cat-name">{c.name}</span>
                <span className="landing-cat-desc">{c.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section
        id="features-section"
        className={`landing-section observe-section${visibleSection['features-section'] ? ' section-visible' : ''}`}
      >
        <div className="container">
          <p className="landing-section-eyebrow">Why LCU Marketplace?</p>
          <h2 className="landing-section-title">Built for LCU Students, by LCU Students</h2>
          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className="landing-feature-card glass-panel" style={{ '--i': i }}>
                <div className="landing-feature-icon" style={{ background: `${f.color}18`, border: `1px solid ${f.color}35`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section
        id="how-section"
        className={`landing-section landing-section-alt observe-section${visibleSection['how-section'] ? ' section-visible' : ''}`}
      >
        <div className="container">
          <p className="landing-section-eyebrow">Simple Process</p>
          <h2 className="landing-section-title">How It Works</h2>
          <div className="landing-steps">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="landing-step glass-panel" style={{ '--i': i }}>
                  <div className="landing-step-num">{s.num}</div>
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="landing-step-desc">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="landing-step-arrow" aria-hidden="true">→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ───────────────────────────────────────── */}
      <section
        id="cta-section"
        className={`landing-section observe-section${visibleSection['cta-section'] ? ' section-visible' : ''}`}
      >
        <div className="container">
          <div className="landing-cta-card glass-panel">
            <div className="landing-cta-orb" aria-hidden="true" />
            <div className="landing-cta-badge">🎓 LCU Students Only</div>
            <h2 className="landing-cta-title">
              Ready to Join the LCU Marketplace?
            </h2>
            <p className="landing-cta-sub">
              Sign up in under a minute. Start buying, selling, and connecting with fellow LCU students today.
            </p>
            <div className="landing-cta-actions">
              {user ? (
                <Link to="/marketplace" className="btn-primary landing-btn-lg">
                  Go to Marketplace →
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="btn-primary landing-btn-lg">
                    Create Free Account →
                  </Link>
                  <Link to="/marketplace" className="btn-secondary landing-btn-lg">
                    Browse First
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
