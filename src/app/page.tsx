'use client';
import ChartComponent from "./ChartComponent";
import React, { useState } from 'react';

// const user = {
//   name: 'Austin Robinson',
// };

// function MyButton() {
//   function handleClick() {
//     alert(`You are ${user.name}`);
//   }

//   return (
//     <button onClick={handleClick}>
//       Who am I?
//     </button>
//   );
// }

const availableTickers = ["AAPL", "MSFT", "TSLA", "GOOGL", "AMZN"];
const availableTimes = ["1 Month", "3 Months", "6 Months", "1 Year", "3 Years", "5 Years"]

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState("AAPL");
  const [selectedTime, setSelectedTime] = useState("1 Month");
  
  return (
    <div className="graph-main">
      <div className="menu-space">
        <div className="ticker">
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="ticker-menu"
          >
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker}>
                {ticker}
              </option>
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
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="graphs">
        <ChartComponent symbol={selectedTicker} time={selectedTime} />
        <ChartComponent symbol={selectedTicker} time={selectedTime}/>
      </div>
    </div>
  );
}