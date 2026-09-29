import Peer from 'peerjs';

export class RoomNetwork {
  constructor({ roomCode, isHost, onStateReceived, onPlayerJoined, onPlayerLeft, onConnected, onError }) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.isHost = isHost;
    this.onStateReceived = onStateReceived;
    this.onPlayerJoined = onPlayerJoined;
    this.onPlayerLeft = onPlayerLeft;
    this.onConnected = onConnected;
    this.onError = onError;

    this.peer = null;
    this.hostConnection = null; // Used by clients to communicate with host
    this.clientConnections = new Map(); // Used by host to communicate with clients
    this.broadcastChannel = null;

    this.init();
  }

  getPeerIdForRoom(code) {
    // Sanitize room code to be safe for PeerJS ID
    const sanitized = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `huddle-psr-${sanitized}`;
  }

  init() {
    // Set up local BroadcastChannel for zero-latency multi-tab sync on same machine
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        this.broadcastChannel = new BroadcastChannel(`huddle-channel-${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data, 'local-tab');
        };
      }
    } catch {
      // BroadcastChannel optional fallback
    }

    // Set up PeerJS for cross-device networking
    try {
      const peerOptions = {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      };

      if (this.isHost) {
        const hostPeerId = this.getPeerIdForRoom(this.roomCode);
        this.peer = new Peer(hostPeerId, peerOptions);

        this.peer.on('open', (id) => {
          if (this.onConnected) this.onConnected(id);
        });

        this.peer.on('connection', (conn) => {
          this.clientConnections.set(conn.peer, conn);

          conn.on('data', (data) => {
            this.handleIncomingMessage(data, conn.peer);
          });

          conn.on('close', () => {
            this.clientConnections.delete(conn.peer);
            if (this.onPlayerLeft) this.onPlayerLeft(conn.peer);
          });

          conn.on('error', (err) => {
            console.warn('Connection error from client', err);
          });
        });

        this.peer.on('error', (err) => {
          console.warn('Host peer error:', err);
          // If peer ID is taken, we might already have a host in another tab or retry
          if (err.type === 'unavailable-id') {
            if (this.onError) this.onError('Room ID already in use. Try a different room code.');
          } else if (this.onError) {
            this.onError(err.message || 'Network error');
          }
        });

      } else {
        // Client connects to host peer ID
        this.peer = new Peer(peerOptions);

        this.peer.on('open', () => {
          const hostPeerId = this.getPeerIdForRoom(this.roomCode);
          const conn = this.peer.connect(hostPeerId, { reliable: true });

          this.hostConnection = conn;

          conn.on('open', () => {
            if (this.onConnected) this.onConnected(conn.peer);
          });

          conn.on('data', (data) => {
            this.handleIncomingMessage(data, 'host');
          });

          conn.on('close', () => {
            if (this.onError) this.onError('Disconnected from host.');
          });

          conn.on('error', (err) => {
            console.warn('Host connection error:', err);
            if (this.onError) this.onError('Failed to connect to host. Make sure the room code is correct.');
          });
        });

        this.peer.on('error', (err) => {
          console.warn('Client peer error:', err);
          if (this.onError) this.onError(err.message || 'Network error connecting');
        });
      }
    } catch (e) {
      console.warn('PeerJS init failed:', e);
    }
  }

  handleIncomingMessage(msg, senderId) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'SYNC_STATE') {
      // Received updated state from host
      if (!this.isHost && this.onStateReceived) {
        this.onStateReceived(msg.payload);
      }
    } else if (msg.type === 'ACTION') {
      // Host receives action from client
      if (this.isHost && this.onPlayerJoined) {
        this.onPlayerJoined(msg.action, senderId);
      }
    }
  }

  // Host broadcasts state to all connected peers & local tabs
  broadcastState(state) {
    const message = { type: 'SYNC_STATE', payload: state };

    // 1. Broadcast to all WebRTC client connections
    this.clientConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(message);
        } catch (e) {
          console.warn('Failed to send to client', e);
        }
      }
    });

    // 2. Broadcast to local tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // ignore
      }
    }
  }

  // Client sends an action to host
  sendActionToHost(action) {
    const message = { type: 'ACTION', action };

    // Send via WebRTC if open
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(message);
      } catch (e) {
        console.warn('Failed to send to host via P2P', e);
      }
    }

    // Also broadcast on local channel for instant multi-tab response
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // ignore
      }
    }
  }

  destroy() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
    }
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
    }
    this.clientConnections.forEach(conn => {
      try {
        conn.close();
      } catch {}
    });
    this.clientConnections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
    }
  }
}
