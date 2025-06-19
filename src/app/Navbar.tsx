'use client';
import { SetStateAction, useState } from "react";
import { Settings } from "lucide-react"; // icon
import SettingsModal from "./SettingsModal";

export default function Navbar() {
  const [balance, setBalance] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

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
            setBalance(newBalance);
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
