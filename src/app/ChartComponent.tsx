import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

interface StockDataPoint {
  time: string;
  price: number;
}

interface StockResponse {
  [x: string]: any;
  data: StockDataPoint[];
  start_price: number;
  end_price: number;
  investment: number;
  final_value: number;
  profit: number;
}

const tickers = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'NVDA', 'AMZN', 'META', 'JPM', 'DIS', 'NFLX'];

const ChartComponent: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [data, setData] = useState<StockDataPoint[]>([]);
  const [stats, setStats] = useState<Omit<StockResponse, 'data'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/stocks/${selectedTicker}`)
      .then(res => res.json())
      .then((json: StockResponse) => {
        if (json.error) {
          setData([]);
          setStats(null);
        } else {
          setData(json.data);
          setStats({
            start_price: json.start_price,
            end_price: json.end_price,
            investment: json.investment,
            final_value: json.final_value,
            profit: json.profit
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stock data:', err);
        setLoading(false);
      });
  }, [selectedTicker]);

  return (
    <div style={{ width: '95%', margin: 'auto' }}>
      {/* Scrollable ticker selector */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '1rem',
        padding: '0.5rem 0',
        marginBottom: '1rem'
      }}>
        {tickers.map(ticker => (
          <button
            key={ticker}
            onClick={() => setSelectedTicker(ticker)}
            style={{
              padding: '0.5rem 1rem',
              background: ticker === selectedTicker ? '#007bff' : '#eaeaea',
              color: ticker === selectedTicker ? 'white' : 'black',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              minWidth: '70px'
            }}
          >
            {ticker}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <p>Loading...</p>
      ) : data.length ? (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#007bff" dot={false} />
            </LineChart>
          </ResponsiveContainer>

          {/* Investment stats */}
          {stats && (
            <div style={{ marginTop: '1rem', background: '#f7f7f7', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Start Price:</strong> ${stats.start_price.toFixed(2)}</p>
              <p><strong>End Price:</strong> ${stats.end_price.toFixed(2)}</p>
              <p><strong>Initial Investment:</strong> ${stats.investment.toFixed(2)}</p>
              <p><strong>Final Value:</strong> ${stats.final_value.toFixed(2)}</p>
              <p style={{ color: stats.profit >= 0 ? 'green' : 'red' }}>
                <strong>{stats.profit >= 0 ? 'Profit' : 'Loss'}:</strong> ${stats.profit.toFixed(2)}
              </p>
            </div>
          )}
        </>
      ) : (
        <p>No data found for {selectedTicker}.</p>
      )}
    </div>
  );
};

export default ChartComponent;
