import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/sound';
import { Trophy, RotateCcw, Home } from 'lucide-react';

export function VictoryPhase({
  winnerTeam,
  settings,
  scores,
  history,
  isHost,
  onRematch,
  onBackToLobby
}) {
  const winnerName = winnerTeam === 'teamA' ? settings.teamAName : settings.teamBName;
  const loserName = winnerTeam === 'teamA' ? settings.teamBName : settings.teamAName;

  useEffect(() => {
    sound.fanfare();

    // Trigger multi-stage confetti
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00e5ff', '#ff5e36', '#ffbe0b', '#10b981']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00e5ff', '#ff5e36', '#ffbe0b', '#10b981']
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winnerTeam]);

  return (
    <div className="victory-card glass-panel animate-pop">
      <div className="crown-icon">👑</div>

      <h1 className={`victory-title ${winnerTeam}`}>
        {winnerName} TAKES THE HUDDLE!
      </h1>

      <div className="victory-huddle-box">
        <p className="huddle-winner-msg">
          🎉 <strong>{winnerName}</strong> gets to keep this video call room!
        </p>
        <p className="huddle-loser-msg">
          👋 <strong>{loserName}</strong>, time to split off and hop into your new breakout link.
        </p>
      </div>

      {/* FINAL SCORE PILL */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '24px',
        padding: '12px 28px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 'var(--radius-full)',
        marginBottom: '28px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ fontWeight: 800, color: 'var(--team-a)' }}>
          {settings.teamAName}: {scores.teamA}
        </div>
        <span style={{ color: 'var(--text-dim)' }}>—</span>
        <div style={{ fontWeight: 800, color: 'var(--team-b)' }}>
          {settings.teamBName}: {scores.teamB}
        </div>
      </div>

      {/* ROUND HISTORY SUMMARY */}
      {history && history.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: '28px', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Match Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Round {i + 1}: {h.playerAName} vs {h.playerBName}</span>
                <span style={{ fontWeight: 700, color: h.winner === 'teamA' ? 'var(--team-a)' : h.winner === 'teamB' ? 'var(--team-b)' : 'var(--gold)' }}>
                  {h.winner === 'teamA' ? `${settings.teamAName} win` : h.winner === 'teamB' ? `${settings.teamBName} win` : 'Draw'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {isHost ? (
        <div className="victory-actions">
          <button className="btn-primary" onClick={onRematch}>
            <RotateCcw size={18} />
            <span>Instant Rematch!</span>
          </button>
          <button className="btn-secondary" onClick={onBackToLobby}>
            <Home size={18} />
            <span>Back to Lobby</span>
          </button>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Waiting for the host to start a rematch or return to lobby...
        </p>
      )}
    </div>
  );
}
