import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import useMetadata from '../../services/useMetadata';
import apiClient from '../../services/apiClient';
import './Wallet.css';

const Wallet = ({ onRefresh }) => {
    const { user, viewMode } = useAuthStore();
    const { profile, wallet, loading: metadataLoading, refreshMetadata } = useMetadata();
    
    // UI Context: strictly based on viewMode, not the raw user role
    const isExpertUI = viewMode === 'EXPERT';

    const [transactions, setTransactions] = useState([]);
    const [showTxHistory, setShowTxHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [refillModal, setRefillModal] = useState({ show: false, type: '', options: [] });
    const [topUpModal, setTopUpModal] = useState({ show: false, customAmount: '' });
    const [withdrawModal, setWithdrawModal] = useState({ show: false, amount: '' });
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(timer);
    }, []);

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

    const handleDeposit = async (amount, packName = "INSTITUTIONAL_TOPUP") => {
        setProcessing(true);
        setMessage('');
        try {
            // 1. Create Order in Backend
            const orderRes = await apiClient.post('/api/payments/order', { 
                amount: parseFloat(amount),
                packName: packName
            });
            
            const orderData = orderRes.data;

            // 2. Initialize Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SfRi5HQCGvRTb7', 
                amount: orderData.amount,
                currency: orderData.currency,
                name: "LawEZY",
                description: `Top Up Cash Balance`,
                order_id: orderData.id,
                handler: async function (response) {
                    // 3. Verify Payment Signature
                    try {
                        const verifyRes = await apiClient.post('/api/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amount,
                            type: packName
                        });

                        if (verifyRes.data.status === 'SUCCESS') {
                            setMessage(`Success: ${packName} Applied.`);
                            await refreshMetadata();
                            onRefresh?.();
                            // Refresh transaction history
                            const txRes = await apiClient.get('/api/account/transactions');
                            setTransactions(txRes.data || []);
                        }
                    } catch (err) {
                        setMessage('Verification Failure: Contact support.');
                    }
                },
                prefill: {
                    name: user?.firstName || "Guest",
                    email: user?.email || "",
                },
                theme: {
                    color: "#D4AF37",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setMessage('Order Failure: Financial link interrupted.');
        } finally {
            setProcessing(false);
        }
    };

    
    const handleInternalPurchase = async (packageType) => {
        setProcessing(true);
        setMessage('');
        setRefillModal({ ...refillModal, show: false }); // Close modal on start
        try {
            const res = await apiClient.post('/api/wallet/purchase-tokens-direct', { packageType });
            setMessage(`Success: Units added. Deducted from wallet.`);
            await refreshMetadata();
            onRefresh?.();
            // Refresh transaction history
            const txRes = await apiClient.get('/api/account/transactions');
            setTransactions(txRes.data || []);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Insufficient balance or error.';
            setMessage(`Failed: ${errorMsg}`);
        } finally {
            setProcessing(false);
        }
    };

    const openRefillModal = (type) => {
        // DECOMMISSIONED: Token refills are no longer supported in favor of time-based service
        console.warn("[WALLET] Refill requested for legacy type:", type);
    };

    const handleWithdraw = async (amount) => {
        setProcessing(true);
        setMessage('');
        try {
            await apiClient.post('/api/wallet/withdraw', { amount: parseFloat(amount) });
            setMessage('Withdrawal request submitted. Admin settles expert payouts at week-end.');
            await refreshMetadata();
            onRefresh?.();
            const txRes = await apiClient.get('/api/account/transactions');
            setTransactions(txRes.data || []);
        } catch (err) {
            setMessage('Payout failed: Verify requirements.');
        } finally {
            setProcessing(false);
        }
    };

    const handleWalletTopUp = (amount) => {
        if (!amount || isNaN(amount) || parseFloat(amount) < 1) return;
        handleDeposit(amount, "INSTITUTIONAL_TOPUP");
        setTopUpModal({ show: false, customAmount: '' });
    };


    const cashBalance = wallet?.cashBalance || 0;
    const earnedBalance = wallet?.earnedBalance || 0;
    const escrowBalance = wallet?.escrowBalance || 0;
    const isUnlimited = user?.isUnlimited ?? false;

    const classifyExpertIncomeSource = (description = '') => {
        const text = description.toLowerCase();
        if (text.includes('consultation earned') || text.includes('appointment')) return 'APPOINTMENT';
        if (text.includes('expert consultation') || text.includes('chat') || text.includes('message')) return 'MESSAGE';
        if (text.includes('payout')) return 'SETTLEMENT';
        return 'OTHER';
    };

    const getCompletedIncome = (tx) => {
        const amount = Number(tx?.amount || 0);
        const status = (tx?.status || '').toUpperCase();
        const isPayout = (tx?.description || '').toLowerCase().includes('payout');
        return (amount > 0 || isPayout) && ['COMPLETED', 'PAID', 'SUCCESS'].includes(status);
    };

    const expertIncomeTransactions = (transactions || [])
        .filter(getCompletedIncome)
        .map((tx) => {
            if (!tx) return null;
            return { ...tx, source: classifyExpertIncomeSource(tx.description) };
        })
        .filter((tx) => tx && (tx.source === 'APPOINTMENT' || tx.source === 'MESSAGE' || tx.source === 'SETTLEMENT'));

    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const minWithdrawAmount = isExpertUI ? 1 : 250;

    const todayEarning = expertIncomeTransactions
        .filter((tx) => new Date(tx.timestamp).toDateString() === now.toDateString())
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const weeklyEarning = expertIncomeTransactions
        .filter((tx) => new Date(tx.timestamp) >= startOfWeek)
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    // Filter transactions for Client View (exclude earnings/expert payouts)
    const clientTransactions = (transactions || []).filter(tx => {
        if (!tx) return false;
        const desc = (tx.description || '').toLowerCase();
        const isEarning = desc.includes('earned') || desc.includes('expert payout') || desc.includes('consultation earned');
        const isWithdrawal = desc.includes('withdrawal request (expert payout)');
        return !isEarning && !isWithdrawal;
    });

    if (loading || metadataLoading) return (
        <div className="profile-loading-overlay">
            <div className="loader-Expert"></div>
            <p>Loading Wallet...</p>
        </div>
    );

    return (
        <div className="wallet-page-wrapper animate-reveal">

            {isExpertUI ? (
                <div className="wallet-assets-grid">
                    <div className="wallet-asset-card asset-card-green">
                        <span className="asset-type-label">Today's Earnings</span>
                        <div className="asset-main-val">₹{todayEarning.toLocaleString()}</div>
                        <div className="asset-icon-watermark">💰</div>
                    </div>

                    <div className="wallet-asset-card asset-card-blue">
                        <span className="asset-type-label">Weekly Earnings</span>
                        <div className="asset-main-val">₹{weeklyEarning.toLocaleString()}</div>
                        <div className="asset-icon-watermark">📈</div>
                    </div>

                    <div className="wallet-asset-card asset-card-gold hero-cash">
                        <span className="asset-type-label">Total Payable</span>
                        <div className="asset-main-val">₹{earnedBalance.toLocaleString()}</div>
                        <div className="card-actions-row">
                            <button className="btn-card-action btn-add" onClick={() => {
                                if (earnedBalance <= 0) {
                                    alert("No funds available for withdrawal.");
                                    return;
                                }
                                if (window.confirm(`Request full withdrawal of ₹${earnedBalance.toLocaleString()}?`)) {
                                    handleWithdraw(earnedBalance);
                                }
                            }}>Request Payout</button>
                        </div>
                        <div className="asset-icon-watermark">🏛️</div>
                    </div>
                </div>
            ) : (
                <div className="wallet-assets-grid">
                {/* PRIMARY CASH BALANCE */}
                <div className="wallet-asset-card hero-cash">
                    <span className="asset-type-label">Cash Balance</span>
                    <div className="asset-main-val">₹{cashBalance.toLocaleString()}</div>
                    <div className="card-actions-row">
                        <button className="btn-card-action btn-add" onClick={() => setTopUpModal({ ...topUpModal, show: true })}>Top Up</button>
                        <button className="btn-card-action btn-withdraw-mini" onClick={() => setWithdrawModal({ ...withdrawModal, show: true })}>Withdraw</button>
                    </div>
                    <div className="asset-icon-watermark">🏛️</div>
                </div>

            </div>
            )}


            {/* TOP UP MODAL */}
            {!isExpertUI && topUpModal.show && (
                <div className="refill-modal-overlay animate-reveal" onClick={() => setTopUpModal({ ...topUpModal, show: false })}>
                    <div className="refill-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Top Up Cash Balance</h4>
                            <button className="btn-close-modal" onClick={() => setTopUpModal({ ...topUpModal, show: false })}>×</button>
                        </div>
                        <div className="modal-body-padd">
                            <div className="amount-grid">
                                {[150, 250, 500, 1000].map(amt => (
                                    <button key={amt} className="amt-pill" onClick={() => handleWalletTopUp(amt)}>₹{amt}</button>
                                ))}
                            </div>
                            <div className="custom-amt-wrapper">
                                <label>Or Enter Custom Amount (Min: ₹150)</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <input 
                                        type="number" 
                                        placeholder="Enter amount..." 
                                        className="custom-amt-input"
                                        value={topUpModal.customAmount}
                                        onChange={(e) => setTopUpModal({ ...topUpModal, customAmount: e.target.value })}
                                    />
                                    <button 
                                        className="btn-opt-buy" 
                                        disabled={!topUpModal.customAmount || parseFloat(topUpModal.customAmount) < 150}
                                        onClick={() => handleWalletTopUp(topUpModal.customAmount)}
                                    >
                                        PROCEED
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WITHDRAW MODAL */}
            {withdrawModal.show && (
                <div className="refill-modal-overlay animate-reveal" onClick={() => setWithdrawModal({ ...withdrawModal, show: false })}>
                    <div className="refill-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Withdraw Funds</h4>
                            <button className="btn-close-modal" onClick={() => setWithdrawModal({ ...withdrawModal, show: false })}>×</button>
                        </div>
                        <div className="modal-body-padd">
                            <div className="custom-amt-wrapper">
                                <label>Enter Withdrawal Amount (Min: ₹{minWithdrawAmount})</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                    <input 
                                        type="number" 
                                        placeholder="Enter amount..." 
                                        className="custom-amt-input"
                                        value={withdrawModal.customAmount}
                                        onChange={(e) => setWithdrawModal({ ...withdrawModal, customAmount: e.target.value })}
                                    />
                                    <button 
                                        className="btn-opt-buy" 
                                        style={{ background: '#ef4444' }}
                                        disabled={!withdrawModal.customAmount || parseFloat(withdrawModal.customAmount) < minWithdrawAmount}
                                        onClick={() => {
                                            handleWithdraw(withdrawModal.customAmount);
                                            setWithdrawModal({ show: false, customAmount: '' });
                                        }}
                                    >
                                        WITHDRAW
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                                    * Payout requests are batched weekly and released by admin after bank transfer confirmation.
                                </p>
                                {isExpertUI && (
                                    <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>
                                        * Today's earning auto-resets daily, monthly earning auto-resets each new month, main earning stays cumulative.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {message && <div className="wallet-status-banner">{message}</div>}


            <div className="wallet-history-section">
                <div className="history-header">
                    <h2>{isExpertUI ? 'Earnings History' : 'Transaction History'}</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isExpertUI && (
                            <button
                                className="saas-button-secondary"
                                onClick={() => setShowTxHistory((prev) => !prev)}
                            >
                                {showTxHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
                            </button>
                        )}
                    </div>
                </div>
                {(!isExpertUI || showTxHistory) && (
                <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="history-table" style={{ minWidth: '900px' }}>
                    <thead>
                        <tr>
                            <th>Ref ID</th>
                            <th>Transaction ID</th>
                            <th>Description</th>
                            {isExpertUI && <th>Source</th>}
                            <th>Date</th>
                            <th style={{textAlign: 'right', width: '100px'}}>Amount</th>
                            <th style={{textAlign: 'center', width: '120px'}}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(isExpertUI ? expertIncomeTransactions : clientTransactions).map(tx => (
                            <tr key={tx.id}>
                                <td style={{fontWeight: 700}}>{tx.id.substring(0, 8)}</td>
                                <td style={{fontFamily: 'monospace', fontSize: '0.75rem'}}>{tx.transactionId}</td>
                                <td style={{fontSize: '0.8rem'}}>{tx.description}</td>
                                {isExpertUI && <td style={{fontSize: '0.72rem', fontWeight: 700}}>{tx.source}</td>}
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
                        {(isExpertUI ? expertIncomeTransactions : clientTransactions).length === 0 && (
                            <tr>
                                <td colSpan={isExpertUI ? 7 : 6} style={{textAlign: 'center', padding: '40px', opacity: 0.5}}>
                                    {isExpertUI ? 'No expert earnings found yet.' : 'No entries found in the financial ledger.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
                )}
            </div>
        </div>
    );
};

export default Wallet;

