'use client';

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

export default function Navbar() {
  const [balance, setBalance] = useState<number | null>(null); // null for no mismatch
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useUser();
  const [isClient, setIsClient] = useState(false);

  // Ensure this component only renders on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      axios.get(`/api/balance/${user.id}`).then(res => {
        setBalance(res.data.balance);
      });
    }
  }, [user?.id]);

  const saveBalance = (newBalance: number) => {
    axios.post('/api/balance', {
      user_id: user?.id,
      balance: newBalance,
    });
    setBalance(newBalance);
  };

  if (!isClient) return null; // Prevent SSR mismatch

  return (
    <div className="settings-balance-config">
      <div className="settings">
        <Settings
          size={24}
          className="text-white w-8 h-8 cursor-pointer transition-transform duration-200 hover:scale-125"
          onClick={() => setShowSettings(true)}
        />
      </div>

      {showSettings && (
        <SettingsModal
          currentBalance={balance ?? 0}
          onSave={(newBalance) => {
            saveBalance(Number(newBalance));
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="balance">
        ${balance !== null ? balance.toLocaleString() : "0"}
      </div>
    </div>
  );
}
