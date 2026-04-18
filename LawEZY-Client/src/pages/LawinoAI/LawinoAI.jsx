import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileSearch, 
  History, 
  LayoutDashboard, 
  LogOut, 
  User, 
  Send, 
  Mic, 
  MoreVertical,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Paperclip,
  Heart,
  Shield
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import './LawinoAI.css';

const LawinoAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(localStorage.getItem('lawino_session_id') || null);
  const [history, setHistory] = useState([]);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaType, setQuotaType] = useState('AI_REFILL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('lawino_sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('lawino_theme') || 'dark');
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
  const userRole = user?.role || 'Expert Tier';

  // Load History on Mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Wallet Refresh: ensure sidebar quota reflects live DB state
  const refreshWallet = async () => {
    if (!user?.id) return;
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

  useEffect(() => {
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
    if (!window.confirm("Are you sure you want to delete this Expert archive? This action cannot be undone.")) return;
    
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

  // Custom Markdown Components for Expert Interaction
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

  // Expert URI Transformer: Allows 'internal:' protocol tactical mapping
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

      const fullResponse = data?.response || "Expert protocols interrupted.";
      
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
      
      // Update Expert Units
      refreshWallet();
    } catch (err) {
      console.error('AI Error:', err);
      if (err.response?.status === 403) {
        setQuotaType('AI_REFILL');
        setShowQuotaModal(true);
      } else {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Connection to LawinoAI tactical link lost. Please check your network and re-engage.' 
        }]);
      }
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
      refreshWallet();
    } catch (err) {
      console.error('AI Edit Error:', err);
      if (err.response?.status === 403) {
        setQuotaType('AI_REFILL');
        setShowQuotaModal(true);
      } else {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Engagement interrupted during edit processing. Please retry.' 
        }]);
      }
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

      {/* Expert Left Sidebar */}
      <aside className={`ai-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobile && isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <button 
          className="sidebar-toggle" 
          onClick={() => {
            const newState = !isSidebarCollapsed;
            setIsSidebarCollapsed(newState);
            localStorage.setItem('lawino_sidebar_collapsed', newState);
          }}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {(!isSidebarCollapsed || isMobile) && (
          <div className="sidebar-content">
            <div className="sidebar-header">
              <button className="primary-action-btn" onClick={handleNewChat}>
                <Plus size={18} />
                <span>New Chat</span>
              </button>
              <button 
                className="secondary-action-btn" 
                onClick={() => navigate('/lawino-ai/analyzer')}
              >
                <FileSearch size={18} />
                <span>Doc Auditor</span>
              </button>
            </div>
            
            <div className="sidebar-scrollable">
              <div className="sidebar-section">
                <div className="section-label">
                  <History size={12} />
                  <span>Recent Activity</span>
                </div>
                <div className="history-flow">
                  {history.map(session => (
                    <div 
                      key={session.id} 
                      className={`history-entry ${sessionId === session.id ? 'active' : ''}`}
                      onClick={() => loadSession(session.id)}
                    >
                      <div className="entry-main">
                        <Sparkles size={14} className="entry-icon" />
                        <span className="entry-title">{session.title}</span>
                      </div>
                      <button 
                        className="btn-delete-session" 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {history.length === 0 && <div className="history-empty">No previous sessions</div>}
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <div className="user-card">
                <div className="user-avatar">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{userName}</div>
                  <div className="user-status-row">
                    <span className="user-role">{userRole}</span>
                    <div className="user-quota-badge">
                      <Zap size={10} />
                      <span>{user?.isUnlimited ? '∞' : `${user?.freeAiTokens ?? 0}/5`}</span>
                    </div>
                  </div>
                </div>
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
            onClick={() => {
              const newTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(newTheme);
              localStorage.setItem('lawino_theme', newTheme);
            }}
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
                <div className="intelligence-core mini">
                  <Sparkles size={56} />
                </div>
                <h1 className="hero-greeting">
                  Search with <span className="brand-highlight">Lawino AI</span> intelligence.
                </h1>
              </div>

              <div className="hero-suggestions">
                <div className="suggestion-box" onClick={() => setInput("Check regulatory standards for startups")}>
                  <div className="suggest-header">
                    <ShieldCheck size={18} />
                    <span>Legal Compliance</span>
                  </div>
                  <p>Verify institutional standards and licensing for emerging ventures.</p>
                </div>
                <div className="suggestion-box" onClick={() => setInput("Ask about ROI and tax efficiency")}>
                  <div className="suggest-header">
                    <Zap size={18} />
                    <span>Tax Strategy</span>
                  </div>
                  <p>Optimize financial performance with AI-driven tax intelligence.</p>
                </div>
                <div className="suggestion-box" onClick={() => setInput("How to protect family assets and inheritance?")}>
                  <div className="suggest-header">
                    <Heart size={18} />
                    <span>Family Governance</span>
                  </div>
                  <p>Secure your legacy with institutional matrimonial and estate insights.</p>
                </div>
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

          {/* Modern Command Dock */}
          <div className="modern-command-dock">
            <div className="command-dock-container">
              {attachedFiles.length > 0 && (
                <div className="modern-file-belt">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="modern-file-chip">
                      {file.type.startsWith('image/') && <img src={file.base64} alt="preview" />}
                      <span className="file-name">{file.name}</span>
                      <button className="remove-file" onClick={() => removeFile(idx)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="command-input-group">
                <button 
                  className="dock-tool-btn" 
                  onClick={() => fileInputRef.current.click()} 
                  title="Upload Media"
                >
                  <Plus size={20} />
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
                  placeholder="Ask Lawino AI anything..."
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

                <div className="dock-actions">
                  {input.trim() || attachedFiles.length > 0 ? (
                    <button 
                      className="dock-send-btn active" 
                      onClick={handleSend}
                      disabled={isLoading}
                    >
                      <Send size={18} />
                    </button>
                  ) : (
                    <button 
                      className={`dock-tool-btn ${isRecording ? 'recording' : ''}`} 
                      onClick={toggleMic}
                    >
                      {isRecording ? <Sparkles className="pulse" size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="subtle-disclaimer centered">
              <ShieldCheck size={14} />
              <span>Expert guidance for orientation only. <span className="cta-link" onClick={() => navigate('/experts')}>Verify with LawEZY Experts.</span></span>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Quota Modal */}
      {showQuotaModal && (
        <div className="quota-modal-overlay">
          <div className="quota-modal-card">
            <div className="modal-header">
              <Zap className="header-icon" size={24} />
              <h3>Institutional Quota Exhausted</h3>
            </div>
            <div className="modal-body">
              <p>Your current tactical AI units have been fully utilized. To continue with high-fidelity legal intelligence, please refill your quota.</p>
              
              <div className="package-option active">
                <div className="option-details">
                  <span className="option-name">Standard Refill</span>
                  <span className="option-description">10 Institutional AI Tokens</span>
                </div>
                <div className="option-price">₹100</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowQuotaModal(false)}>Cancel</button>
              <button className="btn-refill" onClick={async () => {
                try {
                  await apiClient.post('/api/wallet/purchase-tokens-direct', { packageType: quotaType });
                  setShowQuotaModal(false);
                  refreshWallet();
                } catch (err) {
                  console.error('Purchase Failure:', err);
                  alert('Institutional purchase failed. Please check your network.');
                }
              }}>
                Pay & Refill Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawinoAI;
