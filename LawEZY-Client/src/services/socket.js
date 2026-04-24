import { io } from 'socket.io-client';

let socket = null;

export const getSocket = (token) => {
    if (socket && socket.connected) {
        return socket;
    }

    if (socket) {
        console.log('🔄 [SOCKET] Reusing existing socket instance...');
        return socket;
    }

    const messengerUrl = import.meta.env.VITE_MESSENGER_URL || 'http://localhost:8081';
    console.log('🔗 [SOCKET] Initializing new Institutional link at:', messengerUrl);
    
    socket = io(messengerUrl, {
        auth: { token },
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('🛡️ [SOCKET] Institutional link established');
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ [SOCKET] Technical link disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.error('❌ [SOCKET] Connection error:', err.message);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

