import React, { useEffect, useState } from "react";

const ADMIN_PASSWORD = "nexshare123";
const BUILD_NUMBER =
  "Pre-release (Overhaul) V0.98 DeVo";

// Toggle this manually if needed
const SERVER_ONLINE = true;

const PRICING = [
  { max: 1, price: 0.25 },
  { max: 2, price: 0.4 },
  { max: 3, price: 0.5 },
  { max: 5, price: 0.75 },
  { max: 12, price: 1.0 },
  { max: 24, price: 1.5 },
  { max: 48, price: 2.5 },
  { max: 168, price: 5.0 }
];

function getPrice(hours, isNight = false) {
  const tier =
    PRICING.find((t) => hours <= t.max) ||
    PRICING[PRICING.length - 1];

  let total = tier.price;

  if (isNight) {
    total += 0.2;
  }

  return total;
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [borrower, setBorrower] = useState("");
  const [now, setNow] = useState(Date.now());

  const [developerMode, setDeveloperMode] =
    useState(false);

  const [showSplash, setShowSplash] =
    useState(true);

  const [tapCount, setTapCount] = useState(0);

  const [authenticated, setAuthenticated] =
    useState(false);

  // Splash animation
  function triggerSplash() {
    setShowSplash(true);

    setTimeout(() => {
      setShowSplash(false);
    }, 2500);
  }

  useEffect(() => {
    triggerSplash();
  }, []);

  // Load sessions
  useEffect(() => {
    const saved = localStorage.getItem(
      "nexshare_sessions"
    );

    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save sessions
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

  // Unlock developer mode
  function handleBuildTap() {
    const newCount = tapCount + 1;

    setTapCount(newCount);

    if (newCount >= 7) {
      const entered = prompt(
        "Enter developer password"
      );

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
  }

  // Switch back
  function switchToCustomerMode() {
    setDeveloperMode(false);
    setAuthenticated(false);

    triggerSplash();
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
    if (!authenticated) {
      const entered = prompt(
        "Enter admin password"
      );

      if (entered !== ADMIN_PASSWORD) {
        alert("Incorrect password");
        return;
      }

      setAuthenticated(true);
    }

    setSessions((prev) =>
      prev.filter((s) => s.id !== id)
    );
  }

  // SERVER DOWN SCREEN
  if (!SERVER_ONLINE) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#111",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          textAlign: "center",
          padding: "20px",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ fontSize: "100px" }}>
          ⚡
        </div>

        <h1>Server Down</h1>

        <p
          style={{
            opacity: 0.8,
            maxWidth: "400px"
          }}
        >
          Server down due to Repairs or
          Updates
        </p>
      </div>
    );
  }

  // SPLASH SCREEN
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
          color: "white",
          fontFamily: "sans-serif"
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
            marginTop: "15px",
            fontSize: "20px",
            opacity: 0,
            animation:
              "textFade 2.5s ease forwards"
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

            @keyframes textFade {
              0% {
                opacity: 0;
                transform: translateY(10px);
              }

              40% {
                opacity: 1;
                transform: translateY(0px);
              }

              100% {
                opacity: 0;
                transform: translateY(-10px);
              }
            }
          `}
        </style>
      </div>
    );
  }

  // Availability
  const activeSessions = sessions.filter(
    (s) => !s.returned
  );

  const itemAvailable =
    activeSessions.length === 0;

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
      {/* TOP BAR */}
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

      {/* CUSTOMER MODE */}
      {!developerMode && (
        <>
          <p>Family Tech Rental System</p>

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
        </>
      )}

      {/* DEVELOPER MODE */}
      {developerMode && (
        <>
          <div
            style={{
              background: "#2a2a2a",
              padding: "20px",
              borderRadius: "12px",
              marginTop: "20px"
            }}
          >
            <h2>🖥 Deployment / Server Details</h2>

            <p>
              <span
                style={{
                  color: "lime"
                }}
              >
                ●
              </span>{" "}
              Server Online
            </p>

            <p>
              <span
                style={{
                  color: itemAvailable
                    ? "lime"
                    : "red"
                }}
              >
                ●
              </span>{" "}
              Item Availability:{" "}
              {itemAvailable
                ? "Available"
                : "Borrowed"}
            </p>

            <p>
              Uptime: Active Since Launch
            </p>

            <button
              onClick={switchToCustomerMode}
              style={{
                marginTop: "15px",
                padding: "10px 15px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer"
              }}
            >
              Switch To Customer Mode
            </button>
          </div>
        </>
      )}

      {/* LOGS */}
      <div style={{ marginTop: "30px" }}>
        <h2>
          {developerMode
            ? "📜 Developer Logs"
            : "📦 Current Sessions"}
        </h2>

        {sessions.length === 0 && (
          <p>No sessions yet.</p>
        )}

{[...sessions]
  .reverse()
  .map((session) => {
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

          // Hide logs in customer mode
          if (
            !developerMode &&
            session.returned
          ) {
            return null;
          }

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

              {!session.returned &&
                !developerMode && (
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

      {/* BUILD NUMBER */}
      <div
        onClick={handleBuildTap}
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
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
