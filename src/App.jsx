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
import { sound } from './utils/sound';

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
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) return r.toUpperCase();
    }
    return generateRandomCode();
  });

  const [isHost, setIsHost] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !params.has('room'); // First visitor without ?room is host
    }
    return true;
  });

  const [myPlayerId] = useState(getStoredPlayerId);
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
  });

  const networkRef = useRef(null);

  // Keep state synced to clients if we are host
  const broadcastLatestState = useCallback((stateToBroadcast) => {
    if (networkRef.current && isHost) {
      networkRef.current.broadcastState(stateToBroadcast);
    }
  }, [isHost]);

  // Host Action Handler (receives actions from clients or local UI)
  const handleHostAction = useCallback((action) => {
    setGameState((prev) => {
      let next = { ...prev };

      if (action.type === 'JOIN_PLAYER') {
        const existingIdx = next.players.findIndex(p => p.id === action.player.id);
        if (existingIdx >= 0) {
          next.players = [...next.players];
          next.players[existingIdx] = { ...next.players[existingIdx], ...action.player };
        } else {
          next.players = [...next.players, action.player];
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
        next.matchups = queue;
        next.currentMatchupIndex = 0;
        next.scores = { teamA: 0, teamB: 0 };
        next.history = [];
        next.winnerTeam = null;

        // Auto-assign random choices for bots
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        next.players.forEach(p => {
          if (p.isBot) {
            const randomChoice = game.choices[Math.floor(Math.random() * game.choices.length)];
            next.moves[p.id] = randomChoice.id;
          }
        });
      }
      else if (action.type === 'SELECT_MOVE') {
        next.moves = { ...next.moves, [action.playerId]: action.move };

        // Check if all players have picked
        const allPicked = next.players.every(p => !!next.moves[p.id]);
        if (allPicked && next.phase === 'picking') {
          // Can auto proceed or wait for host click
        }
      }
      else if (action.type === 'FORCE_SHUFFLE') {
        // Ensure any player without a move gets an auto pick so game proceeds
        const game = GAMES[next.settings.gameId] || GAMES.psr;
        const updatedMoves = { ...next.moves };
        next.players.forEach(p => {
          if (!updatedMoves[p.id]) {
            const randomChoice = game.choices[Math.floor(Math.random() * game.choices.length)];
            updatedMoves[p.id] = randomChoice.id;
          }
        });
        next.moves = updatedMoves;
        next.phase = 'shuffle';
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

        // Check win condition
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
        const nextIdx = next.currentMatchupIndex + 1;
        if (nextIdx < next.matchups.length) {
          next.currentMatchupIndex = nextIdx;
        } else {
          // If we reached the end of queue without a winner, add extra sudden-death matchup
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
          // Tie-break flip
          next.winnerTeam = Math.random() > 0.5 ? 'teamA' : 'teamB';
        }
        next.phase = 'victory';
      }
      else if (action.type === 'REMATCH') {
        // Restart game with current teams
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
      }

      broadcastLatestState(next);
      return next;
    });
  }, [broadcastLatestState]);

  // Client / Host Action Dispatcher
  const dispatchAction = (action) => {
    if (isHost) {
      handleHostAction(action);
    } else if (networkRef.current) {
      networkRef.current.sendActionToHost(action);
    }
  };

  // Initialize Network Connection
  useEffect(() => {
    // Ensure URL has ?room=... for easy sharing
    if (typeof window !== 'undefined' && !window.location.search.includes(`room=${roomCode}`)) {
      window.history.replaceState(null, '', `?room=${roomCode}`);
    }

    const net = new RoomNetwork({
      roomCode,
      isHost,
      onStateReceived: (remoteState) => {
        setGameState(remoteState);
      },
      onPlayerJoined: (action, senderId) => {
        handleHostAction(action);
      },
      onPlayerLeft: () => {
        // Player disconnected
      },
      onConnected: () => {
        // If client joins, register self if we have a name stored
        const storedName = sessionStorage.getItem('huddle_player_name');
        const storedTeam = sessionStorage.getItem('huddle_player_team') || 'teamA';
        if (storedName) {
          dispatchAction({
            type: 'JOIN_PLAYER',
            player: {
              id: myPlayerId,
              name: storedName,
              team: storedTeam,
              isHost,
              isBot: false,
            }
          });
        }
      },
      onError: (msg) => {
        console.warn('Network alert:', msg);
      }
    });

    networkRef.current = net;

    // Track peer counts periodically
    const peerTimer = setInterval(() => {
      if (net && net.clientConnections) {
        setConnectedPeersCount(net.clientConnections.size);
      }
    }, 1500);

    return () => {
      clearInterval(peerTimer);
      net.destroy();
    };
  }, [roomCode, isHost, myPlayerId]);

  // Current Player Object
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);

  // User Actions
  const handleJoinTeam = (name, team) => {
    sessionStorage.setItem('huddle_player_name', name);
    sessionStorage.setItem('huddle_player_team', team);

    dispatchAction({
      type: 'JOIN_PLAYER',
      player: {
        id: myPlayerId,
        name,
        team,
        isHost,
        isBot: false,
      }
    });
  };

  const handleUpdateSettings = (newSettings) => {
    dispatchAction({
      type: 'UPDATE_SETTINGS',
      settings: newSettings,
    });
  };

  const handleAddBot = (team) => {
    dispatchAction({
      type: 'ADD_BOT',
      team,
    });
  };

  const handleStartGame = () => {
    dispatchAction({ type: 'START_GAME' });
  };

  const handleSelectMove = (move) => {
    dispatchAction({
      type: 'SELECT_MOVE',
      playerId: myPlayerId,
      move,
    });
  };

  const handleForceShuffle = () => {
    dispatchAction({ type: 'FORCE_SHUFFLE' });
  };

  const handleMatchupResult = (result) => {
    dispatchAction({
      type: 'MATCHUP_RESULT',
      result,
    });
  };

  const handleNextMatchup = () => {
    dispatchAction({ type: 'NEXT_MATCHUP' });
  };

  const handleEndGame = () => {
    dispatchAction({ type: 'END_GAME' });
  };

  const handleRematch = () => {
    dispatchAction({ type: 'REMATCH' });
  };

  const handleBackToLobby = () => {
    dispatchAction({ type: 'BACK_TO_LOBBY' });
  };

  return (
    <div className="app-container">
      <Header
        roomCode={roomCode}
        isHost={isHost}
        connectedPeersCount={connectedPeersCount}
        onOpenQr={() => setShowQr(true)}
      />

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
            players={gameState.players}
            moves={gameState.moves}
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
