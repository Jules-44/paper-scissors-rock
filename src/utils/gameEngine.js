// Game definitions and tournament resolution engine

export const GAMES = {
  psr: {
    id: 'psr',
    name: 'Paper-Scissors-Rock',
    shortName: 'PSR',
    icon: '✂️',
    description: 'Classic showdown! Rock crushes Scissors, Scissors cuts Paper, Paper covers Rock.',
    choices: [
      { id: 'rock', label: 'Rock', icon: '🪨', beats: 'scissors', color: '#f59e0b' },
      { id: 'paper', label: 'Paper', icon: '📄', beats: 'rock', color: '#3b82f6' },
      { id: 'scissors', label: 'Scissors', icon: '✂️', beats: 'paper', color: '#ec4899' },
    ],
    resolve(choiceA, choiceB) {
      if (!choiceA || !choiceB) return 'draw';
      if (choiceA === choiceB) return 'draw';
      const moveA = this.choices.find(c => c.id === choiceA);
      if (moveA && moveA.beats === choiceB) return 'teamA';
      return 'teamB';
    },
    explain(choiceA, choiceB) {
      if (!choiceA || !choiceB) return 'Missing choice';
      if (choiceA === choiceB) return "It's a tie!";
      const moveA = this.choices.find(c => c.id === choiceA);
      const moveB = this.choices.find(c => c.id === choiceB);
      if (moveA.beats === choiceB) {
        return `${moveA.label} beats ${moveB.label}!`;
      }
      return `${moveB.label} beats ${moveA.label}!`;
    }
  },
  coin: {
    id: 'coin',
    name: 'Coin Flip Duel',
    shortName: 'Coin Flip',
    icon: '🪙',
    description: 'Heads vs Tails! Team A picks, Coin decides.',
    choices: [
      { id: 'heads', label: 'Heads', icon: '🪙', color: '#eab308' },
      { id: 'tails', label: 'Tails', icon: '🦅', color: '#06b6d4' },
    ],
    resolve(choiceA, outcome) {
      // outcome can be flipped randomly by host
      if (!choiceA || !outcome) return 'draw';
      return choiceA === outcome ? 'teamA' : 'teamB';
    },
    explain(choiceA, outcome) {
      return `Coin landed on ${outcome.toUpperCase()}!`;
    }
  },
  dice: {
    id: 'dice',
    name: 'Dice Clash',
    shortName: 'Dice Clash',
    icon: '🎲',
    description: 'Highest roll takes the glory! (1 to 6)',
    choices: [
      { id: '1', label: '1', icon: '⚀', color: '#94a3b8' },
      { id: '2', label: '2', icon: '⚁', color: '#38bdf8' },
      { id: '3', label: '3', icon: '⚂', color: '#34d399' },
      { id: '4', label: '4', icon: '⚃', color: '#fbbf24' },
      { id: '5', label: '5', icon: '⚄', color: '#fb923c' },
      { id: '6', label: '6', icon: '⚅', color: '#f43f5e' },
    ],
    resolve(choiceA, choiceB) {
      const valA = parseInt(choiceA, 10);
      const valB = parseInt(choiceB, 10);
      if (valA === valB) return 'draw';
      return valA > valB ? 'teamA' : 'teamB';
    },
    explain(choiceA, choiceB) {
      if (choiceA === choiceB) return "Same roll: It's a draw!";
      return choiceA > choiceB ? `Team A rolled ${choiceA} vs ${choiceB}` : `Team B rolled ${choiceB} vs ${choiceA}`;
    }
  }
};

export const WIN_CONDITIONS = [
  { id: 'best_of_3', label: 'Best of 3', targetWins: 2, description: 'First team to 2 duel wins' },
  { id: 'best_of_5', label: 'Best of 5', targetWins: 3, description: 'First team to 3 duel wins' },
  { id: 'first_to_1', label: 'Sudden Death (1 Matchup)', targetWins: 1, description: 'One epic 1v1 decides the huddle' },
  { id: 'first_to_4', label: 'First to 4', targetWins: 4, description: 'First team to 4 duel wins' },
  { id: 'all_play', label: 'Full Roster Clash', targetWins: 0, description: 'Every player gets a turn, highest points wins' }
];

// Helper to shuffle array cleanly
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Generate the queue of 1v1 matchups
export function generateMatchupQueue(teamAPlayers, teamBPlayers, winConditionId) {
  if (!teamAPlayers.length || !teamBPlayers.length) return [];

  const cond = WIN_CONDITIONS.find(c => c.id === winConditionId) || WIN_CONDITIONS[0];
  
  // Shuffle player orders
  const shuffledA = shuffleArray(teamAPlayers);
  const shuffledB = shuffleArray(teamBPlayers);

  const matchups = [];
  const maxInitial = Math.max(shuffledA.length, shuffledB.length);
  
  // Decide how many matchups to pre-generate (with ability to extend dynamically)
  const targetCount = cond.targetWins > 0 ? Math.max(cond.targetWins * 2 - 1, maxInitial) : maxInitial;

  for (let i = 0; i < targetCount; i++) {
    const playerA = shuffledA[i % shuffledA.length];
    const playerB = shuffledB[i % shuffledB.length];
    matchups.push({
      roundNumber: i + 1,
      playerAId: playerA.id,
      playerAName: playerA.name,
      playerBId: playerB.id,
      playerBName: playerB.name,
    });
  }

  return matchups;
}
