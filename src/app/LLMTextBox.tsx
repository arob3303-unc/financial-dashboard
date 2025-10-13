import React, { useState, useEffect } from "react";

interface InvestmentExplanationProps {
  ticker1: string;
  ticker2: string;
  selectedTime: string;
  profit1: number;
  profit2: number;
  start: string;
  end: string;
}

interface ExplainResponse {
  explanation: string;
}

const InvestmentExplanation: React.FC<InvestmentExplanationProps> = ({
  ticker1,
  ticker2,
  selectedTime,
  profit1,
  profit2,
  start,
  end,
}) => {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticker1 || !ticker2) return;
    fetchExplanation();
  }, [ticker1, ticker2, selectedTime]);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      setError("");
      setExplanation("");

      const res = await fetch("http://127.0.0.1:5000/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ticker1,
            ticker2,
            amount: 5000, // You can later replace this with user’s balance from Clerk
            profit1,
            profit2,
            start,
            end,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ExplainResponse = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch explanation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Prompt-Outer">
      <h3 className="Prompt-Title">AI Generated Financial Advise</h3>
      {loading ? (
        <p>Generating explanation...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <textarea
          readOnly
          value={explanation}
          rows={6}
          className="Prompt-Text"
          placeholder="GPT will explain your comparison here..."
        />
      )}
    </div>
  );
};

export default InvestmentExplanation;
