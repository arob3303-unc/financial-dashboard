'use client';
import Chart from "./ChartComponent";

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
          <Chart />
        </div>
        <div className="chart-box">
          <h1>Option Price(s) for...</h1>
          <Chart />
        </div>
      </div>
    </main>
  );
}