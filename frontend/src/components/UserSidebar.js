import React, { useState, useEffect, useRef } from 'react';

// ─── Inline SVG icon helper ───────────────────────────────────────────────────
const Icon = ({ d, size = 20, polyline }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}
    {polyline && <polyline points={polyline} />}
  </svg>
);

const icons = {
  overview:      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  profile:       'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  clocks:        'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 6v6l4 2',
  elearning:     'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M20 22V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5v13z',
  shifts:        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  documents:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  performance:   'M12 20V10M18 20V4M6 20v-4',
  calendar:      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
  expenses:      'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  notifications: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  logout:        'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  chevronLeft:   'M15 18l-6-6 6-6',
  chevronRight:  'M9 18l6-6-6-6',
  menu:          'M3 12h18M3 6h18M3 18h18',
  close:         'M18 6L6 18M6 6l12 12',
};

const NAV_ITEMS = [
  { id: 'overview',      label: 'Overview',       icon: 'overview'      },
  { id: 'profile',       label: 'Profile',         icon: 'profile'       },
  { id: 'clock-ins',     label: 'Clock-Ins',       icon: 'clocks'        },
  { id: 'elearning',     label: 'E-Learning',      icon: 'elearning'     },
  { id: 'shifts',        label: 'Shifts',           icon: 'shifts'        },
  { id: 'documents',     label: 'Documents',        icon: 'documents'     },
  { id: 'performance',   label: 'Performance',      icon: 'performance'   },
  { id: 'calendar',      label: 'Calendar',         icon: 'calendar'      },
  { id: 'expenses',      label: 'Expenses',         icon: 'expenses'      },
  { id: 'notifications', label: 'Notifications',    icon: 'notifications' },
];

const STORAGE_KEY = 'employee_sidebar_collapsed';

