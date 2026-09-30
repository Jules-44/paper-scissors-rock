import React from 'react';
import { GAMES } from '../utils/gameEngine';
import { sound } from '../utils/sound';
import { Check, Clock, Swords, Sparkles } from 'lucide-react';

export function PickingPhase({
  gameId,
  myPlayer,
  currentMatchup,
  currentMatchupIndex,
  totalMatchups,
  isTieReplay,
  moves,
  scores,
  settings,
  onSelectMove,
  isHost,
  onForceShuffle,
  onCheer
}) {
  const game = GAMES[gameId] || GAMES.psr;

  const isFighterA = myPlayer?.id === currentMatchup?.playerAId;
  const isFighterB = myPlayer?.id === currentMatchup?.playerBId;
  const isFighting = isFighterA || isFighterB;

  const myMove = moves[myPlayer?.id];
  const fighterAMove = moves[currentMatchup?.playerAId];
  const fighterBMove = moves[currentMatchup?.playerBId];

  const fighterAReady = !!fighterAMove;
  const fighterBReady = !!fighterBMove;
  const bothFightersReady = fighterAReady && fighterBReady;

  const handlePick = (choiceId) => {
    sound.lockIn();
    onSelectMove(choiceId);
  };

  return (
    <div className="picking-container">
      {/* SCOREBOARD PREVIEW */}
      <div className="duel-banner glass-panel">
        <span style={{ color: 'var(--team-a)' }}>{settings.teamAName}: {scores.teamA}</span>
        <span style={{ color: 'var(--text-dim)' }}>•</span>
        <span>Duel #{currentMatchupIndex + 1} of {totalMatchups}</span>
        <span style={{ color: 'var(--text-dim)' }}>•</span>
        <span style={{ color: 'var(--team-b)' }}>{settings.teamBName}: {scores.teamB}</span>
      </div>

      {/* TIE ALERT IF REPLAYING A DRAW */}
      {isTieReplay && (
        <div className="tie-alert animate-pop">
          🤝 IT WAS A DRAW! Sudden Death Re-Match: Pick a new weapon!
        </div>
      )}

      {/* HEADER */}
      <div className="picking-header">
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
          {currentMatchup?.playerAName} <span style={{ color: 'var(--gold)' }}>VS</span> {currentMatchup?.playerBName}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          {isFighting 
            ? 'You are in the arena! Lock in your move for this round:' 
            : 'You are on deck! Watch your teammates clash:'}
        </p>
      </div>

      {/* IF YOU ARE ONE OF THE FIGHTERS: SHOW WEAPON SELECTION */}
      {isFighting ? (
        <>
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

          {myMove && (
            <p style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '24px' }}>
              ✓ Move locked in! You can change it until the countdown begins.
            </p>
          )}
        </>
      ) : (
        /* SPECTATOR BENCH VIEW */
        <div className="spectator-box glass-panel animate-pop" style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Currently Dueling:</div>
          <div className="spectator-gladiators">
            <div className="spectator-card team-a">
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{currentMatchup?.playerAName}</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                {fighterAReady ? (
                  <span style={{ color: 'var(--success)' }}>✓ Ready</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>Picking...</span>
                )}
              </div>
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gold)' }}>VS</div>

            <div className="spectator-card team-b">
              <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{currentMatchup?.playerBName}</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                {fighterBReady ? (
                  <span style={{ color: 'var(--success)' }}>✓ Ready</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>Picking...</span>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Cheer on your squad while they pick!
          </p>
          <div className="cheer-buttons">
            {['🔥', '👏', '⚡', '👑', '😱'].map(emoji => (
              <button key={emoji} className="btn-cheer" onClick={() => onCheer && onCheer(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FIGHTER READINESS STATUS */}
      <div className="readiness-tracker glass-panel" style={{ maxWidth: '600px' }}>
        <div className="readiness-title">Arena Duel Readiness</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="readiness-item" style={{ borderLeft: '3px solid var(--team-a)' }}>
            <span style={{ fontWeight: 700 }}>{currentMatchup?.playerAName} ({settings.teamAName})</span>
            {fighterAReady ? (
              <span className="status-badge-ready"><Check size={14} /> Ready</span>
            ) : (
              <span className="status-badge-waiting"><Clock size={13} /> Choosing...</span>
            )}
          </div>

          <div className="readiness-item" style={{ borderLeft: '3px solid var(--team-b)' }}>
            <span style={{ fontWeight: 700 }}>{currentMatchup?.playerBName} ({settings.teamBName})</span>
            {fighterBReady ? (
              <span className="status-badge-ready"><Check size={14} /> Ready</span>
            ) : (
              <span className="status-badge-waiting"><Clock size={13} /> Choosing...</span>
            )}
          </div>
        </div>

        {/* HOST BUTTON TO PROCEED OR FORCE SHOWDOWN */}
        {isHost && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              className="btn-primary"
              style={{ maxWidth: '320px', margin: '0 auto' }}
              onClick={onForceShuffle}
            >
              <Swords size={18} />
              <span>{bothFightersReady ? 'Clash in the Arena! ⚔️' : 'Start Clash Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
