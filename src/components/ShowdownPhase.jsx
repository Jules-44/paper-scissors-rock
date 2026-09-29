import React, { useState, useEffect } from 'react';
import { GAMES } from '../utils/gameEngine';
import { sound } from '../utils/sound';
import { Zap, ArrowRight, RefreshCw, Trophy } from 'lucide-react';

export function ShowdownPhase({
  gameId,
  settings,
  scores,
  currentMatchupIndex,
  matchups,
  players,
  moves,
  clinchedWinner,
  isHost,
  onMatchupResult,
  onNextMatchup,
  onEndGame
}) {
  const game = GAMES[gameId] || GAMES.psr;
  const currentMatchup = matchups[currentMatchupIndex];

  // Animation states: 'shuffling' -> 'countdown' -> 'revealed'
  const [animStage, setAnimStage] = useState('shuffling');
  const [countdownNum, setCountdownNum] = useState(3);
  const [shuffledDisplayA, setShuffledDisplayA] = useState('');
  const [shuffledDisplayB, setShuffledDisplayB] = useState('');

  const playerA = players.find(p => p.id === currentMatchup?.playerAId);
  const playerB = players.find(p => p.id === currentMatchup?.playerBId);

  const moveA = moves[playerA?.id];
  const moveB = moves[playerB?.id];

  const choiceObjA = game.choices.find(c => c.id === moveA);
  const choiceObjB = game.choices.find(c => c.id === moveB);

  // Result of current matchup
  const result = game.resolve(moveA, moveB); // 'teamA' | 'teamB' | 'draw'
  const explanation = game.explain(moveA, moveB);

  // 1. Shuffling Slot effect
  useEffect(() => {
    setAnimStage('shuffling');
    let spinInterval;
    const teamAPlayers = players.filter(p => p.team === 'teamA');
    const teamBPlayers = players.filter(p => p.team === 'teamB');

    let counter = 0;
    spinInterval = setInterval(() => {
      counter++;
      const randomA = teamAPlayers[Math.floor(Math.random() * teamAPlayers.length)];
      const randomB = teamBPlayers[Math.floor(Math.random() * teamBPlayers.length)];
      if (randomA) setShuffledDisplayA(randomA.name);
      if (randomB) setShuffledDisplayB(randomB.name);
      sound.countdownTick(300 + (counter % 3) * 50);
    }, 120);

    const spinTimer = setTimeout(() => {
      clearInterval(spinInterval);
      setShuffledDisplayA(playerA?.name || 'Player A');
      setShuffledDisplayB(playerB?.name || 'Player B');
      setAnimStage('countdown');
      setCountdownNum(3);
    }, 2000);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(spinTimer);
    };
  }, [currentMatchupIndex, playerA?.name, playerB?.name]);

  // 2. Countdown sequence (3 -> 2 -> 1 -> Reveal)
  useEffect(() => {
    if (animStage !== 'countdown') return;

    sound.countdownTick(440);
    const countTimer = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev <= 1) {
          clearInterval(countTimer);
          setAnimStage('revealed');
          sound.reveal();

          // Host handles reporting outcome
          if (isHost) {
            setTimeout(() => {
              if (result === 'teamA' || result === 'teamB') {
                sound.point();
              } else {
                sound.tie();
              }
              onMatchupResult(result);
            }, 600);
          }
          return 0;
        }
        sound.countdownTick(440 + (4 - prev) * 50);
        return prev - 1;
      });
    }, 900);

    return () => clearInterval(countTimer);
  }, [animStage]);

  return (
    <div className="showdown-stage">
      {/* SCOREBOARD BAR */}
      <div className="scoreboard-bar glass-panel animate-pop">
        <div className="score-team team-a">
          <div className="score-name">{settings.teamAName}</div>
          <div className="score-number" style={{ color: 'var(--team-a)' }}>
            {scores.teamA}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span className="score-divider">VS</span>
          <span className="target-badge">
            Duel #{currentMatchupIndex + 1} of {matchups.length}
          </span>
        </div>

        <div className="score-team team-b">
          <div className="score-number" style={{ color: 'var(--team-b)' }}>
            {scores.teamB}
          </div>
          <div className="score-name">{settings.teamBName}</div>
        </div>
      </div>

      {/* ARENA SHOWDOWN GRID */}
      <div className="arena-grid">
        {/* TEAM A FIGHTER */}
        <div className={`fighter-card team-a glass-panel ${animStage === 'revealed' && result === 'teamA' ? 'winner' : ''}`}>
          <div>
            <div className="fighter-badge">{settings.teamAName}</div>
            <div className="fighter-name">
              {animStage === 'shuffling' ? shuffledDisplayA : playerA?.name}
            </div>
          </div>

          <div className={`card-slot ${animStage === 'revealed' ? 'revealed' : ''}`}>
            {animStage === 'revealed' ? (
              <div className="animate-pop">
                <div className="card-icon-big">{choiceObjA?.icon || '❓'}</div>
                <div className="card-label-revealed" style={{ color: choiceObjA?.color }}>
                  {choiceObjA?.label || 'Choice'}
                </div>
              </div>
            ) : (
              <div className={`card-back ${animStage === 'shuffling' ? 'spinning' : ''}`}>
                ⚡
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {animStage === 'revealed' && result === 'teamA' ? '🏆 Winner!' : ''}
          </div>
        </div>

        {/* VS / COUNTDOWN CENTER */}
        <div className="vs-center">
          {animStage === 'countdown' ? (
            <div className="countdown-box">{countdownNum}</div>
          ) : (
            <div className="vs-circle">
              <Zap size={28} />
            </div>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {animStage === 'shuffling' ? 'Shuffling...' : animStage === 'countdown' ? 'Ready!' : 'Showdown'}
          </span>
        </div>

        {/* TEAM B FIGHTER */}
        <div className={`fighter-card team-b glass-panel ${animStage === 'revealed' && result === 'teamB' ? 'winner' : ''}`}>
          <div>
            <div className="fighter-badge">{settings.teamBName}</div>
            <div className="fighter-name">
              {animStage === 'shuffling' ? shuffledDisplayB : playerB?.name}
            </div>
          </div>

          <div className={`card-slot ${animStage === 'revealed' ? 'revealed' : ''}`}>
            {animStage === 'revealed' ? (
              <div className="animate-pop">
                <div className="card-icon-big">{choiceObjB?.icon || '❓'}</div>
                <div className="card-label-revealed" style={{ color: choiceObjB?.color }}>
                  {choiceObjB?.label || 'Choice'}
                </div>
              </div>
            ) : (
              <div className={`card-back ${animStage === 'shuffling' ? 'spinning' : ''}`}>
                ⚡
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {animStage === 'revealed' && result === 'teamB' ? '🏆 Winner!' : ''}
          </div>
        </div>
      </div>

      {/* OUTCOME BANNER (Shown upon card reveal) */}
      {animStage === 'revealed' && (
        <div className={`outcome-banner glass-panel animate-pop ${
          result === 'teamA' ? 'team-a-win' : result === 'teamB' ? 'team-b-win' : 'draw'
        }`}>
          <div className="outcome-text">
            {result === 'teamA' && `🎉 ${playerA?.name} wins for ${settings.teamAName}!`}
            {result === 'teamB' && `🎉 ${playerB?.name} wins for ${settings.teamBName}!`}
            {result === 'draw' && `🤝 It's a Draw!`}
          </div>
          <div className="outcome-detail">{explanation}</div>
        </div>
      )}

      {/* NEXT MATCHUP / PROCEED CONTROLS */}
      {animStage === 'revealed' && isHost && (
        <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
          {clinchedWinner ? (
            <button 
              className="btn-primary" 
              onClick={() => onEndGame(clinchedWinner)} 
              style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <Trophy size={18} />
              <span>Claim Huddle Victory for {clinchedWinner === 'teamA' ? settings.teamAName : settings.teamBName}! 👑</span>
            </button>
          ) : currentMatchupIndex + 1 < matchups.length ? (
            <button className="btn-primary" onClick={onNextMatchup} style={{ padding: '14px 28px' }}>
              <span>Next Matchup ({matchups[currentMatchupIndex + 1]?.playerAName} vs {matchups[currentMatchupIndex + 1]?.playerBName})</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn-primary" onClick={() => onEndGame()} style={{ padding: '14px 28px' }}>
              <Trophy size={18} />
              <span>Declare Huddle Victor!</span>
            </button>
          )}
        </div>
      )}

      {animStage === 'revealed' && !isHost && (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '14px' }}>
          {clinchedWinner 
            ? `${clinchedWinner === 'teamA' ? settings.teamAName : settings.teamBName} clinched the victory! Waiting for host...` 
            : 'Waiting for host to proceed to next duel...'}
        </p>
      )}
    </div>
  );
}
