import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { APP_VERSION } from "../version";
import {
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  UserIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  UserGroupIcon,
  BookOpenIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import DocumentDrawer from "./DocumentManagement/DocumentDrawer";
import { isAdmin, isManager, isManagerOrAbove } from "../constants/roles";

// ── Inline styles (no Tailwind dependency for theme tokens) ──────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

  .ts-sidebar {
    font-family: 'DM Sans', sans-serif;
    background: #2f3e46;
    color: #cad2c5;
    position: fixed;
    left: 0; top: 0;
    height: 100vh;
    z-index: 50;
    display: flex;
    flex-direction: column;
    transition: width 0.28s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 4px 0 24px rgba(0,0,0,0.3);
  }
  .ts-sidebar.open  { width: 256px; }
  .ts-sidebar.closed { width: 64px; }

  /* Subtle grid texture overlay */
  .ts-sidebar::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(202,210,197,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(202,210,197,0.025) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
    z-index: 0;
  }
  /* Top radial glow */
  .ts-sidebar::after {
    content: '';
    position: absolute;
    top: -60px; left: -60px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(82,121,111,0.18) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Header ── */
  .ts-header {
    position: relative; z-index: 1;
    display: flex; align-items: center;
    padding: 0 1rem;
    height: 68px;
    border-bottom: 1px solid rgba(82,121,111,0.3);
    flex-shrink: 0;
    overflow: hidden;
  }
  .ts-logo-mark {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .ts-logo-mark svg { width: 18px; height: 18px; }
  .ts-brand-text {
    margin-left: 0.65rem;
    overflow: hidden;
    transition: opacity 0.2s, width 0.28s cubic-bezier(0.22,1,0.36,1);
  }
  .ts-brand-name {
    font-size: 0.9rem; font-weight: 600;
    color: #cad2c5; letter-spacing: 0.03em;
    white-space: nowrap; line-height: 1.2;
  }
  .ts-brand-role {
    font-size: 0.65rem; font-weight: 400;
    color: #84a98c; letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap; margin-top: 1px;
  }

  /* ── Scrollable nav body ── */
  .ts-nav {
    position: relative; z-index: 1;
    flex: 1; overflow-y: auto; overflow-x: hidden;
    padding: 0.75rem 0.6rem;
  }
  .ts-nav::-webkit-scrollbar { width: 3px; }
  .ts-nav::-webkit-scrollbar-track { background: transparent; }
  .ts-nav::-webkit-scrollbar-thumb { background: rgba(82,121,111,0.4); border-radius: 2px; }

  /* ── Section divider label ── */
  .ts-section-label {
    font-size: 0.58rem; font-weight: 600;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba(132,169,140,0.55);
    padding: 0.9rem 0.75rem 0.35rem;
    white-space: nowrap; overflow: hidden;
  }
  .ts-divider {
    height: 1px;
    background: rgba(82,121,111,0.25);
    margin: 0.4rem 0.5rem;
  }

  /* ── Nav button base ── */
  .ts-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.65rem;
    padding: 0.55rem 0.75rem;
    border: none; background: none; cursor: pointer;
    border-radius: 8px;
    color: rgba(202,210,197,0.75);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.8rem; font-weight: 400;
    text-align: left;
    transition: all 0.15s ease;
    white-space: nowrap; overflow: hidden;
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-btn:hover {
    background: rgba(82,121,111,0.2);
    color: #cad2c5;
  }
  .ts-btn.active {
    background: linear-gradient(135deg, rgba(82,121,111,0.35), rgba(53,79,82,0.4));
    color: #cad2c5;
    font-weight: 500;
    box-shadow: inset 0 0 0 1px rgba(132,169,140,0.2);
  }
  .ts-btn.active::before {
    content: '';
    position: absolute; left: 0; top: 20%; bottom: 20%;
    width: 3px; border-radius: 0 2px 2px 0;
    background: #84a98c;
  }
  .ts-btn.open {
    background: rgba(82,121,111,0.15);
    color: #cad2c5;
  }
  .ts-btn-icon {
    flex-shrink: 0;
    width: 16px; height: 16px;
    opacity: 0.85;
  }
  .ts-btn-label {
    flex: 1; font-size: 0.8rem;
    overflow: hidden; text-overflow: ellipsis;
  }
  .ts-chevron {
    flex-shrink: 0; width: 13px; height: 13px; opacity: 0.6;
    transition: transform 0.2s;
  }
  .ts-chevron.rotated { transform: rotate(90deg); }

  /* ── Sub-menu ── */
  .ts-submenu {
    margin: 0.2rem 0 0.2rem 1.1rem;
    padding-left: 0.75rem;
    border-left: 1px solid rgba(82,121,111,0.3);
    display: flex; flex-direction: column; gap: 1px;
  }
  .ts-sub-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.55rem;
    padding: 0.45rem 0.65rem;
    border: none; background: none; cursor: pointer;
    border-radius: 6px;
    color: rgba(202,210,197,0.6);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.77rem; font-weight: 400;
    text-align: left;
    transition: all 0.15s ease;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-sub-btn:hover { background: rgba(82,121,111,0.18); color: #cad2c5; }
  .ts-sub-btn.active {
    background: rgba(82,121,111,0.25);
    color: #84a98c; font-weight: 500;
  }
  .ts-sub-icon { flex-shrink: 0; width: 14px; height: 14px; opacity: 0.75; }

  /* ── Badge ── */
  .ts-badge {
    margin-left: auto;
    background: #52796f;
    color: #cad2c5;
    font-size: 0.6rem; font-weight: 600;
    border-radius: 10px;
    min-width: 18px; height: 18px;
    padding: 0 5px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── Footer ── */
  .ts-footer {
    position: relative; z-index: 1;
    border-top: 1px solid rgba(82,121,111,0.3);
    padding: 0.6rem;
    flex-shrink: 0;
  }
  .ts-profile-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.7rem;
    padding: 0.55rem 0.6rem;
    border: none; background: none; cursor: pointer;
    border-radius: 8px;
    text-align: left;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-profile-btn:hover { background: rgba(82,121,111,0.2); }
  .ts-avatar {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: linear-gradient(135deg, #354f52, #52796f);
    border: 1px solid rgba(132,169,140,0.3);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 0.72rem; font-weight: 600;
    color: #cad2c5; letter-spacing: 0.02em;
  }
  .ts-profile-info { flex: 1; overflow: hidden; }
  .ts-profile-name {
    font-size: 0.78rem; font-weight: 500;
    color: #cad2c5; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .ts-profile-email {
    font-size: 0.65rem; font-weight: 300;
    color: rgba(202,210,197,0.5);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 1px;
  }

  /* ── Profile dropdown ── */
  .ts-profile-dropdown {
    margin-top: 0.3rem;
    border-radius: 8px;
    background: rgba(47,62,70,0.8);
    border: 1px solid rgba(82,121,111,0.25);
    padding: 0.3rem;
    backdrop-filter: blur(8px);
  }
  .ts-dropdown-btn {
    width: 100%;
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.5rem 0.7rem;
    border: none; background: none; cursor: pointer;
    border-radius: 6px;
    color: rgba(202,210,197,0.75);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.77rem; font-weight: 400;
    text-align: left;
    transition: all 0.15s ease;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .ts-dropdown-btn:hover { background: rgba(82,121,111,0.2); color: #cad2c5; }
  .ts-dropdown-btn.danger:hover { background: rgba(200,80,70,0.12); color: #f08080; }
  .ts-dropdown-btn svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; }
  .ts-dropdown-divider { height: 1px; background: rgba(82,121,111,0.25); margin: 0.25rem 0; }

  .ts-version {
    text-align: center;
    font-size: 0.6rem; font-weight: 400;
    color: rgba(132,169,140,0.4);
    padding: 0.4rem 0 0.1rem;
    letter-spacing: 0.08em;
  }

  /* ── Tooltip for collapsed icons ── */
  .ts-tooltip-wrap { position: relative; }
  .ts-tooltip {
    display: none;
    position: absolute;
    left: calc(100% + 10px);
    top: 50%; transform: translateY(-50%);
    background: #354f52;
    border: 1px solid rgba(82,121,111,0.4);
    color: #cad2c5;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.72rem; font-weight: 500;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .ts-tooltip::before {
    content: '';
    position: absolute; right: 100%; top: 50%; transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: rgba(82,121,111,0.4);
  }
  .ts-sidebar.closed .ts-tooltip-wrap:hover .ts-tooltip { display: block; }

  /* ── Collapsed icon center ── */
  .ts-sidebar.closed .ts-btn {
    justify-content: center; padding: 0.55rem;
  }
  .ts-sidebar.closed .ts-btn-label,
  .ts-sidebar.closed .ts-chevron,
  .ts-sidebar.closed .ts-section-label,
  .ts-sidebar.closed .ts-submenu,
  .ts-sidebar.closed .ts-badge { display: none; }
  .ts-sidebar.closed .ts-btn-icon { width: 18px; height: 18px; opacity: 0.9; }

  /* animate submenu open */
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ts-submenu { animation: slideDown 0.18s ease both; }
`;

export default function ModernSidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, loading, user } = useAuth();
  const {
    getUnreadCount,
    subscribeToNotificationChanges,
    triggerRefresh,
    initializeNotifications,
  } = useNotifications();

  const [openClockInOut, setOpenClockInOut] = useState(false);
  const [openEmployees, setOpenEmployees] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openDocumentsDrawer, setOpenDocumentsDrawer] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isAdminUser = isAdmin(user?.role);
  const isManagerUser = isManager(user?.role) || user?.role === "senior-manager" || user?.role === "hr";

  const managerRouteMap = {
    "/calendar": "/manager/calendar",
    "/report-library": "/manager/report-library",
    "/documents": "/manager/documents",
    "/performance": "/manager/performance",
    "/e-learning": "/manager/e-learning",
    "/clock-overview": "/manager/clock-overview",
    "/clock-ins": "/manager/clock-ins",
    "/time-history": "/manager/time-history",
    "/annual-leave-balance": "/manager/annual-leave-balance",
    "/organisational-chart": "/manager/organisational-chart",
    "/employee-hub": "/manager/team",
    "/manage-teams": "/manager/team",
    "/add-employee": "/manager/team",
    "/archive-employees": "/manager/team",
    "/rota-shift-management": "/manager/rota-shift-management",
  };

  useEffect(() => {
    if (!user || !isAdmin(user.role)) {
      setUnreadNotifications(0);
      return;
    }
    Promise.resolve().then(() => {
      try {
        if (isOpen) initializeNotifications();
        setUnreadNotifications(getUnreadCount());
      } catch (error) {
        console.error("Notification init error:", error);
      }
    });
    const unsubscribe = subscribeToNotificationChanges((count) => {
      setUnreadNotifications(count);
    });
    return () => { try { unsubscribe(); } catch (e) {} };
  }, [user, isOpen, getUnreadCount, subscribeToNotificationChanges, initializeNotifications]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) {}
    navigate("/login");
  };

  const handleNavigation = (path) => {
    if (isAdminUser && path === "/documents") { navigate("/manager/documents"); return; }
    if (isManagerUser && !isAdminUser) { navigate(managerRouteMap[path] || path); return; }
    navigate(path);
  };

  const isActive = (path) => {
    if (location.pathname === path) return true;
    if (isManagerUser && !isAdminUser && managerRouteMap[path]) {
      return location.pathname === managerRouteMap[path];
    }
    return false;
  };

  const handleMenuClick = () => { if (toggleSidebar && !isOpen) toggleSidebar(); };

  const roleLabel = isAdminUser ? "Admin" : isManagerUser ? "Manager" : "Dashboard";

  // Helper: nav button
  const NavBtn = ({ icon: Icon, label, path, onClick, isOpenState, hasSubmenu, children }) => {
    const active = path ? (path.startsWith("/performance")
      ? location.pathname.startsWith("/performance")
      : isActive(path))
      : false;

    return (
      <div className="ts-tooltip-wrap">
        <button
          className={`ts-btn ${active ? "active" : ""} ${isOpenState ? "open" : ""}`}
          onClick={onClick || (() => { handleMenuClick(); handleNavigation(path); })}
        >
          <Icon className="ts-btn-icon" />
          <span className="ts-btn-label">{label}</span>
          {hasSubmenu && (
            <ChevronRightIcon className={`ts-chevron ${isOpenState ? "rotated" : ""}`} />
          )}
        </button>
        {!isOpen && <div className="ts-tooltip">{label}</div>}
        {children}
      </div>
    );
  };

  // Helper: sub-button
  const SubBtn = ({ icon: Icon, label, path }) => (
    <button
      className={`ts-sub-btn ${isActive(path) ? "active" : ""}`}
      onClick={() => handleNavigation(path)}
    >
      <Icon className="ts-sub-icon" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <style>{css}</style>

      <div
        className={`ts-sidebar ${isOpen ? "open" : "closed"}`}
        onClick={(e) => { if (e.target === e.currentTarget) toggleSidebar(); }}
      >
        {/* ── Header ── */}
        <div className="ts-header">
          <div className="ts-logo-mark">
            {/* Shield icon matching the logo */}
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
          {isOpen && (
            <div className="ts-brand-text">
              <div className="ts-brand-name">TalentShield</div>
              <div className="ts-brand-role">{roleLabel}</div>
            </div>
          )}
        </div>

        {/* ── Nav body ── */}
        <div
          className="ts-nav"
          onClick={(e) => { if (e.target === e.currentTarget) toggleSidebar(); }}
        >

          {/* Home */}
          {isAdminUser && (
            <NavBtn icon={HomeIcon} label="Home" path="/dashboard" />
          )}
          {isManagerUser && !isAdminUser && (
            <NavBtn icon={HomeIcon} label="Manager Home" path="/manager/dashboard" />
          )}

          {/* Manager-only quick links */}
          {isManagerUser && !isAdminUser && (
            <>
              <div className="ts-divider" />
              {isOpen && <div className="ts-section-label">Team</div>}
              <NavBtn
                icon={ClipboardDocumentCheckIcon}
                label="Approvals"
                path="/manager/approvals"
              />
              <NavBtn icon={UsersIcon} label="My Team" path="/manager/team" />
            </>
          )}

          <div className="ts-divider" />
          {isOpen && <div className="ts-section-label">People</div>}

          {/* Employees Hub */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${openEmployees ? "open" : ""}`}
              onClick={() => { handleMenuClick(); setOpenEmployees(!openEmployees); }}
            >
              <UsersIcon className="ts-btn-icon" />
              <span className="ts-btn-label">Employees Hub</span>
              <ChevronRightIcon className={`ts-chevron ${openEmployees ? "rotated" : ""}`} />
            </button>
            {!isOpen && <div className="ts-tooltip">Employees Hub</div>}
          </div>
          {openEmployees && isOpen && (
            <div className="ts-submenu">
              <SubBtn icon={UserIcon} label="Employees" path="/employee-hub" />
              <SubBtn icon={CalendarDaysIcon} label="Annual Leave Balance" path="/annual-leave-balance" />
              <SubBtn icon={UserGroupIcon} label="Organizational Chart" path="/organisational-chart" />
              <SubBtn icon={ArchiveBoxIcon} label="Archived Employees" path="/archive-employees" />
              <SubBtn icon={UserGroupIcon} label="Manage Teams" path="/manage-teams" />
            </div>
          )}

          <div className="ts-divider" />
          {isOpen && <div className="ts-section-label">Workforce</div>}

          {/* Calendar */}
          <NavBtn icon={CalendarIcon} label="Calendar" path="/calendar" />

          {/* Shift Management */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${isActive("/rota-shift-management") ? "active" : ""}`}
              onClick={() => { handleMenuClick(); handleNavigation("/rota-shift-management"); }}
            >
              <CalendarDaysIcon className="ts-btn-icon" />
              <span className="ts-btn-label">Shift Management</span>
            </button>
            {!isOpen && <div className="ts-tooltip">Shift Management</div>}
          </div>

          {/* ClockIns */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${openClockInOut ? "open" : ""}`}
              onClick={() => { handleMenuClick(); setOpenClockInOut(!openClockInOut); }}
            >
              <ClockIcon className="ts-btn-icon" />
              <span className="ts-btn-label">ClockIns</span>
              <ChevronRightIcon className={`ts-chevron ${openClockInOut ? "rotated" : ""}`} />
            </button>
            {!isOpen && <div className="ts-tooltip">ClockIns</div>}
          </div>
          {openClockInOut && isOpen && (
            <div className="ts-submenu">
              <SubBtn icon={HomeIcon} label="Overview" path="/clock-overview" />
              <SubBtn icon={ClockIcon} label="Clock-ins" path="/clock-ins" />
              <SubBtn icon={DocumentTextIcon} label="History" path="/time-history" />
            </div>
          )}

          <div className="ts-divider" />
          {isOpen && <div className="ts-section-label">Reporting</div>}

          {/* Performance */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${location.pathname.startsWith("/performance") ? "active" : ""}`}
              onClick={() => { handleMenuClick(); handleNavigation("/performance"); }}
            >
              <svg className="ts-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="ts-btn-label">Performance</span>
            </button>
            {!isOpen && <div className="ts-tooltip">Performance</div>}
          </div>

          {/* Documents */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${(location.pathname.startsWith("/documents") || location.pathname.startsWith("/manager/documents")) ? "active" : ""}`}
              onClick={() => { handleMenuClick(); handleNavigation("/documents"); }}
            >
              <DocumentDuplicateIcon className="ts-btn-icon" />
              <span className="ts-btn-label">Documents</span>
            </button>
            {!isOpen && <div className="ts-tooltip">Documents</div>}
          </div>

          {/* E-Learning */}
          <NavBtn icon={BookOpenIcon} label="E-Learning" path="/e-learning" />

          {/* Expenses */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${
                (location.pathname.startsWith("/expenses") ||
                  location.pathname.startsWith("/admin/expenses") ||
                  location.pathname.startsWith("/manager/expenses") ||
                  (location.pathname.startsWith("/user-dashboard") &&
                    new URLSearchParams(location.search).get("tab") === "expenses"))
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                handleMenuClick();
                if (isAdminUser) navigate("/admin/expenses");
                else if (isManagerUser) navigate("/manager/expenses");
                else navigate("/user-dashboard?tab=expenses");
              }}
            >
              <svg className="ts-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <span className="ts-btn-label">Expenses</span>
            </button>
            {!isOpen && <div className="ts-tooltip">Expenses</div>}
          </div>

          {/* Report Library */}
          <div className="ts-tooltip-wrap">
            <button
              className={`ts-btn ${
                (location.pathname === "/report-library" || location.pathname === "/manager/report-library")
                  ? "active"
                  : ""
              }`}
              onClick={() => { handleMenuClick(); handleNavigation("/report-library"); }}
            >
              <svg className="ts-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="ts-btn-label">Report Library</span>
            </button>
            {!isOpen && <div className="ts-tooltip">Report Library</div>}
          </div>

        </div>

        {/* ── Footer / Profile ── */}
        <div className="ts-footer">
          <div className="ts-tooltip-wrap">
            <button
              className="ts-profile-btn"
              onClick={() => { if (!isOpen) { toggleSidebar(); return; } setOpenSettings(!openSettings); }}
            >
              <div className="ts-avatar">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {isOpen && (
                <>
                  <div className="ts-profile-info">
                    <div className="ts-profile-name">{user?.firstName} {user?.lastName}</div>
                    <div className="ts-profile-email">{user?.email}</div>
                  </div>
                  <ChevronRightIcon
                    style={{
                      width: 13, height: 13, flexShrink: 0,
                      opacity: 0.5, color: "#84a98c",
                      transform: openSettings ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </>
              )}
            </button>
            {!isOpen && <div className="ts-tooltip">{user?.firstName} {user?.lastName}</div>}
          </div>

          {openSettings && isOpen && (
            <div className="ts-profile-dropdown">
              <button
                className="ts-dropdown-btn"
                onClick={() =>
                  handleNavigation(
                    isAdminUser ? "/myaccount/profiles"
                    : isManagerUser ? "/manager/myaccount/profiles"
                    : "/user-dashboard?tab=profile"
                  )
                }
              >
                <UserIcon />
                <span>My Profile</span>
              </button>

              <button
                className="ts-dropdown-btn"
                onClick={() => {
                  handleNavigation(
                    isAdminUser ? "/myaccount/notifications"
                    : isManagerUser ? "/manager/myaccount/notifications"
                    : "/user-dashboard?tab=notifications"
                  );
                  triggerRefresh();
                }}
              >
                <BellIcon />
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="ts-badge" style={{ marginLeft: "auto" }}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </button>

              <div className="ts-dropdown-divider" />

              <button
                className="ts-dropdown-btn danger"
                onClick={handleLogout}
                disabled={loading}
                style={{ opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                <ArrowRightOnRectangleIcon />
                <span>{loading ? "Logging out…" : "Logout"}</span>
              </button>
            </div>
          )}

          {isOpen && (
            <div className="ts-version">TalentShield v{APP_VERSION}</div>
          )}
        </div>
      </div>

      <DocumentDrawer
        isOpen={openDocumentsDrawer}
        onClose={() => setOpenDocumentsDrawer(false)}
      />
    </>
  );
}