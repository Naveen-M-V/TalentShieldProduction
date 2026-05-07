// src/pages/Login.js
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { EyeIcon } from '@heroicons/react/24/outline';
import { EyeSlashIcon as EyeOffIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { EnvelopeIcon as MailIcon } from '@heroicons/react/24/outline';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .login-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 0.8; transform: scale(1.08); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up    { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in    { animation: fadeIn 0.4s ease both; }
  .anim-slide-left { animation: slideInLeft 0.65s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-slide-down { animation: slideInDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-shake      { animation: shake 0.45s ease; }

  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }
  .delay-400 { animation-delay: 0.40s; }
  .delay-500 { animation-delay: 0.50s; }
  .delay-600 { animation-delay: 0.60s; }

  /* ══════════════════════════════════════
     LAYOUT
  ══════════════════════════════════════ */
  .login-layout {
    display: flex;
    min-height: 100vh;
    width: 100%;
  }

  /* ── Left panel (desktop/tablet-landscape) ── */
  .panel-left {
    flex: 0 0 42%;
    max-width: 42%;
    background-color: #2f3e46;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 3rem 3rem 2.5rem;
    min-height: 100vh;
  }
  .panel-left::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(82,121,111,0.35) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(53,79,82,0.5) 0%, transparent 55%);
    pointer-events: none;
  }
  .panel-left-orb {
    position: absolute; border-radius: 50%;
    filter: blur(60px); opacity: 0.18; pointer-events: none;
  }
  .orb-1 { width: 320px; height: 320px; background: #84a98c; top: -80px; right: -80px; animation: pulse-ring 6s ease-in-out infinite; }
  .orb-2 { width: 220px; height: 220px; background: #52796f; bottom: 40px; left: -60px; animation: pulse-ring 8s ease-in-out infinite 2s; }
  .panel-left-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
  .brand-logo-wrap {
    width: 102px; height: 102px; border-radius: 20px;
    background: rgba(202,210,197,0.10);
    border: 1px solid rgba(202,210,197,0.18);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.2); flex-shrink: 0;
  }
  .brand-eyebrow {
    font-family: 'DM Sans', sans-serif; font-size: 0.65rem;
    font-weight: 500; letter-spacing: 0.2em;
    text-transform: uppercase; color: #84a98c;
  }
  .brand-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 300;
    font-size: 2.8rem; line-height: 1.1; color: #cad2c5; letter-spacing: -0.01em;
  }
  .brand-subtitle {
    font-size: 0.875rem; color: rgba(202,210,197,0.6); line-height: 1.6; font-weight: 300;
  }
  .left-feature-item {
    display: flex; align-items: center; gap: 0.75rem;
    color: rgba(202,210,197,0.7); font-size: 0.8rem; font-weight: 300; letter-spacing: 0.01em;
  }
  .left-feature-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #84a98c; flex-shrink: 0;
  }
  .left-footer-text {
    font-size: 0.7rem; color: rgba(202,210,197,0.35); letter-spacing: 0.05em; font-weight: 400;
  }

  /* ── Mobile header strip (hidden on desktop) ── */
  .mobile-header {
    display: none;
    background: #2f3e46;
    position: relative; overflow: hidden;
    padding: 1.5rem 1.25rem 1.75rem;
  }
  .mobile-header::before {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 10% 50%, rgba(82,121,111,0.4) 0%, transparent 60%),
      radial-gradient(ellipse at 90% 10%, rgba(53,79,82,0.5) 0%, transparent 50%);
    pointer-events: none;
  }
  .mobile-header-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.04) 1px, transparent 1px);
    background-size: 32px 32px; pointer-events: none;
  }
  .mobile-header-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 1rem;
  }
  .mobile-logo-wrap {
    width: 52px; height: 52px; border-radius: 14px;
    background: rgba(202,210,197,0.10);
    border: 1px solid rgba(202,210,197,0.18);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px); flex-shrink: 0;
  }
  .mobile-brand-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c; margin-bottom: 0.15rem;
  }
  .mobile-brand-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 300;
    font-size: 1.6rem; line-height: 1.1; color: #cad2c5; letter-spacing: -0.01em;
  }

  /* ── Right panel ── */
  .panel-right {
    flex: 1;
    background: #f7f8f6;
    display: flex; align-items: center; justify-content: center;
    padding: 2.5rem;
    min-height: 100vh;
    position: relative;
  }
  .panel-right::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 10%, rgba(132,169,140,0.08) 0%, transparent 50%);
    pointer-events: none;
  }
  .form-card {
    width: 100%; max-width: 420px; position: relative; z-index: 1;
  }
  .form-heading {
    font-family: 'Cormorant Garamond', serif; font-size: 2rem;
    font-weight: 400; color: #2f3e46; letter-spacing: -0.02em; line-height: 1.2;
  }
  .form-subheading {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300; margin-top: 0.25rem;
  }

  /* ── Inputs ── */
  .field-label {
    display: block; font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase; color: #52796f; margin-bottom: 0.5rem;
  }
  .field-wrap { position: relative; }
  .field-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: #84a98c; pointer-events: none; display: flex; align-items: center;
  }
  .field-input {
    width: 100%; padding: 0.8rem 1rem 0.8rem 2.8rem;
    border: 1.5px solid #d4ddd6; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.875rem; color: #2f3e46;
    background: #fff; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
    -webkit-appearance: none; appearance: none;
  }
  .field-input:hover:not(:disabled) { border-color: #84a98c; background: #fafcfa; }
  .field-input:focus { border-color: #52796f; box-shadow: 0 0 0 3px rgba(82,121,111,0.12); background: #fff; }
  .field-input.has-error { border-color: #c0756a; box-shadow: 0 0 0 3px rgba(192,117,106,0.10); }
  .field-input:disabled { opacity: 0.55; cursor: not-allowed; }
  .field-input-password { padding-right: 2.8rem; }

  .eye-btn {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    color: #84a98c; background: none; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.2s;
    min-width: 36px; min-height: 36px; padding: 4px;
    -webkit-tap-highlight-color: transparent;
  }
  .eye-btn:hover { color: #52796f; }

  .field-error {
    display: flex; align-items: center; gap: 0.3rem;
    margin-top: 0.4rem; font-size: 0.75rem; color: #b85c50; font-weight: 400;
  }

  /* ── Alerts ── */
  .alert-success {
    border-left: 3px solid #52796f;
    background: linear-gradient(135deg, #f0f5f2, #eaf2ec);
    border-radius: 8px; padding: 0.85rem 1rem;
    display: flex; gap: 0.65rem; align-items: flex-start;
  }
  .alert-success-icon {
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(82,121,111,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .alert-success-text { font-size: 0.8rem; color: #2f3e46; font-weight: 400; line-height: 1.5; }
  .alert-error {
    border-left: 3px solid #c0756a;
    background: linear-gradient(135deg, #fdf3f2, #fdecea);
    border-radius: 8px; padding: 0.85rem 1rem;
    display: flex; gap: 0.65rem; align-items: flex-start;
  }
  .alert-error-icon {
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(192,117,106,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .alert-error-text { font-size: 0.8rem; color: #7a3028; font-weight: 400; line-height: 1.5; }

  /* ── Remember / Forgot ── */
  .remember-row { display: flex; align-items: center; justify-content: space-between; }
  .remember-left { display: flex; align-items: center; gap: 0.5rem; }
  .remember-checkbox { accent-color: #52796f; width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
  .remember-label { font-size: 0.8rem; color: #52796f; font-weight: 400; cursor: pointer; }
  .forgot-link {
    font-size: 0.8rem; color: #52796f; font-weight: 500;
    text-decoration: none; transition: color 0.2s; letter-spacing: 0.01em; padding: 4px 0;
  }
  .forgot-link:hover { color: #354f52; text-decoration: underline; }

  /* ── Submit button ── */
  .submit-btn {
    width: 100%; padding: 0.95rem; border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600;
    letter-spacing: 0.04em; cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    position: relative; overflow: hidden;
    -webkit-tap-highlight-color: transparent;
  }
  .submit-btn-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    color: #cad2c5; box-shadow: 0 4px 18px rgba(53,79,82,0.3);
  }
  .submit-btn-active::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(202,210,197,0.08) 0%, transparent 100%);
    opacity: 0; transition: opacity 0.2s;
  }
  .submit-btn-active:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(53,79,82,0.38); }
  .submit-btn-active:hover::after { opacity: 1; }
  .submit-btn-active:active { transform: translateY(0); }
  .submit-btn-disabled { background: #d4ddd6; color: #8fa99a; cursor: not-allowed; box-shadow: none; }

  /* ── Footer ── */
  .form-footer-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #d4ddd6, transparent);
    margin: 1.5rem 0 1.25rem;
  }
  .form-footer-text { font-size: 0.72rem; color: #8fa99a; text-align: center; line-height: 1.7; font-weight: 300; }
  .form-footer-link {
    color: #52796f; font-weight: 500; background: none; border: none; cursor: pointer;
    text-decoration: underline; font-size: 0.72rem; padding: 0;
    font-family: 'DM Sans', sans-serif; transition: color 0.2s;
  }
  .form-footer-link:hover { color: #354f52; }
  .powered-row { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; }
  .powered-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #84a98c; opacity: 0.7;
    animation: pulse-ring 2.5s ease-in-out infinite;
  }
  .powered-dot:last-child { animation-delay: 1s; }
  .powered-text { font-size: 0.68rem; color: #8fa99a; font-weight: 400; letter-spacing: 0.08em; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(47,62,70,0.65); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 50; animation: fadeIn 0.2s ease;
  }
  .modal-box {
    background: #fff; border-radius: 16px;
    max-width: 640px; width: 100%; max-height: 88vh; overflow: hidden;
    box-shadow: 0 32px 64px rgba(47,62,70,0.25);
    animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
    display: flex; flex-direction: column;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 1.25rem; border-bottom: 1px solid #eaefeb; flex-shrink: 0;
  }
  .modal-title {
    font-family: 'Cormorant Garamond', serif; font-size: 1.25rem;
    font-weight: 400; color: #2f3e46; letter-spacing: -0.01em;
  }
  .modal-close-btn {
    background: none; border: none; cursor: pointer; color: #84a98c;
    padding: 6px; border-radius: 6px; transition: color 0.2s, background 0.2s;
    min-width: 36px; min-height: 36px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .modal-close-btn:hover { color: #2f3e46; background: #f0f5f2; }
  .modal-body {
    padding: 1.1rem 1.25rem; overflow-y: auto; flex: 1;
    color: #4a6258; font-size: 0.82rem; line-height: 1.75; font-weight: 300;
    -webkit-overflow-scrolling: touch;
  }
  .modal-body h4 {
    font-family: 'Cormorant Garamond', serif; font-size: 1.15rem;
    font-weight: 500; color: #2f3e46; margin-bottom: 0.4rem;
  }
  .modal-body h5 {
    font-size: 0.75rem; font-weight: 600; color: #354f52;
    letter-spacing: 0.05em; text-transform: uppercase; margin: 1.1rem 0 0.35rem;
  }
  .modal-body ul { padding-left: 1.2rem; margin-bottom: 0.6rem; }
  .modal-body li { margin-bottom: 0.2rem; }
  .modal-body p { margin-bottom: 0.6rem; }
  .modal-body a { color: #52796f; }
  .modal-footer {
    padding: 0.9rem 1.25rem; border-top: 1px solid #eaefeb;
    background: #f7f8f6; display: flex; justify-content: flex-end; flex-shrink: 0;
  }
  .modal-close-action {
    padding: 0.6rem 1.4rem; background: #354f52; color: #cad2c5;
    border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; font-weight: 500; cursor: pointer;
    letter-spacing: 0.04em; transition: background 0.2s, transform 0.15s; min-height: 40px;
  }
  .modal-close-action:hover { background: #2f3e46; transform: translateY(-1px); }

  /* ── Spinner ── */
  .spinner-page {
    min-height: 100vh; background: #2f3e46;
    display: flex; align-items: center; justify-content: center;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(202,210,197,0.2); border-top-color: #84a98c;
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */

  /* ── Tablet landscape (768–1023px): shrink left panel ── */
  @media (max-width: 1023px) and (min-width: 768px) {
    .panel-left {
      flex: 0 0 40%;
      max-width: 40%;
      padding: 2.25rem 2rem 2rem;
    }
    .brand-title { font-size: 2.2rem; }
    .brand-subtitle { font-size: 0.8rem; }
    .panel-right { padding: 2rem 1.75rem; }
  }

  /* ── Tablet portrait + phones (below 768px): stacked layout ── */
  @media (max-width: 767px) {
    .login-layout  { flex-direction: column; min-height: auto; }
    .panel-left    { display: none !important; }
    .mobile-header { display: block; }

    .panel-right {
      min-height: auto;
      flex: 1;
      align-items: flex-start;
      padding: 2rem 1.75rem;
      padding-bottom: max(2.5rem, calc(1.5rem + env(safe-area-inset-bottom)));
    }
    .form-card { max-width: 100%; }
    .form-heading { font-size: 1.75rem; }
  }

  /* ── Tablet portrait (640–767px) ── */
  @media (max-width: 767px) and (min-width: 640px) {
    .mobile-header { padding: 1.75rem 2rem 2rem; }
    .mobile-logo-wrap { width: 58px; height: 58px; border-radius: 16px; }
    .mobile-brand-title { font-size: 1.8rem; }
    .mobile-brand-eyebrow { font-size: 0.62rem; }
    .panel-right { padding: 2.25rem 2rem; }
    /* Centered card on wider tablets */
    .panel-right { justify-content: center; align-items: center; min-height: calc(100vh - 120px); }
    .form-card { max-width: 480px; }
  }

  /* ── Large phones (480–639px) ── */
  @media (max-width: 639px) {
    .mobile-header { padding: 1.35rem 1.25rem 1.6rem; }
    .mobile-logo-wrap { width: 50px; height: 50px; border-radius: 13px; }
    .mobile-brand-title { font-size: 1.6rem; }
    .panel-right { padding: 1.75rem 1.25rem; }
    .form-heading { font-size: 1.6rem; }

    /* Comfortable touch inputs */
    .field-input { font-size: 16px; padding-top: 0.9rem; padding-bottom: 0.9rem; }
    .submit-btn  { padding: 1rem; font-size: 0.9rem; min-height: 52px; }
  }

  /* ── Standard phones (375–479px) ── */
  @media (max-width: 479px) {
    .mobile-header { padding: 1.15rem 1rem 1.4rem; }
    .mobile-logo-wrap { width: 46px; height: 46px; border-radius: 12px; }
    .mobile-brand-title { font-size: 1.45rem; }
    .mobile-brand-eyebrow { font-size: 0.55rem; letter-spacing: 0.15em; }

    .panel-right { padding: 1.5rem 1rem; padding-bottom: max(1.75rem, calc(1rem + env(safe-area-inset-bottom))); }
    .form-heading { font-size: 1.5rem; }
    .form-subheading { font-size: 0.78rem; }

    /* font-size 16px prevents iOS zoom on input focus */
    .field-input { font-size: 16px; padding-top: 0.85rem; padding-bottom: 0.85rem; }
    .field-label { font-size: 0.68rem; }
    .remember-label, .forgot-link { font-size: 0.78rem; }

    .submit-btn { padding: 0.9rem; font-size: 0.875rem; min-height: 50px; }
    .form-footer-text, .form-footer-link { font-size: 0.7rem; }

    /* Modal slides up from bottom on small phones */
    .modal-overlay { padding: 0; align-items: flex-end; }
    .modal-box { border-radius: 20px 20px 0 0; max-height: 92vh; }
  }

  /* ── Small phones (below 375px — SE, Galaxy A series) ── */
  @media (max-width: 374px) {
    .mobile-header { padding: 1rem 0.875rem 1.25rem; }
    .mobile-logo-wrap { width: 40px; height: 40px; border-radius: 10px; }
    .mobile-brand-title { font-size: 1.3rem; }
    .mobile-brand-eyebrow { letter-spacing: 0.12em; }

    .panel-right { padding: 1.25rem 0.875rem; }
    .form-heading { font-size: 1.35rem; }
    .form-subheading { font-size: 0.75rem; }

    .field-input { font-size: 16px; padding-top: 0.8rem; padding-bottom: 0.8rem; }
    .submit-btn { font-size: 0.85rem; padding: 0.85rem; min-height: 48px; }

    /* Stack remember/forgot on very narrow screens */
    .remember-row { flex-direction: column; align-items: flex-start; gap: 0.6rem; }

    .form-footer-text, .form-footer-link { font-size: 0.68rem; }
  }

  /* ── Wide screens (1280px+): widen left panel slightly ── */
  @media (min-width: 1280px) {
    .panel-left { flex: 0 0 44%; max-width: 44%; }
    .brand-title { font-size: 3rem; }
    .panel-right { padding: 3rem; }
  }
`;

export default function Login() {
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const initializeComponent = () => {
      try {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail && isMounted) {
          setFormData(prev => ({ ...prev, emailOrUsername: savedEmail, rememberMe: true }));
        }
        const urlParams = new URLSearchParams(window.location.search);
        const verified = urlParams.get('verified');
        const error = urlParams.get('error');
        if (verified === 'true') {
          setVerificationMessage("Email verified successfully! You can now login to access your admin dashboard.");
        } else if (error === 'verification_failed') {
          setErrors({ general: "Email verification failed. Please try again or contact support." });
        }
      } catch (error) {
        console.error('Error loading saved email:', error);
      }
      if (isMounted) setIsLoading(false);
    };
    const timer = requestAnimationFrame(() => { initializeComponent(); });
    return () => { isMounted = false; cancelAnimationFrame(timer); };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.emailOrUsername) {
      newErrors.emailOrUsername = "Username or email is required";
    } else if (formData.emailOrUsername.includes('@') && !/\S+@\S+\.\S+/.test(formData.emailOrUsername)) {
      newErrors.emailOrUsername = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const result = await login(formData.emailOrUsername, formData.password, formData.rememberMe);
      if (result.success) {
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', formData.emailOrUsername);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        console.log('🔍 Login Debug - Full result:', result);
        console.log('🔍 Login Debug - User object:', result.user);
        console.log('🔍 Login Debug - User role:', result.user?.role);
        console.log('🔍 Login Debug - User type:', result.user?.userType);
        const userRole = result.user?.role || 'profile';
        const userType = result.user?.userType;
        let redirectPath;
        if (userRole === 'admin' || userRole === 'super-admin') {
          console.log('✅ Routing to: /dashboard (Admin)');
          redirectPath = location.state?.from?.pathname || "/dashboard";
        } else if (['manager', 'senior-manager', 'hr'].includes(userRole)) {
          console.log('✅ Routing to: /manager/dashboard (Manager)');
          redirectPath = "/manager/dashboard";
        } else if (userRole === 'employee') {
          console.log('✅ Routing to: /user-dashboard (Employee)');
          redirectPath = "/user-dashboard";
        } else {
          console.log('✅ Routing to: /user-dashboard (Profile/Default)');
          redirectPath = "/user-dashboard";
        }
        console.log('🎯 Final redirect path:', redirectPath);
        navigate(redirectPath, { replace: true });
      } else {
        setErrors({ general: result.error || "Invalid email or password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ general: error.response?.data?.message || "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="spinner-page login-root">
        <style>{styles}</style>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <style>{styles}</style>
      <div className="login-root">

        {/* ── Mobile / Tablet Header Strip (shown below 768px) ── */}
        <div className="mobile-header">
          <div className="mobile-header-grid"></div>
          <div className="mobile-header-inner anim-slide-down">
            <div className="mobile-logo-wrap">
              <img
                src="/tslnew.png"
                alt="TSL Logo"
                style={{ width: 120, height: 120, objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <svg style={{ width: 22, height: 22, color: '#84a98c', display: 'none', alignItems: 'center', justifyContent: 'center' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="mobile-brand-eyebrow">Human Resource Management</p>
              <h1 className="mobile-brand-title">Talent Shield</h1>
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="login-layout">

          {/* ── Left Panel (desktop / tablet-landscape) ── */}
          <div className="panel-left">
            <div className="panel-left-grid"></div>
            <div className="panel-left-orb orb-1"></div>
            <div className="panel-left-orb orb-2"></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="brand-logo-wrap anim-fade-in" style={{ marginBottom: '2rem' }}>
                <img
                  src="/tslnew.png" alt="TSL Logo"
                  style={{ width: 142, height: 142, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                />
                <svg style={{ width: 68, height: 68, color: '#95a377', display: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="brand-eyebrow anim-slide-left delay-100">Human Resource Management</p>
              <h1 className="brand-title anim-slide-left delay-200" style={{ marginTop: '0.4rem', marginBottom: '1rem' }}>
                Talent<br />Shield
              </h1>
              <p className="brand-subtitle anim-slide-left delay-300" style={{ maxWidth: 280 }}>
                A unified platform for workforce management, payroll, and performance insights.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {["Role-based access control", "Real-time attendance tracking", "Payroll & document management", "Secure, GDPR-compliant data"].map((feat, i) => (
                <div key={feat} className={`left-feature-item anim-fade-up delay-${(i + 3) * 100}`}>
                  <span className="left-feature-dot"></span>
                  {feat}
                </div>
              ))}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ height: '1px', background: 'rgba(202,210,197,0.12)', marginBottom: '1.25rem' }}></div>
              <p className="left-footer-text">© 2025 Vitrux Shield Ltd · England & Wales</p>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="panel-right">
            <div className="form-card">

              <div className="anim-fade-up" style={{ marginBottom: '1.75rem' }}>
                <h2 className="form-heading">Welcome back</h2>
                <p className="form-subheading">Sign in to access your HRMS dashboard</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {verificationMessage && (
                  <div className="alert-success anim-fade-up">
                    <div className="alert-success-icon">
                      <svg style={{ width: 12, height: 12, color: '#52796f' }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="alert-success-text">{verificationMessage}</p>
                  </div>
                )}

                {(errors.general || error) && (
                  <div className={`alert-error ${errors.general ? 'anim-shake' : ''}`}>
                    <div className="alert-error-icon">
                      <svg style={{ width: 12, height: 12, color: '#b85c50' }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="alert-error-text">{errors.general || error}</p>
                  </div>
                )}

                {/* Username / Email */}
                <div className="anim-fade-up delay-100">
                  <label htmlFor="emailOrUsername" className="field-label">Username or Email</label>
                  <div className="field-wrap">
                    <span className="field-icon">
                      <MailIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
                    </span>
                    <input
                      id="emailOrUsername" name="emailOrUsername" type="text"
                      autoComplete="username"
                      value={formData.emailOrUsername} onChange={handleChange}
                      disabled={isSubmitting} placeholder="Enter your username or email"
                      className={`field-input${errors.emailOrUsername ? ' has-error' : ''}`}
                      aria-invalid={!!errors.emailOrUsername}
                      aria-describedby={errors.emailOrUsername ? 'emailOrUsername-error' : undefined}
                    />
                  </div>
                  {errors.emailOrUsername && (
                    <p className="field-error" id="emailOrUsername-error">
                      <svg style={{ width: 12, height: 12, flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.emailOrUsername}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="anim-fade-up delay-200">
                  <label htmlFor="password" className="field-label">Password</label>
                  <div className="field-wrap">
                    <span className="field-icon">
                      <LockClosedIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
                    </span>
                    <input
                      id="password" name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={formData.password} onChange={handleChange}
                      disabled={isSubmitting} placeholder="Enter your password"
                      className={`field-input field-input-password${errors.password ? ' has-error' : ''}`}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <button
                      type="button" className="eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOffIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
                        : <EyeIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
                      }
                    </button>
                  </div>
                  {errors.password && (
                    <p className="field-error" id="password-error">
                      <svg style={{ width: 12, height: 12, flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember me + Forgot */}
                <div className="remember-row anim-fade-up delay-300">
                  <div className="remember-left">
                    <input
                      id="remember-me" name="rememberMe" type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                      disabled={isSubmitting} className="remember-checkbox"
                    />
                    <label htmlFor="remember-me" className="remember-label">Remember me</label>
                  </div>
                  <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
                </div>

                {/* Submit */}
                <div className="anim-fade-up delay-400" style={{ paddingTop: '0.2rem' }}>
                  <button
                    type="submit" disabled={loading || isSubmitting}
                    aria-live="polite" aria-busy={isSubmitting}
                    className={`submit-btn ${loading || isSubmitting ? 'submit-btn-disabled' : 'submit-btn-active'}`}
                  >
                    {loading || isSubmitting ? (
                      <>
                        <svg style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign in
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="anim-fade-up delay-500">
                <div className="form-footer-divider"></div>
                <p className="form-footer-text">
                  By signing in, you agree to our{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="form-footer-link">Terms of Service</button>{' '}
                  and{' '}
                  <button type="button" onClick={() => setShowPrivacyModal(true)} className="form-footer-link">Privacy Policy</button>
                </p>
                <div className="powered-row">
                  <span className="powered-dot"></span>
                  <span className="powered-text">Powered by Vitrux Shield</span>
                  <span className="powered-dot"></span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Terms Modal ── */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowTermsModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Terms and Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="modal-close-btn" aria-label="Close">
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <h4>Terms and Conditions (T&Cs)</h4>
              <p style={{ fontSize: '0.75rem', color: '#8fa99a' }}><strong>Effective Date:</strong> 06/10/2025</p>
              <p>Welcome to <strong>Talent Shield</strong> HRMS tool. By accessing and using this Application, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, you should not use the <strong>Application</strong>.</p>
              <h5>1. Definitions</h5>
              <ul>
                <li>"<strong>We</strong>", "<strong>Us</strong>", "<strong>Our</strong>" refer to <strong>Talent Shield</strong>, the owner and operator of this HRMS application.</li>
                <li>"<strong>You</strong>", "<strong>User</strong>" refer to the individual or organisation using the Application.</li>
                <li>"<strong>Application</strong>" refers to the HRMS system, its features, and associated services.</li>
              </ul>
              <h5>2. Use of the Application</h5>
              <ul>
                <li>You agree to use the Application only for lawful HR and business purposes.</li>
                <li>You must not use the Application in any way that violates applicable UK law, including but not limited to employment and data protection regulations.</li>
                <li>Access credentials (such as usernames, passwords) must be kept confidential. You are responsible for all activities carried out under your account.</li>
              </ul>
              <h5>3. Data Accuracy</h5>
              <ul>
                <li>Users are responsible for ensuring that all information entered into the Application is accurate and up to date.</li>
                <li>We are not liable for errors or consequences resulting from incorrect or incomplete data entered by Users.</li>
              </ul>
              <h5>4. Intellectual Property</h5>
              <ul>
                <li>All content, design, logos, and software associated with the Application remain the intellectual property of <strong>Vitrux Shield Ltd</strong> or its licensors.</li>
                <li>Users are granted a limited, non-exclusive licence to use the Application for business purposes.</li>
              </ul>
              <h5>5. Availability & Maintenance</h5>
              <ul>
                <li>We aim to provide continuous access to the Application but do not guarantee uninterrupted availability.</li>
                <li>We may carry out scheduled maintenance or updates.</li>
                <li>We are not liable for downtime, data loss, or interruptions beyond our reasonable control.</li>
              </ul>
              <h5>6. Liability</h5>
              <ul>
                <li>The Application is provided on an "as-is" basis, without any warranties, whether express or implied.</li>
                <li>We are not liable for indirect, incidental, or consequential damages arising from your use of the Application.</li>
                <li>Nothing in these Terms excludes liability for death, personal injury, fraud, or any other liability which cannot be excluded under UK law.</li>
              </ul>
              <h5>7. Termination</h5>
              <p>We reserve the right to suspend or terminate access to the Application if you breach these Terms.</p>
              <h5>8. Governing Law</h5>
              <ul>
                <li>These Terms are governed by and construed in accordance with the laws of England and Wales.</li>
                <li>Disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowTermsModal(false)} className="modal-close-action">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Modal ── */}
      {showPrivacyModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPrivacyModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Privacy Policy</h3>
              <button onClick={() => setShowPrivacyModal(false)} className="modal-close-btn" aria-label="Close">
                <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <h4>Privacy Policy</h4>
              <p style={{ fontSize: '0.75rem', color: '#8fa99a' }}><strong>Effective Date:</strong> 06/10/2025</p>
              <p>This Privacy Policy explains how <strong>Talent Shield</strong> ("we", "our", "us") collects, uses, and protects personal data within the HRMS application. We comply with the <strong>UK GDPR</strong> and the <strong>Data Protection Act 2018</strong>.</p>
              <h5>1. Data We Collect</h5>
              <p>We may collect and process the following categories of data:</p>
              <ul>
                <li><strong>Employee information</strong>: name, contact details, job title, payroll data, performance records.</li>
                <li><strong>User account information</strong>: usernames, passwords, access logs.</li>
                <li><strong>System usage data</strong>: device information, IP addresses, login times.</li>
              </ul>
              <h5>2. How We Use Your Data</h5>
              <p>We process personal data to:</p>
              <ul>
                <li>Provide HR management services through the Application.</li>
                <li>Maintain payroll, leave, and performance records.</li>
                <li>Ensure system security and prevent unauthorised access.</li>
                <li>Comply with UK employment, taxation, and legal obligations.</li>
              </ul>
              <h5>3. Legal Basis for Processing</h5>
              <p>We process personal data under the following legal bases:</p>
              <ul>
                <li><strong>Contractual necessity</strong> – to deliver HRMS services.</li>
                <li><strong>Legal obligations</strong> – to comply with UK law.</li>
                <li><strong>Legitimate interests</strong> – for system improvement and security.</li>
                <li><strong>Consent</strong> – where explicitly required.</li>
              </ul>
              <h5>4. Data Sharing & Transfers</h5>
              <ul>
                <li>Data is stored on servers located in the <strong>United Kingdom</strong>.</li>
                <li>We do not transfer personal data outside the UK unless adequate safeguards are in place.</li>
                <li>We may share data with authorised third parties (e.g., payroll providers, IT support) under strict confidentiality agreements.</li>
              </ul>
              <h5>5. Data Retention</h5>
              <ul>
                <li>Personal data is retained only for as long as necessary to fulfil contractual and legal obligations.</li>
                <li>After this period, data will be securely deleted or anonymised.</li>
              </ul>
              <h5>6. Your Rights</h5>
              <p>Under the UK GDPR, you have the right to:</p>
              <ul>
                <li>Access your personal data.</li>
                <li>Correct inaccurate data.</li>
                <li>Request erasure (right to be forgotten).</li>
                <li>Restrict or object to processing.</li>
                <li>Request data portability.</li>
                <li>Withdraw consent (where applicable).</li>
                <li>Lodge a complaint with the <strong>Information Commissioner's Office (ICO)</strong>.</li>
              </ul>
              <h5>7. Security</h5>
              <p>We implement technical and organisational measures (e.g., encryption, access controls) to protect personal data from unauthorised access, loss, or misuse.</p>
              <h5>8. Updates to this Policy</h5>
              <p>We may update this Privacy Policy to reflect changes in law or application functionality. Updates will be communicated to users.</p>
              <h5>9. Contact Us</h5>
              <p>If you have questions about this Privacy Policy or your data rights, contact us at:</p>
              <p>
                <strong>Vitrux Shield Ltd</strong><br />
                <strong>1-7, Park Road, Caterham, England, CR3 5TB</strong><br />
                Email: <a href="mailto:IT@vitrux.co.uk"><strong>IT@vitrux.co.uk</strong></a><br />
                Phone: <strong>07459734663</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPrivacyModal(false)} className="modal-close-action">Close</button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}