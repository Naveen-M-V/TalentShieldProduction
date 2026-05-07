import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, UserX, TrendingUp, CalendarDays, Activity,
  Users, AlertTriangle, Receipt, Award, TrendingDown, BarChart,
  ShieldAlert, Pause, Search, Filter
} from 'lucide-react';
import axios from 'axios';
import ReportCard from '../components/Reports/ReportCard';
import ReportGenerationPanel from '../components/Reports/ReportGenerationPanel';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .rl-root {
    font-family: 'DM Sans', sans-serif;
    -webkit-text-size-adjust: 100%;
    background: #f7f8f6;
    min-height: 100vh;
    padding: 1.5rem;
    position: relative;
    overflow-x: hidden;
    width: 100%;
    max-width: 100%;
  }
  .rl-root::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 70% 0%, rgba(132,169,140,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
    height: 600px;
  }
  .rl-shell {
    position: relative; z-index: 1;
    max-width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  /* ── Keyframes ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1; transform: scale(1.25); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .anim-fade-up { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }

  /* ══════════════════════════════════════
     PAGE HEADER
  ══════════════════════════════════════ */
  .page-header {
    display: flex; gap: 0.7rem; align-items: flex-start;
    margin-bottom: 1.4rem;
    min-width: 0;
  }
  .header-icon-wrap {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(53,79,82,0.18); flex-shrink: 0;
  }
  .header-eyebrow {
    font-size: 0.6rem; font-weight: 500; letter-spacing: 0.18em;
    text-transform: uppercase; color: #84a98c;
    margin: 0 0 0.1rem;
  }
  .header-title {
    font-family: 'Cormorant Garamond', serif; font-weight: 400;
    font-size: 1.65rem; color: #2f3e46; line-height: 1.15; letter-spacing: -0.02em;
    margin: 0;
  }
  .header-subtitle {
    font-size: 0.78rem; color: #7a8e84; font-weight: 300;
    margin: 0.25rem 0 0;
    max-width: 600px;
    line-height: 1.5;
  }

  /* ══════════════════════════════════════
     SEARCH + FILTER BAR
  ══════════════════════════════════════ */
  .search-card {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 12px;
    padding: 0.85rem 1rem;
    margin-bottom: 0.85rem;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .search-row {
    display: flex; flex-direction: column;
    gap: 0.7rem;
  }
  @media (min-width: 768px) {
    .search-row {
      flex-direction: row;
      align-items: center;
    }
  }
  .search-wrap {
    position: relative;
    flex: 1;
  }
  .search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #84a98c;
    pointer-events: none;
    display: flex; align-items: center;
  }
  .search-input {
    width: 100%;
    padding: 0.55rem 0.85rem 0.55rem 2.2rem;
    border: 1.5px solid #d4ddd6;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem; color: #2f3e46;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    min-height: 38px;
  }
  .search-input:focus {
    border-color: #52796f;
    box-shadow: 0 0 0 3px rgba(82,121,111,0.12);
  }
  .search-input::placeholder { color: #b6c0b9; }

  /* ══════════════════════════════════════
     CATEGORY PILLS
  ══════════════════════════════════════ */
  .pills-wrap {
    display: flex; align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0.2rem 0.1rem 0.6rem;
  }
  .pills-wrap::-webkit-scrollbar { display: none; }
  .pills-label {
    font-size: 0.6rem; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #84a98c;
    margin-right: 0.3rem;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .pill-btn {
    background: #fff;
    border: 1.5px solid #d4ddd6;
    color: #52796f;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.74rem; font-weight: 500;
    letter-spacing: 0.02em;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    -webkit-tap-highlight-color: transparent;
    display: inline-flex; align-items: center; gap: 0.35rem;
    min-height: 30px;
  }
  .pill-btn:hover {
    border-color: #84a98c;
    color: #354f52;
    background: #fafbfa;
  }
  .pill-btn.is-active {
    background: linear-gradient(135deg, #354f52 0%, #52796f 100%);
    border-color: transparent;
    color: #cad2c5;
    box-shadow: 0 3px 10px rgba(53,79,82,0.22);
  }
  .pill-btn.is-active:hover {
    color: #cad2c5;
  }

  /* ══════════════════════════════════════
     RESULTS META
  ══════════════════════════════════════ */
  .results-meta {
    font-size: 0.74rem; color: #7a8e84; font-weight: 400;
    margin-bottom: 0.85rem;
    display: flex; align-items: center; gap: 0.5rem;
    flex-wrap: wrap;
  }
  .results-count {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.95rem; font-weight: 500;
    color: #2f3e46;
    margin: 0 0.05rem;
  }

  /* ══════════════════════════════════════
     CARD GRID
  ══════════════════════════════════════ */
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 640px) { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .cards-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1380px) { .cards-grid { grid-template-columns: repeat(4, 1fr); } }

  /* ══════════════════════════════════════
     EMPTY / LOADING
  ══════════════════════════════════════ */
  .loading-card {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.85rem;
    padding: 4rem 1.5rem;
  }
  .spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(82,121,111,0.18);
    border-top-color: #52796f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .loading-text {
    font-size: 0.78rem; color: #7a8e84; font-weight: 400;
    margin: 0;
  }

  .empty-state {
    background: #fff;
    border: 1px solid #eaefeb;
    border-radius: 14px;
    padding: 3.25rem 1.5rem;
    text-align: center;
    box-shadow: 0 1px 3px rgba(47,62,70,0.04);
  }
  .empty-icon-wrap {
    width: 60px; height: 60px;
    border-radius: 50%;
    background: rgba(132,169,140,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1rem;
    color: #84a98c;
  }
  .empty-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.3rem; font-weight: 400;
    color: #2f3e46; letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .empty-text {
    font-size: 0.82rem; color: #7a8e84; font-weight: 300;
    margin: 0 0 1rem;
    max-width: 420px;
    margin-left: auto; margin-right: auto;
  }
  .empty-clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #52796f;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.76rem; font-weight: 500;
    text-decoration: underline;
    text-decoration-color: rgba(82,121,111,0.4);
    text-underline-offset: 3px;
    padding: 0;
    transition: color 0.15s, text-decoration-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .empty-clear-btn:hover {
    color: #354f52;
    text-decoration-color: #52796f;
  }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 1023px) {
    .rl-root { padding: 1.25rem; }
    .header-title { font-size: 1.5rem; }
  }
  @media (max-width: 767px) {
    .rl-root { padding: 0.85rem; }
    .header-title { font-size: 1.35rem; }
    .header-icon-wrap { width: 34px; height: 34px; border-radius: 9px; }
  }
  @media (max-width: 479px) {
    .rl-root { padding: 0.65rem; }
    .header-title { font-size: 1.25rem; }
    .search-input { font-size: 16px; }
  }
`;

const ReportLibrary = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showGenerationPanel, setShowGenerationPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const iconMap = {
    Calendar, Clock, UserX, TrendingUp, CalendarDays, Activity,
    Users, AlertTriangle, Receipt, Award, TrendingDown, BarChart,
    ShieldAlert, Pause
  };

  useEffect(() => {
    fetchReportTypes();
  }, []);

  useEffect(() => {
    filterReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, reports]);

  const fetchReportTypes = async () => {
    try {
      const response = await axios.get('/api/report-library/types');
      if (response.data.success) {
        setReports(response.data.data);
        setFilteredReports(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching report types:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = [...reports];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(report => report.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
    setShowGenerationPanel(true);
  };

  const handleClosePanel = () => {
    setShowGenerationPanel(false);
    setSelectedReport(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const categories = [
    { id: 'all', label: 'All Reports' },
    { id: 'Leave', label: 'Leave' },
    { id: 'Time', label: 'Time' },
    { id: 'People', label: 'People' },
    { id: 'Finance', label: 'Finance' },
    { id: 'Payroll', label: 'Payroll' },
    { id: 'Compliance', label: 'Compliance' }
  ];

  const totalReports = reports.length;
  const visibleReports = filteredReports.length;
  const isFiltered = searchQuery.trim() !== '' || selectedCategory !== 'all';

  return (
    <>
      <style>{styles}</style>
      <div className="rl-root">
        <div className="rl-shell">

          {/* ── Page Header ── */}
          <div className="page-header anim-fade-up">
            <div className="header-icon-wrap">
              <svg style={{ width: 18, height: 18, color: '#cad2c5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 17v-6h13M9 11V5h13M3 5h2m-2 6h2m-2 6h2" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="header-eyebrow">Insights & Analytics</p>
              <h1 className="header-title">Report Library</h1>
              <p className="header-subtitle">
                Generate comprehensive reports for workforce analytics and compliance.
              </p>
            </div>
          </div>

          {/* ── Search ── */}
          <div className="search-card anim-fade-up delay-100">
            <div className="search-row">
              <div className="search-wrap">
                <span className="search-icon">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search reports by name or description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          {/* ── Category pills ── */}
          <div className="pills-wrap anim-fade-up delay-100">
            <span className="pills-label">
              <Filter size={11} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} />
              Category
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`pill-btn ${selectedCategory === cat.id ? 'is-active' : ''}`}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ── Results meta ── */}
          {!loading && reports.length > 0 && (
            <div className="results-meta anim-fade-up delay-200">
              {isFiltered ? (
                <>
                  Showing
                  <span className="results-count">{visibleReports}</span>
                  of
                  <span className="results-count">{totalReports}</span>
                  reports
                </>
              ) : (
                <>
                  <span className="results-count">{totalReports}</span>
                  report{totalReports === 1 ? '' : 's'} available
                </>
              )}
            </div>
          )}

          {/* ── Cards grid / Empty / Loading ── */}
          {loading ? (
            <div className="loading-card">
              <div className="spinner"></div>
              <p className="loading-text">Loading reports…</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state"
            >
              <div className="empty-icon-wrap">
                <Search size={26} />
              </div>
              <h3 className="empty-title">No reports found</h3>
              <p className="empty-text">
                {isFiltered
                  ? 'Try adjusting your search or selecting a different category.'
                  : 'No reports are available at this time.'}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="empty-clear-btn"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="cards-grid"
            >
              {filteredReports.map((report, index) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  icon={iconMap[report.icon]}
                  onClick={handleReportClick}
                  delay={Math.min(index, 12) * 0.04}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Report Generation Panel (passthrough) */}
      {showGenerationPanel && selectedReport && (
        <ReportGenerationPanel
          report={selectedReport}
          icon={iconMap[selectedReport.icon]}
          onClose={handleClosePanel}
        />
      )}
    </>
  );
};

export default ReportLibrary;