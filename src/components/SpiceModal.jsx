import React, { useState } from 'react';
import { X, Flame } from 'lucide-react';

const SPICE_LEVELS = [
  { id: 1, name: 'เผ็ดน้อย', color: 'var(--spice-1)', flames: 1 },
  { id: 2, name: 'เผ็ดกลาง', color: 'var(--spice-2)', flames: 2 },
  { id: 3, name: 'เผ็ด', color: 'var(--spice-3)', flames: 3 },
  { id: 4, name: 'เผ็ดมาก', color: 'var(--spice-4)', flames: 4 },
  { id: 5, name: 'เผ็ดสุดขั้ว', color: 'var(--spice-5)', flames: 5 },
];

const SpiceModal = ({ food, onClose, onConfirm }) => {
  const [selectedSpice, setSelectedSpice] = useState(SPICE_LEVELS[2]); // Default Medium

  if (!food) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">เลือกระดับความเผ็ด</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={28} />
          </button>
        </div>

        <div className="spice-levels">
          {SPICE_LEVELS.map((level) => (
            <div
              key={level.id}
              className={`spice-option ${selectedSpice.id === level.id ? 'selected' : ''}`}
              style={{ '--selected-color': level.color }}
              onClick={() => setSelectedSpice(level)}
            >
              <span className="spice-name" style={{ color: selectedSpice.id === level.id ? level.color : 'inherit' }}>
                {level.name}
              </span>
              <div className="spice-icons">
                {Array.from({ length: level.flames }).map((_, i) => (
                  <Flame key={i} size={20} fill={level.color} color={level.color} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          className="confirm-btn" 
          onClick={() => onConfirm(food, selectedSpice)}
        >
          เพิ่มลงตะกร้า
        </button>
      </div>
    </div>
  );
};

export default SpiceModal;
