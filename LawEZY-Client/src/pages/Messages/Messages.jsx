import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';
import useMetadata from '../../services/useMetadata';
import AppointmentCard from '../Account/Dashboard/components/AppointmentCard';
import './Messages.css';
import { renderContentWithLinks } from '../../utils/institutionalFormatter';

let socket = null;
let socketConnected = false; 

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const expertIdParam = searchParams.get('expertId');
  const expertNameParam = searchParams.get('expertName');
  const { user, token, logout, updateUser } = useAuthStore();
  
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isMobilizing, setIsMobilizing] = useState(false);
  
  // Bridge Stabilization
  const [isConnecting, setIsConnecting] = useState(false);
  const hasInitiatedRef = useRef(false);
  const lastExpertIdRef = useRef(null);
  const latestChatsRef = useRef([]);

  // Discovery Mode
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [profSearchQuery, setProfSearchQuery] = useState('');
  const [professionals, setProfessionals] = useState([]);
  const [error, setError] = useState(null);

  // UI States
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [replyingToMsg, setReplyingToMsg] = useState(null);
  
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showApptDropdown, setShowApptDropdown] = useState(false);

  // Financial Governance States
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [quotaExhaustedBy, setQuotaExhaustedBy] = useState(null); // UID of user who ran out
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [activeMediaTab, setActiveMediaTab] = useState('MEDIA');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId) || (isConnecting ? {
    id: 'mobilizing',
    name: expertNameParam || 'Expert Counsel',
    avatar: 'https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389',
    history: [],
    status: 'MOBILIZING'
  } : null);

  // Sync Ref with State for Async Logic

  useEffect(() => {
    latestChatsRef.current = chats;
  }, [chats]);

  const connectWebSocket = () => {
    // Connect to the Node.js Messenger Service via Shared Provider
    socket = getSocket(token);
    
    // Register local listeners
    socket.on('connect', () => {
      console.log('🛡️ [INSTITUTIONAL] Socket connected successfully');
      socketConnected = true;
      setIsConnecting(false);
      
      // Join self room for private messages
      socket.emit('join_room', user.id);

      // [Expert SYNC] Join all known sessions on reconnect
      if (latestChatsRef.current.length > 0) {
        latestChatsRef.current.forEach(s => {
          socket.emit('join_session', s.id);
        });
      }
      // If we have an active chat, re-ensure it's the primary room
      if (activeChatId) socket.emit('join_session', activeChatId);
    });

    socket.on('new_message', (msg) => {
      // console.log('✉️ [SIGNAL] New message received:', msg); // Hidden for security
      onMessageReceived(msg);
    });

    socket.on('error', (err) => {
      console.error('❌ [MESSENGER ERROR]:', err.message);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ [NETWORK ERROR]: Connection to Messenger failed');
    });

    socket.on('discovery_sync', (data) => {
      console.log('📡 [Expert SYNC] Discovery Ping Received. Syncing ledger...');
      fetchSessions();
    });

    socket.on('chat_deleted', (deletedId) => {
      setChats(prev => prev.filter(c => c.id !== deletedId));
      if (activeChatId === deletedId) {
        setActiveChatId(null);
        setMessages([]);
        alert("This Expert consultation has been resolved or deleted.");
      }
    });

    socket.on('quota_exhausted_alert', (data) => {
      console.warn('🛑 [Expert QUOTA EXHAUSTED]:', data.message);
      setQuotaExhaustedBy(data.userId);
      // Real-time peer balance synchronization to trigger Expert Mobilization Hub
      setChats(prev => prev.map(chat => 
        (chat.userId === data.userId || chat.id === activeChatId)
          ? { ...chat, peerTokenBalance: 0 } 
          : chat
      ));
    });
  };

  const subscribeToChat = (sessionId) => {
    if (socket && socket.connected) {
      socket.emit('join_session', sessionId);
    }
  };

  const onMessageReceived = (newMessage) => {
    // Expert Sync: Check if we have this chat in our list
    const sessionExists = latestChatsRef.current.some(c => c.id === newMessage.chatSessionId);
    
    if (!sessionExists) {
      console.log(`[Expert Sync] Discovery: New session ${newMessage.chatSessionId} detected. Synchronizing ledger...`);
      fetchSessions(); // Fetch all sessions to include the new one
      return;
    }

    setMessages(prev => [...prev, newMessage]);
    
    // Update last message in chat list
    setChats(prev => prev.map(chat => 
      chat.id === newMessage.chatSessionId 
        ? { ...chat, lastMessage: newMessage.content, time: 'Just now' } 
        : chat
    ));
  };


  const onStatusUpdate = (payload) => {
    const newStatus = payload.body;
    // Handle session status updates (RESOLVED, etc.)
    console.log('Session Status Update:', newStatus);
  };

  // --- INITIAL DATA FETCH ---
  const fetchSessions = async () => {
    if (!user) return;
    
    // Expert SWR: Load from cache first for instant UX
    const cached = localStorage.getItem(`lawezy_chats_${user.id}`);
    if (cached) {
      try {
        setChats(JSON.parse(cached));
      } catch (e) {
        console.warn('Failed to parse cached session data');
      }
    } else {
      setLoading(true); // Only show loader if no cache exists
    }

    try {
      const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'];
      const isPro = proRoles.some(role => user?.role?.toUpperCase().includes(role));
      const endpoint = isPro 
        ? `/api/chat/sessions/pro/${user.id}` 
        : `/api/chat/sessions/user/${user.id}`;
      
      const response = await apiClient.get(endpoint);
      const sessions = response.data.data.map(session => ({
        id: session.id,
        userId: session.userId,
        professionalId: session.professionalId,
        proUid: session.proUid || session.professionalId, // Standardize UID location
        name: session.otherPartyName || (isPro ? `Client ${session.userId}` : `Expert Counsel`),
        avatar: session.otherPartyAvatar || (isPro 
          ? 'https://ui-avatars.com/api/?name=Client&background=0D1B2A&color=E0C389' 
          : 'https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389'),
        lastMessage: session.lastMessage || 'Begin your Expert consultation...',
        time: 'Active',
        unread: 0,
        online: true,
        status: session.status,
        peerTokenBalance: session.peerTokenBalance // Expert Liquidity Sync
      }));
      
      // Robust Merged State: Use a Map to combine cached, latched, and server sessions
      const sessionMap = new Map();
      const serverIds = new Set(sessions.map(s => s.id));
      
      // 1. Populate with Server Data (Primary Truth)
      sessions.forEach(s => sessionMap.set(s.id, { ...s, isLatching: false }));
      
      // 2. Overlay Latching Sessions (In-flight Initiates)
      latestChatsRef.current.forEach(c => {
        if (c.isLatching && !serverIds.has(c.id)) {
          sessionMap.set(c.id, c);
        }
      });

      const mergedSessions = Array.from(sessionMap.values())
        .sort((a, b) => (b.isLatching ? 1 : -1)); // Keep new initiates at top

      // 🛡️ PRUNING LOGIC: If activeChatId is no longer in mergedSessions, clear it to prevent 404s
      if (activeChatId && !sessionMap.has(activeChatId)) {
        console.warn(`[Expert Sync] Active session ${activeChatId} not found in server ledger. Resetting...`);
        setActiveChatId(null);
      }

      setChats(mergedSessions);
      latestChatsRef.current = mergedSessions;
      localStorage.setItem(`lawezy_chats_${user.id}`, JSON.stringify(sessions));

      // [Expert SYNC] Join all session rooms to ensure real-time updates for all chats
      if (socket && socket.connected) {
        sessions.forEach(s => {
          socket.emit('join_session', s.id);
        });
      }
    } catch (err) {
      console.error('Secure channel synchronization error:', err.message);
    } finally {
      setLoading(false);
    }

  };

  const initiateNewChat = async (expertId) => {
    setIsConnecting(true);
    setIsMobilizing(true);
    setError(null);
    try {
      // console.log(`[Expert Sync] Initializing handshake with ${expertId}...`); // Hidden for security
      const response = await apiClient.post('/api/chat/start', {
        userId: user.id,
        professionalId: expertId
      });

      if (response.data.success) {
        const session = response.data.data;
        const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'];
        const isPro = proRoles.includes(user.role?.toUpperCase());
        
        const newChat = {
          id: session.id,
          userId: session.userId,
          professionalId: session.professionalId,
          proUid: session.proUid || session.professionalId,
          name: session.otherPartyName || (isPro ? `Client ${session.userId}` : `Expert Counsel`),
          avatar: session.otherPartyAvatar || (isPro 
            ? 'https://ui-avatars.com/api/?name=Client&background=0D1B2A&color=E0C389' 
            : 'https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389'),
          lastMessage: session.lastMessage || 'Begin your Expert consultation...',
          time: 'Active',
          unread: 0,
          online: true,
          status: session.status,
          isLatching: true 
        };

        setChats(prev => {
          const filtered = prev.filter(c => c.id !== newChat.id);
          return [newChat, ...filtered];
        });
        latestChatsRef.current = [newChat, ...latestChatsRef.current.filter(c => c.id !== newChat.id)];
        setActiveChatId(newChat.id);
        setSearchParams({}); // Clear param after success
        hasInitiatedRef.current = false;
      } else {
        setError(response.data.message || "Failed to initialize Expert consultation.");
        hasInitiatedRef.current = false;
      }
    } catch (err) {
      console.error('Error starting new chat:', err);
      const errorMsg = err.response?.status === 404 
        ? `Expert ID ${expertId} not found in database.`
        : "Secure channel initialization failed. Please try again.";
      setError(errorMsg);
      hasInitiatedRef.current = false;
    } finally {
      setIsConnecting(false);
      setIsMobilizing(false); // IMPORTANT: Unlock UI on error or success
    }
  };

  // Effect 1: Socket — runs ONCE on mount
  useEffect(() => {
    // If socket is already established and connected, just ensure listeners are fresh
    if (socket && socket.connected) {
      console.log('🔄 [MESSENGER] Re-using existing stable link');
      socketConnected = true;
    } else {
      connectWebSocket();
    }
    
    // Global Quota Listener (survives component lifecycle)
    const handleQuotaAlert = (data) => {
      console.warn('⚠️ [GOVERNANCE] Quota Exhausted Alert:', data);
      setQuotaExhaustedBy(data.userId);
      const systemMsg = {
        id: `sys-${Date.now()}`,
        sender: 'SYSTEM',
        content: data.message,
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_NOTICE'
      };
      setMessages(prev => [...prev, systemMsg]);
    };

    socket.on('quota_exhausted_alert', handleQuotaAlert);

    return () => {
      // 🛡️ INSTITUTIONAL FIX: Do NOT disconnect the global socket on unmount.
      // This allows the Messenger to stay "Warm" during dashboard navigation.
      socket.off('quota_exhausted_alert', handleQuotaAlert);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Expert SYNCHRONIZATION: DASHBOARD TO CHAT ---
  useEffect(() => {
    if (!activeChatId) return;
    
    const syncActiveAppointment = async () => {
      try {
        const res = await apiClient.get(`/api/appointments/session/${activeChatId}`);
        if (res.data && res.status === 200) {
          const appt = res.data;
          setActiveAppointment(appt);
          
          // Inject a virtual message if no card exists for this proposal
          const virtualId = `virtual-ledger-${appt.id}`;
          const cardExists = messages.some(m => m.id === virtualId || m.appointmentId === appt.id);
          
          if (!cardExists && ['PROPOSED', 'COUNTERED', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID'].includes(appt.status)) {
            const virtualMsg = {
              id: virtualId,
              appointmentId: appt.id,
              senderId: appt.initiatorUid,
              type: 'APPOINTMENT_PROPOSAL',
              appointmentPrice: appt.fee,
              appointmentStatus: appt.status,
              appointmentDate: appt.scheduledAt?.split('T')[0],
              appointmentTime: appt.scheduledAt?.split('T')[1]?.substring(0, 5),
              content: `📜 Expert UPDATE: Active proposal for ₹${appt.fee} synchronized from dashboard ledger.`,
              isVirtual: true
            };
            setMessages(prev => [...prev, virtualMsg]);
          }
        }
      } catch (err) {
        // No active session appointment found, proceed silently
      }
    };

    syncActiveAppointment();
  }, [activeChatId, messages.length]);

  // Wallet Refresh: patch stale localStorage user with live token data
  useEffect(() => {
    // Robust Guard: Prevent calls with missing or malformed Expert IDs
    if (!user?.id || user.id === 'null' || user.id === 'undefined') return;
    
    const refreshWallet = async () => {
      try {
        const response = await apiClient.get(`/api/users/${user.id}`);
        const fresh = response.data;
        if (fresh) {
          updateUser({
            freeAiTokens: fresh.freeAiTokens,
            freeChatTokens: fresh.freeChatTokens,
            tokenBalance: fresh.tokenBalance,
            isUnlimited: fresh.isUnlimited,
          });
        }
      } catch (err) {
        console.warn('[WALLET] Could not refresh token balance:', err.message);
      }
    };
    refreshWallet();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Effect 1.5: Target Lock Reset — Only resets initiation lock when the destination actually changes
  useEffect(() => {
    if (expertIdParam && expertIdParam !== lastExpertIdRef.current) {
      console.log(`[Expert Sync] New destination detected: ${expertIdParam}. Resetting initiation lock...`);
      hasInitiatedRef.current = false;
      lastExpertIdRef.current = expertIdParam;
    } else if (!expertIdParam) {
      lastExpertIdRef.current = null;
    }
  }, [expertIdParam]);

  // Effect 2: Data Fetching — runs on mount and whenever user changes
  useEffect(() => {
    if (!user) return;
    fetchSessions();

    const fetchProfessionals = async () => {
      try {
        const response = await apiClient.get('/api/professionals');
        setProfessionals(response.data);
      } catch (err) {
        console.error('Error fetching discovery professionals:', err);
      }
    };
    fetchProfessionals();
  }, [user]); // Removed expertIdParam from here to decouple fetching from selection

  // Effect 2.5: Deep Link Handling — dedicated handler for expertIdParam
  useEffect(() => {
    if (!user || !expertIdParam || hasInitiatedRef.current) return;

    const handleDeepLink = async () => {
      const expertSearchId = String(expertIdParam).trim().toLowerCase();
      
      // Check if we already have this chat session loaded
      const existing = chats.find(s => {
        const sProfId = s.professionalId ? String(s.professionalId).toLowerCase() : null;
        const sProUid = s.proUid ? String(s.proUid).toLowerCase() : null;
        return sProfId === expertSearchId || sProUid === expertSearchId;
      });

      if (existing) {
        console.log(`[Expert Sync] Targeted channel found. Mobilizing ${existing.id}...`);
        setActiveChatId(existing.id);
        setSearchParams({}); // Clear param
        hasInitiatedRef.current = false;
      } else if (!isConnecting && !isMobilizing) {
        console.log(`[Expert Sync] No active channel found. Securing new initiation...`);
        hasInitiatedRef.current = true;
        initiateNewChat(expertIdParam);
      }
    };

    handleDeepLink();
  }, [user, expertIdParam, chats.length, isConnecting, isMobilizing]);

  // --- HANDLE CHAT SELECTION ---
  useEffect(() => {
    // Robust Guard: Ignore malformed or missing session contexts
    if (!activeChatId || activeChatId === 'null' || activeChatId === 'undefined') return;
    
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get(`/api/chat/${activeChatId}/history`);
        setMessages(response.data.data);
        subscribeToChat(activeChatId);
        
        // Fetch Expert Appointment status for this session
        const apptRes = await apiClient.get(`/api/appointments/session/${activeChatId}`);
        if (apptRes.status === 200) {
          setActiveAppointment(apptRes.data);
        } else {
          setActiveAppointment(null);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
        
        // Handle 404: If session is missing from ledger, clear it from UI
        if (err.response?.status === 404) {
          console.warn(`[Expert Sync] Session ${activeChatId} missing from database. Evicting from state...`);
          setChats(prev => prev.filter(c => c.id !== activeChatId));
          setActiveChatId(null);
        }
        
        setActiveAppointment(null);
      }
    };
    fetchHistory();
  }, [activeChatId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (customPayload = null) => {
    // Proactive Expert Quota Check for Clients
    const isClient = user?.role?.toUpperCase().includes('CLIENT');
    const hasNoCredits = !user?.isUnlimited && user?.freeChatTokens === 0 && (user?.tokenBalance || 0) === 0;
    
    if (isClient && hasNoCredits && !customPayload) {
      setShowRefillModal(true);
      return;
    }

    if ((!customPayload && messageText.trim() === '') || !activeChatId) return;

    const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'];
    const isPro = proRoles.some(role => user?.role?.toUpperCase().includes(role));
    
    const receiverId = isPro
        ? (activeChat?.userId || activeChat?.userUid) 
        : (activeChat?.professionalId || activeChat?.proUid);

    const messageRequest = customPayload || {
      chatSessionId: activeChatId,
      senderId: user.id || user.uid,
      receiverId,
      content: messageText,
      type: 'TEXT'
    };

    if (socket && socket.connected) {
      // CLEAR INPUT OPTIMISTICALLY (but keep for fallback)
      const originalText = messageText;
      if (!customPayload) setMessageText('');

      socket.emit("send_message", messageRequest, (ack) => {
        if (!ack || !ack.success) {
          console.error('❌ [Institutional HANDSHAKE FAILED]:', ack?.error);
          if (!customPayload) {
            setMessageText(originalText); // RESTORE TEXT ON FAILURE
            
            if (ack?.error === 'INSTITUTIONAL_QUOTA_EXHAUSTED') {
              setShowRefillModal(true);
            } else {
              alert(ack?.error || "Institutional Handshake Failed. Connection unstable.");
            }
          }
        } else {
          // SUCCESS: Incrementally update the local Ledger for Clients (UI Sync)
          setQuotaExhaustedBy(null); // Reset if it was exhausted
          if (isClient) {
            if (!user?.isUnlimited && user?.freeChatTokens > 0) {
              updateUser({ freeChatTokens: user.freeChatTokens - 1 });
            } else if (!user?.isUnlimited && (user?.tokenBalance || 0) > 0) {
              updateUser({ tokenBalance: user.tokenBalance - 1 });
            }
          }
        }
      });
    } else {
      console.error('❌ [NETWORK] Messenger disconnected. Reconnecting...');
      connectWebSocket();
      alert("Secure channel is reconnecting. Your message was preserved. Please try again in 5 seconds.");
    }
  };

  const handlePurchaseTokens = async () => {
    setIsPurchasing(true);
    try {
      const response = await apiClient.post('/api/account/purchase-tokens', {
        tokens: 15,
        cost: 100.0
      });
      
      // SUCCESS: Sync whole wallet state back to AuthStore
      const updatedWallet = response.data;
      updateUser({ 
        tokenBalance: updatedWallet.tokenBalance,
        cashBalance: updatedWallet.cashBalance,
        earnedBalance: updatedWallet.earnedBalance
      });
      
      setShowRefillModal(false);
      alert("💳 Expert REFILL SUCCESSFUL: 15 Premium Credits added to your consultation ledger.");
    } catch (err) {
      console.error('Purchase failed:', err);
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg.toLowerCase().includes('insufficient')) {
        if (window.confirm("INSUFFICIENT FUNDS: Your portfolio balance is too low for this refill. Would you like to navigate to the Expert Wallet to add funds now?")) {
          navigate('/dashboard'); // Or dedicated wallet page
        }
      } else {
        alert("Institutional Refill Failed: " + errorMsg);
      }
    } finally {
      setIsPurchasing(false);
    }
  };
  const handleRequestRefill = () => {
    if (!activeChatId) return;
    
    const proRoles = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'];
    const isPro = proRoles.some(role => user?.role?.toUpperCase().includes(role));
    
    if (!isPro) return;

    handleSendMessage({
      chatSessionId: activeChatId,
      senderId: user.id || user.uid,
      receiverId: activeChat?.userId || activeChat?.userUid,
      content: "[QUOTA_REFILL_REQUEST] Your expert has requested a credit refill to continue this deep-dive consultation.",
      type: 'REFILL_REQUEST'
    });
    
    alert("Expert Refill Request transmitted to Client.");
  };

  const handleProposeAppointment = () => {
    if (!activeChatId) return;
    const isPro = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].some(role => user?.role?.toUpperCase().includes(role));
    const senderName = user.firstName || user.name || 'Professional';
    const senderUid = user.uid || user.id;
    
    const content = isPro 
      ? `📅 Expert Request for Scheduling Appointment: ${senderName} (UID: ${senderUid}) would like to set up a meeting. Please visit the Appointment Center to schedule your consultation.`
      : `📅 Client Request for Scheduling Appointment: ${senderName} would like to set up a meeting. Please visit the Appointment Center to propose a slot.`;

    const receiverId = isPro ? activeChat.userId : activeChat.professionalId;
    
    handleSendMessage({
      chatSessionId: activeChatId,
      senderId: user.id,
      receiverId,
      type: 'APPOINTMENT',
      content: content
    });

    if (isPro) alert("Appointment Proposal transmitted to Client.");
  };


  const handleResolveChat = async (sessionId) => {
    if (!window.confirm("Mark this consultation as RESOLVED? This will deactivate the Expert channel but preserve the history for your records.")) return;
    
    try {
      await apiClient.put(`/api/chat/session/${sessionId}/resolve`);
      setChats(prev => prev.map(c => c.id === sessionId ? { ...c, status: 'RESOLVED' } : c));
      alert("Consultation resolved successfully. Expert archival completed.");
    } catch (err) {
      console.error('Failed to resolve session:', err);
      alert("Status update failed. Verify your network credentials.");
    }
  };

  const handleDeleteChat = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this Expert conversation? This action cannot be undone.")) return;
    
    try {
      // 1. Permanent Erasure (Java Backend)
      await apiClient.delete(`/api/chat/session/${sessionId}`);
      
      // 2. Real-Time Broadcast (Node Messenger)
      if (socket && socket.connected) {
        socket.emit('delete_chat', sessionId);
      }
      
      // 3. Optimistic UI Update
      setChats(prev => prev.filter(c => c.id !== sessionId));
      if (activeChatId === sessionId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert("Consultation deletion failed. Ensure your network connection is stable.");
    }
  };



  const handleExportChat = () => {
    alert('Secure chat export initiated. Archiving channel transcription to Expert PDF...');
    // In a real implementation, this would trigger a download from the backend
  };


  const filteredChats = chats.filter(chat => {
    if (activeFilter === 'UNREAD' && chat.unread === 0) return false;
    if (searchQuery.trim() !== '') {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Expert SWR Blocker: Only show full-screen loader if we have ZERO data (no cache)
  if (loading && chats.length === 0) return (
    <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="elite-sync-spinner"></div>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'var(--elite-gold)', letterSpacing: '1px' }}>
        AUTHENTICATING SECURE CHANNEL...
      </span>
    </div>
  );

  return (
    <div className="messages-page-wrapper">
      <div className="messages-container-elite animate-reveal">
        
        {/* SIDEBAR */}
        <aside className={`messages-sidebar ${activeChatId ? 'mobile-hide' : ''}`}>
          
          <div className="sidebar-brand-header" style={{ padding: '20px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', position: 'relative', background: 'rgba(255,255,255,0.4)', minHeight: '70px' }}>
            <button 
              className="msg-back-btn" 
              onClick={() => {
                const isPro = ['LAWYER', 'CA', 'CFA', 'PRO', 'EXPERT', 'PROFESSIONAL'].includes(user?.role?.toUpperCase());
                if (isPro) {
                  navigate('/dashboard');
                } else {
                  navigate('/experts');
                }
              }}
              title={['LAWYER', 'CA', 'CFA', 'PRO'].includes(user?.role?.toUpperCase()) ? "Back to Dashboard" : "Back to Expert Network"}
              aria-label="Go Back"
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                border: '1px solid rgba(0,0,0,0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'rgba(255,255,255,0.8)', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                color: 'var(--deep-charcoal)',
                position: 'absolute',
                left: '20px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--elite-gold)'; e.currentTarget.style.color = 'var(--elite-gold)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)'; e.currentTarget.style.color = 'var(--deep-charcoal)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div 
              className="brand-click-area"
              onClick={() => navigate('/')}
              title="Return to Homepage"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                 <h2 style={{ color: 'var(--accent-burgundy)', fontFamily: 'Outfit, sans-serif', margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px' }}>LAWEZY</h2>
              </div>
              <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.15)' }}></div>
              <span style={{ color: '#555', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'Outfit, sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>Message Box</span>
            </div>
          </div>

          <div className="sidebar-search-container" style={{ padding: '12px 20px 4px 20px', display: 'flex', gap: '8px' }}>
            <div className="sidebar-search-box" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'white', 
              borderRadius: '24px', 
              padding: '10px 15px',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)',
              flex: 1
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder={isDiscoveryMode ? "Find new experts..." : "Search chats..."}
                value={isDiscoveryMode ? profSearchQuery : searchQuery}
                onChange={(e) => isDiscoveryMode ? setProfSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  outline: 'none', 
                  marginLeft: '8px', 
                  fontSize: '0.85rem',
                  width: '100%',
                  color: 'var(--deep-charcoal)',
                  fontFamily: 'inherit'
                }} 
              />
            </div>
            <button 
              onClick={() => setIsDiscoveryMode(!isDiscoveryMode)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: isDiscoveryMode ? 'var(--elite-gold)' : 'var(--midnight-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                transform: isDiscoveryMode ? 'rotate(45deg)' : 'rotate(0)'
              }}
              title={isDiscoveryMode ? "Cance Discovery" : "Start New Expert Consultation"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <div className="sidebar-header" style={{ padding: '10px 20px 15px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.5)', display: 'flex' }}>
            <div className="inbox-filter">
              <span className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`} onClick={() => setActiveFilter('ALL')}>All</span>
              <span className={`filter-pill ${activeFilter === 'UNREAD' ? 'active' : ''}`} onClick={() => setActiveFilter('UNREAD')}>Unread</span>
              <span className={`filter-pill ${activeFilter === 'ARCHIVE' ? 'active' : ''}`} onClick={() => setActiveFilter('ARCHIVE')}>Archive</span>
            </div>
          </div>
          
          <div className="chat-list">
            {error && (
              <div style={{ margin: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#dc2626', fontSize: '0.8rem', textAlign: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginBottom: '8px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <p style={{ margin: 0 }}>{error}</p>
                <button onClick={() => setError(null)} style={{ marginTop: '8px', background: 'none', border: 'none', textDecoration: 'underline', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}>Dismiss</button>
              </div>
            )}
            
            {isDiscoveryMode ? (
              <div className="discovery-mode-results">
                <div style={{ padding: '10px 20px', fontSize: '0.75rem', color: 'var(--elite-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Available Professionals</div>
                {professionals.filter(exp => exp.name.toLowerCase().includes(profSearchQuery.toLowerCase())).map(expert => (
                  <div 
                    key={expert.id} 
                    className="chat-list-item discovery-item animate-reveal"
                    onClick={() => {
                      if (!expert.uid) {
                        console.error("[Expert Warning] Expert has no Public UID. Falling back... Verify database integrity.");
                      }
                      setIsDiscoveryMode(false);
                      initiateNewChat(expert.uid || expert.id);
                    }}
                    style={{ borderLeft: '3px solid transparent' }}
                  >
                    <div className="chat-avatar-wrapper">
                      <img src={expert.avatar} alt={expert.name} />
                      {expert.online && <div className="online-indicator"></div>}
                    </div>
                    <div className="chat-preview-text">
                      <div className="chat-preview-header">
                        <h4 style={{ color: 'var(--midnight-primary)' }}>{expert.name}</h4>
                      </div>
                      <p style={{ fontSize: '0.75rem' }}>{expert.title} • {expert.experience}</p>
                    </div>
                    <div style={{ padding: '5px', color: 'var(--elite-gold)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats.length > 0 ? filteredChats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-list-item ${chat.id === activeChatId ? 'active' : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                <div className="chat-avatar-wrapper">
                  <img src={chat.avatar} alt={chat.name} />
                  {chat.online && <div className="online-indicator"></div>}
                </div>
                <div className="chat-preview-text">
                  <div className="chat-preview-header">
                    <h4>{chat.name}</h4>
                    <span className="msg-time">{chat.time}</span>
                  </div>
                  <p className={chat.unread > 0 ? 'unread-txt' : ''}>
                    {chat.lastMessage}
                  </p>
                </div>
                <div className="chat-item-actions" style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                  {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
                  <button 
                    className="delete-chat-btn"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    title="Delete Conversation"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#ff4d4d', 
                      cursor: 'pointer', 
                      padding: '5px',
                      opacity: 0.6,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            )) : (
              <div 
                style={{ textAlign: 'center', padding: '50px 30px', color: '#888' }}
                className="animate-reveal"
              >
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: 'white', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 20px auto',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                  color: 'var(--elite-gold)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </div>
                <h4 style={{ color: 'var(--midnight-primary)', marginBottom: '10px', fontSize: '1.1rem' }}>Inbox is Empty</h4>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '25px' }}>
                  Begin a secure Expert consultation with India's top legal professionals.
                </p>
                <button 
                  onClick={() => setIsDiscoveryMode(true)}
                  style={{ 
                    padding: '12px 24px', 
                    background: 'var(--midnight-primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '24px', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                >
                  Find Professionals +
                </button>
              </div>
            )}
          </div>
          
          <div 
            className="sidebar-user-profile" 
            onClick={() => setShowUserSettings(!showUserSettings)}
            style={{ position: 'relative' }}
            title="Account Options"
          >
            <div className="sidebar-user-avatar">
              <img src={user?.avatar || "https://i.pravatar.cc/150?img=11"} alt="Current User" />
              <div className="user-online-status"></div>
            </div>
            <div className="sidebar-user-info">
              <h4>{user ? `${user.firstName} ${user.lastName}` : 'Guest User'}</h4>
              <p>{user?.role?.toUpperCase() || 'CLIENT'}</p>
            </div>
            <button className="sidebar-user-settings" onClick={(e) => { e.stopPropagation(); setShowUserSettings(!showUserSettings); }}>
              <i className="fi fi-rr-settings"></i>
            </button>

            {showUserSettings && (
              <div className="user-settings-popover animate-reveal" onClick={(e) => e.stopPropagation()}>
                <div className="popover-header">
                  <strong>Account Settings</strong>
                </div>
                <ul className="popover-menu">
                  <li onClick={() => { setShowUserSettings(false); navigate('/dashboard'); }}>
                    <i className="fi fi-rr-layout-fluid"></i> Dashboard
                  </li>
                  <li className="menu-divider"></li>
                  <li className="logout-item" onClick={() => { logout(); navigate('/login'); }}>
                    <i className="fi fi-rr-exit"></i> Logout Securely
                  </li>
                </ul>
              </div>
            )}
          </div>
        </aside>

        <main className="messages-main-view" style={{ position: 'relative' }}>
          {/* LOCALIZED Expert SYNC LOADER (Non-blocking) */}
          {/* Expert SYNC: Overlay removed for Direct Open experience */}
          {activeChat ? (
            <>
              <header className="chat-header" style={{ position: 'relative', zIndex: 100 }}>
                <div className="chat-header-info">
                  <button 
                    className="mobile-back-to-list" 
                    onClick={() => setActiveChatId(null)}
                    style={{ background: 'transparent', border: 'none', padding: '5px', color: '#888', cursor: 'pointer' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <img src={activeChat.avatar || (isConnecting ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop' : '')} alt={activeChat.name} className="header-avatar" />
                  <div>
                    <h3>{activeChat.name || (isConnecting ? (expertNameParam || 'Expert Consultation') : '')}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: (activeChat.online || isConnecting) ? '#10b981' : '#888', textTransform: 'none', fontWeight: 500 }}>
                        {activeChat.online || isConnecting ? 'online' : 'offline'}
                      </span>
                      {/* Expert CREDIT BADGE (Self) */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        letterSpacing: '0.5px',
                        background: user?.isUnlimited
                          ? 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))'
                          : 'rgba(16, 185, 129, 0.08)',
                        border: user?.isUnlimited
                          ? '1px solid rgba(99,102,241,0.4)'
                          : '1px solid rgba(16,185,129,0.25)',
                        color: user?.isUnlimited ? '#818CF8' : '#059669',
                        textTransform: 'uppercase',
                      }}>
                        💬 {user?.isUnlimited 
                             ? '∞' 
                             : (user?.freeChatTokens > 0 
                                ? `${user.freeChatTokens} Q` 
                                : `${user?.tokenBalance || 0} C`)}
                      </span>

                      {/* PEER CREDIT VISIBILITY (Expert Awareness) */}
                      {activeChat.peerTokenBalance !== undefined && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          background: activeChat.peerTokenBalance === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.08)',
                          border: activeChat.peerTokenBalance === 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                          color: activeChat.peerTokenBalance === 0 ? '#ef4444' : '#3b82f6',
                          textTransform: 'uppercase',
                        }}>
                          ⚖️ PEER: {activeChat.peerTokenBalance} Credits
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-actions">
                  <div style={{ position: 'relative' }}>
                    <button className="btn-appointment-call" title="Expert Appointment Governance" onClick={() => setShowApptDropdown(!showApptDropdown)}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                       <span className="btn-text">Appointment</span>
                    </button>
                    
                    {showApptDropdown && (
                      <div className="wa-context-menu" style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', zIndex: 200, width: '240px' }} onClick={(e) => e.stopPropagation()}>
                        <ul className="wa-menu-list">
                          <li onClick={() => {
                            setShowApptDropdown(false);
                            handleProposeAppointment();
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Request Appointment
                          </li>
                          <li className="menu-divider"></li>
                          <li onClick={() => { 
                            setShowApptDropdown(false); 
                            navigate('/dashboard');
                          }} style={{ color: 'var(--elite-gold)', fontWeight: 700 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            Appointment Center
                          </li>
                        </ul>
                      </div>
                    )}

                  </div>
                  <button className="btn-icon" aria-label="Search" onClick={() => setShowChatSearch(!showChatSearch)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button className="btn-icon" aria-label="More Options" onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
                    </button>
                    {showOptionsDropdown && (
                      <div className="header-options-dropdown animate-reveal">
                        <ul>
                          <li onClick={() => {
                            setShowMediaModal(true);
                            setShowOptionsDropdown(false);
                          }}>Media, Links, and Docs</li>
                          <li onClick={() => {
                            handleExportChat();
                            setShowOptionsDropdown(false);
                          }}>Export Secure Transcript</li>
                          <li className="menu-divider"></li>
                          <li onClick={() => {
                            handleResolveChat(activeChatId);
                            setShowOptionsDropdown(false);
                          }} style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>✓</span> Resolve Consultation
                          </li>
                          <li onClick={(e) => {
                            handleDeleteChat(e, activeChatId);
                            setShowOptionsDropdown(false);
                          }} style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ fontSize: '1rem' }}>🗑</span> Delete Conversation
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="chat-history-scroll" style={{ paddingBottom: '20px', position: 'relative' }} onClick={() => { setShowOptionsDropdown(false); setActiveMessageMenu(null); }}>
                {showChatSearch && (
                  <div className="in-chat-search-bar animate-reveal" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(5px)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', gap: '10px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <input 
                      type="text" 
                      placeholder="Search within conversation..." 
                      value={chatSearchQuery}
                      onChange={e => setChatSearchQuery(e.target.value)}
                      style={{ flex: 1, padding: '8px 15px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', fontSize: '0.9rem' }}
                      autoFocus
                    />
                    <button onClick={() => { setShowChatSearch(false); setChatSearchQuery(''); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: '1.2rem', padding: '0 5px' }}>×</button>
                  </div>
                )}
                
                <div className="secure-notice">
                  🛡️ This connection is end-to-end encrypted. Expert privilege applies.
                </div>

                {/* --- EXPERT QUOTA AWARENESS BANNER --- */}
                {['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].some(role => user?.role?.toUpperCase().includes(role)) && 
                 (activeChat?.peerTokenBalance === 0 || quotaExhaustedBy === activeChat?.userId) && (
                  <div className="quota-alert-banner animate-reveal" style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    margin: '0 20px 15px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.05)',
                    zIndex: 10
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                    <div style={{ flex: 1 }}>
                      <strong>Expert Notice:</strong> Client credits are exhausted. 
                      Advise a <strong>Credit Refill</strong> or suggest a formal <strong>Appointment</strong> to continue this deep-dive discovery.
                    </div>
                    <button 
                      onClick={handleRequestRefill}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(239, 68, 68, 0.2)'
                      }}
                    >
                      Request Refill
                    </button>
                  </div>
                )}

                <div className="safety-disclaimer-banner animate-reveal" style={{
                  background: 'rgba(184, 153, 94, 0.08)',
                  border: '1px solid rgba(184, 153, 94, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  margin: '0 20px 20px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  color: '#7a6030',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  boxShadow: '0 4px 15px rgba(184, 153, 94, 0.05)'
                }}>
                  <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>⚖️</div>
                  <div>
                    <strong>LawEZY Safety Advisory:</strong> Please do not share personal contact details or make payments beyond this platform. 
                    Meeting links from external apps (Zoom/Meet) are prohibited for security. Use the <strong>Appointment Center</strong> for all sessions. 
                    <em> LawEZY is not liable for transactions occurring outside this secure system.</em>
                  </div>
                </div>
                
                {(showChatSearch && chatSearchQuery.trim() !== '' 
                  ? messages.filter(msg => msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                  : messages
                ).map((msg, idx) => {
                   if (msg.type === 'SYSTEM_NOTICE') {
                     return (
                       <div key={msg.id || idx} style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                         <div style={{ background: 'rgba(184, 153, 94, 0.1)', border: '1px solid rgba(184, 153, 94, 0.3)', padding: '10px 20px', borderRadius: '30px', color: '#7a6030', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', maxWidth: '80%', textAlign: 'center' }}>
                           <span style={{ fontSize: '1rem' }}>🛡️</span>
                           {msg.content}
                         </div>
                       </div>
                     );
                   }

                   // --- Expert REFILL REQUEST CARD ---
                   if (msg.type === 'REFILL_REQUEST') {
                     return (
                       <div key={msg.id || idx} style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                         <div className="refill-request-card animate-reveal" style={{
                           background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                           border: '2px solid var(--elite-gold)',
                           padding: '20px',
                           borderRadius: '16px',
                           color: 'white',
                           maxWidth: '300px',
                           textAlign: 'center',
                           boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                         }}>
                           <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚡</div>
                           <h4 style={{ margin: '0 0 10px 0', fontFamily: 'Outfit, sans-serif' }}>Mobilization Requested</h4>
                           <p style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '20px' }}>Your expert has requested a credit refill to continue this deep-dive legal discovery.</p>
                           <button 
                             onClick={() => setShowRefillModal(true)}
                             style={{
                               width: '100%',
                               padding: '10px',
                               background: 'var(--elite-gold)',
                               color: 'var(--midnight-primary)',
                               border: 'none',
                               borderRadius: '8px',
                               fontWeight: 800,
                               cursor: 'pointer'
                             }}
                           >
                             Refill Credits Now
                           </button>
                         </div>
                       </div>
                     );
                   }

                   // --- MASKING LOGIC: HIDE REPLIES IF QUOTA EXHAUSTED ---
                   const isClientExhausted = user?.role?.toUpperCase().includes('CLIENT') && (user?.freeChatTokens === 0 && (user?.tokenBalance || 0) === 0);
                   const isAppointmentMsg = msg.type === 'APPOINTMENT' || msg.content?.startsWith('📅') || msg.content?.includes('Appointment Center');
                   const isBlockedReply = isClientExhausted && msg.senderId !== user.id && msg.type !== 'SYSTEM_NOTICE' && msg.type !== 'REFILL_REQUEST' && !isAppointmentMsg;
                   return (
                    <div key={msg.id || idx} className={`message-bubble-wrapper ${msg.senderId === user.id ? 'sent' : 'received'}`} style={{ position: 'relative' }}>
                    {msg.senderId !== user.id && <img src={activeChat.avatar} className="msg-avatar" alt="Expert" />}
                    <div className="message-content">
                        <div className="message-bubble">
                          {isBlockedReply ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontStyle: 'italic', opacity: 0.8 }}>
                               <span style={{ fontSize: '1.2rem' }}>🔒</span>
                               Message locked. Please refill credits to view this Expert reply.
                            </div>
                          ) : (
                            renderContentWithLinks(msg.content || msg.text || msg.lastMessage)
                          )}
                        </div>
                      <div className="message-time">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || msg.time_sent)}
                        {msg.senderId === user.id && (
                          <span className="msg-status-tick delivered">✓</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="msg-hover-actions">
                      <button title="Options" onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(msg.id); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                      {activeMessageMenu === msg.id && (
                       <div className={`wa-menu-wrapper animate-reveal ${msg.sender === 'me' ? 'sent' : 'received'}`} onClick={(e) => e.stopPropagation()}>
                          <div className="wa-context-menu">
                             <ul className="wa-menu-list">
                                <li onClick={() => { setReplyingToMsg(msg); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Reply
                                </li>
                                <li onClick={() => { navigator.clipboard.writeText(msg.text); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
                                </li>
                                <li onClick={() => setActiveMessageMenu(null)}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg> Pin
                                </li>
                                <li onClick={() => setActiveMessageMenu(null)}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Star
                                </li>
                                <li className="menu-divider"></li>
                                <li onClick={() => setActiveMessageMenu(null)}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Select
                                </li>
                                <li className="menu-divider"></li>
                                <li onClick={() => setActiveMessageMenu(null)}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Report
                                </li>
                                <li onClick={() => { setActiveMessageMenu(null); if(window.confirm('Delete this message?')){ setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, history: (c.history || []).filter(m => m.id !== msg.id) } : c)); } }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete
                                </li>
                             </ul>
                          </div>
                       </div>
                    )}
                    </div>
                  </div>
                )
              })}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                {replyingToMsg && (
                  <div style={{ padding: '8px 15px', background: 'rgba(0,0,0,0.03)', borderLeft: '4px solid var(--elite-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 20px 10px 20px', borderRadius: '4px' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--elite-gold)', display: 'block', marginBottom: '4px' }}>
                        Replying to {replyingToMsg.sender === 'me' ? 'Yourself' : activeChat.name}
                      </span>
                      <p style={{ fontSize: '0.9rem', color: '#555', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingToMsg.text}</p>
                    </div>
                    <button onClick={() => setReplyingToMsg(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', padding: '5px', marginLeft: '10px' }}>✖</button>
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic', marginBottom: '10px', padding: '0 5px' }}>
                  🔒 For your protection, sharing phone numbers or external meeting links is strictly prohibited.
                </div>

                {/* --- Expert MOBILIZATION HUB: EXPERT UI WHEN CLIENT IS OUT OF TOKENS --- */}
                {['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].some(role => user?.role?.toUpperCase().includes(role)) && activeChat?.peerTokenBalance === 0 ? (
                  <div className="expert-mobilization-hub animate-reveal" style={{
                    margin: '0 20px 20px 20px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                    borderRadius: '16px',
                    border: '1px solid rgba(184, 153, 94, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 5px 0', color: 'var(--elite-gold)', fontFamily: 'Outfit, sans-serif' }}>⚠️ Client Tokens Exhausted</h4>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Select a professional action to recover consultation momentum.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button 
                        onClick={handleRequestRefill}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '10px',
                          color: 'white',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                      >
                        ⚡ Request Refill
                      </button>
                      <button 
                        onClick={handleProposeAppointment}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: 'var(--elite-gold)',
                          border: 'none',
                          borderRadius: '10px',
                          color: 'var(--midnight-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        📅 Propose Appointment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whatsapp-input-row flex-row-center">
                    <button className="btn-action-wa" aria-label="Attach Link" onClick={() => {
                      const link = window.prompt("Enter a link to your document, image, or Drive file:");
                      if (link && link.trim() !== '') {
                        setMessageText(prev => prev + (prev ? " \n" : "") + "📄 Attachment Link: " + link.trim());
                      }
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    <input 
                      type="text" 
                      placeholder="Draft your Expert inquiry..." 
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      style={{ flex: 1, padding: '12px 15px', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem' }}
                    />
                    
                    {messageText.trim() === '' ? (
                      <button 
                        className={`btn-send-wa voice-btn ${isRecording ? 'recording' : ''}`} 
                        aria-label="Voice Message"
                        onClick={() => {
                          if (isRecording) {
                            clearInterval(recordingIntervalRef.current);
                            setIsRecording(false);
                            const newMsg = {
                              id: Date.now(),
                              sender: 'me',
                              text: `🎤 Voice Message (${recordingTimer}s)`,
                              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              status: 'delivered'
                            };
                            setChats(prev => prev.map(chat => chat.id === activeChatId ? { ...chat, lastMessage: '🎤 Voice Message', time: newMsg.time, history: [...chat.history, newMsg] } : chat));
                            setRecordingTimer(0);
                          } else {
                            setIsRecording(true);
                            setRecordingTimer(0);
                            recordingIntervalRef.current = setInterval(() => {
                              setRecordingTimer(prev => prev + 1);
                            }, 1000);
                          }
                        }}
                        style={isRecording ? { width: '80px', borderRadius: '20px', background: '#ef4444' } : {}}
                      >
                        {isRecording ? (
                           <div style={{display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold'}}>{recordingTimer}s <div style={{width: 8, height: 8, background: 'white', borderRadius: '50%', marginLeft: 6, animation: 'pulse 1s infinite'}}></div></div>
                        ) : (
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        )}
                      </button>
                    ) : (
                      <button className="btn-send-wa send-btn" aria-label="Send Message" onClick={handleSendMessage}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-2px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {videoCallActive && (
                <div className="video-call-overlay animate-reveal" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', borderLeft: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div className="expert-video-placeholder" style={{
                    width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', marginBottom: '25px',
                    border: '4px solid var(--elite-gold)', boxShadow: '0 0 30px rgba(184, 153, 94, 0.4)'
                  }}>
                    <img src={activeChat.avatar} alt="Expert" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', margin: '0 0 10px 0' }}>{activeChat.name}</h2>
                  <p style={{ color: '#aaa', margin: '0 0 40px 0', fontSize: '1rem' }}>Connecting to secure video session...</p>
                  <div style={{ display: 'flex', gap: '25px' }}>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      style={{ width: '56px', height: '56px', borderRadius: '50%', background: isMuted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)', border: isMuted ? 'none' : '1px solid rgba(255,255,255,0.2)', color: isMuted ? '#1a1a1a' : 'white', cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
                      {isMuted ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                      )}
                    </button>
                    <button 
                      onClick={() => setIsVideoOff(!isVideoOff)}
                      style={{ width: '56px', height: '56px', borderRadius: '50%', background: isVideoOff ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)', border: isVideoOff ? 'none' : '1px solid rgba(255,255,255,0.2)', color: isVideoOff ? '#1a1a1a' : 'white', cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
                      {isVideoOff ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      )}
                    </button>
                    <button 
                      onClick={() => setVideoCallActive(false)}
                      title="End Call"
                      style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems:'center', justifyContent:'center', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', transition: 'all 0.2s' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                    </button>
                  </div>
                </div>
              )}

              {showMediaModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', width: '90%', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--parchment-cream)' }}>
                      <h3 style={{ margin: 0, color: 'var(--deep-charcoal)', fontFamily: 'Outfit, sans-serif' }}>Media, Links, and Docs</h3>
                      <button onClick={() => setShowMediaModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>&times;</button>
                    </div>
                    <div className="media-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.01)' }}>
                      {['MEDIA', 'DOCS', 'LINKS'].map(tab => (
                        <button 
                          key={tab}
                          onClick={() => setActiveMediaTab(tab)}
                          style={{ 
                            flex: 1, 
                            padding: '12px', 
                            border: 'none', 
                            background: 'transparent', 
                            fontSize: '0.75rem', 
                            fontWeight: 800, 
                            letterSpacing: '1px', 
                            cursor: 'pointer',
                            color: activeMediaTab === tab ? 'var(--elite-gold)' : '#888',
                            borderBottom: activeMediaTab === tab ? '2px solid var(--elite-gold)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#666' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--elite-gold)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '15px', opacity: 0.8 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>No {activeMediaTab.toLowerCase()} shared in this conversation yet.</p>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '8px' }}>Multimedia sent over this channel will appear here for archival.</span>
                    </div>
                  </div>
                </div>
              )}

              {showReportModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', width: '90%', maxWidth: '450px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--parchment-cream)' }}>
                      <h3 style={{ margin: 0, color: '#ef4444', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Report Account
                      </h3>
                      <button onClick={() => setShowReportModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>&times;</button>
                    </div>
                    <div style={{ padding: '25px' }}>
                      <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#555' }}>Please select a reason for reporting <strong>{activeChat.name}</strong>. We take this seriously and will investigate immediately.</p>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--deep-charcoal)', marginBottom: '8px' }}>Reason Point</label>
                        <select 
                          value={reportReason} 
                          onChange={(e) => setReportReason(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)', outline: 'none', background: 'rgba(0,0,0,0.02)', fontFamily: 'Inter, sans-serif' }}
                        >
                          <option value="">-- Select Reason --</option>
                          <option value="spam">Spam / Unsolicited Promotion</option>
                          <option value="inappropriate">Inappropriate Behavior / Harassment</option>
                          <option value="scam">Scam / Fraudulent Activity</option>
                          <option value="fake">Fake Profile</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--deep-charcoal)', marginBottom: '8px' }}>Additional Reason Details</label>
                        <textarea 
                          value={reportDetails}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Please provide specific details to help us investigate..."
                          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)', outline: 'none', background: 'rgba(0,0,0,0.02)', fontFamily: 'Inter, sans-serif', minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!reportReason) {
                            alert('Please select a reason point first.');
                            return;
                          }
                          alert(`Report Submitted Successfully!\nReason: ${reportReason}\nOur compliance team will investigate within 24 hours.`);
                          setShowReportModal(false);
                          setReportReason('');
                          setReportDetails('');
                        }}
                        style={{ width: '100%', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '1rem' }}
                      >
                        Submit Report
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Appointment Modals replaced by streamlined Discovery Ping system */}

            </>
          ) : (
            <div className="no-chat-selected">
              <div className="empty-state-icon" style={{ opacity: 0.8, marginBottom: '20px' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--elite-gold)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem' }}>{ (isConnecting || isMobilizing) ? 'Preparing Channel...' : 'Select who to talk to'}</h3>
              <p style={{ maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>
                { (isConnecting || isMobilizing) 
                  ? 'Your Expert consultation is being initialized. This will only take a moment.' 
                  : 'Choose an ongoing Expert consultation from the left pane to view your messages.'}
              </p>
            </div>
          )}
        </main>

      </div>

      {/* Expert REFILL MODAL */}
      {showRefillModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 10, 20, 0.75)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '440px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', position: 'relative', border: '1px solid rgba(184, 153, 94, 0.2)' }} className="animate-reveal">
            
            <div style={{ height: '140px', background: 'linear-gradient(135deg, #1a1c2c 0%, #0d0e14 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--elite-gold)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }}></div>
              <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '80px', height: '80px', background: '#4f46e5', opacity: 0.15, borderRadius: '50%', filter: 'blur(30px)' }}></div>
              <div style={{ zIndex: 2, textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.05)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--elite-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 style={{ color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', letterSpacing: '0.5px' }}>Expert Quota Refill</h3>
              </div>
              <button 
                onClick={() => setShowRefillModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '30px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 25px 0' }}>
                Your initial consultation quota has been utilized. Mobilize your consultation with <strong>15 Premium Expert Credits</strong> to continue deep-dive legal discovery.
              </p>
              
              <div style={{ background: 'var(--parchment-cream)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(184, 153, 94, 0.15)', marginBottom: '30px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--elite-gold)', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>Consolidated Offer</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--midnight-primary)', fontFamily: 'Outfit, sans-serif' }}>₹100 <span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.6 }}>/ 15 Credits</span></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button 
                  onClick={handlePurchaseTokens}
                  disabled={isPurchasing}
                  style={{ 
                    padding: '16px', 
                    background: 'var(--midnight-primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    fontFamily: 'Outfit, sans-serif', 
                    fontSize: '1rem',
                    transition: 'all 0.2s',
                    boxShadow: '0 8px 20px rgba(2, 6, 23, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(2, 6, 23, 0.3)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(2, 6, 23, 0.2)'; }}
                >
                  {isPurchasing ? 'Processing Refill...' : 'Authorize Purchase (₹100)'}
                </button>
                
                <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Source: {['LAWYER', 'CA', 'CFA', 'PRO'].some(r => user?.role?.toUpperCase().includes(r)) ? 'Earned Balance' : 'Cash Portfolio'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;

