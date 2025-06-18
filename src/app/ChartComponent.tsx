"use client";
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import axios from "axios";

type Props = {
  symbol: string;
  time: string;
};

type ChartData = {
  date: string;
  price: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: "#1e1e1e",
        padding: "10px",
        borderRadius: "8px",
        color: "#00bfff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        fontSize: "14px"
      }}>
        <p>{`Price: $${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }

  return null;
};

const ChartComponent = ({ symbol, time }: Props) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol && !time) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/stocks/${symbol}?time=${time}`);
        setData(res.data);
        setLoading(false);
        console.log("Stock data:", res.data);
      } catch (err) {
        console.error("Failed to fetch stock data", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, time]);

  if (loading) return <p>Loading chart for {symbol}...</p>;
  if (data.length === 0) return <p>No data available for {symbol}</p>;

  return (
    <div className="chart-box" style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ color: "#aab8cf", textAlign: "center" }}>{symbol} Stock Chart</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="date" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="Price" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
