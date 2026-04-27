import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

let stompClient = null;
let subscriptions = {};
let onConnectCallbacks = [];
let isConnecting = false;

/**
 * Get or create a STOMP WebSocket connection to the Spring Boot backend.
 * This replaces the Socket.io connection to the separate Node.js Messenger.
 * 
 * The STOMP client connects via SockJS to /ws?token=JWT and uses:
 * - /app/chat.send → Send messages (replaces socket.emit('send_message'))
 * - /topic/session/{id} → Receive messages for a session (replaces socket.join + 'new_message')
 * - /topic/user/{id}/discovery → Discovery sync notifications
 * - /topic/user/{id}/ack → Message acknowledgements
 * - /topic/user/{id}/notifications → Push notifications
 */
export const getStompClient = (token) => {
    if (stompClient && stompClient.connected) {
        return stompClient;
    }

    if (isConnecting) {
        return stompClient;
    }

    isConnecting = true;

    // Connect to the Spring Boot backend (same origin or configured URL)
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const wsUrl = `${backendUrl}/ws?token=${encodeURIComponent(token)}`;

    stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl, null, { transports: ['xhr-streaming', 'xhr-polling'] }),
        connectHeaders: {
            Authorization: `Bearer ${token}`
        },
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: (str) => {
            // Only log non-heartbeat messages in development
            if (import.meta.env.DEV && !str.includes('heart-beat')) {
                console.log('[STOMP]', str);
            }
        },
        onConnect: () => {
            console.log('🛡️ [STOMP] Institutional link established');
            isConnecting = false;
            
            // Execute any pending callbacks
            onConnectCallbacks.forEach(cb => cb(stompClient));
            onConnectCallbacks = [];
        },
        onDisconnect: () => {
            console.warn('⚠️ [STOMP] Technical link disconnected');
            isConnecting = false;
        },
        onStompError: (frame) => {
            console.error('❌ [STOMP] Protocol error:', frame.headers?.message || 'Unknown');
            isConnecting = false;
        },
        onWebSocketError: (event) => {
            console.error('❌ [STOMP] WebSocket error:', event);
            isConnecting = false;
        }
    });

    stompClient.activate();
    return stompClient;
};

/**
 * Execute a callback when the STOMP client is connected.
 * If already connected, executes immediately.
 */
export const whenConnected = (callback) => {
    if (stompClient && stompClient.connected) {
        callback(stompClient);
    } else {
        onConnectCallbacks.push(callback);
    }
};

/**
 * Subscribe to a STOMP topic. Tracks subscriptions to prevent duplicates
 * and allow proper cleanup.
 * 
 * @param {string} topic - The STOMP destination (e.g., '/topic/session/abc123')
 * @param {function} callback - Handler for received messages
 * @returns {object} The subscription object (or null if not connected)
 */
export const subscribe = (topic, callback) => {
    if (!stompClient || !stompClient.connected) {
        // Queue subscription for when connection is ready
        whenConnected((client) => {
            doSubscribe(client, topic, callback);
        });
        return null;
    }
    return doSubscribe(stompClient, topic, callback);
};

const doSubscribe = (client, topic, callback) => {
    // Unsubscribe from existing subscription on same topic to prevent duplicates
    if (subscriptions[topic]) {
        try {
            subscriptions[topic].unsubscribe();
        } catch (e) { /* ignore */ }
    }

    const sub = client.subscribe(topic, (message) => {
        try {
            const body = JSON.parse(message.body);
            callback(body);
        } catch (e) {
            callback(message.body);
        }
    });

    subscriptions[topic] = sub;
    return sub;
};

/**
 * Unsubscribe from a specific topic.
 */
export const unsubscribe = (topic) => {
    if (subscriptions[topic]) {
        try {
            subscriptions[topic].unsubscribe();
        } catch (e) { /* ignore */ }
        delete subscriptions[topic];
    }
};

/**
 * Send a message via STOMP.
 * Replaces: socket.emit('send_message', data, callback)
 * 
 * @param {object} messagePayload - The message data
 */
export const sendMessage = (messagePayload) => {
    if (!stompClient || !stompClient.connected) {
        console.error('❌ [STOMP] Cannot send: Not connected');
        return false;
    }

    stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(messagePayload)
    });
    return true;
};

/**
 * Send a chat delete notification via STOMP.
 * Replaces: socket.emit('delete_chat', sessionId)
 */
export const sendDeleteChat = (sessionId) => {
    if (!stompClient || !stompClient.connected) return false;

    stompClient.publish({
        destination: '/app/chat.delete',
        body: JSON.stringify({ sessionId })
    });
    return true;
};

/**
 * Check if the STOMP client is currently connected.
 */
export const isConnected = () => {
    return stompClient && stompClient.connected;
};

/**
 * Disconnect the STOMP client and clean up all subscriptions.
 */
export const disconnectStomp = () => {
    // Clean up all subscriptions
    Object.keys(subscriptions).forEach(topic => {
        try {
            subscriptions[topic].unsubscribe();
        } catch (e) { /* ignore */ }
    });
    subscriptions = {};
    onConnectCallbacks = [];

    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
    isConnecting = false;
};
