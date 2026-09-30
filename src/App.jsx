import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { Header } from './components/Header';
import { QRCodeModal } from './components/QRCodeModal';
import { Lobby } from './components/Lobby';
import { PickingPhase } from './components/PickingPhase';
import { ShowdownPhase } from './components/ShowdownPhase';
import { VictoryPhase } from './components/VictoryPhase';
import { RoomNetwork } from './utils/network';
import { GAMES, WIN_CONDITIONS, generateMatchupQueue } from './utils/gameEngine';

function generateRandomCode() {
  const words = ['ROCK', 'HUDDLE', 'CLASH', 'DUEL', 'SPLIT', 'TEAM'];
  const prefix = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

function getStoredPlayerId() {
  let id = sessionStorage.getItem('huddle_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('huddle_player_id', id);
  }
  return id;
}

export default function App() {
  // Check URL query for room code
  const [roomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) return r.toUpperCase().trim();
    }
    const newCode = generateRandomCode();
    sessionStorage.setItem('huddle_is_creator_' + newCode, 'true');
    return newCode;
  });

  const [myPlayerId] = useState(getStoredPlayerId);

  // Determine if this tab is the host (creator or claimed)
  const [isHost, setIsHost] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check if session storage has this room's creator flag
      if (sessionStorage.getItem('huddle_is_creator_' + roomCode) === 'true') {
        return true;
      }
      const params = new URLSearchParams(window.location.search);
      if (!params.has('room')) {
        return true;
      }
    }
    return false;
  });

  // Stored player profile (optimistic local state)
  const [myPlayer, setMyPlayer] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('huddle_player_name');
      const storedTeam = sessionStorage.getItem('huddle_player_team');
      if (storedName) {
        return {
          id: myPlayerId,
          name: storedName,
          team: storedTeam || 'teamA',
          isHost,
          isBot: false,
        };
      }
    }
    return null;
  });

  const [showQr, setShowQr] = useState(false);
  const [connectedPeersCount, setConnectedPeersCount] = useState(0);

  // Authoritative Game State
  const [gameState, setGameState] = useState({
    phase: 'lobby', // 'lobby' | 'picking' | 'shuffle' | 'victory'
    settings: {
      gameId: 'psr',
      winConditionId: 'best_of_3',
      teamAName: 'Team A',
      teamBName: 'Team B',
    },
    players: [],
    moves: {},
    scores: { teamA: 0, teamB: 0 },
    matchups: [],
    currentMatchupIndex: 0,
    history: [],
    winnerTeam: null,
    clinchedWinner: null,
  });

  const networkRef = useRef(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const myPlayerRef = useRef(myPlayer);
  myPlayerRef.current = myPlayer;

  // Broadcast latest state to peers (host only)
  const broadcastState = useCallback((stateToBroadcast) => {
    if (networkRef.current && isHostRef.current) {
      networkRef.current.broadcastGameState(stateToBroadcast);
    }
  }, []);

  // Central state reducer for all game actions
  const applyAction = useCallback((action) => {
    setGameState((prev) => {
      let next = { ...prev };

      if (action.type === 'JOIN_PLAYER') {
        const player = action.player;
        const exists = next.players.some(p => p.id === player.id);
        if (exists) {
          next.players = next.players.map(p => (p.id === player.id ? { ...p, ...player } : p));
        } else {
          next.players = [...next.players, player];
        }
      }
      else if (action.type === 'UPDATE_SETTINGS') {
        next.settings = { ...next.settings, ...action.settings };
      }
      else if (action.type === 'ADD_BOT') {
        const botCount = next.players.filter(p => p.isBot).length + 1;
        const botNames = ['Pixel', 'Turbo', 'Blaze', 'Nova', 'Echo', 'Viper'];
        const name = `${botNames[(botCount - 1) % botNames.length]} (Bot)`;
        const botPlayer = {
          id: 'bot_' + Math.random().toString(36).substring(2, 7),
          name,
          team: action.team,
          isHost: false,
          isBot: true,
        };
        next.players = [...next.players, botPlayer];
      }
      else if (action.type === 'START_GAME') {
        const teamA = next.players.filter(p => p.team === 'teamA');
        const teamB = next.players.filter(p => p.team === 'teamB');
        const queue = generateMatchupQueue(teamA, teamB, next.settings.winConditionId);

        next.phase = 'picking';
        next.moves = {};
        next.isTieReplay = false;
        next.matchups = queue;
        next.currentMatchupIndex = 0;
        next.scores = { teamA: 0, teamB: 0 };
        next.history = [];
        next.winnerTeam = null;
        next.clinchedWinner = null;

        // Auto-assign move for bot if fighting in first duel
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        const currentMatch = queue[0];
        if (currentMatch) {
          const fA = next.players.find(p => p.id === currentMatch.playerAId);
          const fB = next.players.find(p => p.id === currentMatch.playerBId);
          if (fA && fA.isBot) {
            next.moves[fA.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
          if (fB && fB.isBot) {
            next.moves[fB.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
        }
      }
      else if (action.type === 'SELECT_MOVE') {
        next.moves = { ...next.moves, [action.playerId]: action.move };

        // Auto advance to clash if both active duelists have locked in
        const currentMatch = next.matchups[next.currentMatchupIndex];
        if (currentMatch && next.phase === 'picking') {
          const moveA = next.moves[currentMatch.playerAId];
          const moveB = next.moves[currentMatch.playerBId];
          if (moveA && moveB) {
            next.phase = 'shuffle';
          }
        }
      }
      else if (action.type === 'FORCE_SHUFFLE') {
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        const currentMatch = next.matchups[next.currentMatchupIndex];
        const updatedMoves = { ...next.moves };
        if (currentMatch) {
          if (!updatedMoves[currentMatch.playerAId]) {
            updatedMoves[currentMatch.playerAId] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
          if (!updatedMoves[currentMatch.playerBId]) {
            updatedMoves[currentMatch.playerBId] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
        }
        next.moves = updatedMoves;
        next.phase = 'shuffle';
      }
      else if (action.type === 'TIE_REPLAY') {
        // Clear previous moves so players get to pick fresh!
        next.moves = {};
        next.isTieReplay = true;
        next.phase = 'picking';

        // Auto-assign move for bot if fighting
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        const currentMatch = next.matchups[next.currentMatchupIndex];
        if (currentMatch) {
          const fA = next.players.find(p => p.id === currentMatch.playerAId);
          const fB = next.players.find(p => p.id === currentMatch.playerBId);
          if (fA && fA.isBot) {
            next.moves[fA.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
          if (fB && fB.isBot) {
            next.moves[fB.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
        }
      }
      else if (action.type === 'MATCHUP_RESULT') {
        const result = action.result; // 'teamA' | 'teamB' | 'draw'
        const currentMatchup = next.matchups[next.currentMatchupIndex];

        let newScores = { ...next.scores };
        if (result === 'teamA') newScores.teamA += 1;
        if (result === 'teamB') newScores.teamB += 1;
        next.scores = newScores;

        if (currentMatchup) {
          next.history = [
            ...next.history,
            {
              roundNumber: currentMatchup.roundNumber,
              playerAName: currentMatchup.playerAName,
              playerBName: currentMatchup.playerBName,
              winner: result,
            }
          ];
        }

        const cond = WIN_CONDITIONS.find(c => c.id === next.settings.winConditionId);
        const target = cond ? cond.targetWins : 2;

        if (target > 0) {
          if (newScores.teamA >= target) {
            next.clinchedWinner = 'teamA';
          } else if (newScores.teamB >= target) {
            next.clinchedWinner = 'teamB';
          }
        }
      }
      else if (action.type === 'NEXT_MATCHUP') {
        next.clinchedWinner = null;
        next.isTieReplay = false;
        next.moves = {}; // RESET MOVES FOR NEW DUEL!

        const nextIdx = next.currentMatchupIndex + 1;
        if (nextIdx < next.matchups.length) {
          next.currentMatchupIndex = nextIdx;
        } else {
          const teamA = next.players.filter(p => p.team === 'teamA');
          const teamB = next.players.filter(p => p.team === 'teamB');
          const extraMatchup = {
            roundNumber: next.matchups.length + 1,
            playerAId: teamA[Math.floor(Math.random() * teamA.length)].id,
            playerAName: teamA[Math.floor(Math.random() * teamA.length)].name,
            playerBId: teamB[Math.floor(Math.random() * teamB.length)].id,
            playerBName: teamB[Math.floor(Math.random() * teamB.length)].name,
          };
          next.matchups = [...next.matchups, extraMatchup];
          next.currentMatchupIndex = nextIdx;
        }

        next.phase = 'picking'; // RETURN TO PICKING PHASE FOR NEW DUEL!

        // Auto-assign move for bot if fighting in new duel
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        const currentMatch = next.matchups[next.currentMatchupIndex];
        if (currentMatch) {
          const fA = next.players.find(p => p.id === currentMatch.playerAId);
          const fB = next.players.find(p => p.id === currentMatch.playerBId);
          if (fA && fA.isBot) {
            next.moves[fA.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
          if (fB && fB.isBot) {
            next.moves[fB.id] = game.choices[Math.floor(Math.random() * game.choices.length)].id;
          }
        }
      }
      else if (action.type === 'END_GAME') {
        const winner = action.winner || next.clinchedWinner;
        if (winner) {
          next.winnerTeam = winner;
        } else if (next.scores.teamA > next.scores.teamB) {
          next.winnerTeam = 'teamA';
        } else if (next.scores.teamB > next.scores.teamA) {
          next.winnerTeam = 'teamB';
        } else {
          next.winnerTeam = Math.random() > 0.5 ? 'teamA' : 'teamB';
        }
        next.phase = 'victory';
      }
      else if (action.type === 'REMATCH') {
        const teamA = next.players.filter(p => p.team === 'teamA');
        const teamB = next.players.filter(p => p.team === 'teamB');
        const queue = generateMatchupQueue(teamA, teamB, next.settings.winConditionId);

        next.phase = 'picking';
        next.moves = {};
        next.matchups = queue;
        next.currentMatchupIndex = 0;
        next.scores = { teamA: 0, teamB: 0 };
        next.history = [];
        next.winnerTeam = null;
        next.clinchedWinner = null;

        const game = GAMES[next.settings.gameId] || GAMES.psr;
        next.players.forEach(p => {
          if (p.isBot) {
            const randomChoice = game.choices[Math.floor(Math.random() * game.choices.length)];
            next.moves[p.id] = randomChoice.id;
          }
        });
      }
      else if (action.type === 'BACK_TO_LOBBY') {
        next.phase = 'lobby';
        next.moves = {};
        next.scores = { teamA: 0, teamB: 0 };
        next.winnerTeam = null;
        next.clinchedWinner = null;
      }

      // If we are host, broadcast updated state to network
      if (isHostRef.current) {
        broadcastState(next);
      }

      return next;
    });
  }, [broadcastState]);

  // Dispatch an action (applies locally & broadcasts to network)
  const dispatch = useCallback((action) => {
    applyAction(action);
    if (networkRef.current) {
      networkRef.current.broadcastAction(action);
    }
  }, [applyAction]);

  // Initialize network and listeners
  useEffect(() => {
    // Keep URL parameter synchronized
    if (typeof window !== 'undefined' && !window.location.search.includes(`room=${roomCode}`)) {
      window.history.replaceState(null, '', `?room=${roomCode}`);
    }

    const net = new RoomNetwork({
      roomCode,
      myPlayerId,
      onStateReceived: (remoteState) => {
        // If we receive state from a host, adopt it
        if (!isHostRef.current && remoteState) {
          setGameState(remoteState);
        }
      },
      onActionReceived: (action) => {
        if (!action) return;

        if (action.type === 'PEER_JOINED') {
          // If a new peer joined and we are host, send current state immediately
          if (isHostRef.current) {
            net.broadcastGameState(gameStateRef.current);
          }
          // Also announce our own presence
          if (myPlayerRef.current) {
            net.broadcastAction({
              type: 'JOIN_PLAYER',
              player: myPlayerRef.current
            });
          }
        }
        else if (action.type === 'PRESENCE_HEARTBEAT' && action.player) {
          applyAction({ type: 'JOIN_PLAYER', player: action.player });
        }
        else {
          applyAction(action);
        }
      },
      onPeerListChange: (peers) => {
        setConnectedPeersCount(peers.length);
      }
    });

    networkRef.current = net;

    // Periodic heartbeat: announce player & broadcast state if host
    const heartbeatTimer = setInterval(() => {
      if (myPlayerRef.current) {
        net.broadcastPresence(myPlayerRef.current);
      }
      if (isHostRef.current) {
        net.broadcastGameState(gameStateRef.current);
      }
    }, 2000);

    // Initial broadcast of presence if player already exists
    if (myPlayerRef.current) {
      net.broadcastAction({
        type: 'JOIN_PLAYER',
        player: myPlayerRef.current
      });
    }

    return () => {
      clearInterval(heartbeatTimer);
      net.destroy();
    };
  }, [roomCode, myPlayerId, applyAction]);

  // Handle local user actions
  const handleJoinTeam = (name, team) => {
    sessionStorage.setItem('huddle_player_name', name);
    sessionStorage.setItem('huddle_player_team', team);

    const player = {
      id: myPlayerId,
      name,
      team,
      isHost,
      isBot: false,
    };

    // Optimistically update local state immediately
    setMyPlayer(player);

    dispatch({
      type: 'JOIN_PLAYER',
      player,
    });
  };

  const handleClaimHost = () => {
    setIsHost(true);
    sessionStorage.setItem('huddle_is_creator_' + roomCode, 'true');
    if (myPlayer) {
      const updated = { ...myPlayer, isHost: true };
      setMyPlayer(updated);
      dispatch({ type: 'JOIN_PLAYER', player: updated });
    }
    // Broadcast state to take over host responsibilities
    broadcastState(gameStateRef.current);
  };

  const handleUpdateSettings = (newSettings) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: newSettings });
  };

  const handleAddBot = (team) => {
    dispatch({ type: 'ADD_BOT', team });
  };

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME' });
  };

  const handleSelectMove = (move) => {
    dispatch({
      type: 'SELECT_MOVE',
      playerId: myPlayerId,
      move,
    });
  };

  const handleForceShuffle = () => {
    dispatch({ type: 'FORCE_SHUFFLE' });
  };

  const handleMatchupResult = (result) => {
    dispatch({ type: 'MATCHUP_RESULT', result });
  };

  const handleNextMatchup = () => {
    dispatch({ type: 'NEXT_MATCHUP' });
  };

  const handleTieReplay = () => {
    dispatch({ type: 'TIE_REPLAY' });
  };

  const handleEndGame = (winner) => {
    dispatch({ type: 'END_GAME', winner });
  };

  const handleRematch = () => {
    dispatch({ type: 'REMATCH' });
  };

  const handleBackToLobby = () => {
    dispatch({ type: 'BACK_TO_LOBBY' });
  };

  return (
    <div className="app-container">
      <Header
        roomCode={roomCode}
        isHost={isHost}
        connectedPeersCount={connectedPeersCount}
        onOpenQr={() => setShowQr(true)}
      />

      {/* Host Claim Banner if user is not currently marked as host */}
      {!isHost && (
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <button
            onClick={handleClaimHost}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Claim Host Controls
          </button>
        </div>
      )}

      <main className="main-stage">
        {gameState.phase === 'lobby' && (
          <Lobby
            isHost={isHost}
            myPlayer={myPlayer}
            players={gameState.players}
            settings={gameState.settings}
            onJoinTeam={handleJoinTeam}
            onUpdateSettings={handleUpdateSettings}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
          />
        )}

        {gameState.phase === 'picking' && (
          <PickingPhase
            gameId={gameState.settings.gameId}
            myPlayer={myPlayer}
            currentMatchup={gameState.matchups[gameState.currentMatchupIndex]}
            currentMatchupIndex={gameState.currentMatchupIndex}
            totalMatchups={gameState.matchups.length}
            isTieReplay={gameState.isTieReplay}
            moves={gameState.moves}
            scores={gameState.scores}
            settings={gameState.settings}
            onSelectMove={handleSelectMove}
            isHost={isHost}
            onForceShuffle={handleForceShuffle}
          />
        )}

        {gameState.phase === 'shuffle' && (
          <ShowdownPhase
            gameId={gameState.settings.gameId}
            settings={gameState.settings}
            scores={gameState.scores}
            currentMatchupIndex={gameState.currentMatchupIndex}
            matchups={gameState.matchups}
            players={gameState.players}
            moves={gameState.moves}
            clinchedWinner={gameState.clinchedWinner}
            isHost={isHost}
            onMatchupResult={handleMatchupResult}
            onNextMatchup={handleNextMatchup}
            onTieReplay={handleTieReplay}
            onEndGame={handleEndGame}
          />
        )}

        {gameState.phase === 'victory' && (
          <VictoryPhase
            winnerTeam={gameState.winnerTeam}
            settings={gameState.settings}
            scores={gameState.scores}
            history={gameState.history}
            isHost={isHost}
            onRematch={handleRematch}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </main>

      {showQr && (
        <QRCodeModal
          roomCode={roomCode}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
}
