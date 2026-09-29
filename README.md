# ⚔️ Huddle Clash: Who Keeps the Call?

A lightweight, high-energy mini-game web app built to fairly and entertainingly resolve which split team keeps the main video call huddle.

---

## 🚀 Features

- **🎮 Paper-Scissors-Rock Arena (Extensible Architecture)**
  - Secret weapon selection: Rock 🪨, Paper 📄, Scissors ✂️.
  - Extensible engine with support for Coin Flip & Dice Clash.
- **🔄 Shuffle State & 1v1 Duels**
  - Dramatic slot-machine roulette animation matching gladiators from Team A vs Team B.
  - Fair dynamic cycling: if teams have uneven numbers (e.g., 2 vs 3), the game cycles through remaining players randomly.
  - 3-2-1 countdown, dramatic 3D card flip reveal, and win/draw explanation banners.
- **⚙️ Configurable Scoring Formats (Host Controlled)**
  - Best of 3 (First to 2 wins)
  - Best of 5 (First to 3 wins)
  - Sudden Death (1 epic duel)
  - First to 4 wins
  - Full Roster Clash (Highest score across all players)
- **👥 Seamless Self-Sorting Lobby**
  - Players join via Room Link or QR Code and pick Team A or Team B.
  - Custom team names (e.g. "Design" vs "Engineering").
  - Built-in **"+ Add Test Player (Bot)"** button for instant solo testing.
- **🌐 Zero-Backend Real-Time Sync (Vercel Ready)**
  - Powered by **PeerJS WebRTC** (cross-device browser-to-browser data channels) and **BroadcastChannel** (zero-latency same-machine multi-tab testing).
  - No database setup, no API keys, and 100% free static hosting on Vercel.
- **🔊 Arcade Audio & Visuals**
  - Web Audio API synthesized sound effects (ticks, clash whoosh, lock-in, points, fanfare) without external audio file loading lag.
  - Multi-colored confetti burst on victory.

---

## 🛠️ Getting Started Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚀 Deploying to Vercel

1. Push this repository to GitHub or GitLab:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Import the repository in [Vercel](https://vercel.com/new).
3. Vercel automatically detects the Vite framework and uses `vercel.json` for SPA routing.
4. Deploy! No environment variables or database setup required.
