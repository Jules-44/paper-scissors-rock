import React, { useState } from 'react';
import { Volume2, VolumeX, QrCode, Copy, Check, Users, Shield } from 'lucide-react';
import { sound } from '../utils/sound';

export function Header({ roomCode, isHost, connectedPeersCount, onOpenQr }) {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);

  const handleCopyLink = () => {
    sound.click();
    const url = window.location.origin + window.location.pathname + '?room=' + roomCode;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleSound = () => {
    const isMuted = sound.toggleMute();
    setMuted(isMuted);
    if (!isMuted) sound.click();
  };

  return (
    <header className="app-header glass-panel">
      <div className="logo-area">
        <span className="logo-icon">⚔️</span>
        <div className="logo-text">
          <h1>
            HUDDLE CLASH
            <span className="logo-tag">Vercel Ready</span>
          </h1>
          <p className="logo-subtitle">Who keeps the video call?</p>
        </div>
      </div>

      <div className="header-actions">
        {roomCode && (
          <>
            <button 
              className="room-badge" 
              onClick={handleCopyLink} 
              title="Click to copy invite link"
            >
              <span>ROOM: {roomCode}</span>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>

            <button 
              className="icon-button" 
              onClick={onOpenQr} 
              title="Show Join QR Code"
            >
              <QrCode size={18} />
            </button>
          </>
        )}

        {isHost && (
          <div className="status-pill" title="You are the room host">
            <Shield size={13} />
            <span>Host</span>
          </div>
        )}

        <div className="status-pill" title="Connected teammates">
          <Users size={13} />
          <span>{connectedPeersCount + 1}</span>
        </div>

        <button 
          className="icon-button" 
          onClick={handleToggleSound} 
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
