import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import ReviewModal from '../Account/Dashboard/components/ReviewModal';
import useAuthStore from '../../store/useAuthStore';
import { getSocket } from '../../services/socket';
import useMetadata from '../../services/useMetadata';
import AppointmentCard from '../Account/Dashboard/components/AppointmentCard';
import './Messages.css';
import { renderContentWithLinks, redactPlain } from '../../utils/caseFormatter';

let socket = null;
let socketConnected = false; 

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const expertIdParam = searchParams.get('expertId');
  const expertNameParam = searchParams.get('expertName');
  const { user, token, logout, updateUser, viewMode } = useAuthStore();
  
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [replyingToMsg, setReplyingToMsg] = useState(null);
  
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showApptDropdown, setShowApptDropdown] = useState(false);

  // Financial Governance States
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeFee, setProposeFee] = useState(0);
  const [proposeData, setProposeData] = useState({ 
    reason: '', 
    slots: [{ date: '', time: '' }] 
  });
  const [quotaExhaustedBy, setQuotaExhaustedBy] = useState(null); // ID of user who ran out
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedRefillBlock, setSelectedRefillBlock] = useState(10);

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [activeMediaTab, setActiveMediaTab] = useState('MEDIA');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const recognitionRef = useRef(null);

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

  const onMessageReceived = React.useCallback((newMessage) => {
    // Expert Sync: Check if we have this chat in our list
    const sessionExists = latestChatsRef.current.some(c => c.id === newMessage.chatSessionId);
    
    if (!sessionExists) {
      console.log(`[Expert Sync] Discovery: New session ${newMessage.chatSessionId} detected. Synchronizing ledger...`);
      fetchSessions(); 
      return;
    }

    setMessages(prev => {
      // 1. Check for explicit ID match
      const idExists = prev.findIndex(m => m.id === newMessage.id);
      if (idExists !== -1) return prev; // Already handled

      // 2. Check for tempId match (Optimistic UI handshake)
      const tempIndex = prev.findIndex(m => m.tempId === newMessage.tempId);
      if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = { ...newMessage, isPending: false };
          return updated;
      }

      // 3. Fallback: Content & Sender matching for own messages (legacy/edge cases)
      if (newMessage.senderId === user?.id) {
          const pendingIndex = prev.findIndex(m => 
              m.isPending && m.senderId === user.id && m.content === newMessage.content
          );
          if (pendingIndex !== -1) {
              const updated = [...prev];
              updated[pendingIndex] = { ...newMessage, isPending: false };
              return updated;
          }
      }

      // 4. Fresh arrival from other party
      return [...prev, newMessage];
    });

    // Update session map for last message preview
    if (newMessage.chatSessionId) {
      setChats(prev => prev.map(chat => 
        chat.id === newMessage.chatSessionId 
          ? { ...chat, lastMessage: newMessage.content, lastMessageTime: 'Just now' }
          : chat
      ));
    }
  }, [activeChatId, user?.id]);


  const onStatusUpdate = (payload) => {
    const newStatus = payload.body;
    // Handle session status updates (RESOLVED, etc.)
    console.log('Session Status Update:', newStatus);
  };

  // --- INITIAL DATA FETCH ---
  const fetchSessions = async (silent = false) => {
    if (!user) return;
    
    // Expert SWR: Load from cache first for instant UX
    if (!silent && chats.length === 0) {
      const cached = localStorage.getItem(`lawezy_chats_${user.id}`);
      if (cached) {
        try {
          setChats(JSON.parse(cached));
        } catch (e) {
          console.warn('Failed to parse cached session data');
        }
      } else {
        setLoading(true);
      }
    }

    try {
      const isExpert = viewMode === 'EXPERT';
      const endpoint = isExpert ? `/api/chat/sessions/pro/${user.id}` : `/api/chat/sessions/user/${user.id}`;
      const response = await apiClient.get(endpoint);
      
      if (response.data && response.data.data) {
        const incoming = response.data.data;
        
        setChats(prev => {
            // [INSTITUTIONAL SYNC] Merge new data while preserving state of existing chats
            const merged = [...incoming];
            
            // Keep any "discovery" sessions that might not have hit the primary ledger yet
            prev.forEach(p => {
                if (!merged.find(m => m.id === p.id)) {
                    // If it was in prev but not in incoming, check if it's "new" (less than 1 minute old)
                    // This prevents flickering during race conditions
                    if (p.createdAt && (new Date() - new Date(p.createdAt)) < 60000) {
                        merged.push(p);
                    }
                }
            });
            return merged.sort((a, b) => new Date(b.lastUpdateAt || b.createdAt) - new Date(a.lastUpdateAt || a.createdAt));
        });
        
        localStorage.setItem(`lawezy_chats_${user.id}`, JSON.stringify(incoming));

        // [Expert SYNC] Join all session rooms to ensure real-time updates for all chats
        if (socket && socket.connected) {
          incoming.forEach(s => {
            socket.emit('join_session', s.id);
          });
        }
      }
    } catch (err) {
      console.error('❌ [SYNC ERROR] Failed to fetch institutional sessions:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const initiateNewChat = async (expertId) => {
    setIsConnecting(true);
    setIsMobilizing(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/chat/start', {
        userId: user.id,
        professionalId: expertId
      });

      if (response.data.success) {
        const session = response.data.data;
        const isPro = viewMode === 'EXPERT';
        
        const newChat = {
          id: session.id,
          userId: session.userId,
          professionalId: session.professionalId,
          name: session.otherPartyName || (isPro ? `Client ${session.userId}` : `Expert Counsel`),
          avatar: session.otherPartyAvatar || (isPro 
            ? 'https://ui-avatars.com/api/?name=Client&background=0D1B2A&color=E0C389' 
            : 'https://ui-avatars.com/api/?name=Expert&background=0D1B2A&color=E0C389'),
          lastMessage: session.lastMessage || 'Begin your Expert consultation...',
          time: session.status === 'EXPIRED' ? 'Expired' : (session.status === 'RESOLVED' || session.status === 'ENDED' ? 'Closed' : 'Active'),
          unread: 0,
          online: true,
          status: session.status,
          expiryTime: session.expiryTime,
          trialEnded: session.trialEnded,
          textChatFee: session.textChatFee,
          chatDurationMinutes: session.chatDurationMinutes,
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
      const backendError = err.response?.data?.message || err.response?.data?.error || err.message;
      const errorMsg = backendError 
        ? `Handshake Failed: ${backendError}`
        : err.response?.status === 404 
          ? `Expert ID ${expertId} not found in database.`
          : "Secure channel initialization failed. Please try again.";
      setError(errorMsg);
      // hasInitiatedRef.current = false; // [FIX] Do NOT reset lock on failure to prevent infinite loops.
    } finally {
      setIsConnecting(false);
      setIsMobilizing(false); // IMPORTANT: Unlock UI on error or success
    }
  };

  // --- CONSULTATION TICKER ENGINE ---
  useEffect(() => {
    if (!activeChat?.expiryTime) {
      setTimeLeft('');
      return;
    }

    const tick = () => {
      const expiry = new Date(activeChat.expiryTime);
      const now = new Date();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        // Trigger status refresh if it just expired
        if (activeChat.status !== 'EXPIRED') {
           setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, status: 'EXPIRED' } : c));
        }
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins} min ${secs} sec LEFT`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeChat?.expiryTime, activeChat?.id]);

  const connectWebSocket = useCallback(() => {
    // Connect to the Node.js Messenger Service via Shared Provider
    socket = getSocket(token);
    
    // Register local listeners
    socket.on('connect', () => {
      console.log('🛡️ [NETWORK] Socket connected successfully');
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

    socket.on('error', (err) => {
      console.error('❌ [MESSENGER ERROR]:', err.message);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ [NETWORK ERROR]: Connection to Messenger failed');
    });

    socket.on('chat_deleted', (deletedId) => {
      setChats(prev => prev.filter(c => c.id !== deletedId));
      if (activeChatId === deletedId) {
        setActiveChatId(null);
        setMessages([]);
        alert("This Expert consultation has been resolved or deleted.");
      }
    });
  }, [token, user.id, activeChatId]);

  // Voice-to-Text Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setMessageText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) recognitionRef.current.start();
      };
    }
  }, [isRecording]);

  // Effect: Global Socket Listeners with proper cleanup
  useEffect(() => {
    if (!socket) return;

    const handleQuotaExhausted = (data) => {
      console.warn('🛑 [Expert QUOTA EXHAUSTED]:', data.message);
      
      if (data.isTimeExpiry) {
          const alertMsg = {
              id: `alert-${Date.now()}`,
              type: 'SYSTEM_NOTICE',
              content: `⏳ SESSION EXPIRED: Your consultation window has concluded. Please unlock another block to continue.`,
              timestamp: new Date().toISOString(),
              isSystem: true
          };
          setMessages(prev => [...prev, alertMsg]);
          
          // Force active chat status refresh in list
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, status: 'EXPIRED' } : c));
          return;
      }

      setQuotaExhaustedBy(data.userId);
      
      // Update peer balance in chat list
      setChats(prev => prev.map(chat => 
        (chat.userId === data.userId || chat.id === activeChatId)
          ? { ...chat, peerTokenBalance: 0 } 
          : chat
      ));

      // Add system message to active chat if applicable
      const systemMsg = {
        id: `sys-${Date.now()}`,
        sender: 'SYSTEM',
        content: data.message,
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_NOTICE'
      };
      setMessages(prev => [...prev, systemMsg]);
    };

    socket.on('new_message', onMessageReceived);
    socket.on('discovery_sync', () => {
      console.log('📡 [Expert SYNC] Discovery Ping Received. Syncing ledger...');
      fetchSessions();
    });
    socket.on('quota_exhausted_alert', handleQuotaExhausted);

    return () => {
      socket.off('new_message', onMessageReceived);
      socket.off('discovery_sync');
      socket.off('quota_exhausted_alert', handleQuotaExhausted);
    };
  }, [socket, onMessageReceived, activeChatId]); 


  // Effect 1: Socket — runs ONCE on mount
  useEffect(() => {
    // If socket is already established and connected, just ensure listeners are fresh
    if (socket && socket.connected) {
      console.log('🔄 [MESSENGER] Re-using existing stable link');
      socketConnected = true;
    } else {
      connectWebSocket();
    }
    
    // Cleanup is handled by the state-aware effect and the global socket singleton behavior
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
              senderId: appt.initiatorId,
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
        // Institutional Guard: Silent failure for discovery to prevent UI disruption
        if (err.response?.status !== 404) {
          console.warn('[INSTITUTIONAL] Discovery Handshake failed. Dashboard ledger sync suspended.');
        }
        setActiveAppointment(null);
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
            cashBalance: fresh.cashBalance,
            isUnlimited: fresh.isUnlimited, aiLimit: fresh.aiLimit, docLimit: fresh.docLimit,
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
    // Robust Guard: Prevent initiation if user identity is missing or malformed
    if (!user?.id || user.id === 'null' || user.id === 'undefined' || !expertIdParam || hasInitiatedRef.current) return;

    const handleDeepLink = async () => {
      const expertSearchId = String(expertIdParam).trim().toLowerCase();
      
      // Check if we already have this chat session loaded
      const existing = chats.find(s => {
        const sProfId = s.professionalId ? String(s.professionalId).toLowerCase() : null;
        return sProfId === expertSearchId;
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
        
        // Institutional Sync: Mark messages as read on entry
        apiClient.post(`/api/chat/${activeChatId}/read`).catch(() => {});
        
        // Fetch Expert Appointment status for this session
        const apptRes = await apiClient.get(`/api/appointments/session/${activeChatId}`);
        if (apptRes.status === 200) {
          setActiveAppointment(apptRes.data);
        } else {
          setActiveAppointment(null);
        }
      } catch (err) {
        // Institutional Guard: If the session-link discovery fails with 500, we proceed with null appointment
        if (err.response?.status !== 404) {
          console.warn('[INSTITUTIONAL] Discovery Sync Failure for Session:', activeChatId);
        }
        
        // Handle 404: If session is missing from ledger, clear it from UI
        if (err.response?.status === 404) {
          console.warn(`[Expert Sync] Session ${activeChatId} missing from ledger. Verifying...`);
          // Graceful Eviction: Don't just wipe it, wait for a few retries or confirm via list
          const isExpert = viewMode === 'EXPERT';
          const endpoint = isExpert ? `/api/chat/sessions/pro/${user.id}` : `/api/chat/sessions/user/${user.id}`;
          const check = await apiClient.get(endpoint).catch(() => null);
          if (check && !check.data.data.find(c => c.id === activeChatId)) {
            setChats(prev => prev.filter(c => c.id !== activeChatId));
            setActiveChatId(null);
          }
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChatId) return;

    // Tactical Limit: 25MB (mirroring AI auditor governance)
    if (file.size > 25 * 1024 * 1024) {
      alert("Institutional Breach: File exceeds 25MB tactical limit.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await apiClient.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 200) {
        const { fileId, fileName, contentType, size, downloadUrl } = res.data;
        
        // Construct Attachment Payload
        const payload = {
          chatSessionId: activeChatId,
          senderId: user.id,
          receiverId: viewMode === 'EXPERT' ? activeChat.userId : activeChat.professionalId,
          content: `📄 Shared file: ${fileName}`,
          type: 'FILE_ATTACHMENT',
          fileMetadata: {
            fileId,
            fileName,
            contentType,
            size,
            downloadUrl
          }
        };

        handleSendMessage(payload);
      }
    } catch (err) {
      console.error('[FILE-UPLOAD] Failure:', err);
      alert("Institutional Upload Failed: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = (customPayload = null) => {
    // Proactive Consultation Window Check for Clients
    const isClient = user?.role?.toUpperCase().includes('CLIENT');
    const isExpired = (activeChat?.expiryTime && new Date(activeChat.expiryTime) < new Date()) || 
                      (activeChat?.trialEnded && !activeChat?.expiryTime && activeChat?.status === 'ACTIVE');
    
    if (isClient && isExpired && !customPayload) {
      setShowRefillModal(true);
      return;
    }

    const text = customPayload?.content || messageText;
    if ((!customPayload && text.trim() === '') || !activeChatId) return;

    const isPro = viewMode === 'EXPERT';
    const receiverId = isPro
        ? (activeChat?.userId) 
        : (activeChat?.professionalId);

    // BLOCK SELF-MESSAGING
    if (user.id === receiverId) {
      alert("Institutional Protocol: Self-messaging is restricted.");
      if (!customPayload) setMessageText('');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const messageRequest = customPayload || {
      tempId,
      chatSessionId: activeChatId,
      senderId: user.id,
      receiverId,
      content: text,
      type: 'TEXT',
      timestamp: new Date().toISOString(),
      isPending: true
    };

    // --- OPTIMISTIC UI: Update state immediately ---
    setMessages(prev => [...prev, messageRequest]);
    if (!customPayload) setMessageText('');

    if (socket && socket.connected) {
      socket.emit("send_message", messageRequest, (ack) => {
        if (!ack || !ack.success) {
          console.error('❌ [Institutional HANDSHAKE FAILED]:', ack?.error);
          // Rollback: Remove optimistic message and restore text
          setMessages(prev => prev.filter(m => m.tempId !== tempId));
          if (!customPayload) {
            setMessageText(text); 
            if (ack?.error === 'SESSION_EXPIRED' || ack?.error === 'INSTITUTIONAL_QUOTA_EXHAUSTED') {
              setShowRefillModal(true);
            } else {
              alert(ack?.error || "Institutional Handshake Failed. Connection unstable.");
            }
          }
        } else {
          // SUCCESS: Reset exhaustion state
          setQuotaExhaustedBy(null);
        }
      });
    } else {
      console.error('Socket disconnected. Cannot send.');
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      if (!customPayload) setMessageText(text);
      alert("Institutional Grid Offline. Reconnecting...");
    }
  };

  const handlePurchaseTokens = async (minutes = 10) => {

    if (!activeChatId) return;
    setIsPurchasing(true);
    try {
      // --- INSTITUTIONAL GOVERNANCE: TIME-BASED UNLOCK ---
      const response = await apiClient.post(`/api/chat/${activeChatId}/unlock?minutes=${minutes}`);
      
      if (response.data.success || response.status === 200) {
        setShowRefillModal(false);
        alert(`💳 Consultation Window Extended: ${minutes} Additional Minutes have been added to your session.`);
        
        // Refresh active chat to get new expiryTime
        fetchSessions();
        
        // Refresh wallet
        const walletRes = await apiClient.get('/api/wallet/balance');
        updateUser({ 
          cashBalance: walletRes.data.cashBalance,
          earnedBalance: walletRes.data.earnedBalance
        });
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg.includes('BALANCE_INSUFFICIENT')) {
        if (window.confirm("INSUFFICIENT FUNDS: Your portfolio balance is too low for this extension. Would you like to navigate to the Wallet to add funds now?")) {
          navigate('/dashboard'); 
        }
      } else {
        alert("Institutional Refill Failed: " + errorMsg);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleUnlockMessage = async (msgId) => {
    if (!activeChatId) return;
    
    try {
      // 1. Handshake with Backend to verify and execute unlock
      const response = await apiClient.post(`/api/chat/${activeChatId}/unlock`);
      
      if (response.data.success) {
        // 2. Success: Refresh session state and wallet
        alert("🔒 Expert Consultation Unlocked: 10 Premium Credits granted. Expert payout processed.");
        
        // Refresh messages to reflect unlocked state
        const historyRes = await apiClient.get(`/api/chat/${activeChatId}/history`);
        setMessages(historyRes.data.data);
        
        // Refresh wallet
        const walletRes = await apiClient.get(`/api/wallet/balance`);
        updateUser({ 
          tokenBalance: walletRes.data.tokenBalance,
          freeChatTokens: walletRes.data.freeChatTokens 
        });
        
        // Refresh sessions to update status in sidebar
        fetchSessions();
      }
    } catch (err) {
      console.error('Unlock failed:', err);
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg.includes('BALANCE_INSUFFICIENT') || errorMsg.includes('QUOTA')) {
        setShowRefillModal(true);
      } else {
        alert("Institutional Unlock Failed: " + errorMsg);
      }
    }
  };
  const handleRequestRefill = () => {
    if (!activeChatId) return;
    
    const isPro = viewMode === 'EXPERT';
    
    if (!isPro) return;

    handleSendMessage({
      chatSessionId: activeChatId,
      senderId: user.id || user.id,
      receiverId: activeChat?.userId,
      content: "[QUOTA_REFILL_REQUEST] Your expert has requested a credit refill to continue this deep-dive consultation.",
      type: 'REFILL_REQUEST'
    });
    
    alert("Expert Refill Request transmitted to Client.");
  };

  const handleProposeAppointment = () => {
    if (!activeChatId) return;
    const isPro = viewMode === 'EXPERT';
    
    if (isPro) {
      setProposeFee(user.consultationFee || 500);
      setShowProposeModal(true);
      return;
    }

    const senderName = user.firstName || user.name || 'Professional';
    const content = `📅 Client Request for Scheduling Appointment: ${senderName} would like to set up a meeting. Please visit the Dashboard to propose a slot.`;
    const receiverId = activeChat.professionalId;
    
    handleSendMessage({
      chatSessionId: activeChatId,
      senderId: user.id,
      receiverId,
      type: 'APPOINTMENT',
      content: content
    });
  };

  const submitFormalProposal = async () => {
    try {
      const payload = {
        clientId: activeChat.userId,
        expertId: user.id,
        initiatorId: user.id,
        baseFee: proposeFee,
        reason: proposeData.reason || "Institutional Consultation initiated via Chat.",
        chatSessionId: activeChatId,
        proposedSlot1: proposeData.slots[0] ? `${proposeData.slots[0].date}T${proposeData.slots[0].time}` : null,
        proposedSlot2: proposeData.slots[1] ? `${proposeData.slots[1].date}T${proposeData.slots[1].time}` : null,
        proposedSlot3: proposeData.slots[2] ? `${proposeData.slots[2].date}T${proposeData.slots[2].time}` : null,
      };

      // Set primary scheduledAt as the first slot
      payload.scheduledAt = payload.proposedSlot1;

      const res = await apiClient.post('/api/appointments/propose', payload);
      const appt = res.data;
      
      const totalFee = Math.round(proposeFee * 1.2 + 50);
      
      handleSendMessage({
        chatSessionId: activeChatId,
        senderId: user.id,
        receiverId: activeChat.userId,
        type: 'APPOINTMENT_PROPOSAL',
        appointmentId: appt.id,
        appointmentPrice: totalFee,
        slots: proposeData.slots, // Pass slots for immediate UI rendering
        content: `📅 FORMAL PROPOSAL: I have initiated an appointment proposal for ₹${totalFee} with multiple time options. Please visit your Dashboard to select a slot.`
      });

      alert("Institutional Proposal Dispatched.");
      setShowProposeModal(false);
      setProposeData({ reason: '', slots: [{ date: '', time: '' }] });
    } catch (err) {
      alert("Proposal failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleFinalizeSlot = async (apptId, index) => {
    try {
      await apiClient.post(`/api/appointments/${apptId}/finalize?slotIndex=${index}`);
      alert("Consultation time finalized successfully.");
      // The background sync effect will pick up the status change
    } catch (err) {
      alert("Finalization failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleStartFreshSession = async () => {
    if (!activeChat) return;
    
    const expertId = activeChat.professionalId;
    if (!expertId) {
      alert("Expert identity missing. Cannot restart session.");
      return;
    }

    if (!window.confirm("Start a fresh consultation with this expert? Your current session history will be preserved as a separate entry.")) return;

    try {
      setIsConnecting(true);
      setIsMobilizing(true);
      
      // 1. Resolve current session if not already resolved
      if (activeChat.status !== 'RESOLVED') {
        try {
          await apiClient.put(`/api/chat/session/${activeChatId}/resolve`);
        } catch (resolveErr) {
          console.warn("Soft resolution skip:", resolveErr);
        }
      }
      
      // 2. Initiate new session
      const response = await apiClient.post('/api/chat/start', {
        userId: user.id,
        professionalId: expertId
      });

      if (response.data.success) {
        const session = response.data.data;
        alert("New consultation channel secured. You may now begin a fresh interaction.");
        
        // 3. Refresh list and activate new chat
        await fetchSessions();
        setActiveChatId(session.id);
      } else {
        alert(response.data.message || "Failed to initialize new Expert consultation.");
      }
    } catch (err) {
      console.error('Error restarting session:', err);
      alert("Institutional Restart Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsConnecting(false);
      setIsMobilizing(false);
    }
  };

  const handleClientEndChat = async () => {
    if (!activeChatId) return;
    
    const confirmMsg = activeAppointment 
      ? "End this consultation and release payment to the expert? You will be asked for a rating."
      : "End this consultation session? Your history will be preserved.";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsFinishing(true);
      
      if (activeAppointment) {
        // If there's an appointment, show the review modal
        setShowReviewModal(true);
      } else {
        // If just a trial, resolve the session directly
        await handleResolveChat(activeChatId);
        alert("Session ended. Thank you for using LawEZY.");
      }
    } catch (err) {
      console.error("Failed to end session:", err);
      alert("Institutional Sync Failure: Could not close session. Please try again.");
    } finally {
      setIsFinishing(false);
    }
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
      // Graceful Eviction: Don't just wipe it, wait for a few retries or confirm via list
      const isExpert = viewMode === 'EXPERT';
      const endpoint = isExpert ? `/api/chat/sessions/pro/${user.id}` : `/api/chat/sessions/user/${user.id}`;
      const check = await apiClient.get(endpoint).catch(() => null);
      if (check && !check.data.data.find(c => c.id === sessionId)) {
          setChats(prev => prev.filter(c => c.id !== sessionId));
          if (activeChatId === sessionId) setActiveChatId(null);
      }
      alert("Consultation deletion failed. Ensure your network connection is stable.");
    }
  };



  const handleExportChat = () => {
    alert('Secure chat export initiated. Archiving channel transcription to Expert PDF...');
    // In a real implementation, this would trigger a download from the backend
  };


  const filteredChats = chats.filter(chat => {
    // Safety Filtering: Hide blocked/disabled accounts
    if (chat.isOtherPartyEnabled === false) return false;

    if (activeFilter === 'UNREAD' && chat.unread === 0) return false;
    if (searchQuery.trim() !== '') {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Expert SWR Blocker: Only show full-screen loader if we have ZERO data (no cache)
  if (loading && chats.length === 0) return (
    <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff' }}>
      <div className="elite-sync-spinner"></div>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, color: 'var(--accent-burgundy)', letterSpacing: '1px', display: 'block', fontSize: '0.9rem' }}>
          VERIFYING INSTITUTIONAL CREDENTIALS...
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#64748b', marginTop: '8px', display: 'block' }}>
          Synchronizing secure message ledger from the LawEZY cloud.
        </span>
      </div>
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
                const isPro = viewMode === 'EXPERT';
                if (isPro) {
                  navigate('/dashboard');
                } else {
                  navigate('/experts');
                }
              }}
              title={viewMode === 'EXPERT' ? "Back to Dashboard" : "Back to Expert Network"}
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
                      if (!expert.id) {
                        console.error("[Expert Warning] Expert has no ID. Falling back... Verify database integrity.");
                      }
                      setIsDiscoveryMode(false);
                      initiateNewChat(expert.id || expert.id);
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
                    {redactPlain(chat.lastMessage)}
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
                {messages.some(m => m.isSelected) ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 20px', zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <button className="btn-icon" onClick={() => setMessages(prev => prev.map(m => ({...m, isSelected: false})))}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                      <span style={{ fontSize: '1.2rem', fontWeight: '500' }}>{messages.filter(m => m.isSelected).length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button className="btn-icon" title="Star Selected" onClick={() => {
                        const isAllStarred = messages.filter(m => m.isSelected).every(m => m.isStarred);
                        setMessages(prev => prev.map(m => m.isSelected ? { ...m, isStarred: !isAllStarred, isSelected: false } : m));
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </button>
                      <button className="btn-icon" title="Delete Selected" onClick={() => {
                        const selectedCount = messages.filter(m => m.isSelected).length;
                        if (window.confirm(`Delete ${selectedCount} message${selectedCount > 1 ? 's' : ''}?`)) {
                          setMessages(prev => prev.filter(m => !m.isSelected));
                        }
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                      <button className="btn-icon" title="Copy Selected" onClick={() => {
                        const textToCopy = messages.filter(m => m.isSelected).map(m => m.content).join('\n\n');
                        navigator.clipboard.writeText(textToCopy);
                        setMessages(prev => prev.map(m => ({...m, isSelected: false})));
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                        background: 'rgba(184, 153, 94, 0.08)',
                        border: '1px solid rgba(184, 153, 94, 0.25)',
                        color: 'var(--elite-gold)',
                        textTransform: 'uppercase',
                      }}>
                        🔒 TIME-BASED CONSULTATION
                      </span>

                      {/* PEER STATUS */}
                      {activeChat.status && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '0.6rem',
                          fontWeight: 900,
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          textTransform: 'uppercase',
                        }}>
                          ⚖️ STATUS: {activeChat.status}
                        </span>
                      )}

                      {/* SESSION EXPIRY TIMER */}
                      {activeChat.expiryTime && (
                        <div className="session-timer-badge animate-reveal" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}>
                          <span className="timer-icon">⏳</span>
                          <span className="timer-text">
                            {timeLeft || 'EXPIRED'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-header-actions flex-row-center">
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    
                    {activeAppointment && activeAppointment.status === 'PAID' && activeAppointment.roomId && (
                      <button 
                        className="btn-join-consultation animate-reveal" 
                        onClick={() => {
                          const baseJoinUrl = `https://meet.jit.si/${activeAppointment.roomId}`;
                          const isPro = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].some(role => user?.role?.toUpperCase().includes(role));
                          const userName = user?.displayName || (isPro ? "Professional Expert" : "LawEZY Client");
                          
                          // 🛡️ ROLE-BASED ROOM GOVERNANCE
                          // Expert: Bypasses pre-join, manages lobby
                          // Client: Enters lobby, awaits expert admission
                          const rolespec = isPro 
                              ? `#config.prejoinPageEnabled=false&config.enableLobby=true&config.startWithAudioMuted=false&userInfo.displayName="${userName}"` 
                              : `#config.prejoinPageEnabled=true&config.enableLobby=true&config.startWithAudioMuted=true&userInfo.displayName="${userName}"`;
                          
                          window.open(baseJoinUrl + rolespec, '_blank');
                        }}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                          fontFamily: 'Outfit, sans-serif'
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>🎥</span> JOIN SECURE CONSULTATION
                      </button>
                    )}

                    {viewMode === 'CLIENT' && activeChat?.status !== 'RESOLVED' && (
                      <button 
                        className="btn-end-consultation animate-reveal" 
                        onClick={handleClientEndChat}
                        disabled={isFinishing}
                        style={{
                          background: 'rgba(220, 38, 38, 0.08)',
                          color: '#dc2626',
                          border: '1px solid rgba(220, 38, 38, 0.2)',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginRight: '10px',
                          cursor: 'pointer',
                          fontFamily: 'Outfit, sans-serif',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'; e.currentTarget.style.color = '#dc2626'; }}
                      >
                        <span style={{ fontSize: '0.9rem' }}>🛑</span> END SESSION
                      </button>
                    )}

                    <button className="btn-icon" aria-label="Appointments" onClick={async () => {
                      if (!showApptDropdown && activeChatId) {
                        try {
                          const apptRes = await apiClient.get(`/api/appointments/session/${activeChatId}`);
                          if (apptRes.status === 200) setActiveAppointment(apptRes.data);
                          else if (apptRes.status === 204) setActiveAppointment(null);
                        } catch (err) { console.error("Sync error:", err); }
                      }
                      setShowApptDropdown(!showApptDropdown);
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {activeAppointment && <div style={{ position: 'absolute', top: '0', right: '0', width: '10px', height: '10px', background: activeAppointment.status === 'PAID' ? '#10b981' : '#f59e0b', borderRadius: '50%', border: '2px solid white' }}></div>}
                    </button>
                    
                    {showApptDropdown && (
                      <div className="wa-context-menu" style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', zIndex: 200, width: '260px', padding: '5px' }} onClick={(e) => e.stopPropagation()}>
                         {viewMode === 'CLIENT' && (
                           <div style={{ padding: '12px 15px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '5px' }}>
                             <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Session Status</span>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeAppointment ? (activeAppointment.status === 'PAID' ? '#10b981' : '#f59e0b') : '#94a3b8' }}></div>
                               <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                                 {activeAppointment ? activeAppointment.status.replace('_', ' ') : 'NO APPOINTMENT LINKED'}
                               </span>
                             </div>
                             {!activeAppointment && (
                               <p style={{ margin: '5px 0 0 0', fontSize: '0.65rem', color: '#888', fontStyle: 'italic' }}>
                                 Propose a formal session to enable video consultation features.
                               </p>
                             )}
                           </div>
                         )}
                         <ul className="wa-menu-list">
                           {activeAppointment && activeAppointment.status === 'PAID' && activeAppointment.roomId && (
                             <li onClick={() => {
                               setShowApptDropdown(false);
                               const baseUrl = "https://meet.jit.si/";
                               const isPro = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL'].some(role => user?.role?.toUpperCase().includes(role));
                               const config = isPro 
                                 ? "#config.prejoinPageEnabled=false&interfaceConfig.DISABLE_FOCUS_INDICATOR=true"
                                 : "#config.enableLobby=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true";
                               const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.displayName || 'LawEZY User';
                               const finalUrl = `${baseUrl}${activeAppointment.roomId}${config}&userInfo.displayName="${encodeURIComponent(displayName)}"`;
                               window.open(finalUrl, '_blank');
                             }} style={{ color: '#10b981', fontWeight: 800 }}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M15.6 11.6L22 7v10l-6.4-4.6z"></path><rect x="2" y="5" width="12" height="14" rx="2" ry="2"></rect></svg>
                               Join Secure Consultation
                             </li>
                           )}

                           {viewMode === 'CLIENT' && (activeChat?.status === 'RESOLVED' || (activeChat?.expiryTime && new Date(activeChat.expiryTime) < new Date())) && (
                             <li onClick={() => { setShowApptDropdown(false); handleStartFreshSession(); }} style={{ color: 'var(--elite-gold)', fontWeight: 800 }}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                               Start Fresh Session
                             </li>
                           )}

                           {viewMode === 'EXPERT' && (
                             <li onClick={() => {
                               setShowApptDropdown(false);
                               handleProposeAppointment();
                             }}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                               Offer Appointment
                             </li>
                           )}

                           <li className="menu-divider"></li>
                           <li onClick={() => { 
                             setShowApptDropdown(false); 
                             navigate('/dashboard');
                           }} style={{ color: 'var(--elite-gold)', fontWeight: 700 }}>
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                             Dashboard
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
                  </>
                )}
              </header>

              <div className="safety-disclaimer-banner animate-reveal" style={{
                background: 'rgba(184, 153, 94, 0.08)',
                border: '1px solid rgba(184, 153, 94, 0.2)',
                borderRadius: '10px',
                padding: '10px 20px',
                margin: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                color: '#7a6030',
                fontSize: '0.75rem',
                lineHeight: '1.4',
                boxShadow: '0 4px 15px rgba(184, 153, 94, 0.05)',
                zIndex: 10
              }}>
                <div style={{ fontSize: '1.4rem', opacity: 0.8 }}>⚖️</div>
                <div style={{ flex: 1 }}>
                  <strong>LawEZY Safety Advisory:</strong> Please do not share personal contact details or make payments beyond this platform. 
                  Meeting links from external apps (Zoom/Meet) are prohibited for security. Use the <strong>Dashboard</strong> for all sessions. 
                  <em> LawEZY is not liable for transactions occurring outside this secure system.</em>
                </div>
              </div>

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
                 (activeChat?.trialEnded || quotaExhaustedBy === activeChat?.userId) && (
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

                    // --- Expert APPOINTMENT PROPOSAL CARD ---
                    if (msg.type === 'APPOINTMENT_PROPOSAL') {
                      const displaySlots = msg.slots || (msg.appointmentDate ? [{ date: msg.appointmentDate, time: msg.appointmentTime }] : []);
                      const isClient = !['LAWYER', 'CA', 'CFA', 'PROFESSIONAL', 'PRO'].some(role => user?.role?.toUpperCase().includes(role));

                      return (
                        <div key={msg.id || idx} style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '25px 0' }}>
                          <div className="proposal-card animate-reveal" style={{
                            background: '#ffffff',
                            border: '1px solid rgba(184, 153, 94, 0.3)',
                            borderTop: '4px solid var(--elite-gold)',
                            padding: '24px',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '380px',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📅</div>
                            <h4 style={{ margin: '0 0 5px 0', fontFamily: 'Outfit, sans-serif', color: 'var(--midnight-primary)', fontSize: '1.1rem' }}>Consultation Proposal</h4>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '20px' }}>Total Fee: <strong style={{ color: 'var(--elite-gold)' }}>₹{msg.appointmentPrice}</strong></div>
                            
                            <div style={{ background: 'rgba(184, 153, 94, 0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Proposed Time Slots</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {displaySlots.map((slot, sIdx) => (
                                        <div key={sIdx} style={{ 
                                            padding: '8px 12px', 
                                            background: 'white', 
                                            border: '1.5px solid rgba(184, 153, 94, 0.2)', 
                                            borderRadius: '10px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'var(--midnight-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '10px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ opacity: 0.6 }}>🕒</span> {new Date(slot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {slot.time}
                                            </div>
                                            {isClient && (
                                              <button 
                                                onClick={() => handleFinalizeSlot(msg.appointmentId, sIdx + 1)}
                                                style={{
                                                  padding: '4px 10px',
                                                  background: 'var(--midnight-primary)',
                                                  color: 'var(--elite-gold)',
                                                  border: 'none',
                                                  borderRadius: '6px',
                                                  fontSize: '0.65rem',
                                                  fontWeight: 800,
                                                  cursor: 'pointer'
                                                }}
                                              >
                                                SELECT
                                              </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isClient ? (
                                <button 
                                  onClick={() => navigate('/dashboard')}
                                  style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--midnight-primary)',
                                    color: 'var(--elite-gold)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 12px rgba(13, 27, 42, 0.2)'
                                  }}
                                >
                                  Finalize on Dashboard
                                </button>
                            ) : (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Waiting for client to finalize selection...
                                </div>
                            )}
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

                    // --- MASKING LOGIC: HIDE REPLIES IF EXPLICITLY LOCKED BY GOVERNANCE ---
                    const isAppointmentMsg = msg.type === 'APPOINTMENT' || msg.content?.startsWith('📅') || msg.content?.includes('Dashboard');
                    const isExplicitlyLocked = msg.isLocked === true;
                    
                    // [INSTITUTIONAL FIX] Transparency Directive: 
                    // We only mask if explicitly locked for monetization. 
                    // Expiry (time-over) should NOT hide past messages.
                    const isBlockedReply = isExplicitlyLocked && msg.senderId !== user.id && msg.type !== 'SYSTEM_NOTICE' && msg.type !== 'REFILL_REQUEST' && !isAppointmentMsg;
                   return (
                    <div key={msg.id || idx} className={`message-bubble-wrapper ${msg.senderId === user.id ? 'sent' : 'received'}`} style={{ position: 'relative', background: msg.isSelected ? 'rgba(184, 153, 94, 0.15)' : 'transparent', padding: msg.isSelected ? '8px' : '0', margin: msg.isSelected ? '-8px' : '0', borderRadius: msg.isSelected ? '12px' : '0' }}>
                    {msg.senderId !== user.id && <img src={activeChat.avatar} className="msg-avatar" alt="Expert" />}
                    <div className="message-content">
                        <div className="message-bubble">
                          {isBlockedReply ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '5px 0' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontStyle: 'italic', opacity: 0.8 }}>
                                  <span style={{ fontSize: '1.2rem' }}>🔒</span>
                                  {isExplicitlyLocked ? 'Initial Expert reply is locked.' : 'Session window closed. Please extend to continue.'}
                               </div>
                               {isExplicitlyLocked && (
                                 <button 
                                   onClick={() => handleUnlockMessage(msg.id)}
                                   style={{
                                     padding: '8px 16px',
                                     background: 'var(--elite-gold)',
                                     border: 'none',
                                     borderRadius: '6px',
                                     color: 'var(--midnight-primary)',
                                     fontSize: '0.8rem',
                                     fontWeight: 800,
                                     cursor: 'pointer',
                                     width: 'fit-content',
                                     boxShadow: '0 4px 10px rgba(184, 153, 94, 0.3)'
                                   }}
                                 >
                                   Unlock Consultation (₹99)
                                 </button>
                               )}
                            </div>
                          ) : msg.type === 'FILE_ATTACHMENT' && msg.fileMetadata ? (
                                <div className="file-attachment-bubble" style={{
                                  padding: '10px',
                                  borderRadius: '12px',
                                  background: 'rgba(0,0,0,0.03)',
                                  border: '1px solid rgba(0,0,0,0.05)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  minWidth: '200px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      background: 'var(--elite-gold)', 
                                      borderRadius: '8px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '1.2rem'
                                    }}>
                                      {msg.fileMetadata.contentType?.startsWith('image/') ? '🖼️' : '📄'}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--midnight-primary)' }}>{msg.fileMetadata.fileName}</div>
                                      <div style={{ fontSize: '0.7rem', opacity: 0.6, color: '#64748b' }}>{(msg.fileMetadata.size / 1024).toFixed(1)} KB</div>
                                    </div>
                                  </div>
                                  <a 
                                    href={msg.fileMetadata.downloadUrl} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.fileMetadata.fileName}
                                    style={{
                                      textDecoration: 'none',
                                      padding: '8px',
                                      background: 'var(--midnight-primary)',
                                      color: 'var(--elite-gold)',
                                      borderRadius: '8px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      textAlign: 'center',
                                      marginTop: '5px'
                                    }}
                                  >
                                    VIEW / DOWNLOAD ASSET
                                  </a>
                                </div>
                          ) : (
                            renderContentWithLinks(msg.content || msg.text || msg.lastMessage)
                          )}
                        </div>
                      <div className="message-time">
                        {msg.isStarred && <span style={{ marginRight: '4px', fontSize: '0.65rem' }}>⭐</span>}
                        {msg.isPinned && <span style={{ marginRight: '4px', fontSize: '0.65rem' }}>📌</span>}
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
                       <div className={`wa-menu-wrapper animate-reveal ${msg.senderId === user.id ? 'sent' : 'received'}`} onClick={(e) => e.stopPropagation()}>
                          <div className="wa-context-menu">
                             <ul className="wa-menu-list">
                                <li onClick={() => { setReplyingToMsg(msg); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Reply
                                </li>
                                <li onClick={() => { navigator.clipboard.writeText(msg.content); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
                                </li>
                                <li onClick={() => { setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m)); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg> {msg.isPinned ? 'Unpin' : 'Pin'}
                                </li>
                                <li onClick={() => { setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: !m.isStarred } : m)); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> {msg.isStarred ? 'Unstar' : 'Star'}
                                </li>
                                <li className="menu-divider"></li>
                                <li onClick={() => { setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isSelected: !m.isSelected } : m)); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> {msg.isSelected ? 'Deselect' : 'Select'}
                                </li>
                                <li className="menu-divider"></li>
                                <li onClick={() => { setShowReportModal(true); setActiveMessageMenu(null); }}>
                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Report
                                </li>
                                <li onClick={() => { setActiveMessageMenu(null); if(window.confirm('Delete this message?')){ setMessages(prev => prev.filter(m => m.id !== msg.id)); } }}>
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

               <div className="chat-input-area" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {(() => {
                    const isTimeExpired = activeChat?.expiryTime && new Date(activeChat.expiryTime) < new Date();
                    const isExpert = ['LAWYER', 'CA', 'CFA', 'PROFESSIONAL', 'PRO'].some(role => user?.role?.toUpperCase().includes(role));
                    const isLocked = activeChat?.status === 'EXHAUSTED' || activeChat?.status === 'EXPIRED' || 
                                     activeChat?.status === 'RESOLVED' ||
                                     (activeChat?.expiryTime && new Date(activeChat.expiryTime) < new Date()) ||
                                     (activeChat?.trialEnded && !activeChat?.expiryTime && activeChat?.status === 'ACTIVE');

                     if (isLocked) {
                        return (
                            <div className="locked-reply-overlay animate-reveal" style={{
                                width: '100%',
                                background: 'rgba(13, 27, 42, 0.98)',
                                backdropFilter: 'blur(12px)',
                                padding: '12px 15px', // More compact
                                borderTop: '2px solid var(--elite-gold)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px', // Tighter gap
                                zIndex: 1000,
                                textAlign: 'center',
                                color: 'white'
                            }}>
                                {isExpert ? (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '280px', marginBottom: '2px' }}>
                                            <button 
                                                onClick={() => handleRequestRefill()}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'transparent',
                                                    color: 'var(--elite-gold)',
                                                    border: '1.5px solid var(--elite-gold)',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ⚡ Request Extension
                                            </button>
                                            <button 
                                                onClick={handleProposeAppointment}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'var(--elite-gold)',
                                                    color: 'var(--midnight-primary)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📅 Propose Meeting
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <h4 style={{ color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', letterSpacing: '0.3px' }}>Consultation Window Concluded</h4>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '280px', marginBottom: '2px' }}>
                                            <button 
                                                onClick={() => setShowRefillModal(true)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'var(--elite-gold)',
                                                    color: 'var(--midnight-primary)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                Unlock Extension (₹{activeChat.textChatFee || 100})
                                            </button>
                                            <button 
                                                onClick={handleStartFreshSession}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Start Fresh
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <h4 style={{ color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', letterSpacing: '0.3px' }}>Consultation Window Concluded</h4>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* --- RENDER INPUT ELEMENTS ONLY IF NOT LOCKED --- */}
                {! (activeChat?.expiryTime && new Date(activeChat.expiryTime) < new Date()) && (
                  <>
                    {replyingToMsg && (
                      <div style={{ padding: '8px 15px', background: 'rgba(0,0,0,0.03)', borderLeft: '4px solid var(--elite-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 20px 10px 20px', borderRadius: '4px' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--elite-gold)', display: 'block', marginBottom: '4px' }}>
                            Replying to {replyingToMsg.senderId === user.id ? 'Yourself' : activeChat.name}
                          </span>
                          <p style={{ fontSize: '0.9rem', color: '#555', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingToMsg.content}</p>
                        </div>
                        <button onClick={() => setReplyingToMsg(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', padding: '5px', marginLeft: '10px' }}>✖</button>
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#888', fontStyle: 'italic', marginBottom: '10px', padding: '0 5px' }}>
                      🔒 For your protection, sharing phone numbers or external meeting links is strictly prohibited.
                    </div>

                    <div className="whatsapp-input-row flex-row-center">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileUpload}
                    />
                    <button className="btn-action-wa" aria-label="Attach File" onClick={() => fileInputRef.current.click()}>
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
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {showLangPicker && (
                          <div className="wa-context-menu animate-reveal" style={{ 
                            position: 'absolute', 
                            bottom: '100%', 
                            right: 0, 
                            marginBottom: '10px', 
                            width: '180px',
                            background: '#ffffff',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            borderRadius: '12px',
                            padding: '8px',
                            zIndex: 1000,
                            border: '1px solid rgba(0,0,0,0.05)'
                          }}>
                            <ul className="wa-menu-list">
                              {[
                                { code: 'en-IN', label: 'English' },
                                { code: 'hi-IN', label: 'Hindi (हिंदी)' },
                                { code: 'mr-IN', label: 'Marathi (मराठी)' },
                                { code: 'te-IN', label: 'Telugu (తెలుగు)' },
                                { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
                                { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
                                { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
                                { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
                                { code: 'pa-Guru-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
                                { code: 'bn-IN', label: 'Bengali (বাংলা)' }
                              ].map(lang => (
                                <li key={lang.code} onClick={() => { setSelectedLang(lang.code); setShowLangPicker(false); }} style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '10px 15px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  background: selectedLang === lang.code ? 'rgba(184, 153, 94, 0.15)' : 'transparent',
                                  color: selectedLang === lang.code ? 'var(--elite-gold)' : '#1e293b', // Dark slate for visibility
                                  fontWeight: selectedLang === lang.code ? 800 : 500,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span>{lang.label}</span>
                                  {selectedLang === lang.code && <span>✓</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button 
                          className="lang-selector-btn" 
                          onClick={() => setShowLangPicker(!showLangPicker)}
                          title="Change Language"
                          style={{
                            marginRight: '10px',
                            padding: '6px 12px',
                            background: 'rgba(184, 153, 94, 0.1)',
                            border: '1px solid var(--elite-gold)',
                            borderRadius: '20px',
                            color: 'var(--elite-gold)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            transition: 'all 0.2s'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                          {selectedLang.split('-')[0].toUpperCase()}
                        </button>
                        <button 
                          className={`btn-send-wa voice-btn ${isRecording ? 'recording' : ''}`} 
                          aria-label="Voice Message"
                          onClick={() => {
                            if (!recognitionRef.current) {
                              alert("Voice Recognition is not supported in this browser.");
                              return;
                            }

                            if (isRecording) {
                              recognitionRef.current.stop();
                              setIsRecording(false);
                              setRecordingTimer(0);
                              if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                            } else {
                              try {
                                recognitionRef.current.lang = selectedLang;
                                recognitionRef.current.start();
                                setIsRecording(true);
                                setRecordingTimer(0);
                                recordingIntervalRef.current = setInterval(() => {
                                  setRecordingTimer(prev => prev + 1);
                                }, 1000);
                              } catch (e) {
                                console.warn("Recognition already started:", e);
                              }
                            }
                          }}
                          style={isRecording ? { width: '80px', borderRadius: '20px', background: '#ef4444', color: 'white' } : {}}
                        >
                          {isRecording ? (
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {recordingTimer}s 
                              <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', marginLeft: 6, animation: 'pulse 1s infinite' }}></div>
                            </div>
                          ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button className="btn-send-wa send-btn" aria-label="Send Message" onClick={() => handleSendMessage()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-2px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      </button>
                    )}
                  </div>
                </>
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
                          value={reportDetails || ''}
                          onChange={(e) => setReportDetails(e.target.value)}
                          placeholder="Please provide specific details to help us investigate..."
                          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)', outline: 'none', background: 'rgba(0,0,0,0.02)', fontFamily: 'Inter, sans-serif', minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>

                      <button 
                        onClick={async () => {
                          if (!reportReason) {
                            alert('Please select a reason point first.');
                            return;
                          }
                          try {
                            const reportData = {
                              reporterId: user.id,
                              targetType: 'USER_PROFILE', 
                              targetId: activeChat.professionalId || activeChat.userId,
                              reason: reportReason,
                              details: reportDetails
                            };
                            await apiClient.post('/api/reports', reportData);
                            alert(`Report Submitted Successfully!\nOur compliance team will investigate within 24 hours.`);
                          } catch (err) {
                            console.error('Report submission failed:', err);
                            alert('Failed to submit report. Please check your connection.');
                          }
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
          <div style={{ background: 'white', width: '90%', maxWidth: '380px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', position: 'relative', border: '1px solid rgba(184, 153, 94, 0.2)' }} className="animate-reveal">
            
            <div style={{ height: '110px', background: 'linear-gradient(135deg, #1a1c2c 0%, #0d0e14 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--elite-gold)', opacity: 0.1, borderRadius: '50%', filter: 'blur(40px)' }}></div>
              <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '80px', height: '80px', background: '#4f46e5', opacity: 0.15, borderRadius: '50%', filter: 'blur(30px)' }}></div>
              <div style={{ zIndex: 2, textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--elite-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </div>
                <h3 style={{ color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Expert Quota Refill</h3>
              </div>
              <button 
                onClick={() => setShowRefillModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '0 20px 25px 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* OPTION 1: 10 MINS */}
                <div 
                  onClick={() => setSelectedRefillBlock(10)}
                  style={{ 
                    padding: '15px 10px', 
                    background: selectedRefillBlock === 10 ? 'rgba(184, 153, 94, 0.08)' : 'var(--parchment-cream)', 
                    borderRadius: '16px', 
                    border: selectedRefillBlock === 10 ? '2px solid var(--elite-gold)' : '1.5px solid var(--glass-border)', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' }}>Standard</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--midnight-primary)', fontFamily: 'Outfit, sans-serif' }}>10 min</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--elite-gold)', marginTop: '2px' }}>₹{activeChat.textChatFee || 100}</div>
                  {selectedRefillBlock === 10 && <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: 'var(--elite-gold)', color: 'white', fontSize: '0.55rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 900 }}>SELECTED</div>}
                </div>

                {/* OPTION 2: 20 MINS */}
                <div 
                  onClick={() => setSelectedRefillBlock(20)}
                  style={{ 
                    padding: '15px 10px', 
                    background: selectedRefillBlock === 20 ? 'rgba(10, 10, 11, 0.95)' : 'var(--midnight-primary)', 
                    borderRadius: '16px', 
                    border: selectedRefillBlock === 20 ? '2px solid var(--elite-gold)' : '1.5px solid var(--midnight-primary)', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    color: 'white',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--elite-gold)', color: 'var(--midnight-primary)', fontSize: '0.45rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>BEST VALUE</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' }}>Discovery</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--elite-gold)', fontFamily: 'Outfit, sans-serif' }}>20 min</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>₹{Math.round((activeChat.textChatFee || 100) * 1.8)}</div>
                  {selectedRefillBlock === 20 && <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: 'var(--elite-gold)', color: 'white', fontSize: '0.55rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 900 }}>SELECTED</div>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowRefillModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(0,0,0,0.05)',
                      color: '#64748b',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handlePurchaseTokens(selectedRefillBlock)}
                    disabled={isPurchasing}
                    style={{
                      flex: 2,
                      padding: '12px',
                      background: 'var(--elite-gold)',
                      color: 'var(--midnight-primary)',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: isPurchasing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(184, 153, 94, 0.2)'
                    }}
                  >
                    {isPurchasing ? (
                      <>
                        <div className="loading-spinner-small" style={{ width: '16px', height: '16px', border: '2px solid rgba(10,10,11,0.1)', borderTop: '2px solid var(--midnight-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                        Processing...
                      </>
                    ) : (
                      <>Buy {selectedRefillBlock} min (₹{selectedRefillBlock === 20 ? Math.round((activeChat.textChatFee || 100) * 1.8) : (activeChat.textChatFee || 100)})</>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/wallet')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--midnight-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Top-up
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Deducted from {['LAWYER', 'CA', 'CFA', 'PRO'].some(r => user?.role?.toUpperCase().includes(r)) ? 'Earned Balance' : 'Cash Portfolio'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Expert PROPOSE APPOINTMENT MODAL */}
      {showProposeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 10, 20, 0.75)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--heritage-parchment)', width: '100%', maxWidth: '440px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(184, 153, 94, 0.2)' }} className="animate-reveal">
            <div style={{ padding: '30px', borderBottom: '1px solid rgba(184, 153, 94, 0.1)', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'var(--midnight-primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'var(--elite-gold)', fontSize: '1.5rem' }}>📅</div>
              <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: 'var(--midnight-primary)' }}>Propose Consultation</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '5px' }}>Initiating formal proposal for <strong>{activeChat.name}</strong></p>
            </div>

            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Proposed Time Slots (Max 3)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {proposeData.slots.map((slot, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <input 
                          type="date" 
                          min={new Date().toISOString().split('T')[0]}
                          value={slot.date}
                          onChange={e => {
                            const newSlots = [...proposeData.slots];
                            newSlots[index].date = e.target.value;
                            setProposeData({...proposeData, slots: newSlots});
                          }}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <input 
                          type="time" 
                          value={slot.time}
                          onChange={e => {
                            const newSlots = [...proposeData.slots];
                            newSlots[index].time = e.target.value;
                            setProposeData({...proposeData, slots: newSlots});
                          }}
                          style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                        />
                      </div>
                      {index > 0 && (
                        <button 
                          onClick={() => {
                            const newSlots = proposeData.slots.filter((_, i) => i !== index);
                            setProposeData({...proposeData, slots: newSlots});
                          }}
                          style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  {proposeData.slots.length < 3 && (
                    <button 
                      onClick={() => setProposeData({...proposeData, slots: [...proposeData.slots, { date: '', time: '' }]})}
                      style={{ padding: '8px', background: 'transparent', border: '1.5px dashed rgba(184, 153, 94, 0.5)', color: 'var(--elite-gold)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                    >
                      + Add Alternative Slot
                    </button>
                  )}
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Negotiated Fee (Expert Payout)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--midnight-primary)' }}>₹</span>
                  <input 
                    type="number" 
                    value={proposeFee}
                    onChange={e => setProposeFee(e.target.value)}
                    style={{ width: '100%', padding: '12px 12px 12px 30px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', outline: 'none', fontSize: '1rem', fontWeight: 800, color: 'var(--midnight-primary)' }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic' }}>Client pays ₹{Math.round(proposeFee * 1.2 + 50)} (incl. LawEZY Governance Fee).</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button onClick={() => { setShowProposeModal(false); setProposeData({ reason: '', slots: [{ date: '', time: '' }] }); }} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button 
                  onClick={submitFormalProposal} 
                  disabled={proposeData.slots.some(s => !s.date || !s.time)}
                  style={{ flex: 2, padding: '15px', borderRadius: '12px', border: 'none', background: 'var(--midnight-primary)', color: 'var(--elite-gold)', fontWeight: 800, cursor: 'pointer', opacity: proposeData.slots.some(s => !s.date || !s.time) ? 0.5 : 1 }}
                >
                  Dispatch Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && activeAppointment && (
        <ReviewModal 
          appointment={{
            ...activeAppointment,
            expertName: activeChat.name
          }}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            alert("Feedback recorded. Thank you for helping us maintain institutional quality.");
            fetchSessions();
          }}
        />
      )}
    </div>
  );
};

export default Messages;


