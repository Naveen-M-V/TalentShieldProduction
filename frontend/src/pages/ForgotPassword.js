import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeIcon as MailIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { buildApiUrl } from '../utils/apiConfig';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .fp-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
  }

  @keyframes fpFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fpFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fpSlideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fpPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 0.8; transform: scale(1.08); }
  }
  @keyframes fpShake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-5px); }
    40%       { transform: translateX(5px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fp-fade-up   { animation: fpFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .fp-fade-in   { animation: fpFadeIn 0.4s ease both; }
  .fp-slide-down { animation: fpSlideDown 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .fp-shake     { animation: fpShake 0.4s ease; }
  .delay-100    { animation-delay: 0.10s; }
  .delay-200    { animation-delay: 0.20s; }
  .delay-300    { animation-delay: 0.30s; }
  .delay-400    { animation-delay: 0.40s; }

  /* ── Layout ── */
  .fp-layout {
    display: flex;
    min-height: 100vh;
    width: 100%;
  }

  /* ── Left panel ── */
  .fp-panel-left {
    flex: 0 0 42%; max-width: 42%;
    background: #2f3e46;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    justify-content: space-between;
    padding: 3rem 3rem 2.5rem;
    min-height: 100vh;
  }
  .fp-panel-left::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(82,121,111,0.35) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(53,79,82,0.5) 0%, transparent 55%);
    pointer-events: none;
  }
  .fp-panel-left-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 40px 40px; pointer-events: none;
  }
  .fp-orb {
    position: absolute; border-radius: 50%;
    filter: blur(60px); opacity: 0.18; pointer-events: none;
  }
  .fp-orb-1 { width: 300px; height: 300px; background: #84a98c; top: -70px; right: -70px; animation: fpPulse 6s ease-in-out infinite; }
  .fp-orb-2 { width: 200px; height: 200px; background: #52796f; bottom: 40px; left: -50px; animation: fpPulse 8s ease-in-out infinite 2s; }

  .fp-logo-wrap {
    width: 68px; height: 68px; border-radius: 18px;
    background: rgba(202,210,197,0.10);
    border: 1px solid rgba(202,210,197,0.18);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.2);
    position: relative; z-index: 1; flex-shrink: 0;
  }
  .fp-brand-eyebrow {
    font-size: 0.62rem; font-weight: 500; letter-spacing: 0.2em;
    text-transform: uppercase; color: #84a98c;
    position: relative; z-index: 1;
  }
  .fp-brand-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 300;
    font-size: 2.8rem; line-height: 1.1; color: #cad2c5; letter-spacing: -0.01em;
    position: relative; z-index: 1;
  }
  .fp-brand-subtitle {
    font-size: 0.875rem; color: rgba(202,210,197,0.6); line-height: 1.6; font-weight: 300;
    position: relative; z-index: 1;
  }
  .fp-feature-item {
    display: flex; align-items: center; gap: 0.75rem;
    color: rgba(202,210,197,0.7); font-size: 0.8rem; font-weight: 300;
    position: relative; z-index: 1;
  }
  .fp-feature-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #84a98c; flex-shrink: 0;
  }
  .fp-left-footer {
    font-size: 0.7rem; color: rgba(202,210,197,0.35);
    letter-spacing: 0.05em; font-weight: 400;
    position: relative; z-index: 1;
  }

  /* ── Mobile header strip ── */
  .fp-mobile-header {
    display: none;
    background: #2f3e46; position: relative; overflow: hidden;
    padding: 1.5rem 1.25rem 1.75rem;
  }
  .fp-mobile-header::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 10% 50%, rgba(82,121,111,0.4) 0%, transparent 60%),
      radial-gradient(ellipse at 90% 10%, rgba(53,79,82,0.5) 0%, transparent 50%);
    pointer-events: none;
  }
  .fp-mobile-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 32px 32px; pointer-events: none;
  }
  .fp-mobile-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 1rem;
  }
  .fp-mobile-logo {
    width: 50px; height: 50px; border-radius: 13px;
    background: rgba(202,210,197,0.10);
    border: 1px solid rgba(202,210,197,0.18);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px); flex-shrink: 0;
  }
  .fp-mobile-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c; margin-bottom: 0.15rem;
  }
  .fp-mobile-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 300;
    font-size: 1.6rem; line-height: 1.1; color: #cad2c5; letter-spacing: -0.01em;
  }

  /* ── Right panel ── */
  .fp-panel-right {
    flex: 1; background: #f7f8f6;
    display: flex; align-items: center; justify-content: center;
    padding: 2.5rem; min-height: 100vh; position: relative;
  }
  .fp-panel-right::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 10%, rgba(132,169,140,0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  .fp-card {
    width: 100%; max-width: 420px; position: relative; z-index: 1;
  }

  /* ── Back link ── */
  .fp-back-link {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-size: 0.75rem; font-weight: 500;
    color: #52796f; text-decoration: none;
    letter-spacing: 0.04em;
    transition: color 0.18s, gap 0.18s;
    margin-bottom: 1.75rem;
  }
  .fp-back-link:hover { color: #354f52; gap: 0.55rem; }
  .fp-back-link svg { width: 13px; height: 13px; flex-shrink: 0; }

  /* ── Heading ── */
  .fp-heading {
    font-family: 'Cormorant Garamond', serif; font-size: 2rem;
    font-weight: 400; color: #2f3e46; letter-spacing: -0.02em; line-height: 1.2;
  }
  .fp-subheading {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300; margin-top: 0.3rem; line-height: 1.5;
  }

  /* ── Icon container ── */
  .fp-icon-circle {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.3);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(47,62,70,0.25);
    margin-bottom: 1.25rem;
  }
  .fp-icon-circle svg { width: 22px; height: 22px; color: #cad2c5; }

  /* ── Alerts ── */
  .fp-alert-error {
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 8px; padding: 0.85rem 1rem;
    display: flex; gap: 0.65rem; align-items: flex-start;
  }
  .fp-alert-error-icon {
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(192,117,106,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .fp-alert-error-text { font-size: 0.8rem; color: #7a3028; font-weight: 400; line-height: 1.5; }

  .fp-alert-success {
    border-left: 3px solid #52796f;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border-radius: 8px; padding: 0.85rem 1rem;
    display: flex; gap: 0.65rem; align-items: flex-start;
  }
  .fp-alert-success-icon {
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(82,121,111,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .fp-alert-success-text { font-size: 0.8rem; color: #2f3e46; font-weight: 400; line-height: 1.5; }

  /* ── Field ── */
  .fp-label {
    display: block; font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #52796f; margin-bottom: 0.5rem;
  }
  .fp-field-wrap { position: relative; }
  .fp-field-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: #84a98c; pointer-events: none; display: flex; align-items: center;
  }
  .fp-field-icon svg { width: 16px; height: 16px; }
  .fp-input {
    width: 100%; padding: 0.82rem 1rem 0.82rem 2.8rem;
    border: 1.5px solid #d4ddd6; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 16px; color: #2f3e46;
    background: #fff; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    -webkit-appearance: none; appearance: none;
  }
  .fp-input:hover:not(:disabled) { border-color: #84a98c; background: #fafcfa; }
  .fp-input:focus { border-color: #52796f; box-shadow: 0 0 0 3px rgba(82,121,111,0.12); background: #fff; }
  .fp-input:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Submit button ── */
  .fp-submit {
    width: 100%; padding: 0.95rem;
    border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 600;
    letter-spacing: 0.04em; cursor: pointer;
    transition: all 0.22s cubic-bezier(0.22,1,0.36,1);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    position: relative; overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .fp-submit-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5; box-shadow: 0 4px 18px rgba(53,79,82,0.3);
  }
  .fp-submit-active:hover {
    transform: translateY(-1px); box-shadow: 0 8px 26px rgba(53,79,82,0.38);
  }
  .fp-submit-active:active { transform: translateY(0); }
  .fp-submit-disabled { background: #d4ddd6; color: #8fa99a; cursor: not-allowed; box-shadow: none; }

  /* ── Footer ── */
  .fp-form-footer {
    height: 1px;
    background: linear-gradient(90deg, transparent, #d4ddd6, transparent);
    margin: 1.5rem 0 1.25rem;
  }
  .fp-footer-text {
    font-size: 0.78rem; color: #8fa99a; text-align: center; font-weight: 300;
  }
  .fp-footer-link {
    color: #52796f; font-weight: 500; text-decoration: none; transition: color 0.2s;
  }
  .fp-footer-link:hover { color: #354f52; text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 767px) {
    .fp-layout { flex-direction: column; min-height: auto; }
    .fp-panel-left { display: none !important; }
    .fp-mobile-header { display: block; }
    .fp-panel-right {
      min-height: auto; flex: 1; align-items: flex-start;
      padding: 2rem 1.5rem;
      padding-bottom: max(2rem, calc(1.5rem + env(safe-area-inset-bottom)));
    }
    .fp-card { max-width: 100%; }
    .fp-heading { font-size: 1.75rem; }
  }
  @media (max-width: 479px) {
    .fp-mobile-header { padding: 1.15rem 1rem 1.4rem; }
    .fp-panel-right { padding: 1.5rem 1rem; }
    .fp-heading { font-size: 1.5rem; }
    .fp-subheading { font-size: 0.78rem; }
  }
  @media (min-width: 1280px) {
    .fp-panel-left { flex: 0 0 44%; max-width: 44%; }
    .fp-brand-title { font-size: 3rem; }
  }
`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    if (!email) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("If an account with this email exists, a password reset link has been sent to your email address. Please check your inbox and follow the instructions.");
      } else {
        setError(data.message || "Failed to send reset email. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="fp-root">

        {/* ── Mobile header strip ── */}
        <div className="fp-mobile-header">
          <div className="fp-mobile-grid"></div>
          <div className="fp-mobile-inner fp-fade-in">
            <div className="fp-mobile-logo">
              <img
                src="/TSL.png" alt="TSL Logo"
                style={{ width: 30, height: 30, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
              />
              <svg style={{ width: 20, height: 20, color: '#84a98c', display: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="fp-mobile-eyebrow">Human Resource Management</p>
              <h1 className="fp-mobile-title">Talent Shield</h1>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="fp-layout">

          {/* Left panel */}
          <div className="fp-panel-left">
            <div className="fp-panel-left-grid"></div>
            <div className="fp-orb fp-orb-1"></div>
            <div className="fp-orb fp-orb-2"></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="fp-logo-wrap fp-fade-in" style={{ marginBottom: '2rem' }}>
                <img
                  src="/TSL.png" alt="TSL Logo"
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                />
                <svg style={{ width: 26, height: 26, color: '#84a98c', display: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="fp-brand-eyebrow fp-fade-up delay-100">Human Resource Management</p>
              <h1 className="fp-brand-title fp-fade-up delay-200" style={{ marginTop: '0.4rem', marginBottom: '1rem' }}>
                Talent<br />Shield
              </h1>
              <p className="fp-brand-subtitle fp-fade-up delay-300" style={{ maxWidth: 280 }}>
                A unified platform for workforce management, payroll, and performance insights.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {["Role-based access control", "Real-time attendance tracking", "Payroll & document management", "Secure, GDPR-compliant data"].map((feat, i) => (
                <div key={feat} className={`fp-feature-item fp-fade-up delay-${(i + 3) * 100}`}>
                  <span className="fp-feature-dot"></span>
                  {feat}
                </div>
              ))}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ height: '1px', background: 'rgba(202,210,197,0.12)', marginBottom: '1.25rem' }}></div>
              <p className="fp-left-footer">© 2025 Vitrux Shield Ltd · England & Wales</p>
            </div>
          </div>

          {/* Right panel */}
          <div className="fp-panel-right">
            <div className="fp-card">

              {/* Icon + heading */}
              <div className="fp-fade-up" style={{ marginBottom: '1.75rem' }}>
                <div className="fp-icon-circle">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="fp-heading">Reset your password</h2>
                <p className="fp-subheading">Enter your email address and we'll send you a link to get back into your account.</p>
              </div>

              {/* Back link */}
              <Link to="/login" className="fp-back-link fp-fade-up delay-100">
                <ArrowLeftIcon style={{ width: 13, height: 13 }} />
                Back to sign in
              </Link>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Error alert */}
                {error && (
                  <div className={`fp-alert-error fp-slide-down ${error ? 'fp-shake' : ''}`}>
                    <div className="fp-alert-error-icon">
                      <svg style={{ width: 12, height: 12, color: '#b85c50' }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="fp-alert-error-text">{error}</p>
                  </div>
                )}

                {/* Success alert */}
                {message && (
                  <div className="fp-alert-success fp-slide-down">
                    <div className="fp-alert-success-icon">
                      <svg style={{ width: 12, height: 12, color: '#52796f' }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="fp-alert-success-text">{message}</p>
                  </div>
                )}

                {/* Email field */}
                <div className="fp-fade-up delay-200">
                  <label htmlFor="email" className="fp-label">Email address</label>
                  <div className="fp-field-wrap">
                    <span className="fp-field-icon">
                      <MailIcon aria-hidden="true" />
                    </span>
                    <input
                      id="email" name="email" type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter your registered email"
                      className="fp-input"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="fp-fade-up delay-300" style={{ paddingTop: '0.15rem' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`fp-submit ${isSubmitting ? 'fp-submit-disabled' : 'fp-submit-active'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Reset Link…
                      </>
                    ) : (
                      <>
                        <svg style={{ width: 15, height: 15, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        Send Reset Link
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="fp-fade-up delay-400">
                <div className="fp-form-footer"></div>
                <p className="fp-footer-text">
                  Remember your password?{' '}
                  <Link to="/login" className="fp-footer-link">Sign in here</Link>
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default ForgotPassword;