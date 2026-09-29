import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import { sound } from '../utils/sound';

export function QRCodeModal({ roomCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const joinUrl = window.location.origin + window.location.pathname + '?room=' + roomCode;

  const handleCopy = () => {
    sound.click();
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animate-pop" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Scan to Join Room</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
          Teammates can scan with their phone camera or visit the link below:
        </p>

        <div className="qr-wrapper">
          <QRCodeSVG 
            value={joinUrl} 
            size={200}
            bgColor="#ffffff"
            fgColor="#0a0d18"
            level="M"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input 
            type="text" 
            readOnly 
            value={joinUrl} 
            className="custom-input"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} 
          />
          <button 
            className="btn-secondary" 
            style={{ width: 'auto', padding: '0 16px' }}
            onClick={handleCopy}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
