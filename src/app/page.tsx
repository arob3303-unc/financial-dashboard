'use client';
import ChartComponent from "./ChartComponent";
import React, { useEffect, useState } from 'react';

const availableTickers = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "AMD", "ZM", "SPY", "VOO", "NVDA"];
const availableTimes = ["1 Month", "3 Months", "6 Months", "1 Year", "3 Years", "5 Years"]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function Home() {
  const [selectedTicker1, setSelectedTicker1] = useState("AAPL");
  const [selectedTicker2, setSelectedTicker2] = useState("NVDA");
  const [selectedTime, setSelectedTime] = useState("1 Month");

  const [showSecondChart, setShowSecondChart] = useState(false);

  // Whenever selectedTicker2 or selectedTime changes, delay showing 2nd chart
  useEffect(() => {
    setShowSecondChart(false); // hide second chart first

    async function delayedShow() {
      await sleep(1); // 500ms delay
      setShowSecondChart(true); // then show second chart
    }

    delayedShow();

  }, [selectedTicker2, selectedTime]);

  return (
    <div className="graph-main">
      <div className="menu-space">
        {/* ... your selects here ... */}
        <div className="ticker">
          <select
            value={selectedTicker1}
            onChange={(e) => setSelectedTicker1(e.target.value)}
            className="ticker-menu"
          >
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker}>{ticker}</option>
            ))}
          </select>
        </div>
        <div className="ticker">
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="ticker-menu"
          >
            {availableTimes.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        <div className="ticker">
          <select
            value={selectedTicker2}
            onChange={(e) => setSelectedTicker2(e.target.value)}
            className="ticker-menu"
          >
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker}>{ticker}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="graphs">
        <ChartComponent symbol={selectedTicker1} time={selectedTime} />
        {showSecondChart && <ChartComponent symbol={selectedTicker2} time={selectedTime} />}
      </div>
    </div>
  );
}
