import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import './LawinoAI.css';

const LawinoAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(localStorage.getItem('lawino_session_id') || null);
  const [history, setHistory] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1200);
  const [isLoading, setIsLoading] = useState(false);
  
  // Tactical Edit State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]); // Base64 images
  
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { updateUser } = useAuthStore();
  const userName = user?.email?.split('@')[0] || 'Guest User';
  const userRole = user?.role || 'Strategic Tier';

  // Load History on Mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Wallet Refresh: ensure sidebar quota reflects live DB state
  useEffect(() => {
    if (!user?.id) return;
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
        console.warn('[WALLET] Could not refresh AI token balance:', err.message);
      }
    };
    refreshWallet();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = async () => {
    try {
      const response = await apiClient.get('/api/ai/history');
      setHistory(response.data?.data || []);
    } catch (err) {
      console.error('History Error:', err);
    }
  };

  const loadSession = async (id) => {
    setSessionId(id);
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/ai/sessions/${id}`);
      const historyMessages = response.data?.data || [];
      setMessages(historyMessages.map(m => ({ 
        role: m.role, 
        content: m.content,
        timestamp: m.timestamp 
      })));
      localStorage.setItem('lawino_session_id', id);
    } catch (err) {
      console.error('Session Load Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this strategic archive? This action cannot be undone.")) return;
    
    try {
      await apiClient.delete(`/api/ai/sessions/${id}`);
      setHistory(prev => prev.filter(s => s.id !== id));
      if (sessionId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Delete Error:', err);
      alert("Failed to purge archive. Tactical link interrupted.");
    }
  };

  // Voice Intelligence (Native Speech Recognition)
  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  // Media Ingestion
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          base64: reader.result,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Custom Markdown Components for Strategic Interaction
  const MarkdownComponents = {
    a: ({ node, ...props }) => {
      const { href, children } = props;
      
      // UNIVERSAL INTERCEPT: Any link containing 'experts' or using 'internal:' protocol
      const isInternal = href?.startsWith('internal:') || href?.includes('/experts');
      
      if (isInternal) {
        // Universal Path Sanitization: Strips 'internal:' and ensures absolute routing
        let targetPath = href;
        if (href.startsWith('internal:')) {
          targetPath = href.split(':', 2)[1];
        }
        
        // Ensure strictly absolute path for routing stability (e.g., 'experts' -> '/experts')
        const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
        
        return (
          <button 
            type="button"
            className="btn-expert-cta" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[ROUTING] Initiating tactical redirection to:', cleanPath);
              navigate(cleanPath);
            }}
          >
            {children}
            <span className="cta-arrow">→</span>
          </button>
        );
      }
      
      return <a {...props} target="_blank" rel="noopener noreferrer" className="external-link" />;
    }
  };

  // Strategic URI Transformer: Allows 'internal:' protocol tactical mapping
  const transformUri = (uri) => {
    console.log('URI Transformer Pulse:', uri);
    if (uri.startsWith('internal:') || uri.includes('/experts')) return uri;
    const url = uri.replace(/\s/g, '');
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return uri;
    }
    return '';
  };

  // Responsive Detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1200);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;
    
    const userMessage = { 
      role: 'user', 
      content: input,
      files: attachedFiles.map(f => f.name) 
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImages = attachedFiles.map(f => f.base64);
    
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const payload = { 
        query: currentInput, 
        sessionId: sessionId,
        images: currentImages 
      };
      
      const response = await apiClient.post('/api/ai/copilot', payload);
      const data = response.data?.data;
      
      if (data?.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('lawino_session_id', data.sessionId);
        fetchHistory(); // Refresh sidebar history
      }

      const fullResponse = data?.response || "Strategic protocols interrupted.";
      
      // Industrial Grade Typewriter: Stream characters into the message state
      const newAiMessage = { role: 'ai', content: '' };
      setMessages(prev => [...prev, newAiMessage]);

      let currentText = '';
      const chars = Array.from(fullResponse);
      let charIdx = 0;

      const interval = setInterval(() => {
        if (charIdx < chars.length) {
          currentText += chars[charIdx];
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { ...updated[updated.length - 1], content: currentText };
            }
            return updated;
          });
          charIdx++;
        } else {
          clearInterval(interval);
        }
      }, 5); // Fast tactical streaming
    } catch (err) {
      console.error('AI Error:', err);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Connection to LawinoAI tactical link lost. Please check your network and re-engage.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (index, content) => {
    setEditingIndex(index);
    setEditingValue(content);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleSaveEdit = async (index) => {
    if (!editingValue.trim() || isLoading) return;
    
    // Industrial Standard: Branch conversation at the edit point
    const truncatedMessages = messages.slice(0, index);
    const updatedUserMessage = { 
      role: 'user', 
      content: editingValue,
      files: [] // Edits typically focus on text
    };
    
    setMessages([...truncatedMessages, updatedUserMessage]);
    setEditingIndex(null);
    
    // Re-trigger the AI engagement
    const currentInput = editingValue;
    setIsLoading(true);

    try {
      const payload = { 
        query: currentInput, 
        sessionId: sessionId,
        images: [] 
      };
      
      const response = await apiClient.post('/api/ai/copilot', payload);
      const data = response.data?.data;
      
      const aiResponse = { role: 'ai', content: data?.response };
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI Edit Error:', err);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Engagement interrupted during edit processing. Please retry.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setSessionId(null);
    localStorage.removeItem('lawino_session_id');
    setAttachedFiles([]);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className={`lawino-ai-container theme-${theme}`}>
      {/* Mobile Sidebar Backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)}></div>
      )}

      {/* Strategic Left Sidebar */}
      <aside className={`ai-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobile && isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? '→' : '←'}
        </button>

        {(!isSidebarCollapsed || isMobile) && (
          <>
            <div className="sidebar-header">
              <button className="new-chat-btn" onClick={handleNewChat}>
                <span className="btn-icon">+</span>
                <span className="btn-text">NEW CHAT</span>
              </button>
            </div>
            
            <div className="sidebar-middle">
              <div className="sidebar-group">
                <div className="sidebar-label">HISTORY</div>
                <div className="history-flow">
                  {history.map(session => (
                    <div 
                      key={session.id} 
                      className={`history-entry ${sessionId === session.id ? 'active' : ''}`}
                      onClick={() => loadSession(session.id)}
                    >
                      <div className="entry-main">
                        <span className="entry-icon">◈</span>
                        <span className="entry-title">{session.title}</span>
                      </div>
                      <button 
                        className="btn-delete-session" 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Delete Session"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {history.length === 0 && <div className="history-empty">No previous sessions</div>}
                </div>
              </div>
            </div>
          </>
        )}
        
        {!isSidebarCollapsed && (
          <div className="sidebar-bottom">
            {/* TIERED QUOTA TRACKER */}
            <div className={`quota-status-card ${user?.isUnlimited ? 'unlimited' : ''}`}>
              <div className="quota-label">AI SESSIONS LEFT</div>
              <div className="quota-value">
                {user?.isUnlimited ? '∞ UNLIMITED' : `${user?.freeAiTokens ?? 0} / 5`}
              </div>
              {!user?.isUnlimited && (
                <div className="quota-progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${((user?.freeAiTokens ?? 0) / 5) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>

            <div className="user-profile-card">
              <div className="profile-avatar">{userName.substring(0, 2).toUpperCase()}</div>
              <div className="profile-meta">
                <span className="profile-name">{userName}</span>
                <span className="profile-badge">{userRole}</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Command Workspace */}
      <main className={`ai-workspace ${isSidebarCollapsed ? 'expanded' : ''}`}>
        {/* Persistent Theme Control (Top Right) */}
        <div className="workspace-header-actions">
          <button 
            className="theme-toggle-fab" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>

        {isMobile && (
          <button 
            className="mobile-sidebar-trigger" 
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <span className="history-icon-symbol">◈</span>
            <span className="history-label">HISTORY</span>
          </button>
        )}

        <div className="chat-container">
          {messages.length === 0 ? (
            <div className="workspace-hero">
              <div className="hero-centerpiece">
                <div className="hero-icon-wrapper">
                  <svg className="intelligence-core mini" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="core-orbit" cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" />
                    <path className="core-star" d="M50 15L55 45L85 50L55 55L50 85L45 55L15 50L45 45L50 15Z" fill="currentColor" />
                  </svg>
                </div>
                <h1 className="hero-greeting">Search with <span className="brand-highlight">Lawino AI</span> intelligence.</h1>
              </div>

              <div className="hero-suggestions">
                <button className="suggestion-box" onClick={() => setInput('Explain Indian Companies Act compliance...')}>
                  <div className="suggest-header">🔍 <strong>Legal Compliance</strong></div>
                  <p>Check regulatory standards for startups.</p>
                </button>
                <button className="suggestion-box" onClick={() => setInput('How to optimize tax for a private limited?')}>
                  <div className="suggest-header">💰 <strong>Tax Strategy</strong></div>
                  <p>Ask about ROI and tax efficiency.</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-stream">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-row ${msg.role}`}>
                  <div className={`chat-bubble ${editingIndex === i ? 'editing' : ''}`}>
                    <div className="bubble-sender">
                      <span>{msg.role === 'user' ? 'YOU' : 'LAWINO AI'}</span>
                      {msg.role === 'user' && editingIndex !== i && !isLoading && (
                        <button 
                          className="btn-edit-query" 
                          onClick={() => handleStartEdit(i, msg.content)}
                          title="Edit Query"
                        >
                          ✎
                        </button>
                      )}
                    </div>
                    
                    <div className="bubble-content">
                      {editingIndex === i ? (
                        <div className="edit-mode-container">
                          <textarea 
                            className="edit-textarea"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button className="btn-cancel-edit" onClick={handleCancelEdit}>Cancel</button>
                            <button className="btn-save-edit" onClick={() => handleSaveEdit(i)}>Save & Resubmit</button>
                          </div>
                        </div>
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                          transformUri={transformUri}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="chat-row ai">
                  <div className="chat-bubble thinking">
                    <div className="bubble-sender">LAWINO AI</div>
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="flow-anchor"></div>
            </div>
          )}

          {/* Floating Command Dock */}
          <div className="chat-input-area">
            <div className="chat-input-wrapper">
              {attachedFiles.length > 0 && (
                <div className="file-preview-belt">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="file-chip">
                      {file.type.startsWith('image/') && <img src={file.base64} alt="preview" />}
                      <span>{file.name}</span>
                      <span className="chip-remove" onClick={() => removeFile(idx)}>✕</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="chat-input-main">
                {/* Media Button: Anchored Left */}
                <button className="tool-btn left-action" onClick={() => fileInputRef.current.click()} title="Upload Media">
                  <span>+</span>
                </button>
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />

                <textarea 
                  ref={textareaRef}
                  placeholder="Message LawinoAI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                />

                {/* Adaptive Action Toggle: Anchored Right */}
                <div className="right-action-group">
                  {input.trim() || attachedFiles.length > 0 ? (
                    <button 
                      className="btn-send active" 
                      onClick={handleSend}
                      disabled={isLoading}
                    >
                      <span>↑</span>
                    </button>
                  ) : (
                    <button 
                      className={`tool-btn right-action ${isRecording ? 'recording' : ''}`} 
                      onClick={toggleMic}
                      title="Voice Command"
                    >
                      <span>{isRecording ? '⏺' : '🎤'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="command-disclaimer">Strategic guidance for orientation only. Verify with LawEZY Experts.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LawinoAI;
