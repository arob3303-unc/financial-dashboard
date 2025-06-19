'use client';
import { SetStateAction, useEffect, useState } from "react";
import { Settings } from "lucide-react"; // icon
import SettingsModal from "./SettingsModal";
import { useUser } from "@clerk/nextjs";
import axios from "axios";

export default function Navbar() {
  const [balance, setBalance] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useUser();
  const userId = user?.id;


  useEffect(() => {
  if (userId) {
    axios.get(`/api/balance/${userId}`).then(res => {
      setBalance(res.data.balance);
    });
  }
}, [userId]);

const saveBalance = (newBalance: number) => {
  axios.post('/api/balance', {
    user_id: userId,
    balance: newBalance,
  });
};

  return (
    <div className="settings-balance-config">
      <div className="settings">
        <Settings
          size={24}
          className="color-white w-8 h-8 text-white cursor-pointer transition-transform duration-200 hover:scale-125"
          onClick={() => setShowSettings(true)}
        />
      </div>

      {showSettings && (
        <SettingsModal
          currentBalance={balance}
          onSave={(newBalance: SetStateAction<number>) => {
            saveBalance(Number(newBalance));
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="balance">
        Money: ${balance.toLocaleString()}
      </div>
    </div>
  );
}
