/**
 * Socket Compatibility Layer
 * 
 * This module provides a Socket.io-compatible API on top of the STOMP/SockJS
 * WebSocket connection to the Spring Boot backend. It allows all existing 
 * components (Messages, Notifications, Dashboard, etc.) to continue using
 * socket.on() / socket.emit() / socket.off() without changes.
 * 
 * MIGRATION: This replaces the direct Socket.io connection to the Node.js Messenger.
 * All real-time communication now goes through the Java Backend's /ws endpoint.
 */
import { getStompClient, subscribe, unsubscribe, sendMessage, isConnected, disconnectStomp, whenConnected } from './stompClient';

let socketInstance = null;
let userId = null;

/**
 * Creates a Socket.io-compatible wrapper around the STOMP client.
 * All existing code using socket.on('event', handler) will work unchanged.
 */
export const getSocket = (token) => {
    if (socketInstance && socketInstance.connected) {
        return socketInstance;
    }

    // Initialize the underlying STOMP connection
    const stomp = getStompClient(token);

    // Extract userId from token for subscription routing
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id || payload.sub;
    } catch (e) {
        console.error('[SOCKET-COMPAT] Failed to decode JWT:', e);
    }

    // Event listeners registry
    const listeners = {};

    // Build a Socket.io-compatible interface
    socketInstance = {
        get connected() {
            return isConnected();
        },

        /**
         * Register an event listener.
         * Maps Socket.io events to STOMP topic subscriptions.
         */
        on(event, handler) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);

            // Map Socket.io events to STOMP subscriptions
            whenConnected(() => {
                switch (event) {
                    case 'connect':
                        // Already connected by this point
                        handler();
                        break;

                    case 'new_message':
                        // Subscribe to all known session topics
                        // Individual session subscriptions happen via join_session
                        break;

                    case 'notification_received':
                    case 'new_notification':
                        if (userId) {
                            subscribe(`/topic/user/${userId}/notifications`, handler);
                        }
                        break;

                    case 'discovery_sync':
                        if (userId) {
                            subscribe(`/topic/user/${userId}/discovery`, handler);
                        }
                        break;

                    case 'quota_exhausted_alert':
                        if (userId) {
                            subscribe(`/topic/user/${userId}/quota`, handler);
                        }
                        break;

                    case 'chat_deleted':
                        // Will be subscribed per-session via join_session
                        break;

                    case 'disconnect':
                    case 'connect_error':
                    case 'error':
                        // These are handled by the STOMP client's built-in callbacks
                        break;

                    default:
                        console.log(`[SOCKET-COMPAT] Unhandled event registration: ${event}`);
                }
            });
        },

        /**
         * Remove an event listener.
         */
        off(event, handler) {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }

            // Unsubscribe from STOMP topics if no more listeners
            if (!listeners[event] || listeners[event].length === 0) {
                switch (event) {
                    case 'notification_received':
                    case 'new_notification':
                        if (userId) unsubscribe(`/topic/user/${userId}/notifications`);
                        break;
                    case 'discovery_sync':
                        if (userId) unsubscribe(`/topic/user/${userId}/discovery`);
                        break;
                    case 'quota_exhausted_alert':
                        if (userId) unsubscribe(`/topic/user/${userId}/quota`);
                        break;
                }
            }
        },

        /**
         * Emit an event.
         * Maps Socket.io emit calls to STOMP publish + subscribe patterns.
         */
        emit(event, data, callback) {
            switch (event) {
                case 'send_message':
                    // Send message via STOMP
                    const sent = sendMessage(data);
                    
                    if (sent && userId) {
                        // Listen for ack on the user's ack channel
                        // Use a one-time subscription pattern
                        const ackTopic = `/topic/user/${userId}/ack`;
                        const tempHandler = (ack) => {
                            // Match by tempId to ensure this is the right ack
                            if (ack.tempId === data.tempId || ack.chatSessionId === data.chatSessionId) {
                                if (callback) callback(ack);
                                // Don't unsubscribe - we need to keep listening for future acks
                            }
                        };
                        subscribe(ackTopic, tempHandler);
                    } else if (!sent && callback) {
                        callback({ success: false, error: 'Not connected' });
                    }
                    break;

                case 'join_session':
                    // Subscribe to the session's message topic
                    const sessionId = data;
                    if (sessionId) {
                        // Subscribe to messages for this session
                        subscribe(`/topic/session/${sessionId}`, (msg) => {
                            // Trigger all 'new_message' listeners
                            if (listeners['new_message']) {
                                listeners['new_message'].forEach(h => h(msg));
                            }
                        });

                        // Subscribe to deletion events for this session
                        subscribe(`/topic/session/${sessionId}/deleted`, (msg) => {
                            if (listeners['chat_deleted']) {
                                listeners['chat_deleted'].forEach(h => h(msg.sessionId || sessionId));
                            }
                        });
                    }
                    break;

                case 'join_room':
                    // User room for private notifications (already handled by userId subscriptions)
                    break;

                case 'delete_chat':
                    import('./stompClient').then(mod => mod.sendDeleteChat(data));
                    break;

                default:
                    console.log(`[SOCKET-COMPAT] Unhandled emit: ${event}`);
            }
        },

        /**
         * Disconnect and clean up.
         */
        disconnect() {
            disconnectStomp();
            socketInstance = null;
        }
    };

    return socketInstance;
};

/**
 * Disconnect the socket. Backward compatible with the old API.
 */
export const disconnectSocket = () => {
    disconnectStomp();
    socketInstance = null;
    userId = null;
};
