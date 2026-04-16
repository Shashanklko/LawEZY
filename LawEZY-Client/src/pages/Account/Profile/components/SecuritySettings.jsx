import React, { useState } from 'react';
import useAuthStore from '../../../../store/useAuthStore';
import apiClient from '../../../../services/apiClient';

const SecuritySettings = () => {
    const { user, logout } = useAuthStore();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [sessions, setSessions] = useState([]);

    React.useEffect(() => {
        const loadSessions = async () => {
            try {
                const res = await apiClient.get('/api/account/sessions');
                setSessions(res.data);
            } catch (err) {
                console.error("Failed to load session audits:", err);
            }
        };
        loadSessions();
    }, []);
    
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        
        setSaving(true);
        setMessage({ type: '', text: '' });
        
        try {
            await apiClient.post(`/api/users/${user.id}/change-password`, {
                current: passwords.current,
                new: passwords.new
            });
            setMessage({ type: 'success', text: 'Authentication synced successfully with core servers.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data || 'Failed to update credentials. Check current password.' });
        } finally {
            setSaving(false);
            setPasswords({ current: '', new: '', confirm: '' });
        }
    };

    const handleDisableProfile = async () => {
        if (window.confirm("Are you sure you want to temporarily disable your profile? You will be logged out and hidden from searches.")) {
            setActionLoading(true);
            try {
                await apiClient.post(`/api/users/${user.id}/disable`);
                alert("Profile disabled successfully. Signing out...");
                logout();
            } catch (err) {
                alert("Institutional override failed: " + (err.response?.data || 'Server Error'));
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleDeleteAccount = async () => {
        const confirmation = window.prompt("This action is IRREVERSIBLE. All data will be purged. Type 'PERMANENT DELETE' to confirm:");
        if (confirmation === 'PERMANENT DELETE') {
            setActionLoading(true);
            try {
                await apiClient.delete(`/api/users/${user.id}`);
                alert("Identity purged successfully. We value your past institutional presence.");
                logout();
            } catch (err) {
                alert("Purge failed: " + (err.response?.data || 'Server Error'));
            } finally {
                setActionLoading(false);
            }
        }
    };

    return (
        <div className="security-settings-container animate-reveal" style={{maxWidth: '800px'}}>
            {/* PASSWORD MANAGEMENT */}
            <div className="form-section">
                <h3 className="section-subtitle">Password Management</h3>
                <form onSubmit={handlePasswordChange}>
                    <div className="input-group">
                        <label>Current Credentials</label>
                        <input 
                            type="password" 
                            style={{fontSize: '0.7rem'}}
                            value={passwords.current} 
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>New Passphrase</label>
                            <input 
                                type="password" 
                                style={{fontSize: '0.7rem'}}
                                value={passwords.new} 
                                onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label>Confirm Entry</label>
                            <input 
                                type="password" 
                                style={{fontSize: '0.7rem'}}
                                value={passwords.confirm} 
                                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                                required 
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn-save-profile" style={{fontSize: '0.7rem', padding: '8px 20px'}} disabled={saving}>
                        {saving ? 'Synchronizing Backend...' : 'Update Authentication'}
                    </button>
                    {message.text && (
                        <div className={`status-msg ${message.type}`} style={{marginTop: '15px', fontSize: '0.65rem'}}>
                            {message.text}
                        </div>
                    )}
                </form>
            </div>

            {/* SECURITY LAYERS */}
            <div className="form-section">
                <h3 className="section-subtitle">Advanced Governance</h3>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                        <p style={{fontWeight: 700, fontSize: '0.75rem', marginBottom: '2px'}}>Two-Factor Authentication (2FA)</p>
                        <p style={{fontSize: '0.65rem', color: '#64748B'}}>Add an institutional encryption layer to your institutional sessions.</p>
                    </div>
                    <button 
                        className="btn-save-profile" 
                        disabled 
                        style={{
                            padding: '6px 15px', 
                            fontSize: '0.65rem', 
                            background: '#F1F5F9', 
                            color: '#94A3B8', 
                            border: '1px solid #E2E8F0',
                            cursor: 'not-allowed'
                        }}
                    >
                        COMING SOON
                    </button>
                </div>
            </div>

            {/* ACCOUNT GOVERNANCE / DANGER ZONE */}
            <div className="form-section" style={{borderColor: '#FEE2E2', background: '#FFF1F2'}}>
                <h3 className="section-subtitle" style={{color: '#9F1239'}}>Account Governance (Danger Zone)</h3>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #FFE4E6'}}>
                    <div style={{maxWidth: '70%'}}>
                        <p style={{fontWeight: 700, fontSize: '0.75rem', marginBottom: '2px', color: '#1E293B'}}>Temporarily Disable Account</p>
                        <p style={{fontSize: '0.6rem', color: '#9F1239'}}>Your profile will be hidden from the LawEZY network. All credentials and ledger data will be preserved for reactivation.</p>
                    </div>
                    <button 
                        onClick={handleDisableProfile}
                        disabled={actionLoading}
                        className="btn-save-profile" 
                        style={{padding: '6px 15px', fontSize: '0.65rem', background: 'transparent', border: '1px solid #FDA4AF', color: '#9F1239', cursor: 'pointer'}}
                    >
                        {actionLoading ? 'PROCESSING...' : 'DISABLE PROFILE'}
                    </button>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0 0 0'}}>
                    <div style={{maxWidth: '70%'}}>
                        <p style={{fontWeight: 700, fontSize: '0.75rem', marginBottom: '2px', color: '#1E293B'}}>Permanently Purge Account</p>
                        <p style={{fontSize: '0.6rem', color: '#9F1239', fontWeight: 600}}>This action is IRREVERSIBLE. All legal documents, financial history, and UIDs will be permanently expunged from LawEZY servers.</p>
                    </div>
                    <button 
                        onClick={handleDeleteAccount}
                        disabled={actionLoading}
                        className="btn-save-profile" 
                        style={{padding: '6px 15px', fontSize: '0.65rem', background: '#9F1239', color: 'white', cursor: 'pointer'}}
                    >
                        {actionLoading ? 'PURGING...' : 'DELETE ACCOUNT'}
                    </button>
                </div>
            </div>

            {/* SESSION AUDIT */}
            <div className="form-section">
                <h3 className="section-subtitle">Industrial Session Audit</h3>
                <div style={{fontSize: '0.65rem'}}>
                    {sessions.length > 0 ? sessions.map((s, idx) => (
                        <div key={s.id} style={{padding: '8px 0', borderBottom: idx < sessions.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', opacity: idx === 0 ? 1 : 0.6}}>
                            <span style={{color: '#1E293B', fontWeight: idx === 0 ? 600 : 400}}>
                                {s.summary}: {s.ipAddress || 'Unknown IP'}
                            </span>
                            <span style={{color: idx === 0 ? '#10B981' : '#64748B', fontWeight: 800}}>
                                {idx === 0 ? 'ACTIVE SESSION' : new Date(s.timestamp).toLocaleString()}
                            </span>
                        </div>
                    )) : (
                        <div style={{padding: '8px 0', color: '#64748B', fontStyle: 'italic'}}>Initializing Institutional Tracking...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
