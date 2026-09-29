import React, { useState } from 'react';
import { Users, Swords, Bot, Settings, ArrowRightLeft, Sparkles } from 'lucide-react';
import { GAMES, WIN_CONDITIONS } from '../utils/gameEngine';
import { sound } from '../utils/sound';

export function Lobby({
  isHost,
  myPlayer,
  players,
  settings,
  onJoinTeam,
  onUpdateSettings,
  onStartGame,
  onAddBot
}) {
  const [inputName, setInputName] = useState(myPlayer ? myPlayer.name : '');
  const [selectedTeam, setSelectedTeam] = useState('teamA');

  const teamAPlayers = players.filter(p => p.team === 'teamA');
  const teamBPlayers = players.filter(p => p.team === 'teamB');

  const canStart = teamAPlayers.length > 0 && teamBPlayers.length > 0;

  const handleRegister = (e) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    sound.click();
    onJoinTeam(inputName.trim(), selectedTeam);
  };

  const handleSwitchTeam = (newTeam) => {
    sound.click();
    if (myPlayer) {
      onJoinTeam(myPlayer.name, newTeam);
    } else {
      setSelectedTeam(newTeam);
    }
  };

  const handleStart = () => {
    sound.lockIn();
    onStartGame();
  };

  const handleAddMockPlayer = (team) => {
    sound.click();
    onAddBot(team);
  };

  // If user hasn't joined any team yet, show the join prompt
  if (!myPlayer) {
    return (
      <div className="name-prompt-card glass-panel animate-pop">
        <h2>Enter the Arena</h2>
        <p>Choose your name and select which team you are joining for the huddle.</p>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className="custom-input"
              style={{ fontSize: '1.1rem', padding: '14px', textAlign: 'center' }}
              placeholder="e.g. Julian"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              autoFocus
              maxLength={20}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              className="btn-join-team"
              style={{
                background: selectedTeam === 'teamA' ? 'var(--team-a)' : 'rgba(0, 229, 255, 0.1)',
                color: selectedTeam === 'teamA' ? '#000' : 'var(--team-a)',
                border: '1px solid var(--team-a-border)'
              }}
              onClick={() => setSelectedTeam('teamA')}
            >
              Join {settings.teamAName}
            </button>

            <button
              type="button"
              className="btn-join-team"
              style={{
                background: selectedTeam === 'teamB' ? 'var(--team-b)' : 'rgba(255, 94, 54, 0.1)',
                color: selectedTeam === 'teamB' ? '#fff' : 'var(--team-b)',
                border: '1px solid var(--team-b-border)'
              }}
              onClick={() => setSelectedTeam('teamB')}
            >
              Join {settings.teamBName}
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={!inputName.trim()}>
            <span>Step into Lobby</span>
            <Sparkles size={18} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="lobby-grid">
      {/* TEAM A ROSTER */}
      <div className="team-card team-a glass-panel">
        <div className="team-header">
          <div className="team-title">
            <div className="team-badge-circle">A</div>
            <div>
              <div className="team-name-text">{settings.teamAName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Squad 1</div>
            </div>
          </div>
          <span className="player-count-badge">
            {teamAPlayers.length} {teamAPlayers.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        <div className="player-roster">
          {teamAPlayers.length === 0 ? (
            <div className="empty-roster">
              <Users size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p>No players yet</p>
              <span style={{ fontSize: '0.75rem' }}>Join this team to represent!</span>
            </div>
          ) : (
            teamAPlayers.map(p => (
              <div key={p.id} className={`player-item ${p.id === myPlayer?.id ? 'is-me' : ''}`}>
                <div className="player-info">
                  <div className="player-avatar" style={{ background: 'var(--team-a-bg)', color: 'var(--team-a)' }}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="player-name">{p.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.id === myPlayer?.id && <span className="you-tag">YOU</span>}
                  {p.isHost && <span className="host-tag">HOST</span>}
                  {p.isBot && <span className="bot-tag">BOT</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {myPlayer?.team !== 'teamA' ? (
          <button className="btn-join-team" onClick={() => handleSwitchTeam('teamA')}>
            <ArrowRightLeft size={16} />
            <span>Switch to {settings.teamAName}</span>
          </button>
        ) : (
          <button 
            className="btn-secondary" 
            onClick={() => handleAddMockPlayer('teamA')}
            title="Add a test teammate for quick testing"
          >
            <Bot size={15} />
            <span>+ Add Test Player (Bot)</span>
          </button>
        )}
      </div>

      {/* CENTER GAME CONTROLS */}
      <div className="center-controls">
        <div className="control-card glass-panel">
          <div className="control-title">
            <Settings size={16} />
            <span>Game Settings</span>
          </div>

          {/* Game Selection */}
          <div className="setting-group">
            <label>Selected Game</label>
            <select
              className="custom-select"
              value={settings.gameId}
              disabled={!isHost}
              onChange={e => onUpdateSettings({ gameId: e.target.value })}
            >
              {Object.values(GAMES).map(g => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scoring Format */}
          <div className="setting-group">
            <label>Scoring Format</label>
            <select
              className="custom-select"
              value={settings.winConditionId}
              disabled={!isHost}
              onChange={e => onUpdateSettings({ winConditionId: e.target.value })}
            >
              {WIN_CONDITIONS.map(w => (
                <option key={w.id} value={w.id}>
                  {w.label} ({w.description})
                </option>
              ))}
            </select>
          </div>

          {/* Team Name Customization (Host only) */}
          {isHost && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team A Name</label>
                <input
                  type="text"
                  className="custom-input"
                  value={settings.teamAName}
                  maxLength={16}
                  onChange={e => onUpdateSettings({ teamAName: e.target.value || 'Team A' })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team B Name</label>
                <input
                  type="text"
                  className="custom-input"
                  value={settings.teamBName}
                  maxLength={16}
                  onChange={e => onUpdateSettings({ teamBName: e.target.value || 'Team B' })}
                />
              </div>
            </div>
          )}

          {!isHost && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '10px' }}>
              Host controls format & settings
            </p>
          )}

          <div style={{ marginTop: '16px' }}>
            <button
              className="btn-primary"
              disabled={!canStart || (!isHost && false)}
              onClick={handleStart}
            >
              <Swords size={20} />
              <span>START THE CLASH!</span>
            </button>

            {!canStart && (
              <p style={{ fontSize: '0.78rem', color: 'var(--warning)', textAlign: 'center', marginTop: '8px' }}>
                Both teams need at least 1 player to clash!
              </p>
            )}
          </div>
        </div>

        {/* Quick Tips Box */}
        <div className="glass-panel" style={{ padding: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <p style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>⚡ Fair Huddle Decider</p>
          <p>
            Players pick their moves secretly. The game shuffles and pits 1v1 matchups from each team until a team claims victory!
          </p>
        </div>
      </div>

      {/* TEAM B ROSTER */}
      <div className="team-card team-b glass-panel">
        <div className="team-header">
          <div className="team-title">
            <div className="team-badge-circle">B</div>
            <div>
              <div className="team-name-text">{settings.teamBName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Squad 2</div>
            </div>
          </div>
          <span className="player-count-badge">
            {teamBPlayers.length} {teamBPlayers.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        <div className="player-roster">
          {teamBPlayers.length === 0 ? (
            <div className="empty-roster">
              <Users size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p>No players yet</p>
              <span style={{ fontSize: '0.75rem' }}>Join this team to represent!</span>
            </div>
          ) : (
            teamBPlayers.map(p => (
              <div key={p.id} className={`player-item ${p.id === myPlayer?.id ? 'is-me' : ''}`}>
                <div className="player-info">
                  <div className="player-avatar" style={{ background: 'var(--team-b-bg)', color: 'var(--team-b)' }}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="player-name">{p.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {p.id === myPlayer?.id && <span className="you-tag">YOU</span>}
                  {p.isHost && <span className="host-tag">HOST</span>}
                  {p.isBot && <span className="bot-tag">BOT</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {myPlayer?.team !== 'teamB' ? (
          <button className="btn-join-team" onClick={() => handleSwitchTeam('teamB')}>
            <ArrowRightLeft size={16} />
            <span>Switch to {settings.teamBName}</span>
          </button>
        ) : (
          <button 
            className="btn-secondary" 
            onClick={() => handleAddMockPlayer('teamB')}
            title="Add a test teammate for quick testing"
          >
            <Bot size={15} />
            <span>+ Add Test Player (Bot)</span>
          </button>
        )}
      </div>
    </div>
  );
}
