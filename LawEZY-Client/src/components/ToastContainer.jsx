import React from 'react';
import useToastStore from '../store/useToastStore';
import { Bell, CheckCircle, AlertCircle, CreditCard, Calendar, X } from 'lucide-react';

const ToastContainer = () => {
    const { toasts, removeToast } = useToastStore();

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={18} color="#10b981" />;
            case 'error': return <AlertCircle size={18} color="#ef4444" />;
            case 'payment': return <CreditCard size={18} color="#3b82f6" />;
            case 'appointment': return <Calendar size={18} color="#f59e0b" />;
            default: return <Bell size={18} color="#6366f1" />;
        }
    };

    const getLabel = (type) => {
        switch (type) {
            case 'payment': return 'FINANCIAL UPDATE';
            case 'appointment': return 'APPOINTMENT UPDATE';
            case 'success': return 'SUCCESS';
            case 'error': return 'ALERT';
            default: return 'NOTIFICATION';
        }
    };

    return (
        <div className="toast-stack-provider" style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            pointerEvents: 'none'
        }}>
            {toasts.map((toast) => (
                <div 
                    key={toast.id} 
                    className={`institutional-toast-elite animate-slide-in ${toast.type}`}
                    style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(12px) saturate(180%)',
                        border: '1px solid rgba(209, 213, 219, 0.3)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        width: '340px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03)',
                        pointerEvents: 'auto',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                    onClick={() => removeToast(toast.id)}
                >
                    <div className="toast-icon-box" style={{
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {getIcon(toast.type)}
                    </div>
                    
                    <div className="toast-content" style={{ flex: 1 }}>
                        <div className="toast-header" style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            letterSpacing: '1px',
                            color: '#94a3b8',
                            marginBottom: '4px',
                            textTransform: 'uppercase'
                        }}>
                            {getLabel(toast.type)}
                        </div>
                        <div className="toast-body" style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            lineHeight: '1.4'
                        }}>
                            {toast.message}
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}

            <style>{`
                .animate-slide-in {
                    animation: toast-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes toast-slide-in {
                    from { transform: translateX(100%) scale(0.9); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
                .institutional-toast-elite:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 35px rgba(0,0,0,0.12);
                }
                .institutional-toast-elite.payment { border-left: 4px solid #3b82f6; }
                .institutional-toast-elite.appointment { border-left: 4px solid #f59e0b; }
                .institutional-toast-elite.success { border-left: 4px solid #10b981; }
                .institutional-toast-elite.error { border-left: 4px solid #ef4444; }
            `}</style>
        </div>
    );
};

export default ToastContainer;
