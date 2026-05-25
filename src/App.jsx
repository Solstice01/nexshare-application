import React, { useEffect, useState } from "react";

const PRICING = [
  { max: 1, price: 0.25 },
  { max: 2, price: 0.5 },
  { max: 3, price: 0.75 },
  { max: 6, price: 1.75 },
  { max: 24, price: 2.50 }
];

function getPrice(hours) {
  const tier = PRICING.find(t => hours <= t.max) || PRICING[PRICING.length - 1];
  return tier.price;
}

export default function App() {
  const [start, setStart] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [active, setActive] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  function startBorrow() {
    setStart(Date.now());
    setActive(true);
  }

  const hours = start ? (now - start) / 3600000 : 0;
  const cost = start ? getPrice(hours) : 0;

  return (
    <div style={{ color: "white", fontFamily: "sans-serif", padding: 20 }}>
      <h1>⚡ NEXSHARE</h1>
      <p>Simple Borrow Tracker</p>

      <button onClick={startBorrow} style={{ padding: 10 }}>
        Start Borrow
      </button>

      {active && (
        <div style={{ marginTop: 20 }}>
          <p>Hours: {hours.toFixed(2)}</p>
          <h2>Cost: £{cost.toFixed(2)}</h2>
        </div>
      )}
    </div>
  );
}
