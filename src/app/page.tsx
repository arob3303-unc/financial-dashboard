'use client';
import StockChart from "./ChartComponent";

const user = {
  name: 'Austin Robinson',
};

function MyButton() {
  function handleClick() {
    alert(`You are ${user.name}`);
  }

  return (
    <button onClick={handleClick}>
      Who am I?
    </button>
  );
}

export default function Home() {
  return (
    <main className="page">
      <div className="chart-container">
        <div className="chart-box">
          <h1> If held...</h1>
          <StockChart />
        </div>
        <div className="chart-box">
          <h1> If held111...</h1>
          <StockChart />
        </div>
      </div>
    </main>
  );
}