import { joinRoom } from '@trystero-p2p/torrent';

export class RoomNetwork {
  constructor({ roomCode, myPlayerId, onStateReceived, onActionReceived, onPeerListChange }) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.myPlayerId = myPlayerId;
    this.onStateReceived = onStateReceived;
    this.onActionReceived = onActionReceived;
    this.onPeerListChange = onPeerListChange;

    this.room = null;
    this.sendStateAction = null;
    this.sendPlayerAction = null;
    this.sendPresenceAction = null;
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
      console.warn('BroadcastChannel error:', e);
    }

    // 2. Cross-device WebRTC mesh via Trystero BitTorrent swarm
    try {
      const config = { appId: 'huddle-clash-v1' };
      this.room = joinRoom(config, this.roomCode);

      // Register Trystero action handlers
      const [sendState, getState] = this.room.makeAction('gameState');
      const [sendAction, getAction] = this.room.makeAction('playerAction');
      const [sendPresence, getPresence] = this.room.makeAction('presence');

      this.sendStateAction = sendState;
      this.sendPlayerAction = sendAction;
      this.sendPresenceAction = sendPresence;

      // Handle remote state updates
      getState((data, peerId) => {
        if (this.onStateReceived) this.onStateReceived(data, peerId);
      });

      // Handle remote actions (joins, moves, settings updates)
      getAction((action, peerId) => {
        if (this.onActionReceived) this.onActionReceived(action, peerId);
      });

      // Handle presence heartbeats
      getPresence((presenceData, peerId) => {
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PRESENCE_HEARTBEAT', player: presenceData }, peerId);
        }
      });

      // Peer connected
      this.room.onPeerJoin((peerId) => {
        this.connectedPeers.add(peerId);
        if (this.onPeerListChange) this.onPeerListChange(Array.from(this.connectedPeers));
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PEER_JOINED', peerId });
        }
      });

      // Peer disconnected
      this.room.onPeerLeave((peerId) => {
        this.connectedPeers.delete(peerId);
        if (this.onPeerListChange) this.onPeerListChange(Array.from(this.connectedPeers));
        if (this.onActionReceived) {
          this.onActionReceived({ type: 'PEER_LEFT', peerId });
        }
      });
    } catch (err) {
      console.warn('Trystero init error:', err);
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
        console.warn('Channel error:', e);
      }
    }

    // 2. Send across Trystero P2P network
    if (this.sendStateAction) {
      try {
        this.sendStateAction(state);
      } catch (e) {
        console.warn('Trystero sendState error:', e);
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
        console.warn('Channel error:', e);
      }
    }

    // 2. Send across Trystero P2P
    if (this.sendPlayerAction) {
      try {
        this.sendPlayerAction(action);
      } catch (e) {
        console.warn('Trystero sendAction error:', e);
      }
    }
  }

  // Send periodic presence
  broadcastPresence(player) {
    if (this.sendPresenceAction && player) {
      try {
        this.sendPresenceAction(player);
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
