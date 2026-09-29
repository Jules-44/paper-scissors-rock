import React from 'react';
import { GAMES } from '../utils/gameEngine';
import { sound } from '../utils/sound';
import { Check, Clock, Swords } from 'lucide-react';

export function PickingPhase({
  gameId,
  myPlayer,
  players,
  moves,
  onSelectMove,
  isHost,
  onForceShuffle
}) {
  const game = GAMES[gameId] || GAMES.psr;
  const myMove = moves[myPlayer?.id];

  const handlePick = (choiceId) => {
    sound.lockIn();
    onSelectMove(choiceId);
  };

  const teamAPlayers = players.filter(p => p.team === 'teamA');
  const teamBPlayers = players.filter(p => p.team === 'teamB');

  const allReady = players.length > 0 && players.every(p => !!moves[p.id]);

  return (
    <div className="picking-container">
      <div className="picking-header">
        <h2>Lock in your move!</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Pick your secret weapon. Choices remain hidden until the showdown arena!
        </p>
      </div>

      {/* CHOICES GRID */}
      <div className="choices-grid">
        {game.choices.map((choice) => {
          const isSelected = myMove === choice.id;
          return (
            <div
              key={choice.id}
              className={`choice-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handlePick(choice.id)}
            >
              {isSelected && <span className="locked-badge">LOCKED IN</span>}
              <span className="choice-icon">{choice.icon}</span>
              <span className="choice-label" style={{ color: choice.color }}>
                {choice.label}
              </span>
              {choice.beats && (
                <span className="choice-beats">Beats {choice.beats.toUpperCase()}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* READINESS TRACKER */}
      <div className="readiness-tracker glass-panel">
        <div className="readiness-title">Locker Room Readiness</div>

        <div className="readiness-teams">
          {/* Team A */}
          <div className="readiness-list">
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--team-a)', marginBottom: '4px' }}>
              TEAM A
            </div>
            {teamAPlayers.map(p => {
              const ready = !!moves[p.id];
              return (
                <div key={p.id} className="readiness-item">
                  <span style={{ fontWeight: 600 }}>{p.name} {p.id === myPlayer?.id && '(You)'}</span>
                  {ready ? (
                    <span className="status-badge-ready">
                      <Check size={14} /> Ready
                    </span>
                  ) : (
                    <span className="status-badge-waiting">
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Picking...
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Team B */}
          <div className="readiness-list">
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--team-b)', marginBottom: '4px' }}>
              TEAM B
            </div>
            {teamBPlayers.map(p => {
              const ready = !!moves[p.id];
              return (
                <div key={p.id} className="readiness-item">
                  <span style={{ fontWeight: 600 }}>{p.name} {p.id === myPlayer?.id && '(You)'}</span>
                  {ready ? (
                    <span className="status-badge-ready">
                      <Check size={14} /> Ready
                    </span>
                  ) : (
                    <span className="status-badge-waiting">
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Picking...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Host control if waiting or ready */}
        {isHost && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              className="btn-primary"
              style={{ maxWidth: '300px', margin: '0 auto' }}
              onClick={onForceShuffle}
            >
              <Swords size={18} />
              <span>{allReady ? 'Enter Shuffle & Showdown!' : 'Start Showdown Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
