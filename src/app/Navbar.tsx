'use client';
import { UserButton } from "@clerk/nextjs";
import { SetStateAction, useState } from "react";
import { Settings } from "lucide-react"; // Optional icon
import SettingsModal from "./SettingsModal";

export default function Navbar() {
  const [balance, setBalance] = useState(10000);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="w-full flex justify-between items-center p-4 bg-zinc-900 text-white">
      <div className="text-lg font-semibold">
        Balance: ${balance.toLocaleString()}
      </div>
      <div className="flex gap-4 items-center">
        <Settings
          className="cursor-pointer hover:text-blue-400"
          onClick={() => setShowSettings(true)}
        />
        <UserButton />
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
    </div>
  );
}
