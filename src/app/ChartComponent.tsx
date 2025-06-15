// components/Chart.tsx
'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const sampleData = [
  { name: 'Jan', value: 115 },
  { name: 'Feb', value: 120 },
  { name: 'Mar', value: 100 },
  { name: 'Apr', value: 102 },
  { name: 'May', value: 144 },
  { name: 'Jun', value: 150 },
  { name: 'Jul', value: 160 },
  { name: 'Aug', value: 198 },
  { name: 'Sep', value: 187 },
  { name: 'Oct', value: 184 },
  { name: 'Nov', value: 202 },
  { name: 'Dec', value: 193 },
];

export default function Chart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={sampleData}>
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#3b82f6" />
      </LineChart>
    </ResponsiveContainer>
  );
}
