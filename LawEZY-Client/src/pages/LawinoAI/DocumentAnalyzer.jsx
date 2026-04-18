import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Trash2, 
  History, 
  Sun, 
  Moon,
  Clock,
  Shield,
  FileSearch,
  ChevronRight,
  ChevronLeft,
  Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DocumentAnalyzer.css';

const DocumentAnalyzer = () => {
    const { user, updateUser } = useAuthStore();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('lawino_theme') || 'dark');
    const [progress, setProgress] = useState(0);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('lawino_sidebar_collapsed') === 'true');
    const [showQuotaModal, setShowQuotaModal] = useState(false);
    const [quotaType, setQuotaType] = useState('DOC_REFILL');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await apiClient.get('/api/documents/history');
            setHistory(response.data || []);
        } catch (err) {
            console.error('Failed to fetch institutional history:', err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            alert("Institutional Breach: File exceeds 25MB limit.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsLoading(true);
        setProgress(10);

        try {
            const response = await apiClient.post('/api/documents/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted * 0.8); // Reserve 20% for AI processing
                }
            });

            const result = response.data;
            setSelectedDoc(result);
            setHistory(prev => [result, ...prev]);
            
            // Update local user state for quota
            if (!user.isUnlimited) {
                updateUser({ freeDocTokens: (user.freeDocTokens || 1) - 1 });
            }
        } catch (err) {
            console.error('Analysis Failure:', err);
            if (err.response?.status === 403) {
                setQuotaType('DOC_REFILL');
                setShowQuotaModal(true);
            } else {
                alert(err.response?.data || "Tactical link failed during analysis.");
            }
        } finally {
            setIsLoading(false);
            setProgress(0);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`doc-analyzer-container theme-${theme}`}>
            {/* Sidebar */}
            <aside className={`doc-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
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

                <div className="sidebar-content">
                    <div className="sidebar-header">
                        <div className="sidebar-nav-actions">
                            <button className="nav-action-item" onClick={() => navigate('/lawino-ai')}>
                                <ArrowLeft size={16} />
                                <span>Lawino Chat</span>
                            </button>
                        </div>

                        <button className="primary-action-btn" onClick={() => setSelectedDoc(null)}>
                            <Plus size={18} />
                            <span>NEW AUDIT</span>
                        </button>
                    </div>

                    <div className="sidebar-scrollable">
                        <div className="section-label">
                            <History size={12} />
                            <span>RECENT AUDITS</span>
                        </div>
                        <div className="history-flow">
                            {history.map(doc => (
                                <div 
                                    key={doc.id} 
                                    className={`history-entry ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <div className="entry-main">
                                        <FileText size={16} />
                                        <span className="entry-title">{doc.fileName}</span>
                                    </div>
                                    <span className="entry-date">{new Date(doc.analyzedAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                            {history.length === 0 && <div className="history-empty">No previous audits</div>}
                        </div>
                    </div>

                    <div className="sidebar-footer">
                        <div className="user-card">
                            <div className="user-avatar">
                                {user?.name?.substring(0, 2).toUpperCase() || 'AI'}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{user?.name || 'Guest'}</div>
                                <div className="user-status-row">
                                    <span className="user-role">CLIENT</span>
                                    <div className="user-quota-badge">
                                        <Zap size={10} />
                                        <span>{user?.isUnlimited ? '∞' : `${user?.freeDocTokens ?? 0} LEFT`}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>


            {/* Main Workspace */}
            <main className={`doc-workspace ${isSidebarCollapsed ? 'expanded' : ''}`}>
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
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                {isLoading && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <h3 style={{marginTop: '20px', color: 'var(--elite-gold)'}}>SECURE ANALYSIS IN PROGRESS</h3>
                        <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>Processing institutional documentation...</p>
                    </div>
                )}

                {!selectedDoc ? (
                    <div className="workspace-hero">
                        <div className="hero-centerpiece">
                            <div className="intelligence-core mini">
                                <FileSearch size={56} />
                            </div>
                            <h1 className="hero-greeting">
                                Institutional <span className="brand-highlight">Document Auditor</span>
                            </h1>
                        </div>

                        <div 
                            className="modern-upload-zone"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div className="upload-glow"></div>
                            <div className="upload-content">
                                <Plus size={32} className="upload-plus" />
                                <h3>SELECT INSTITUTIONAL DOCUMENT</h3>
                                <p>PDF, DOCX, or Images up to 25MB</p>
                            </div>
                            <input 
                                type="file" 
                                hidden 
                                ref={fileInputRef} 
                                onChange={handleFileUpload}
                                accept=".pdf,.docx,image/*"
                            />
                        </div>

                        <div className="hero-suggestions">
                            <div className="suggestion-box">
                                <div className="suggest-header">
                                    <ShieldCheck size={18} />
                                    <span>RISK DETECTION</span>
                                </div>
                                <p>Automated identification of unfavorable clauses and legal vulnerabilities.</p>
                            </div>
                            <div className="suggestion-box">
                                <div className="suggest-header">
                                    <FileText size={18} />
                                    <span>SUMMARY GEN</span>
                                </div>
                                <p>Executive-level briefing of complex legal jargon into clear insights.</p>
                            </div>
                            <div className="suggestion-box">
                                <div className="suggest-header">
                                    <Heart size={18} />
                                    <span>FAMILY PROTECT</span>
                                </div>
                                <p>Institutional audit for matrimonial and domestic legal documentation.</p>
                            </div>
                        </div>

                        <div className="workspace-disclaimer">
                            <Shield size={16} />
                            <p>
                                AI analysis is for diagnostic purposes only. 
                                For definitive legal governance, <span className="cta-link" onClick={() => navigate('/experts')}>VERIFY WITH LAWEZY EXPERTS</span>.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="analysis-panel">
                        <header className="analysis-header">
                            <div className="doc-info">
                                <div className="doc-type-icon">PDF</div>
                                <div>
                                    <h3 style={{margin: 0}}>{selectedDoc.fileName}</h3>
                                    <span style={{fontSize: '0.8rem', color: '#64748b'}}>Analyzed on {formatDate(selectedDoc.analyzedAt)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedDoc(null)}
                                style={{padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem'}}
                            >
                                CLOSE ANALYSIS
                            </button>
                        </header>

                        <div className="analysis-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedDoc.analysisResult || "Analysis pulse missing. No assessment data found."}
                            </ReactMarkdown>
                        </div>

                        <div className="analysis-footer" style={{marginTop: '40px', padding: '25px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.1)'}}>
                            <h4 style={{margin: 0, color: 'var(--elite-gold)'}}>Ready for the next step?</h4>
                            <p style={{fontSize: '0.9rem', color: '#94a3b8', margin: '10px 0 20px 0'}}>Connect with a verified professional to discuss these findings in detail.</p>
                            <button 
                                onClick={() => window.location.href = '/experts'}
                                style={{padding: '10px 24px', background: 'var(--elite-gold)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer'}}
                            >
                                CONSULT AN EXPERT
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Institutional Quota Modal */}
            {showQuotaModal && (
                <div className="quota-modal-overlay">
                    <div className="quota-modal-card">
                        <div className="modal-header">
                            <Zap className="header-icon" size={24} />
                            <h3>Audit Units Exhausted</h3>
                        </div>
                        <div className="modal-body">
                            <p>Your institutional document analysis units have been fully utilized. To perform further audits, please acquire additional tactical units.</p>
                            
                            <div className="package-option active">
                                <div className="option-details">
                                    <span className="option-name">Auditor Refill</span>
                                    <span className="option-description">5 Analysis Units</span>
                                </div>
                                <div className="option-price">₹250</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowQuotaModal(false)}>Cancel</button>
                            <button className="btn-refill" onClick={async () => {
                                try {
                                    await apiClient.post('/api/wallet/purchase-tokens-direct', { packageType: quotaType });
                                    setShowQuotaModal(false);
                                    // Refresh user data to update quota display
                                    const walletRes = await apiClient.get('/api/wallet/balance');
                                    updateUser({ 
                                        freeDocTokens: walletRes.data.freeDocTokens,
                                        freeAiTokens: walletRes.data.freeAiTokens 
                                    });
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

export default DocumentAnalyzer;
