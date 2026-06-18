import React, { useEffect, useState, useMemo } from "react";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const ADMIN_PASSWORD = "nexshare123";
const BUILD_NUMBER = "Release V1.0.0 (Overhaul)";
const SERVER_ONLINE = true;

// Future-proof item architecture
const INVENTORY = [
  { id: "ugreen_100w", name: "UGREEN 100W GaN Charger", icon: "⚡" },
  { id: "redmi_pb", name: "Redmi Power Bank", icon: "🔋" },
  { id: "iniu_p63", name: "INIU P63 Power Bank", icon: "📱" },
  { id: "photo_storage", name: "Photo Storage Service", icon: "💾" },
  { id: "tech_support", name: "Tech Support Service", icon: "🛠️" },
];

const PRICING = [
  { max: 1, price: 0.25 },
  { max: 2, price: 0.4 },
  { max: 3, price: 0.5 },
  { max: 5, price: 0.75 },
  { max: 12, price: 1.0 },
  { max: 24, price: 1.5 },
  { max: 48, price: 2.5 },
  { max: 168, price: 5.0 },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getPrice(hours, isNight = false) {
  const tier = PRICING.find((t) => hours <= t.max) || PRICING[PRICING.length - 1];
  let total = tier.price;
  if (isNight) total += 0.2;
  return total;
}

const formatMoney = (amount) => `£${Math.max(0, amount).toFixed(2)}`;
const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==========================================
// MAIN APPLICATION
// ==========================================
export default function App() {
  // --- State Management ---
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [developerMode, setDeveloperMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);

  // Form & UI State
  const [borrowForm, setBorrowForm] = useState({ borrower: "", itemId: "ugreen_100w" });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'active', 'returned'

  // --- Effects ---
  useEffect(() => {
    triggerSplash();
    const saved = localStorage.getItem("nexshare_sessions");
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("nexshare_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Core Logic ---
  function triggerSplash() {
    setShowSplash(true);
    setTimeout(() => setShowSplash(false), 2000);
  }

  function handleBuildTap() {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 7) {
      if (!developerMode) {
        const entered = window.prompt("Enter Developer Password:");
        if (entered === ADMIN_PASSWORD) {
          setDeveloperMode(true);
          setAuthenticated(true);
          triggerSplash();
        } else if (entered !== null) {
          window.alert("Incorrect Password");
        }
      }
      setTapCount(0);
    }
  }

  function switchToCustomerMode() {
    setDeveloperMode(false);
    setAuthenticated(false);
    triggerSplash();
  }

  function startBorrow(e) {
    e.preventDefault();
    if (!borrowForm.borrower.trim()) {
      window.alert("Please enter a borrower name.");
      return;
    }

    const itemConfig = INVENTORY.find((i) => i.id === borrowForm.itemId);
    
    // Check if this specific item is currently borrowed
    const isAvailable = !sessions.some((s) => !s.returned && s.itemId === borrowForm.itemId);
    if (!isAvailable) {
      window.alert(`${itemConfig.name} is currently out on loan.`);
      return;
    }

    const session = {
      id: Date.now(),
      borrower: borrowForm.borrower.trim(),
      itemId: itemConfig.id,
      item: itemConfig.name,
      start: new Date().toISOString(),
      returned: false,
      owed: 0,
    };

    setSessions((prev) => [...prev, session]);
    setBorrowForm({ ...borrowForm, borrower: "" });
  }

  function returnItem(id) {
    const entered = window.prompt("Enter Admin Password to confirm return:");
    if (entered !== ADMIN_PASSWORD) {
      if (entered !== null) window.alert("Incorrect Password");
      return;
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const startTime = new Date(s.start);
        const currentTime = new Date();
        const hours = (currentTime - startTime) / (1000 * 60 * 60);
        const currentHour = currentTime.getHours();
        const isNight = currentHour >= 21 || currentHour < 8;

        return {
          ...s,
          returned: true,
          end: currentTime.toISOString(),
          owed: getPrice(hours, isNight),
        };
      })
    );
  }

  function deleteLog(id) {
    if (!authenticated) {
      const entered = window.prompt("Enter Admin Password to delete log:");
      if (entered !== ADMIN_PASSWORD) {
        if (entered !== null) window.alert("Incorrect Password");
        return;
      }
      setAuthenticated(true);
    }
    if (window.confirm("Are you sure you want to permanently delete this log?")) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  // --- Derived State (Performance Optimized) ---
  const inventoryStatus = useMemo(() => {
    return INVENTORY.map(item => {
      const activeBorrow = sessions.find(s => !s.returned && s.itemId === item.id);
      return { ...item, isAvailable: !activeBorrow, activeBorrow };
    });
  }, [sessions]);

  const stats = useMemo(() => {
    let revenue = 0;
    let outstanding = 0;
    let active = 0;
    let returnedCount = 0;

    sessions.forEach(s => {
      if (s.returned) {
        revenue += s.owed;
        returnedCount++;
      } else {
        active++;
        const hours = (now - new Date(s.start)) / (1000 * 60 * 60);
        const currentHour = new Date().getHours();
        const isNight = currentHour >= 21 || currentHour < 8;
        outstanding += getPrice(hours, isNight);
      }
    });

    return { total: sessions.length, active, returnedCount, revenue, outstanding };
  }, [sessions, now]);

  const filteredLogs = useMemo(() => {
    return [...sessions]
      .reverse()
      .filter((s) => {
        // Mode filter: Customers only see active sessions unless Dev mode is on
        if (!developerMode && s.returned) return false;
        
        // Status filter (Dev Mode)
        if (filterType === "active" && s.returned) return false;
        if (filterType === "returned" && !s.returned) return false;
        
        // Search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return s.borrower.toLowerCase().includes(q) || s.item.toLowerCase().includes(q);
        }
        return true;
      });
  }, [sessions, developerMode, filterType, searchQuery]);

  // ==========================================
  // RENDER BLOCKS
  // ==========================================

  // 1. Server Down View
  if (!SERVER_ONLINE) {
    return (
      <div className="fullscreen-center bg-dark">
        <div className="text-huge animate-pulse">⚡</div>
        <h1 className="title-glow">Server Maintenance</h1>
        <p className="text-muted">NEXSHARE is currently down for repairs or updates. Please check back later.</p>
      </div>
    );
  }

  // 2. Splash Screen View
  if (showSplash) {
    return (
      <div className="fullscreen-center bg-dark">
        <div className="splash-logo">⚡</div>
        <div className="splash-text">
          {developerMode ? "NEXSHARE ADMIN" : "NEXSHARE"}
        </div>
        <div className="splash-subtext">
          {developerMode ? "Authenticating & Loading Assets..." : "Connecting to Secure Server..."}
        </div>
        <Styles />
      </div>
    );
  }

  // 3. Main Interface View
  return (
    <div className={`app-container ${developerMode ? "dev-theme" : ""}`}>
      <Styles />

      {/* HEADER */}
      <header className="app-header glass-panel">
        <div className="header-left">
          <div className="logo-container">
            <span className="logo-icon">⚡</span>
            <div>
              <h1 className="brand-title">NEXSHARE</h1>
              <p className="brand-subtitle">Family Tech Rental System</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className={`status-badge ${developerMode ? "badge-dev" : "badge-customer"}`}>
            <span className="pulse-dot"></span>
            {developerMode ? "Admin Mode" : "Customer Mode"}
          </div>
        </div>
      </header>

      <main className="app-main">
        
        {/* CUSTOMER MODE: BORROW PANEL */}
        {!developerMode && (
          <div className="glass-panel slide-up">
            <h2 className="panel-title">Start a New Session</h2>
            <form onSubmit={startBorrow} className="borrow-form">
              <div className="input-group">
                <label>Select Item</label>
                <select 
                  value={borrowForm.itemId} 
                  onChange={(e) => setBorrowForm({ ...borrowForm, itemId: e.target.value })}
                  className="modern-input"
                >
                  {inventoryStatus.map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.isAvailable}>
                      {item.icon} {item.name} {!item.isAvailable ? "(Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Borrower Name</label>
                <input
                  type="text"
                  value={borrowForm.borrower}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrower: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="modern-input"
                />
              </div>
              <button type="submit" className="btn btn-primary form-submit">
                Authorize Borrow
              </button>
            </form>
          </div>
        )}

        {/* DEVELOPER MODE: ADMIN DASHBOARD */}
        {developerMode && (
          <div className="admin-dashboard slide-up">
            <div className="dashboard-header glass-panel">
              <div className="dashboard-header-text">
                <h2 className="panel-title text-dev">Server & Analytics Dashboard</h2>
                <p className="text-muted">Live metrics and system status.</p>
              </div>
              <button onClick={switchToCustomerMode} className="btn btn-outline">
                Exit Admin Mode
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <div className="stat-title">Total Revenue</div>
                <div className="stat-value text-success">{formatMoney(stats.revenue)}</div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-title">Pending Revenue</div>
                <div className="stat-value text-warning">{formatMoney(stats.outstanding)}</div>
              </div>
              <div className="stat-card glass-panel">
                <div className="stat-title">Active / Total Borrows</div>
                <div className="stat-value">{stats.active} / {stats.total}</div>
              </div>
            </div>

            <div className="inventory-grid">
              {inventoryStatus.map(item => (
                <div key={item.id} className={`inv-card glass-panel ${item.isAvailable ? 'available' : 'borrowed'}`}>
                  <div className="inv-header">
                    <span>{item.icon} {item.name}</span>
                    <span className={`status-indicator ${item.isAvailable ? 'text-success' : 'text-danger'}`}>
                      {item.isAvailable ? "🟢 Available" : "🔴 Out"}
                    </span>
                  </div>
                  {!item.isAvailable && item.activeBorrow && (
                    <div className="inv-details">
                      Borrowed by: <strong>{item.activeBorrow.borrower}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOGS SECTION */}
        <div className="logs-container slide-up-delayed">
          <div className="logs-header">
            <h2 className="panel-title">{developerMode ? "System Logs & History" : "Active Sessions"}</h2>
            
            {developerMode && (
              <div className="log-controls">
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modern-input search-input"
                />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="modern-input filter-select"
                >
                  <option value="all">All Logs</option>
                  <option value="active">Active Only</option>
                  <option value="returned">Returned Only</option>
                </select>
              </div>
            )}
          </div>

          <div className="logs-list">
            {filteredLogs.length === 0 ? (
              <div className="empty-state glass-panel">
                <div className="empty-icon">📁</div>
                <h3>No records found</h3>
                <p className="text-muted">There are currently no sessions matching your criteria.</p>
              </div>
            ) : (
              filteredLogs.map((session) => {
                const startTime = new Date(session.start);
                const hours = (now - startTime) / (1000 * 60 * 60);
                const isNight = new Date().getHours() >= 21 || new Date().getHours() < 8;
                const liveCost = getPrice(hours, isNight);

                return (
                  <div key={session.id} className={`log-card glass-panel ${session.returned ? "log-returned" : "log-active"}`}>
                    <div className="log-header">
                      <div className="log-identity">
                        <div className="log-avatar">{session.borrower.charAt(0).toUpperCase()}</div>
                        <div>
                          <h3 className="log-borrower">{session.borrower}</h3>
                          <p className="log-item">{session.item}</p>
                        </div>
                      </div>
                      <div className={`log-status ${session.returned ? 'bg-success-dim' : 'bg-warning-dim'}`}>
                        {session.returned ? "Returned" : "Active"}
                      </div>
                    </div>

                    <div className="log-details">
                      <div className="detail-group">
                        <label>Start Time</label>
                        <span>{formatDate(session.start)}</span>
                      </div>
                      {session.returned ? (
                        <>
                          <div className="detail-group">
                            <label>Return Time</label>
                            <span>{formatDate(session.end)}</span>
                          </div>
                          <div className="detail-group">
                            <label>Final Cost</label>
                            <span className="text-success font-bold">{formatMoney(session.owed)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="detail-group">
                            <label>Duration</label>
                            <span>{Math.floor(hours)}h {Math.floor((hours * 60) % 60)}m</span>
                          </div>
                          <div className="detail-group">
                            <label>Accrued Cost</label>
                            <span className="text-warning font-bold">{formatMoney(liveCost)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="log-actions">
                      {!session.returned && !developerMode && (
                        <button onClick={() => returnItem(session.id)} className="btn btn-success btn-full">
                          Mark as Returned
                        </button>
                      )}
                      {developerMode && (
                        <button onClick={() => deleteLog(session.id)} className="btn btn-danger">
                          Delete Record
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* FOOTER (Secret Trigger Area) */}
      <footer className="app-footer">
        <div onClick={handleBuildTap} className="build-tag">
          {BUILD_NUMBER} | System Healthy
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// CSS STYLES (Injected purely for single-file constraints)
// ==========================================
function Styles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --bg-color: #0f172a;
        --surface-color: #1e293b;
        --surface-hover: #334155;
        --border-color: rgba(255, 255, 255, 0.08);
        --text-main: #f8fafc;
        --text-muted: #94a3b8;
        --primary: #3b82f6;
        --primary-hover: #2563eb;
        --success: #10b981;
        --success-hover: #059669;
        --danger: #ef4444;
        --danger-hover: #dc2626;
        --warning: #f59e0b;
        --glow: rgba(59, 130, 246, 0.5);
      }

      .dev-theme {
        --bg-color: #1a0505;
        --surface-color: #2d1313;
        --surface-hover: #451a1a;
        --border-color: rgba(239, 68, 68, 0.15);
        --primary: #ef4444;
        --primary-hover: #dc2626;
        --glow: rgba(239, 68, 68, 0.5);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--bg-color); color: var(--text-main); font-family: 'Inter', system-ui, -apple-system, sans-serif; transition: background 0.5s ease; -webkit-font-smoothing: antialiased; }
      
      /* UTILITIES */
      .text-muted { color: var(--text-muted); }
      .text-success { color: var(--success); }
      .text-danger, .text-dev { color: var(--danger); }
      .text-warning { color: var(--warning); }
      .font-bold { font-weight: 700; }
      .bg-success-dim { background: rgba(16, 185, 129, 0.15); color: var(--success); }
      .bg-warning-dim { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
      
      .fullscreen-center { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-color); text-align: center; overflow: hidden;}
      
      /* LAYOUT */
      .app-container { min-height: 100vh; display: flex; flex-direction: column; max-width: 1000px; margin: 0 auto; padding: 20px; }
      .app-main { flex: 1; display: flex; flex-direction: column; gap: 24px; }
      
      /* GLASS PANELS */
      .glass-panel { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: all 0.3s ease; backdrop-filter: blur(10px); }
      
      /* HEADER */
      .app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 20px 24px; }
      .logo-container { display: flex; align-items: center; gap: 16px; }
      .logo-icon { font-size: 32px; filter: drop-shadow(0 0 8px var(--glow)); }
      .brand-title { font-size: 24px; font-weight: 800; letter-spacing: 1px; margin: 0; }
      .brand-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
      
      /* BADGES */
      .status-badge { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); }
      .badge-customer { color: var(--text-main); }
      .badge-dev { color: var(--danger); border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
      .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); animation: pulse 2s infinite; }
      .badge-dev .pulse-dot { background: var(--danger); box-shadow: 0 0 8px var(--danger); }

      /* FORMS & INPUTS */
      .borrow-form { display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: end; margin-top: 20px; }
      .input-group { display: flex; flex-direction: column; gap: 8px; }
      .input-group label { font-size: 13px; font-weight: 500; color: var(--text-muted); }
      .modern-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 12px 16px; border-radius: 10px; font-size: 15px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
      .modern-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      .modern-input option { background: var(--surface-color); }
      
      /* BUTTONS */
      .btn { padding: 12px 20px; border-radius: 10px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; justify-content: center; align-items: center; }
      .btn-primary { background: var(--primary); color: white; }
      .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 12px var(--glow); }
      .btn-success { background: var(--success); color: white; }
      .btn-success:hover { background: var(--success-hover); transform: translateY(-1px); }
      .btn-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
      .btn-danger:hover { background: var(--danger); color: white; }
      .btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-main); }
      .btn-outline:hover { background: rgba(255,255,255,0.05); }
      .btn-full { width: 100%; }

      /* DASHBOARD STATS */
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; }
      .stat-card { padding: 20px; border-radius: 12px; text-align: center; }
      .stat-title { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
      .stat-value { font-size: 28px; font-weight: 800; }
      
      /* INVENTORY GRID */
      .inventory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin-top: 20px; }
      .inv-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-left: 4px solid var(--success); }
      .inv-card.borrowed { border-left-color: var(--danger); opacity: 0.8; }
      .inv-header { display: flex; justify-content: space-between; font-weight: 600; font-size: 14px; }
      .inv-details { font-size: 13px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; }

      /* LOGS LIST */
      .logs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
      .log-controls { display: flex; gap: 12px; flex: 1; justify-content: flex-end; }
      .search-input { min-width: 200px; }
      .logs-list { display: flex; flex-direction: column; gap: 16px; }
      
      .log-card { display: flex; flex-direction: column; gap: 16px; transition: transform 0.2s; }
      .log-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.15); }
      .log-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; }
      .log-identity { display: flex; align-items: center; gap: 12px; }
      .log-avatar { width: 40px; height: 40px; border-radius: 10px; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: white; }
      .log-borrower { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
      .log-item { font-size: 13px; color: var(--text-muted); }
      .log-status { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      
      .log-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; }
      .detail-group label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
      .detail-group span { font-size: 14px; font-weight: 500; }
      .log-actions { margin-top: 8px; display: flex; justify-content: flex-end; }

      /* MISC / EMPTY STATES */
      .empty-state { text-align: center; padding: 40px 20px; border-style: dashed; }
      .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
      .app-footer { text-align: center; padding: 24px; margin-top: auto; }
      .build-tag { display: inline-block; font-size: 12px; color: var(--text-muted); opacity: 0.5; cursor: pointer; user-select: none; transition: opacity 0.2s; padding: 8px; }
      .build-tag:hover { opacity: 1; }

      /* DASHBOARD HEADERS */
      .dashboard-header { display: flex; justify-content: space-between; align-items: center; }

      /* ANIMATIONS */
      .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .slide-up-delayed { opacity: 0; animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
      
      .splash-logo { font-size: 80px; animation: splashPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; margin-bottom: 20px; filter: drop-shadow(0 0 20px var(--glow)); }
      .splash-text { font-size: 24px; font-weight: 800; letter-spacing: 2px; animation: textFadeIn 0.8s ease-out; }
      .splash-subtext { font-size: 14px; color: var(--text-muted); margin-top: 10px; animation: textFadeIn 1.2s ease-out; }

      @keyframes slideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
      @keyframes splashPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
      @keyframes textFadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }

      /* RESPONSIVENESS */
      @media (max-width: 768px) {
        .borrow-form { grid-template-columns: 1fr; gap: 12px; }
        .dashboard-header { flex-direction: column; gap: 16px; align-items: flex-start; }
        .app-header { flex-direction: column; gap: 16px; align-items: flex-start; }
        .log-controls { flex-direction: column; width: 100%; }
      }
    `}} />
  );
}
