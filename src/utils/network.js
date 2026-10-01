import { joinRoom } from 'trystero/nostr';

export class RoomNetwork {
  constructor({ roomCode, myPlayerId, onStateReceived, onActionReceived, onPeerListChange }) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.myPlayerId = myPlayerId;
    this.onStateReceived = onStateReceived;
    this.onActionReceived = onActionReceived;
    this.onPeerListChange = onPeerListChange;

    this.room = null;
    this.stateAction = null;
    this.playerAction = null;
    this.presenceAction = null;
    this.broadcastChannel = null;
    this.connectedPeers = new Set();

    this.init();
  }

  init() {
    // 1. Same-device instant tab synchronization via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        this.broadcastChannel = new BroadcastChannel(`huddle-sync-${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleChannelMessage(event.data);
        };
      }
    } catch (e) {
      console.warn('[Network] BroadcastChannel error:', e);
    }

    // 2. Cross-device WebRTC mesh via Trystero Nostr network
    try {
      const config = {
        appId: 'huddle-clash-v1'
      };

      this.room = joinRoom(config, this.roomCode);

      // Register Trystero action handlers (Trystero 0.25+ returns action object with .send and .onMessage)
      this.stateAction = this.room.makeAction('gameState');
      this.playerAction = this.room.makeAction('playerAction');
      this.presenceAction = this.room.makeAction('presence');

      // Handle remote state updates
      this.stateAction.onMessage = (data, meta) => {
        const peerId = (meta && typeof meta === 'object') ? meta.peerId : meta;
        if (this.onStateReceived) this.onStateReceived(data, peerId);
      };

      // Handle remote actions (joins, moves, settings updates)
      this.playerAction.onMessage = (action, meta) => {
        const peerId = (meta && typeof meta === 'object') ? meta.peerId : meta;
        if (this.onActionReceived) this.onActionReceived(action, peerId);
      };

      // Handle presence heartbeats
      this.presenceAction.onMessage = (presenceData, meta) => {
        const peerId = (meta && typeof meta === 'object') ? meta.peerId : meta;
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PRESENCE_HEARTBEAT', player: presenceData }, peerId);
        }
      };

      // Peer connected (onPeerJoin is a property setter in Trystero 0.25+)
      this.room.onPeerJoin = (peerId) => {
        console.log(`[P2P] Remote peer joined room ${this.roomCode}:`, peerId);
        this.connectedPeers.add(peerId);
        if (this.onPeerListChange) this.onPeerListChange(Array.from(this.connectedPeers));
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PEER_JOINED', peerId });
        }
      };

      // Peer disconnected
      this.room.onPeerLeave = (peerId) => {
        console.log(`[P2P] Remote peer left room ${this.roomCode}:`, peerId);
        this.connectedPeers.delete(peerId);
        if (this.onPeerListChange) this.onPeerListChange(Array.from(this.connectedPeers));
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PEER_LEFT', peerId });
        }
      };
    } catch (err) {
      console.error('[Network] Trystero P2P initialization error:', err);
    }
  }

  handleChannelMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.senderId === this.myPlayerId) return; // Don't handle self-echo

    if (msg.type === 'SYNC_GAME_STATE' && this.onStateReceived) {
      this.onStateReceived(msg.payload, msg.senderId);
    } else if (msg.type === 'CLIENT_ACTION' && this.onActionReceived) {
      this.onActionReceived(msg.action, msg.senderId);
    }
  }

  // Host broadcasts authoritative state to all peers
  broadcastGameState(state) {
    // 1. Send across local browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SYNC_GAME_STATE',
          payload: state,
          senderId: this.myPlayerId
        });
      } catch (e) {
        console.warn('[Network] BroadcastChannel state error:', e);
      }
    }

    // 2. Send across Trystero P2P network
    if (this.stateAction) {
      try {
        this.stateAction.send(state).catch((e) => {
          console.warn('[Network] P2P state send warning:', e);
        });
      } catch (e) {
        console.warn('[Network] P2P sendState error:', e);
      }
    }
  }

  // Send player action to host and peers
  broadcastAction(action) {
    // 1. Send across local tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'CLIENT_ACTION',
          action,
          senderId: this.myPlayerId
        });
      } catch (e) {
        console.warn('[Network] BroadcastChannel action error:', e);
      }
    }

    // 2. Send across Trystero P2P
    if (this.playerAction) {
      try {
        this.playerAction.send(action).catch((e) => {
          console.warn('[Network] P2P action send warning:', e);
        });
      } catch (e) {
        console.warn('[Network] P2P sendAction error:', e);
      }
    }
  }

  // Send periodic presence
  broadcastPresence(player) {
    if (this.presenceAction && player) {
      try {
        this.presenceAction.send(player).catch(() => {});
      } catch {}
    }
  }

  destroy() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
    }
    if (this.room) {
      try {
        this.room.leave();
      } catch {}
    }
  }
}
