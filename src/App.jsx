import React, { useEffect, useState } from "react";

const ADMIN_PASSWORD = "nexshare123";
const BUILD_NUMBER = "Release V0.78 DeVo";

const PRICING = [
  { max: 1, price: 0.25 },
  { max: 2, price: 0.40 },
  { max: 3, price: 0.50 },
  { max: 5, price: 0.75 },
  { max: 12, price: 1.00 },
  { max: 24, price: 1.50 },
  { max: 48, price: 2.50 },
  { max: 168, price: 5.00 }
];

function getPrice(hours, isNight = false) {
  const tier =
    PRICING.find((t) => hours <= t.max) ||
    PRICING[PRICING.length - 1];

  let total = tier.price;

  if (isNight) {
    total += 0.20;
  }

  return total;
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [borrower, setBorrower] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showSplash, setShowSplash] = useState(true);

  const [developerMode, setDeveloperMode] =
    useState(false);

  const [tapCount, setTapCount] = useState(0);

  // Splash animation
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(splashTimer);
  }, []);

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem(
      "nexshare_sessions"
    );

    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(
      "nexshare_sessions",
      JSON.stringify(sessions)
    );
  }, [sessions]);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Developer unlock
  function handleBuildTap() {
    const newCount = tapCount + 1;

    setTapCount(newCount);

    if (newCount >= 7) {
      const entered = prompt(
        "Enter developer password"
      );

      if (entered === ADMIN_PASSWORD) {
        setDeveloperMode(true);
        alert("Developer Mode Enabled");
      } else {
        alert("Incorrect Password");
      }

      setTapCount(0);
    }
  }

  // Start borrow
  function startBorrow() {
    if (!borrower.trim()) {
      alert("Enter borrower name");
      return;
    }

    const session = {
      id: Date.now(),
      borrower,
      item: "UGREEN 100W GaN Charger",
      start: new Date().toISOString(),
      returned: false,
      owed: 0
    };

    setSessions((prev) => [...prev, session]);

    setBorrower("");
  }

  // Return item
  function returnItem(id) {
    const entered = prompt(
      "Enter admin password"
    );

    if (entered !== ADMIN_PASSWORD) {
      alert("Incorrect password");
      return;
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        const startTime = new Date(s.start);

        const currentTime = new Date();

        const hours =
          (currentTime - startTime) /
          (1000 * 60 * 60);

        const currentHour =
          currentTime.getHours();

        const isNight =
          currentHour >= 21 ||
          currentHour < 8;

        const finalCost = getPrice(
          hours,
          isNight
        );

        return {
          ...s,
          returned: true,
          end: currentTime.toISOString(),
          owed: finalCost
        };
      })
    );
  }

  // Delete log
  function deleteLog(id) {
    const entered = prompt(
      "Enter admin password"
    );

    if (entered !== ADMIN_PASSWORD) {
      alert("Incorrect password");
      return;
    }

    setSessions((prev) =>
      prev.filter((s) => s.id !== id)
    );
  }

  // Splash screen
  if (showSplash) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#1f1f1f",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          overflow: "hidden",
          color: "white"
        }}
      >
        <div
          style={{
            fontSize: "120px",
            animation:
              "zoomFade 2.5s ease forwards"
          }}
        >
          ⚡
        </div>

        <div
          style={{
            marginTop: "20px",
            opacity: 0.8
          }}
        >
          {developerMode
            ? "Developer Mode"
            : "Customer Mode"}
        </div>

        <style>
          {`
            @keyframes zoomFade {
              0% {
                transform: scale(0.5);
                opacity: 0;
              }

              40% {
                transform: scale(1);
                opacity: 1;
              }

              100% {
                transform: scale(3);
                opacity: 0;
              }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1f1f1f",
        color: "white",
        padding: "20px",
        fontFamily: "sans-serif"
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h1>⚡ NEXSHARE</h1>

        <div
          style={{
            background: developerMode
              ? "#5b0000"
              : "#2a2a2a",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "14px"
          }}
        >
          {developerMode
            ? "Developer Mode"
            : "Customer Mode"}
        </div>
      </div>

      <p>Family Tech Rental System</p>

      {/* Borrow Panel */}
      <div
        style={{
          background: "#2a2a2a",
          padding: "15px",
          borderRadius: "12px",
          marginTop: "20px"
        }}
      >
        <input
          value={borrower}
          onChange={(e) =>
            setBorrower(e.target.value)
          }
          placeholder="Borrower Name"
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            marginRight: "10px",
            width: "200px"
          }}
        />

        <button
          onClick={startBorrow}
          style={{
            padding: "10px 15px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer"
          }}
        >
          Start Borrow
        </button>
      </div>

      {/* Sessions */}
      <div style={{ marginTop: "30px" }}>
        <h2>
          {developerMode
            ? "📜 Developer Logs"
            : "📦 Current Sessions"}
        </h2>

        {sessions.length === 0 && (
          <p>No sessions yet.</p>
        )}

        {sessions.map((session) => {
          const startTime = new Date(
            session.start
          );

          const hours =
            (now - startTime) /
            (1000 * 60 * 60);

          const currentHour =
            new Date().getHours();

          const isNight =
            currentHour >= 21 ||
            currentHour < 8;

          const liveCost = getPrice(
            hours,
            isNight
          );

          return (
            <div
              key={session.id}
              style={{
                background: "#2a2a2a",
                padding: "15px",
                borderRadius: "12px",
                marginTop: "15px"
              }}
            >
              <p>
                <strong>Borrower:</strong>{" "}
                {session.borrower}
              </p>

              <p>
                <strong>Item:</strong>{" "}
                {session.item}
              </p>

              <p>
                <strong>Started:</strong>{" "}
                {startTime.toLocaleString()}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {session.returned
                  ? "Returned"
                  : "Borrowed"}
              </p>

              {!session.returned && (
                <p>
                  <strong>Live Cost:</strong>{" "}
                  £{liveCost.toFixed(2)}
                </p>
              )}

              {session.returned && (
                <p>
                  <strong>Amount Owed:</strong>{" "}
                  £{session.owed.toFixed(2)}
                </p>
              )}

              {!session.returned && (
                <button
                  onClick={() =>
                    returnItem(session.id)
                  }
                  style={{
                    marginTop: "10px",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Return Item
                </button>
              )}

              {developerMode && (
                <button
                  onClick={() =>
                    deleteLog(session.id)
                  }
                  style={{
                    marginTop: "10px",
                    marginLeft: "10px",
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#5b0000",
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  Delete Log
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pricing */}
      <div
        style={{
          background: "#2a2a2a",
          padding: "15px",
          borderRadius: "12px",
          marginTop: "30px"
        }}
      >
        <h2>💰 Pricing</h2>

        <p>1 Hour — £0.25</p>
        <p>2 Hours — £0.40</p>
        <p>3 Hours — £0.50</p>
        <p>5 Hours — £0.75</p>
        <p>12 Hours — £1.00</p>
        <p>1 Day — £1.50</p>
        <p>2 Days — £2.50</p>
        <p>1 Week — £5.00</p>

        <p style={{ marginTop: "10px" }}>
          🌙 Night fee (9PM–8AM): +£0.20
        </p>
      </div>

      {/* Build Number */}
      <div
        onClick={handleBuildTap}
        style={{
          position: "fixed",
          bottom: "10px",
          left: "10px",
          fontSize: "12px",
          color: "#888",
          opacity: 0.8,
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        {BUILD_NUMBER}
      </div>
    </div>
  );
}
