import React, { useEffect } from 'react';
import { getSocket } from '../services/socket';
import useAuthStore from '../store/useAuthStore';
import useToastStore from '../store/useToastStore';

/**
 * 📡 Socket Notification Manager
 * A headless component that bridges real-time socket events to global Toast alerts.
 */
const SocketNotificationManager = () => {
    const { token, user } = useAuthStore();
    const { addToast } = useToastStore();

    useEffect(() => {
        if (!token || !user) return;

        const socket = getSocket(token);

        const handleNotification = (data) => {
            console.log('🔔 [TOAST] Real-time alert received:', data);
            
            // Map backend notification types to Toast types
            let toastType = 'info';
            if (data.type === 'PAYMENT' || data.type === 'FINANCIAL') toastType = 'payment';
            if (data.type === 'APPOINTMENT' || data.type === 'SESSION') toastType = 'appointment';
            
            addToast(data.message || data.body || 'New Institutional Alert', toastType);
        };

        socket.on('notification_received', handleNotification);
        socket.on('new_notification', handleNotification);

        return () => {
            socket.off('notification_received', handleNotification);
            socket.off('new_notification', handleNotification);
        };
    }, [token, user, addToast]);

    return null; // Headless component
};

export default SocketNotificationManager;
