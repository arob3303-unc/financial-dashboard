import { useState } from "react";

export default function SettingsModal({ currentBalance, onSave, onClose }) {
  const [input, setInput] = useState(currentBalance.toString());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-zinc-800 p-6 rounded-xl text-white w-80">
        <h2 className="text-xl mb-4">Set Balance</h2>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 rounded bg-zinc-700 text-white mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(Number(input))}
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}