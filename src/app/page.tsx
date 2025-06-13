'use client';
import AssetPieChart from "./ChartComponent";

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

function Login() {
  //clerk auth goes here (eventually)

  return (
    <>
      <h1>Clerk Login/Logout</h1>
    </>
  )
}

export default function Home() {
  return (
    <div className="title">
      <h1>Austins Dashboard</h1>
      <AssetPieChart />
      <Login />
    </div>
  );
}