function getInitials(firstName, lastName) {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (!f && !l) return '?';
  return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

  .us-sidebar {
    font-family: 'DM Sans', sans-serif;
    background: #2f3e46;
    display: flex; flex-direction: column;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  /* Grid texture */
  .us-sidebar::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.025) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none; z-index: 0;
  }
  /* Top radial glow */
  .us-sidebar::after {
    content: '';
    position: absolute; top: -50px; left: -50px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(82,121,111,0.2) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  /* ── Header ── */
  .us-header {
    position: relative; z-index: 1;
    display: flex; align-items: center;
    padding: 0 0.75rem;
    height: 64px;
    border-bottom: 1px solid rgba(82,121,111,0.3);
    flex-shrink: 0;
    gap: 0.6rem;
  }
  .us-logo-mark {
    width: 34px; height: 34px; flex-shrink: 0;
    border-radius: 9px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.3);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .us-logo-mark svg { width: 16px; height: 16px; }
  .us-brand-name {
    flex: 1;
    font-size: 0.875rem; font-weight: 600;
    color: #cad2c5; letter-spacing: 0.02em;
    white-space: nowrap; overflow: hidden;
  }
  .us-collapse-btn {
    flex-shrink: 0;
    width: 28px; height: 28px;
    border: none; background: none; cursor: pointer;
    border-radius: 7px;
    color: rgba(202,210,197,0.5);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .us-collapse-btn:hover { background: rgba(82,121,111,0.25); color: #cad2c5; }

  /* ── Nav ── */
  .us-nav {
    position: relative; z-index: 1;
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0.5rem 0.5rem;
  }
  .us-nav::-webkit-scrollbar { width: 3px; }
  .us-nav::-webkit-scrollbar-track { background: transparent; }
  .us-nav::-webkit-scrollbar-thumb { background: rgba(82,121,111,0.35); border-radius: 2px; }

  .us-section-label {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba(132,169,140,0.5);
    padding: 0.75rem 0.6rem 0.3rem;
    white-space: nowrap;
  }

  /* ── Nav button ── */
  .us-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.52rem 0.65rem;
    border: none; background: none; cursor: pointer;
    border-radius: 8px;
    color: rgba(202,210,197,0.65);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 400;
    text-align: left;
    transition: all 0.15s ease;
    white-space: nowrap; overflow: hidden;
    position: relative;
    margin-bottom: 1px;
    -webkit-tap-highlight-color: transparent;
  }
  .us-btn:hover {
    background: rgba(82,121,111,0.2);
    color: #cad2c5;
  }
  .us-btn.active {
    background: linear-gradient(135deg, rgba(82,121,111,0.32), rgba(53,79,82,0.38));
    color: #cad2c5;
    font-weight: 500;
    box-shadow: inset 0 0 0 1px rgba(132,169,140,0.18);
  }
  .us-btn.active::before {
    content: '';
    position: absolute; left: 0; top: 22%; bottom: 22%;
    width: 3px; border-radius: 0 2px 2px 0;
    background: #84a98c;
  }
  .us-btn-icon-wrap {
    position: relative; flex-shrink: 0;
    width: 16px; height: 16px;
    display: flex; align-items: center; justify-content: center;
  }
  .us-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; }

  /* collapsed icon centering */
  .us-sidebar.collapsed .us-btn {
    justify-content: center; padding: 0.52rem;
  }
  .us-sidebar.collapsed .us-btn-label,
  .us-sidebar.collapsed .us-section-label,
  .us-sidebar.collapsed .us-badge-pill { display: none; }
  .us-sidebar.collapsed .us-btn-icon-wrap { width: 18px; height: 18px; }

  /* ── Badge ── */
  .us-notif-dot {
    position: absolute; top: -4px; right: -4px;
    width: 8px; height: 8px;
    background: #c0756a; border-radius: 50%;
    border: 1.5px solid #2f3e46;
  }
  .us-badge-pill {
    margin-left: auto; flex-shrink: 0;
    background: rgba(192,117,106,0.2);
    border: 1px solid rgba(192,117,106,0.4);
    color: #e09090;
    font-size: 0.6rem; font-weight: 600;
    border-radius: 10px;
    min-width: 18px; height: 17px;
    padding: 0 5px;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Tooltip for collapsed ── */
  .us-tooltip-wrap { position: relative; }
  .us-tooltip {
    display: none;
    position: absolute; left: calc(100% + 10px); top: 50%;
    transform: translateY(-50%);
    background: #354f52;
    border: 1px solid rgba(82,121,111,0.4);
    color: #cad2c5;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    padding: 0.28rem 0.6rem;
    border-radius: 6px; white-space: nowrap;
    pointer-events: none; z-index: 200;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .us-tooltip::before {
    content: ''; position: absolute;
    right: 100%; top: 50%; transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: rgba(82,121,111,0.4);
  }
  .us-sidebar.collapsed .us-tooltip-wrap:hover .us-tooltip { display: block; }

  /* ── Footer ── */
  .us-footer {
    position: relative; z-index: 1;
    border-top: 1px solid rgba(82,121,111,0.3);
    padding: 0.6rem 0.5rem 0.7rem;
    flex-shrink: 0;
  }
  .us-user-row {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.45rem 0.55rem;
    border-radius: 8px;
    margin-bottom: 0.25rem;
    transition: background 0.15s;
  }
  .us-user-row:hover { background: rgba(82,121,111,0.15); }
  .us-avatar {
    width: 32px; height: 32px; flex-shrink: 0;
    border-radius: 8px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 600; color: #cad2c5;
    letter-spacing: 0.02em;
  }
  .us-user-name {
    font-size: 0.77rem; font-weight: 500; color: #cad2c5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    line-height: 1.2;
  }
  .us-user-email {
    font-size: 0.62rem; font-weight: 300;
    color: rgba(202,210,197,0.45);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px;
  }
  .us-logout-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.48rem 0.65rem;
    border: none; background: none; cursor: pointer;
    border-radius: 8px;
    color: rgba(202,210,197,0.55);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.77rem; font-weight: 400;
    text-align: left;
    transition: all 0.15s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .us-logout-btn:hover { background: rgba(192,117,106,0.12); color: #f08080; }
  .us-sidebar.collapsed .us-logout-btn { justify-content: center; padding: 0.48rem; }
  .us-sidebar.collapsed .us-user-row { justify-content: center; padding: 0.45rem; }
  .us-sidebar.collapsed .us-user-info { display: none; }

  /* ── Mobile top bar ── */
  .us-mobile-bar {
    display: none;
    position: fixed; top: 0; left: 0; right: 0;
    height: 56px; z-index: 40;
    background: #2f3e46;
    border-bottom: 1px solid rgba(82,121,111,0.3);
    align-items: center; justify-content: space-between;
    padding: 0 1rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    font-family: 'DM Sans', sans-serif;
  }
  .us-mobile-bar-title {
    font-size: 0.875rem; font-weight: 600;
    color: #cad2c5; letter-spacing: 0.03em;
  }
  .us-mobile-icon-btn {
    width: 36px; height: 36px;
    border: none; background: none; cursor: pointer;
    border-radius: 8px; color: rgba(202,210,197,0.75);
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .us-mobile-icon-btn:hover { background: rgba(82,121,111,0.25); color: #cad2c5; }

  /* Mobile drawer overlay */
  .us-overlay {
    position: fixed; inset: 0; background: rgba(10,20,25,0.6);
    z-index: 49; backdrop-filter: blur(2px);
    animation: usFadeIn 0.18s ease;
  }
  @keyframes usFadeIn { from { opacity: 0; } to { opacity: 1; } }

  .us-drawer {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 240px; z-index: 50;
    background: #2f3e46;
    box-shadow: 4px 0 24px rgba(0,0,0,0.4);
    animation: usSlideIn 0.22s cubic-bezier(0.22,1,0.36,1);
  }
  @keyframes usSlideIn {
    from { transform: translateX(-100%); opacity: 0.6; }
    to   { transform: translateX(0);     opacity: 1; }
  }

  /* Responsive */
  @media (max-width: 767px) {
    .us-mobile-bar { display: flex; }
    .us-desktop-aside { display: none !important; }
    .us-desktop-spacer { display: none !important; }
    .us-mobile-spacer { display: block; height: 56px; }
  }
  @media (min-width: 768px) {
    .us-mobile-spacer { display: none; }
  }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
const UserSidebar = ({ activeTab, setActiveTab, notifications = [], onLogout, user }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);

  const toggleCollapse = () => {
    setCollapsed(p => {
      const next = !p;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  const handleTabChange = (id) => { setActiveTab(id); setMobileOpen(false); };
  const notifCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;
  const initials = getInitials(user?.firstName, user?.lastName);

  // ── Shield logo mark ──────────────────────────────────────────────────────
  const ShieldMark = () => (
    <div className="us-logo-mark">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 6v5c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6l-8-4z"
          fill="#52796f" stroke="#84a98c" strokeWidth="1"/>
        <polyline points="8.5,12.5 11,15.5 16,9.5"
          fill="none" stroke="#cad2c5" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );

  // ── Sidebar body (reused in desktop + mobile drawer) ──────────────────────
  const SidebarBody = ({ isMobile = false }) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className={`us-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ height: '100%' }}>

        {/* Header */}
        <div className="us-header">
          <ShieldMark />
          {(!isCollapsed) && (
            <span className="us-brand-name">TalentShield</span>
          )}
          {isMobile ? (
            <button className="us-collapse-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <Icon d={icons.close} size={16} />
            </button>
          ) : (
            <button className="us-collapse-btn" onClick={toggleCollapse} aria-label="Toggle sidebar">
              <Icon d={isCollapsed ? icons.chevronRight : icons.chevronLeft} size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="us-nav">
          {isCollapsed ? null : <div className="us-section-label">Menu</div>}

          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const hasNotif = item.id === 'notifications' && notifCount > 0;
            return (
              <div key={item.id} className="us-tooltip-wrap">
                <button
                  className={`us-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  <div className="us-btn-icon-wrap">
                    <Icon d={icons[item.icon]} size={16} />
                    {hasNotif && <span className="us-notif-dot" />}
                  </div>
                  <span className="us-btn-label">{item.label}</span>
                  {hasNotif && (
                    <span className="us-badge-pill">
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
                </button>
                {isCollapsed && <div className="us-tooltip">{item.label}</div>}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="us-footer">
          <div className="us-tooltip-wrap">
            <div className="us-user-row">
              <div className="us-avatar">{initials}</div>
              <div className="us-user-info" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="us-user-name">{user?.firstName} {user?.lastName}</div>
                <div className="us-user-email">{user?.email || ''}</div>
              </div>
            </div>
            {isCollapsed && <div className="us-tooltip">{user?.firstName} {user?.lastName}</div>}
          </div>

          <div className="us-tooltip-wrap">
            <button className="us-logout-btn" onClick={onLogout}>
              <Icon d={icons.logout} size={15} />
              <span style={{ display: isCollapsed ? 'none' : undefined }}>Logout</span>
            </button>
            {isCollapsed && <div className="us-tooltip">Logout</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{css}</style>

      {/* ── Mobile top bar ── */}
      <div className="us-mobile-bar">
        <button className="us-mobile-icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Icon d={icons.menu} size={20} />
        </button>
        <span className="us-mobile-bar-title">TalentShield</span>
        <div className="us-avatar">{initials}</div>
      </div>

      {/* Mobile spacer */}
      <div className="us-mobile-spacer" />

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          <div className="us-overlay" onClick={() => setMobileOpen(false)} />
          <div className="us-drawer" ref={drawerRef}>
            <SidebarBody isMobile />
          </div>
        </>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className="us-desktop-aside"
        style={{
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, height: '100vh',
          zIndex: 30,
          width: collapsed ? 84 : 224,
          transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
        }}
      >
        <SidebarBody />
      </aside>

      {/* Desktop spacer */}
      <div
        className="us-desktop-spacer"
        style={{
          flexShrink: 0,
          width: collapsed ? 64 : 224,
          transition: 'width 0.25s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </>
  );
};

export default UserSidebar;