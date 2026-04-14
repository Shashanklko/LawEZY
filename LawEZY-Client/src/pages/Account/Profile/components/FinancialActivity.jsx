import React, { useState, useEffect } from 'react';
import useAuthStore from '../../../../store/useAuthStore';
import apiClient from '../../../../services/apiClient';

const FinancialActivity = ({ profile }) => {
    const { user } = useAuthStore();
    const isProfessional = ['LAWYER', 'CA', 'CFA', 'PRO', 'EXPERT', 'PROFESSIONAL'].includes(user?.role?.toUpperCase());
    
    const [transactions, setTransactions] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const loadTransactions = async () => {
            try {
                const res = await apiClient.get('/api/account/transactions');
                setTransactions(res.data);
            } catch (err) {
                console.error("Failed to sync financial ledger:", err);
            }
        };
        loadTransactions();
    }, []);

    const handleWithdrawalRequest = async () => {
        if (!profile?.walletBalance || profile.walletBalance <= 0) {
            setMessage('Insufficient Capital: Ledger balance must be positive.');
            return;
        }

        setProcessing(true);
        setMessage('');
        
        try {
            const res = await apiClient.post('/api/account/withdraw', { amount: profile.walletBalance });
            setTransactions([res.data, ...transactions]);
            setMessage('Withdrawal Request Submitted Successfully.');
        } catch (err) {
            setMessage('Purge Error: Transaction transmission interrupted.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeposit = async () => {
        setProcessing(true);
        setMessage('');
        try {
            const res = await apiClient.post('/api/account/deposit', { amount: 5000.0 });
            setTransactions([res.data, ...transactions]);
            setMessage('Strategic Funding Secured: ₹5,000 added.');
        } catch (err) {
            setMessage('Funding Error: Check authorization.');
        } finally {
            setProcessing(false);
        }
    };

    const walletBalance = profile?.walletBalance || user?.tokenBalance || 0.00;
    const aiTokens = user?.freeAiTokens ?? 0;
    const chatTokens = user?.freeChatTokens ?? 0;
    const isUnlimited = user?.isUnlimited ?? false;

    return (
        <div className="financial-activity-container animate-reveal" style={{maxWidth: '850px'}}>
            {/* STRATEGIC ASSET CARDS */}
            <div className="asset-cards-grid" style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px', 
                marginBottom: '20px'
            }}>
                {/* INR WALLET */}
                <div className="asset-card" style={{
                    background: '#0F172A', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{fontSize: '0.6rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '10px'}}>Institutional Funding</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 900, color: 'white'}}>₹{walletBalance.toLocaleString()}</div>
                    <div style={{fontSize: '0.55rem', color: '#10B981', marginTop: '5px'}}>● Active Ledger</div>
                    <div style={{
                        position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, fontSize: '3rem'
                    }}>💳</div>
                </div>

                {/* AI TOKENS */}
                <div className="asset-card" style={{
                    background: isUnlimited ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' : '#0F172A', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    border: isUnlimited ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.05)',
                    position: 'relative'
                }}>
                    <div style={{fontSize: '0.6rem', color: isUnlimited ? '#C7D2FE' : '#94A3B8', textTransform: 'uppercase', marginBottom: '10px'}}>AI Console Access</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 900, color: '#FDE68A'}}>
                        {isUnlimited ? '∞ UNLIMITED' : `${aiTokens} Sessions`}
                    </div>
                    <div style={{fontSize: '0.55rem', color: '#C7D2FE', marginTop: '5px'}}>
                        {isUnlimited ? 'Strategic Unlimited Pass' : 'Tiered Free Quota'}
                    </div>
                    <div style={{
                        position: 'absolute', right: '5px', top: '5px', opacity: 0.1, fontSize: '1.5rem'
                    }}>🤖</div>
                </div>

                {/* CHAT TOKENS */}
                <div className="asset-card" style={{
                    background: isUnlimited ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' : '#0F172A', 
                    borderRadius: '8px', 
                    padding: '15px', 
                    border: isUnlimited ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.05)',
                    position: 'relative'
                }}>
                    <div style={{fontSize: '0.6rem', color: isUnlimited ? '#C7D2FE' : '#94A3B8', textTransform: 'uppercase', marginBottom: '10px'}}>Chat Credits</div>
                    <div style={{fontSize: '1.4rem', fontWeight: 900, color: '#FDE68A'}}>
                        {isUnlimited ? '∞ UNLIMITED' : `${chatTokens} Sessions`}
                    </div>
                    <div style={{fontSize: '0.55rem', color: '#C7D2FE', marginTop: '5px'}}>
                        {isUnlimited ? 'Active Engagement Pass' : 'Tiered Free Quota'}
                    </div>
                    <div style={{
                        position: 'absolute', right: '5px', top: '5px', opacity: 0.1, fontSize: '1.5rem'
                    }}>💬</div>
                </div>
            </div>

            {/* FUNDING ACTIONS */}
            <div className="form-section highlight" style={{background: 'rgba(15, 23, 42, 0.02)', padding: '15px 20px', border: '1px solid #E2E8F0'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <h3 className="section-subtitle" style={{color: '#1E293B', marginBottom: '4px', fontSize: '0.6rem'}}>Strategic Funding Control</h3>
                        <p style={{fontSize: '0.55rem', color: '#64748B', margin: 0}}>Manage your institutional capital and payout requests.</p>
                    </div>
                    
                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                        {message && <span style={{fontSize: '0.55rem', color: '#10B981', fontWeight: 800, maxWidth: '180px', textAlign: 'right'}}>{message}</span>}
                        
                        {!isProfessional && (
                            <button 
                                className="btn-save-profile" 
                                onClick={handleDeposit}
                                disabled={processing}
                                style={{padding: '6px 15px', background: '#8B5A2B', fontSize: '0.65rem', minWidth: 'auto', height: '30px'}}
                            >
                                {processing ? '...' : 'Add Credits'}
                            </button>
                        )}
                        
                        <button 
                            className="btn-save-profile" 
                            onClick={handleWithdrawalRequest}
                            disabled={processing}
                            style={{
                                padding: '6px 15px', 
                                background: isProfessional ? '#8B5A2B' : 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                fontSize: '0.65rem', 
                                minWidth: 'auto', 
                                height: '30px'
                            }}
                        >
                            {processing ? 'Submitting...' : (isProfessional ? 'Request Payout' : 'Withdraw')}
                        </button>
                    </div>
                </div>
            </div>

            {/* AUDIT TABLE - PENDING / PAID Status Schema */}
            <div className="form-section" style={{padding: '12px 18px'}}>
                <h3 className="section-subtitle" style={{fontSize: '0.6rem', marginBottom: '12px'}}>Withdrawal Request History</h3>
                
                <div style={{width: '100%', overflowX: 'auto'}}>
                    <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.65rem'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid #F1F5F9', background: '#F8FAFC'}}>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase'}}>Ref ID</th>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase'}}>Transaction ID</th>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase'}}>History</th>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase'}}>Date</th>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right'}}>Amount</th>
                                <th style={{padding: '8px 10px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center'}}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(txn => (
                                <tr key={txn.id} style={{borderBottom: '1px solid #F8FAFC'}}>
                                    <td style={{padding: '8px 10px', fontWeight: 700, color: '#1E293B'}}>{txn.id}</td>
                                    <td style={{padding: '8px 10px', fontFamily: 'monospace', color: '#64748B'}}>{txn.transactionId}</td>
                                    <td style={{padding: '8px 10px', color: '#334155'}}>{txn.description}</td>
                                    <td style={{padding: '8px 10px', color: '#64748B'}}>{new Date(txn.timestamp).toISOString().split('T')[0]}</td>
                                    <td style={{padding: '8px 10px', fontWeight: 800, textAlign: 'right', color: txn.amount < 0 ? '#E11D48' : '#10B981'}}>
                                        {txn.amount < 0 ? '-' : '+'}₹{Math.abs(txn.amount).toLocaleString()}
                                    </td>
                                    <td style={{padding: '8px 10px', textAlign: 'center'}}>
                                        <span style={{
                                            padding: '2px 8px', 
                                            borderRadius: '3px', 
                                            fontSize: '0.55rem', 
                                            fontWeight: 900, 
                                            background: txn.status === 'PENDING' ? '#FEF3C7' : '#DCFCE7',
                                            color: txn.status === 'PENDING' ? '#92400E' : '#166534',
                                            textTransform: 'uppercase',
                                            border: '1px solid',
                                            borderColor: txn.status === 'PENDING' ? '#FDE68A' : '#BBF7D0',
                                            display: 'inline-block',
                                            minWidth: '70px'
                                        }}>
                                            {txn.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{padding: '0 10px'}}>
                <p className="input-hint" style={{fontSize: '0.55rem', opacity: 0.6}}>
                    * All withdrawal requests are processed within 24-48 hours. 'PAID' status indicates the funds have been successfully disbursed to your linked account.
                </p>
            </div>
        </div>
    );
};

export default FinancialActivity;
