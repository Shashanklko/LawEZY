import React, { useState, useEffect } from 'react';
import apiClient from '../../../../services/apiClient';

const ClientEditor = ({ uid, profile, onUpdate }) => {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [formData, setFormData] = useState({
        firstname: profile?.firstName || '',
        lastname: profile?.lastName || '',
        email: profile?.email || '',
        phone: profile?.phoneNumber || '',
        address: profile?.address || '',
        location: profile?.location || '',
        bankName: profile?.bankName || '',
        accountNumber: profile?.accountNumber || '',
        ifscCode: profile?.ifscCode || '',
        accountHolderName: profile?.accountHolderName || '',
        upiId: profile?.upiId || ''
    });

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                ...profile,
                firstname: profile.firstName || prev.firstname,
                lastname: profile.lastName || prev.lastname,
                phone: profile.phoneNumber || prev.phone,
                address: profile.address || '',
                location: profile.location || '',
                bankName: profile.bankName || '',
                accountNumber: profile.accountNumber || '',
                ifscCode: profile.ifscCode || '',
                accountHolderName: profile.accountHolderName || '',
                upiId: profile.upiId || ''
            }));
        }
    }, [profile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await apiClient.get('/api/profiles/my'); // Verification fetch or use PUT response
            await apiClient.put('/api/profiles/my', {
                ...formData,
                uid: uid
            });
            const updated = await apiClient.get('/api/profiles/my');
            onUpdate(updated.data);
            setMessage({ type: 'success', text: 'Client dossier updated successfully on the LawEZY secure ledger.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Synchronization relay failed. Check your network or institutional access.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="professional-editor-form animate-reveal" onSubmit={handleSubmit}>
            <div className="form-section highlight">
                <h3 className="section-subtitle">Personal Identification</h3>
                <div className="form-row">
                    <div className="input-group">
                        <label>First Name (Institutional Record)</label>
                        <input name="firstname" value={formData.firstname} className="input-readonly" readOnly />
                    </div>
                    <div className="input-group">
                        <label>Last Name (Institutional Record)</label>
                        <input name="lastname" value={formData.lastname} className="input-readonly" readOnly />
                    </div>
                </div>
                <div className="form-row">
                    <div className="input-group">
                        <label>System UID (Institutional)</label>
                        <input value={uid} className="input-readonly" readOnly />
                    </div>
                    <div className="input-group">
                        <label>Contact Phone</label>
                        <input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            placeholder="+91 XXXXX XXXXX" 
                            maxLength={15}
                            required 
                        />
                    </div>
                </div>
            </div>

            <div className="form-section highlight-settlement" style={{marginTop: '20px', padding: '20px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)'}}>
                <h3 className="section-subtitle">Financial Settlement Coordinates <span className="mandatory-star">*</span></h3>
                <p className="section-hint-text" style={{fontSize: '0.8rem', opacity: 0.6, marginBottom: '15px'}}>Enter bank details for secure refunds and transaction audits.</p>
                
                <div className="form-row" style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                    <div className="input-group" style={{flex: 1}}>
                        <label>Bank Name <span className="mandatory-star">*</span></label>
                        <input name="bankName" value={formData.bankName || ''} onChange={handleChange} placeholder="e.g. HDFC Bank" required style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                    </div>
                    <div className="input-group" style={{flex: 1}}>
                        <label>Account Holder Name <span className="mandatory-star">*</span></label>
                        <input name="accountHolderName" value={formData.accountHolderName || ''} onChange={handleChange} placeholder="As per Bank Records" required style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                    </div>
                </div>

                <div className="form-row" style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                    <div className="input-group" style={{flex: 1}}>
                        <label>Account Number <span className="mandatory-star">*</span></label>
                        <input name="accountNumber" value={formData.accountNumber || ''} onChange={handleChange} placeholder="Full Account Number" required style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                    </div>
                    <div className="input-group" style={{flex: 1}}>
                        <label>IFSC Code <span className="mandatory-star">*</span></label>
                        <input name="ifscCode" value={formData.ifscCode || ''} onChange={handleChange} placeholder="e.g. HDFC0001234" required style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                    </div>
                </div>

                <div className="input-group">
                    <label>UPI ID <span className="mandatory-star">*</span></label>
                    <input name="upiId" value={formData.upiId || ''} onChange={handleChange} placeholder="e.g. username@upi" required style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                </div>
            </div>

            <div className="editor-actions">
                <button type="submit" className="btn-save-profile" disabled={saving}>
                    {saving ? 'Synchronizing Identity...' : 'Update Institutional Profile'}
                </button>
                {message.text && (
                    <div className={`status-msg ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </form>
    );
};

export default ClientEditor;

