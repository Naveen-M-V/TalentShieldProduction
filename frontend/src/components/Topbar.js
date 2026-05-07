// src/components/Topbar.js
import { Bars3Icon } from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

  .ts-topbar {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    display: flex;
    align-items: center;
    background: #2f3e46;
    border-bottom: 1px solid rgba(82,121,111,0.35);
    padding: 0 1.25rem;
    height: 64px;
    gap: 0.75rem;
    position: relative;
    z-index: 40;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    flex-shrink: 0;
  }

  /* Subtle grid overlay */
  .ts-topbar::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.025) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  /* ── Logo area ── */
  .ts-topbar-logo {
    display: flex; align-items: center; gap: 0.6rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s;
    position: relative; z-index: 1;
  }
  .ts-topbar-logo:hover { opacity: 0.82; }
  .ts-topbar-logo img {
    height: 58px; width: auto;
    object-fit: contain;
  }
  .ts-topbar-logo-fallback {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .ts-topbar-logo-fallback svg { width: 18px; height: 18px; }

  /* ── Hamburger ── */
  .ts-hamburger {
    display: flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border: none; background: none; cursor: pointer;
    border-radius: 8px;
    color: rgba(202,210,197,0.7);
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
    position: relative; z-index: 1;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-hamburger:hover {
    background: rgba(82,121,111,0.25);
    color: #cad2c5;
  }
  .ts-hamburger svg { width: 20px; height: 20px; }

  /* ── Divider ── */
  .ts-topbar-divider {
    width: 1px; height: 28px;
    background: rgba(82,121,111,0.35);
    flex-shrink: 0;
    position: relative; z-index: 1;
  }

  /* ── Right section ── */
  .ts-topbar-right {
    margin-left: auto;
    display: flex; align-items: center; gap: 1rem;
    position: relative; z-index: 1;
  }

  /* ── Account badge ── */
  .ts-account-badge {
    display: flex; align-items: center; gap: 0.5rem;
  }
  .ts-account-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #84a98c;
    animation: tsPulse 2.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes tsPulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.15); }
  }
  .ts-account-label {
    font-size: 0.72rem; font-weight: 400;
    color: rgba(202,210,197,0.55);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .ts-account-name {
    font-size: 0.8rem; font-weight: 500;
    color: #cad2c5;
    white-space: nowrap;
  }

  /* ── Create button ── */
  .ts-create-wrap { position: relative; }

  .ts-create-btn {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid rgba(132,169,140,0.4);
    border-radius: 8px;
    background: linear-gradient(135deg, #354f52, #52796f);
    color: #cad2c5;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .ts-create-btn:hover {
    background: linear-gradient(135deg, #3d5a5e, #5e8a7a);
    box-shadow: 0 4px 14px rgba(82,121,111,0.4);
    transform: translateY(-1px);
    border-color: rgba(132,169,140,0.6);
  }
  .ts-create-btn:active { transform: translateY(0); }
  .ts-create-btn svg {
    width: 13px; height: 13px; flex-shrink: 0;
    transition: transform 0.2s;
  }
  .ts-create-btn.dropdown-open svg { transform: rotate(180deg); }

  /* Plus icon */
  .ts-create-plus {
    width: 15px; height: 15px;
    border-radius: 4px;
    background: rgba(202,210,197,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ts-create-plus svg { width: 9px; height: 9px; }

  /* ── Dropdown menu ── */
  .ts-dropdown {
    position: absolute; right: 0; top: calc(100% + 6px);
    min-width: 160px;
    background: #2f3e46;
    border: 1px solid rgba(82,121,111,0.4);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.35);
    overflow: hidden;
    animation: tsDropIn 0.16s cubic-bezier(0.22,1,0.36,1) both;
    z-index: 100;
  }
  @keyframes tsDropIn {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ts-dropdown-item {
    width: 100%;
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.6rem 0.9rem;
    border: none; background: none; cursor: pointer;
    color: rgba(202,210,197,0.8);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 400;
    text-align: left;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-dropdown-item:hover {
    background: rgba(82,121,111,0.22);
    color: #cad2c5;
  }
  .ts-dropdown-item svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.7; }
  .ts-dropdown-divider {
    height: 1px;
    background: rgba(82,121,111,0.25);
    margin: 0;
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .ts-topbar { padding: 0 0.875rem; }
    .ts-account-label { display: none; }
    .ts-account-name { font-size: 0.75rem; }
  }
  @media (max-width: 360px) {
    .ts-account-badge { display: none; }
  }
`;

export default function Topbar({ toggleSidebar }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const showCreateButton = (() => {
    const p = location.pathname || '';
    // Hide the Create button on manager and personal account pages
    if (p.startsWith('/manager') || p.includes('/myaccount')) return false;
    return (
      p.includes('/profiles') ||
      p.includes('/certificates') ||
      p.includes('/profilescreate') ||
      p.includes('/createcertificate')
    );
  })();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <style>{css}</style>

      <div className="ts-topbar">

        {/* ── Logo ── */}
        <div className="ts-topbar-logo" onClick={() => navigate("/dashboard")}>
          {!imgError ? (
            <img
              src="/tslnew.png"
              alt="TalentShield"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="ts-topbar-logo-fallback">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L4 6v5c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6l-8-4z"
                  fill="#52796f" stroke="#84a98c" strokeWidth="1"
                />
                <polyline
                  points="8.5,12.5 11,15.5 16,9.5"
                  fill="none" stroke="#cad2c5" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="ts-topbar-divider" />

        {/* ── Hamburger ── */}
        <button className="ts-hamburger" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Bars3Icon />
        </button>

        {/* ── Right section ── */}
        <div className="ts-topbar-right">

          {/* Account badge */}
          <div className="ts-account-badge">
            <span className="ts-account-dot" />
            <span className="ts-account-label">Account:</span>
            <span className="ts-account-name">Vitrux Ltd</span>
          </div>

          {/* Create dropdown */}
          {showCreateButton && (
            <div className="ts-create-wrap" ref={dropdownRef}>
              <button
                className={`ts-create-btn ${open ? 'dropdown-open' : ''}`}
                onClick={() => setOpen(!open)}
              >
                <div className="ts-create-plus">
                  <svg fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="1" x2="5" y2="9" strokeLinecap="round"/>
                    <line x1="1" y1="5" x2="9" y2="5" strokeLinecap="round"/>
                  </svg>
                </div>
                Create
                <ChevronDownIcon />
              </button>

              {open && (
                <div className="ts-dropdown">
                  <button
                    className="ts-dropdown-item"
                    onClick={() => { setOpen(false); navigate("/dashboard/profilescreate"); }}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </button>
                  <div className="ts-dropdown-divider" />
                  <button
                    className="ts-dropdown-item"
                    onClick={() => {
                      setOpen(false);
                      console.log('Navigating to create certificate page...');
                      navigate("/dashboard/createcertificate");
                    }}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Certificate
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}