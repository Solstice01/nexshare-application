import React, { useEffect, useState, useMemo, useCallback } from "react";

const ADMIN_PASSWORD = "nexshare123";
const BUILD_NUMBER = "V1.0 Full Release • Build 2026.06.18";

const SERVER_ONLINE = true;

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

const ITEMS = [
  { id: "ugreen", name: "UGREEN 100W GaN Charger", available: true },
  // Future items prepared for easy expansion:
  // { id: "redmi", name: "Redmi Power Bank", available: true },
  // { id: "iniu", name: "INIU P63 Power Bank", available: true },
];

function getPrice(hours, isNight = false) {
  const tier = PRICING.find((t) => hours <= t.max) || PRICING[PRICING.length - 1];
  let total = tier.price;
  if (isNight) total += 0.2;
  return total;
}

function formatCurrency(amount) {
  return `£${amount.toFixed(2)}`;
}

function StatusBadge({ status, isAvailable }) {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide";
  if (status === "available") {
    return <span className={`${base} bg-emerald-500/10 text-emerald-400`}>🟢 AVAILABLE</span>;
  }
  if (status === "borrowed") {
    return <span className={`${base} bg-rose-500/10 text-rose-400`}>🔴 BORROWED</span>;
  }
  return null;
}

function SessionCard({ session, now, developerMode, onReturn, onDelete }) {
  const startTime = new Date(session.start);
  const hours = (now - startTime) / (1000 * 60 * 60);
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 21 || currentHour < 8;
  const liveCost = getPrice(hours, isNight);

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700 hover:shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="font-semibold text-lg">{session.borrower}</div>
          <div className="text-sm text-zinc-400">{session.item}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">STARTED</div>
          <div className="text-sm font-mono">{startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${session.returned ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {session.returned ? "RETURNED" : "ACTIVE"}
        </div>
        {!session.returned && (
          <div className="text-emerald-400 text-sm font-mono">{formatCurrency(liveCost)} <span className="text-zinc-500">live</span></div>
        )}
      </div>

      {session.returned && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500">FINAL AMOUNT</div>
          <div className="text-2xl font-semibold text-emerald-400">{formatCurrency(session.owed)}</div>
        </div>
      )}

      <div className="flex gap-3">
        {!session.returned && !developerMode && (
          <button
            onClick={() => onReturn(session.id)}
            className="flex-1 bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 active:scale-[0.985] transition-all"
          >
            Return Item
          </button>
        )}
        {developerMode && (
          <button
            onClick={() => onDelete(session.id)}
            className="flex-1 bg-zinc-800 hover:bg-rose-900 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.985]"
          >
            Delete Log
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [borrower, setBorrower] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(ITEMS[0].id);
  const [now, setNow] = useState(Date.now());

  const [developerMode, setDeveloperMode] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | returned

  // Splash screen
  const triggerSplash = useCallback(() => {
    setShowSplash(true);
    setTimeout(() => setShowSplash(false), 2200);
  }, []);

  useEffect(() => {
    triggerSplash();
  }, [triggerSplash]);

  // Load & persist sessions
  useEffect(() => {
    const saved = localStorage.getItem("nexshare_sessions");
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("nexshare_sessions", JSON.stringify(sessions));
  }, [sessions]);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Derived data
  const activeSessions = useMemo(() => sessions.filter(s => !s.returned), [sessions]);
  const currentItem = ITEMS.find(i => i.id === selectedItemId) || ITEMS[0];
  const itemAvailable = activeSessions.length === 0;

  const filteredSessions = useMemo(() => {
    let result = [...sessions].reverse();

    if (!developerMode) {
      result = result.filter(s => !s.returned);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.borrower.toLowerCase().includes(term) ||
        s.item.toLowerCase().includes(term)
      );
    }

    if (filter === "active") result = result.filter(s => !s.returned);
    if (filter === "returned") result = result.filter(s => s.returned);

    return result;
  }, [sessions, developerMode, searchTerm, filter]);

  // Stats (Developer Mode)
  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter(s => !s.returned).length;
    const returned = total - active;
    const revenue = sessions
      .filter(s => s.returned)
      .reduce((sum, s) => sum + (s.owed || 0), 0);

    return { total, active, returned, revenue };
  }, [sessions]);

  // Developer mode unlock
  const handleBuildTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount >= 7) {
      const entered = prompt("Enter developer password");
      if (entered === ADMIN_PASSWORD) {
        setDeveloperMode(true);
        setAuthenticated(true);
        triggerSplash();
        alert("Developer Mode Enabled");
      } else {
        alert("Incorrect Password");
      }
      setTapCount(0);
    }
  };

  const switchToCustomerMode = () => {
    setDeveloperMode(false);
    setAuthenticated(false);
    setSearchTerm("");
    setFilter("all");
    triggerSplash();
  };

  // Borrow
  const startBorrow = () => {
    if (!borrower.trim()) {
      alert("Please enter a borrower name");
      return;
    }

    const session = {
      id: Date.now(),
      borrower: borrower.trim(),
      item: currentItem.name,
      itemId: currentItem.id,
      start: new Date().toISOString(),
      returned: false,
      owed: 0,
    };

    setSessions(prev => [...prev, session]);
    setBorrower("");
  };

  // Return item (password protected)
  const returnItem = (id) => {
    const entered = prompt("Enter admin password to return item");
    if (entered !== ADMIN_PASSWORD) {
      alert("Incorrect Password");
      return;
    }

    setSessions(prev =>
      prev.map(s => {
        if (s.id !== id) return s;

        const startTime = new Date(s.start);
        const currentTime = new Date();
        const hours = (currentTime - startTime) / (1000 * 60 * 60);
        const currentHour = currentTime.getHours();
        const isNight = currentHour >= 21 || currentHour < 8;
        const finalCost = getPrice(hours, isNight);

        return {
          ...s,
          returned: true,
          end: currentTime.toISOString(),
          owed: finalCost,
        };
      })
    );
  };

  // Delete log
  const deleteLog = (id) => {
    if (!authenticated) {
      const entered = prompt("Enter admin password");
      if (entered !== ADMIN_PASSWORD) {
        alert("Incorrect Password");
        return;
      }
      setAuthenticated(true);
    }

    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // Server down screen
  if (!SERVER_ONLINE) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-8xl mb-6">⚡</div>
          <h1 className="text-4xl font-bold mb-2">Server Temporarily Unavailable</h1>
          <p className="text-zinc-400 max-w-sm mx-auto">NEXSHARE is currently undergoing maintenance or updates.</p>
        </div>
      </div>
    );
  }

  // Splash screen
  if (showSplash) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[140px] mb-4 animate-[zoomFade_2.2s_ease_forwards]">⚡</div>
          <div className="text-2xl font-medium text-zinc-400 animate-[textFade_2.2s_ease_forwards]">
            {developerMode ? "Developer Mode" : "NEXSHARE"}
          </div>
        </div>
        <style>{`
          @keyframes zoomFade { 0%{transform:scale(0.6);opacity:0} 35%{transform:scale(1);opacity:1} 100%{transform:scale(2.8);opacity:0} }
          @keyframes textFade { 0%{opacity:0;transform:translateY(12px)} 35%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-12px)} }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Top Navigation */}
      <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold tracking-tighter">NEXSHARE</div>
            <div className="text-xs px-3 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
              {BUILD_NUMBER}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${developerMode ? "bg-red-950 text-red-400" : "bg-zinc-900"}`}>
              {developerMode ? "🖥 Developer Mode" : "👤 Customer Mode"}
            </div>
            {developerMode && (
              <button onClick={switchToCustomerMode} className="text-sm px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition">
                Switch to Customer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        {/* Hero Status */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="text-6xl font-semibold tracking-tighter mb-2">UGREEN 100W GaN Charger</div>
            <div className="flex items-center gap-3">
              <StatusBadge status={itemAvailable ? "available" : "borrowed"} />
              <span className="text-zinc-400 text-sm">Family Tech Rental System</span>
            </div>
          </div>

          {!developerMode && (
            <div className="text-right">
              <div className="text-sm text-zinc-500">CURRENT RATE</div>
              <div className="text-3xl font-semibold text-emerald-400">from £0.25/hr</div>
            </div>
          )}
        </div>

        {/* CUSTOMER MODE */}
        {!developerMode && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="uppercase tracking-[2px] text-xs text-zinc-500 mb-2">BORROW THIS ITEM</div>
                  <input
                    value={borrower}
                    onChange={(e) => setBorrower(e.target.value)}
                    placeholder="Enter borrower name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-lg placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={startBorrow}
                    disabled={!borrower.trim()}
                    className="w-full md:w-auto bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-lg py-4 px-10 rounded-2xl transition active:scale-[0.985]"
                  >
                    Start Borrow Session
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="text-center text-xs text-zinc-500">
              Night surcharge (+£0.20) applies 9pm–8am • Prices are per session
            </div>
          </div>
        )}

        {/* DEVELOPER MODE DASHBOARD */}
        {developerMode && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-xs text-zinc-500">TOTAL SESSIONS</div>
                <div className="text-5xl font-semibold mt-1">{stats.total}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-xs text-zinc-500">ACTIVE</div>
                <div className="text-5xl font-semibold mt-1 text-amber-400">{stats.active}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-xs text-zinc-500">RETURNED</div>
                <div className="text-5xl font-semibold mt-1 text-emerald-400">{stats.returned}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-xs text-zinc-500">TOTAL REVENUE</div>
                <div className="text-5xl font-semibold mt-1 text-emerald-400">{formatCurrency(stats.revenue)}</div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-semibold text-xl">Server Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-sm">Online • All systems operational</span>
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-500">Uptime since launch</div>
              </div>
            </div>
          </div>
        )}

        {/* LOGS SECTION */}
        <div className="mt-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="text-2xl font-semibold">
              {developerMode ? "Session Logs" : "Active Sessions"}
            </div>

            {developerMode && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search borrower or item..."
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:border-zinc-600"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">No sessions found.</div>
          ) : (
            <div className="grid gap-4">
              {filteredSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  now={now}
                  developerMode={developerMode}
                  onReturn={returnItem}
                  onDelete={deleteLog}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Build Number */}
      <div
        onClick={handleBuildTap}
        className="fixed bottom-4 right-4 text-[10px] text-zinc-500 hover:text-zinc-400 cursor-pointer select-none font-mono tracking-widest"
      >
        {BUILD_NUMBER}
      </div>
    </div>
  );
}
