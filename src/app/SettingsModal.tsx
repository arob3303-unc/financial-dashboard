'use client';

import { useState } from 'react';

interface SettingsModalProps {
  currentBalance: number;
  onSave: (newBalance: number) => void;
  onClose: () => void;
}

export default function SettingsModal({
  currentBalance,
  onSave,
  onClose,
}: SettingsModalProps) {
  const [input, setInput] = useState(currentBalance.toString());

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Set Fictional Amount of Money</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="modal-input"
        />

        <div className="modal-actions">
          <button onClick={onClose} className="modal-button cancel">Cancel</button>
          <button onClick={() => onSave(Number(input))} className="modal-button save">Save</button>
        </div>
      </div>
    </div>
  );
}