import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import useAuthStore from '../store/useAuthStore';
import { getSocket } from '../services/socket';
import './FloatingMessenger.css';

const FloatingMessenger = () => {
    const { 
        user, token, isAuthenticated, viewMode, 
        floatingChatOpen, setFloatingChatOpen, 
        floatingChatDismissed, setFloatingChatDismissed,
        setMsgUnreadCount, incrementMsgUnreadCount
    } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const isOpen = floatingChatOpen;
    const setIsOpen = setFloatingChatOpen;
    const isDismissed = floatingChatDismissed;
    const setIsDismissed = setFloatingChatDismissed;
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsDismissed(false);
        }
    }, [isOpen]);

    const isMessagePage = location.pathname === '/messages';

    const onMessageReceived = React.useCallback((msg) => {
        setMessages(prev => {
            const newId = msg.id || msg._id;
            const newTempId = msg.tempId;

            const exists = prev.some(m => 
                (newId && (m.id === newId || m._id === newId)) || 
                (newTempId && m.tempId === newTempId)
            );

            if (exists) {
                return prev.map(m => {
                    const isMatch = (newId && (m.id === newId || m._id === newId)) || 
                                    (newTempId && m.tempId === newTempId);
                    return isMatch ? msg : m;
                });
            }

            if (activeSession && msg.chatSessionId === activeSession.id) {
                return [...prev, msg];
            }
            return prev;
        });

        if (!isOpen || !activeSession || msg.chatSessionId !== activeSession.id) {
            setUnreadTotal(prev => prev + 1);
            incrementMsgUnreadCount();

            setSessions(prev => prev.map(s => 
                s.id === msg.chatSessionId 
                    ? { ...s, lastMessage: msg.content, unreadCount: (s.unreadCount || 0) + 1 }
                    : s
            ));
        }
    }, [activeSession, setMsgUnreadCount]);

    const initSocket = React.useCallback(() => {
        const socket = getSocket(token);
        socketRef.current = socket;
        socket.on('new_message', onMessageReceived);
    }, [token, onMessageReceived]);

    const fetchSessions = async () => {
        try {
            const isPro = viewMode === 'EXPERT';
            const endpoint = isPro 
                ? `/api/chat/sessions/pro/${user.id}` 
                : `/api/chat/sessions/user/${user.id}`;
            
            const response = await apiClient.get(endpoint);
            const data = response.data.data;
            setSessions(data);
            setUnreadTotal(data.reduce((sum, s) => sum + (s.unreadCount || 0), 0));
        } catch (err) {
            console.error('[FLOATING-CHAT] Session fetch failed');
        }
    };

    const fetchHistory = async (sessionId) => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/api/chat/${sessionId}/history`);
            setMessages(response.data.data);
            if (socketRef.current) {
                socketRef.current.emit('join_session', sessionId);
            }
        } catch (err) {
            console.error('[FLOATING-CHAT] History fetch failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !activeSession) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = {
            tempId,
            chatSessionId: activeSession.id,
            senderId: user.id,
            receiverId: viewMode === 'EXPERT' ? activeSession.userId : activeSession.professionalId,
            content: messageText,
            type: 'TEXT',
            timestamp: new Date().toISOString(),
            isPending: true
        };

        // Update UI immediately (Optimistic UI)
        setMessages(prev => [...prev, optimisticMsg]);
        const currentText = messageText;
        setMessageText('');

        const payload = { ...optimisticMsg };

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('send_message', payload, (ack) => {
                if (!ack || !ack.success) {
                    console.error('Failed to send message');
                    // Remove optimistic message on failure
                    setMessages(prev => prev.filter(m => m.tempId !== tempId));
                    setMessageText(currentText); // Restore text
                }
            });
        } else {
            console.error('Socket disconnected. Message not sent.');
            setMessages(prev => prev.filter(m => m.tempId !== tempId));
            setMessageText(currentText);
        }
    };

    const selectSession = (session) => {
        setActiveSession(session);
        fetchHistory(session.id);
        // Institutional Sync: Mark read and sync Global Tally
        apiClient.post(`/api/chat/${session.id}/read`).then(() => {
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, unreadCount: 0 } : s));
            setUnreadTotal(prev => Math.max(0, prev - (session.unreadCount || 0)));
            
            // Sync Global Navbar Dot
            apiClient.get('/api/chat/unread-count').then(res => {
                setMsgUnreadCount(res.data.data || 0);
            });
        }).catch(() => {});
    };

    useEffect(() => {
        if (isAuthenticated && !isMessagePage) {
            fetchSessions();
            initSocket();
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.off('new_message', onMessageReceived);
            }
        };
    }, [isAuthenticated, isMessagePage, onMessageReceived, initSocket]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);





    if (!isAuthenticated || isMessagePage || isDismissed) return null;

    return (
        <div className={`floating-messenger-wrap ${isOpen ? 'expanded' : 'collapsed'}`}>
            {isOpen ? (
                <div className="mini-chat-window">
                    <header className="mini-chat-header">
                        {activeSession ? (
                            <div className="header-back-title">
                                <button className="btn-mini-back" onClick={() => setActiveSession(null)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                </button>
                                <div className="mini-user-info">
                                    <span className="mini-name">{activeSession.otherPartyName}</span>
                                    <span className="mini-status">Active Consultation</span>
                                </div>
                                <button 
                                    className="btn-mini-full" 
                                    onClick={() => { navigate('/messages'); setIsOpen(false); }}
                                    title="Full Message Center"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                                </button>
                            </div>
                        ) : (
                            <span className="mini-header-text">Expert Consultations</span>
                        )}
                        <button className="btn-mini-close" onClick={() => setIsOpen(false)}>×</button>
                    </header>

                    <div className="mini-chat-body">
                        {activeSession ? (
                            <div className="mini-messages-list">
                                {loading ? (
                                    <div className="mini-loader">Synchronizing...</div>
                                ) : (
                                    <>
                                        {messages.map((msg, i) => (
                                            <div key={i} className={`mini-msg ${msg.senderId === user.id ? 'sent' : 'received'}`}>
                                                <div className="mini-msg-bubble">{msg.content}</div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="mini-session-list">
                                {sessions.length > 0 ? (
                                    sessions.map(s => (
                                        <div key={s.id} className="mini-session-item" onClick={() => selectSession(s)}>
                                            <div className="mini-avatar">{(s.otherPartyName || 'E').charAt(0)}</div>
                                            <div className="mini-session-info">
                                                <div className="mini-session-top">
                                                    <span className="mini-session-name">{s.otherPartyName}</span>
                                                    {s.unreadCount > 0 && <span className="mini-unread-badge">{s.unreadCount}</span>}
                                                </div>
                                                <p className="mini-last-msg">{s.lastMessage || 'Start consulting...'}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="mini-empty">No active consultations.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {activeSession && (
                        <footer className="mini-chat-footer">
                            <input 
                                type="text" 
                                placeholder="Type a message..." 
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="btn-mini-send" onClick={handleSendMessage}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </footer>
                    )}
                </div>
            ) : (
                <div className="messenger-trigger-group">
                    <button className={`messenger-trigger ${unreadTotal > 0 ? 'has-unread' : ''}`} onClick={() => setIsOpen(true)}>
                        <span className="trigger-icon">💬</span>
                        {unreadTotal > 0 && <span className="trigger-badge">{unreadTotal}</span>}
                    </button>
                    <button className="btn-dismiss-messenger" onClick={() => setIsDismissed(true)} title="Hide Widget">×</button>
                </div>
            )}
        </div>
    );
};

export default FloatingMessenger;
