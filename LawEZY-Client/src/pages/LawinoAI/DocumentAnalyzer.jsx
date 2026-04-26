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
  Heart,
  X
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
    const [selectedPackage, setSelectedPackage] = useState('DOC_5');
    const [isProcessing, setIsProcessing] = useState(false);
    const [quotaType, setQuotaType] = useState('DOC_REFILL');
    const [showBanner, setShowBanner] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchHistory();
        refreshWallet();
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
                    freeDocTokens: fresh.freeDocTokens,
                    cashBalance: fresh.cashBalance,
                    isUnlimited: fresh.isUnlimited,
                    docLimit: fresh.docLimit, // Institutional sync: ensure total capacity mirrors DB
                    aiLimit: fresh.aiLimit
                });
            }
        } catch (err) {
            console.warn('[WALLET] Could not refresh token balance:', err.message);
        }
    };

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
            
            // Update local user state for quota (1 Audit = 5 Tokens)
            if (!user.isUnlimited) {
                const current = user.freeDocTokens ?? 0;
                updateUser({ freeDocTokens: Math.max(0, current - 5) });
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

    const handlePurchasePackage = async () => {
        if (!selectedPackage) return;
        setIsProcessing(true);
        try {
            const response = await apiClient.post('/api/wallet/purchase-package', { packageType: selectedPackage });
            const freshWallet = response.data;
            updateUser({
                freeAiTokens: freshWallet.freeAiTokens,
                freeDocTokens: freshWallet.freeDocTokens,
                cashBalance: freshWallet.cashBalance,
                docLimit: freshWallet.docLimit || freshWallet.docTokenLimit,
                aiLimit: freshWallet.aiLimit || freshWallet.aiTokenLimit
            });
            alert(`Successfully purchased ${selectedPackage === 'AI_15' ? '15 AI Queries' : '5 Document Audits'}!`);
            setShowQuotaModal(false);
        } catch (err) {
            console.error('Purchase Error:', err);
            alert(err.response?.data?.message || "Failed to process tactical refill. Ensure wallet balance is sufficient.");
        } finally {
            setIsProcessing(false);
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
                    className="sidebar-toggle-btn" 
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
                                {(user?.firstName || user?.email || 'G').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{user?.firstName || user?.email?.split('@')[0] || 'Guest'}</div>
                                <div className="user-status-row">
                                    <span className="user-role">{user?.role || 'CLIENT'}</span>
                                    <div 
                                        className="user-quota-badge clickable" 
                                        onClick={() => {
                                            setQuotaType('DOC_REFILL');
                                            setShowQuotaModal(true);
                                        }}
                                        title="Refill Institutional Units"
                                    >
                                        <Zap size={10} />
                                        <span>{user?.isUnlimited || ['LAWYER', 'CA', 'CFA', 'ADMIN'].includes(user?.role?.toUpperCase()) ? 'UNLIMITED' : `${Math.floor((user?.freeDocTokens ?? 0) / 5)}/${Math.floor((user?.docLimit ?? 5) / 5)} Audits`}</span>
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

                {/* 🛡️ INSTITUTIONAL SAFETY BANNER */}
                {showBanner && (
                    <div className="safety-advisory-banner animate-reveal" style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        zIndex: 50,
                        backdropFilter: 'blur(5px)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldCheck size={16} color="#ef4444" />
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                Institutional Disclaimer: AI analysis is for diagnostic orientation and may not reflect the latest legal precedents. 
                                <span className="cta-link" onClick={() => navigate('/experts')} style={{ marginLeft: '8px', textDecoration: 'underline', cursor: 'pointer' }}>Verify findings with LawEZY Experts.</span>
                            </span>
                        </div>
                        <button 
                            onClick={() => setShowBanner(false)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                            title="Close Disclaimer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

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
                                Lawino <span className="brand-highlight">Document Auditor</span>
                            </h1>
                        </div>

                        <div 
                            className="modern-upload-zone"
                            onClick={() => {
                                if (!user?.isUnlimited && (user?.freeDocTokens || 0) <= 0) {
                                    setQuotaType('DOC_REFILL');
                                    setShowQuotaModal(true);
                                    return;
                                }
                                fileInputRef.current.click();
                            }}
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
            </main>            {/* Institutional Quota Modal */}
            {showQuotaModal && (
                <div className="quota-modal-overlay">
                    <div className="quota-modal-card">
                        <div className="modal-header">
                            <Zap className={`header-icon ${isProcessing ? 'spinning' : ''}`} size={24} />
                            <h3>Institutional Refill</h3>
                        </div>
                        <div className="modal-body">
                            <p>Select a tactical package to continue with high-fidelity document auditing.</p>
                            
                            <div className="package-options-grid">
                                <div 
                                    className={`package-option ${selectedPackage === 'AI_15' ? 'active' : ''}`} 
                                    onClick={() => setSelectedPackage('AI_15')}
                                >
                                    <div className="option-details">
                                        <span className="option-name">AI Intelligence (Refill)</span>
                                        <span className="option-description">15 Tactical Queries</span>
                                    </div>
                                    
                                </div>

                                <div 
                                    className={`package-option ${selectedPackage === 'DOC_5' ? 'active' : ''}`} 
                                    onClick={() => setSelectedPackage('DOC_5')}
                                >
                                    <div className="option-details">
                                        <span className="option-name">Document Auditor (Refill)</span>
                                        <span className="option-description">5 Deep-Scan Audits</span>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowQuotaModal(false)}>Close</button>
                            <button 
                                className={`btn-primary purchase-btn ${isProcessing ? 'loading' : ''}`}
                                onClick={handlePurchasePackage}
                                disabled={isProcessing || !selectedPackage}
                            >
                                                                {isProcessing ? 'Processing...' : `Buy Package (₹${selectedPackage === 'AI_15' ? '150' : '250'})`}

                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={() => navigate('/dashboard?tab=wallet')}
                            >
                                Top up Wallet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentAnalyzer;

