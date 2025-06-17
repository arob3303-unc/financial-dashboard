'use client'  // If you're using the App Router

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function StockChart({ ticker = "AAPL" }) {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch(`http://127.0.0.1:5000/stock/${ticker}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
  }, [ticker])

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="time" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
