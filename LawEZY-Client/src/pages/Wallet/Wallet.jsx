import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useMetadata from '../../services/useMetadata';
import apiClient from '../../services/apiClient';
import './Wallet.css';

const Wallet = () => {
    const { user } = useAuthStore();
    const { profile, refreshMetadata } = useMetadata();
    
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchTransactionHistory = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get('/api/account/transactions');
                setTransactions(res.data || []);
            } catch (err) {
                console.error("Financial Sync Failure:", err);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchTransactionHistory();
    }, [user]);

    const handleDeposit = async () => {
        setProcessing(true);
        setMessage('');
        try {
            // Mocking strategic funding for demo/test purposes as discussed
            const res = await apiClient.post('/api/account/deposit', { amount: 5000.0 });
            setTransactions([res.data, ...transactions]);
            setMessage('Strategic Funding Secured: ₹5,000 added.');
            refreshMetadata(); // Sync global balance
        } catch (err) {
            setMessage('Funding Error: Check authorization.');
        } finally {
            setProcessing(false);
        }
    };

    const handleWithdraw = async () => {
        if (!profile?.walletBalance || profile.walletBalance <= 0) {
            setMessage('Insufficient Capital for liquidation.');
            return;
        }
        setProcessing(true);
        setMessage('');
        try {
            const res = await apiClient.post('/api/account/withdraw', { amount: profile.walletBalance });
            setTransactions([res.data, ...transactions]);
            setMessage('Liquidation Request Submitted Successfully.');
            refreshMetadata();
        } catch (err) {
            setMessage('Liquidation Error: Transmission interrupted.');
        } finally {
            setProcessing(false);
        }
    };

    const cashBalance = profile?.cashBalance || 0;
    const earnedBalance = profile?.earnedBalance || 0;
    
    const aiTokens = user?.freeAiTokens ?? 0;
    const chatTokens = user?.freeChatTokens ?? 0;
    const isUnlimited = user?.isUnlimited ?? false;
    const isProfessional = ['LAWYER', 'CA', 'CFA', 'PRO', 'EXPERT', 'PROFESSIONAL', 'ROLE_LAWYER', 'ROLE_CA', 'ROLE_CFA'].some(r => user?.role?.toUpperCase().includes(r));

    if (loading) return (
        <div className="profile-loading-overlay">
            <div className="loader-strategic"></div>
            <p>Synchronizing Institutional Strategic Ledger...</p>
        </div>
    );

    return (
        <div className="wallet-page-wrapper animate-reveal">
            <header className="wallet-header">
                <h1>Strategic Wallet</h1>
                <p>Manage your professional earnings and institutional deposits.</p>
            </header>

            <div className="wallet-assets-grid">
                {/* PRIMARY CASH BALANCE (Deposits) */}
                <div className="wallet-asset-card">
                    <span className="asset-type-label">Strategic Deposits</span>
                    <div className="asset-main-val">₹{cashBalance.toLocaleString()}</div>
                    <span className="asset-sub-val">● Liquid Capital</span>
                    <div className="asset-icon-watermark">💳</div>
                </div>

                {/* EARNED BALANCE (Professional Revenue) */}
                {isProfessional && (
                    <div className="wallet-asset-card" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #16213e 100%)', border: '1px solid var(--strategic-gold)' }}>
                        <span className="asset-type-label" style={{ color: 'var(--strategic-gold)' }}>Consolidated Revenue</span>
                        <div className="asset-main-val" style={{ color: 'white' }}>₹{earnedBalance.toLocaleString()}</div>
                        <span className="asset-sub-val" style={{ color: 'rgba(255,255,255,0.6)' }}>● Professional Earnings</span>
                        <div className="asset-icon-watermark" style={{ opacity: 0.1 }}>🏛️</div>
                    </div>
                )}

                {/* AI TOKENS */}
                <div className="wallet-asset-card asset-card-ai">
                    <span className="asset-type-label">AI Console Access</span>
                    <div className="asset-main-val">
                        {isUnlimited ? '∞ UNLIMITED' : `${aiTokens} Sessions`}
                    </div>
                    <span className="asset-sub-val" style={{color: '#c7d2fe'}}>
                        {isUnlimited ? 'Elite Strategic Pass' : 'Tiered Quota Active'}
                    </span>
                    <div className="asset-icon-watermark">🤖</div>
                </div>

                {/* CHAT TOKENS */}
                <div className="wallet-asset-card asset-card-ai">
                    <span className="asset-type-label">Chat Credits</span>
                    <div className="asset-main-val">
                        {isUnlimited ? '∞ UNLIMITED' : `${chatTokens} Sessions`}
                    </div>
                    <span className="asset-sub-val" style={{color: '#c7d2fe'}}>
                        {isUnlimited ? 'Engagement Multiplier' : 'Direct Access Quota'}
                    </span>
                    <div className="asset-icon-watermark">💬</div>
                </div>
            </div>

            <div className="wallet-action-bar">
                <div className="action-intro">
                    <h3>Strategic Capital Control</h3>
                    <p>Manage your institutional reserve and payout requests.</p>
                    {message && <div style={{fontSize: '0.7rem', color: '#10b981', fontWeight: 800, marginTop: '5px'}}>{message}</div>}
                </div>
                <div className="action-buttons">
                    <button className="btn-wallet-action btn-deposit" onClick={handleDeposit} disabled={processing}>
                        {processing ? '...' : (isProfessional ? 'Add Strategic Float' : 'Add Credits')}
                    </button>
                    {isProfessional && (
                         <button className="btn-wallet-action btn-withdraw" onClick={handleWithdraw} disabled={processing || earnedBalance <= 0} style={{ background: 'var(--strategic-gold)', color: 'var(--midnight-primary)', fontWeight: 800 }}>
                            {processing ? '...' : 'Request Revenue Payout'}
                        </button>
                    )}
                    {!isProfessional && (
                        <button className="btn-wallet-action btn-withdraw" onClick={handleWithdraw} disabled={processing || cashBalance <= 0}>
                            {processing ? '...' : 'Withdraw Capital'}
                        </button>
                    )}
                </div>
            </div>


            <div className="wallet-history-section">
                <div className="history-header">
                    <h2>Audited Transaction History</h2>
                </div>
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Ref ID</th>
                            <th>Transaction ID</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th style={{textAlign: 'right'}}>Amount</th>
                            <th style={{textAlign: 'center'}}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id}>
                                <td style={{fontWeight: 700}}>{tx.id.substring(0, 8)}</td>
                                <td style={{fontFamily: 'monospace', fontSize: '0.75rem'}}>{tx.transactionId}</td>
                                <td style={{fontSize: '0.8rem'}}>{tx.description}</td>
                                <td>{new Date(tx.timestamp).toLocaleDateString()}</td>
                                <td style={{textAlign: 'right', fontWeight: 900, color: tx.amount < 0 ? '#ef4444' : '#10b981'}}>
                                    {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
                                </td>
                                <td style={{textAlign: 'center'}}>
                                    <span className={`status-pill-tx ${tx.status === 'PAID' ? 'status-tx-paid' : 'status-tx-pending'}`}>
                                        {tx.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{textAlign: 'center', padding: '40px', opacity: 0.5}}>
                                    No strategic entries found in the institutional ledger.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Wallet;
