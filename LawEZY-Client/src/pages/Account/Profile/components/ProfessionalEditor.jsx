import React, { useState, useEffect } from 'react';
import apiClient from '../../../../services/apiClient';
import './ProfessionalEditor.css';

const ProfessionalEditor = ({ role, uid, profile, onUpdate }) => {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [formData, setFormData] = useState({
        firstname: profile?.firstName || '',
        lastname: profile?.lastName || '',
        title: profile?.title || '',
        location: profile?.location || '',
        bio: profile?.bio || '',
        licenseNumber: profile?.barLicenseNumber || profile?.membershipNumber || profile?.charterNumber || '',
        issuingAuthority: profile?.issuingAuthority || '',
        licenseDriveLink: profile?.licenseDriveLink || '',
        youtubeLink: profile?.youtubeLink || '',
        linkedinLink: profile?.linkedinLink || '',
        websiteLink: profile?.websiteLink || '',
        consultationFee: profile?.consultationFee || 499,
        domains: profile?.domains || [],
        educationList: profile?.educationList || [],
        experienceList: profile?.experienceList || [],
        experienceSnapshots: profile?.experienceSnapshots || [],
        email: profile?.email || '',
        phone: profile?.phoneNumber || '',
        experience: profile?.experience || '',
        textChatFee: profile?.textChatFee || 100,
        chatDurationMinutes: profile?.chatDurationMinutes || 20,
        bankName: profile?.bankName || '',
        accountNumber: profile?.accountNumber || '',
        ifscCode: profile?.ifscCode || '',
        accountHolderName: profile?.accountHolderName || '',
        upiId: profile?.upiId || '',
        docAuditFee: 0 // Decommissioned
    });


    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                ...profile,
                firstname: profile.firstName || prev.firstname || '',
                lastname: profile.lastName || prev.lastname || '',
                licenseNumber: profile.barLicenseNumber || profile.membershipNumber || profile.charterNumber || prev.licenseNumber || '',
                domains: profile.domains || [],
                educationList: profile.educationList || [],
                experienceList: profile.experienceList || [],
                experienceSnapshots: profile.experienceSnapshots || [],
                email: profile.email || prev.email || '',
                phone: profile.phoneNumber || prev.phone || '',
                experience: profile.experience || prev.experience || '',
                textChatFee: profile.textChatFee || prev.textChatFee || 100,
                chatDurationMinutes: profile.chatDurationMinutes || prev.chatDurationMinutes || 20,
                bankName: profile.bankName || prev.bankName || '',
                accountNumber: profile.accountNumber || prev.accountNumber || '',
                ifscCode: profile.ifscCode || prev.ifscCode || '',
                accountHolderName: profile.accountHolderName || prev.accountHolderName || '',
                upiId: profile.upiId || prev.upiId || '',
                docAuditFee: 0
            }));

        }
    }, [profile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addEducation = () => {
        setFormData(prev => ({
            ...prev,
            educationList: [...prev.educationList, { degree: '', institute: '', year: '' }]
        }));
    };

    const removeEducation = (index) => {
        setFormData(prev => ({
            ...prev,
            educationList: prev.educationList.filter((_, i) => i !== index)
        }));
    };

    const updateEducation = (index, field, value) => {
        const newList = [...formData.educationList];
        newList[index][field] = value;
        setFormData(prev => ({ ...prev, educationList: newList }));
    };

    const addExperience = () => {
        setFormData(prev => ({
            ...prev,
            experienceList: [...prev.experienceList, { designation: '', company: '', start: '', end: '' }]
        }));
    };

    const removeExperience = (index) => {
        setFormData(prev => ({
            ...prev,
            experienceList: prev.experienceList.filter((_, i) => i !== index)
        }));
    };

    const updateExperience = (index, field, value) => {
        const newList = [...formData.experienceList];
        newList[index][field] = value;
        setFormData(prev => ({ ...prev, experienceList: newList }));
    };

    const addSnapshot = () => {
        setFormData(prev => ({
            ...prev,
            experienceSnapshots: [...prev.experienceSnapshots, { title: '', link: '', category: 'CASE' }]
        }));
    };

    const removeSnapshot = (index) => {
        setFormData(prev => ({
            ...prev,
            experienceSnapshots: prev.experienceSnapshots.filter((_, i) => i !== index)
        }));
    };

    const updateSnapshot = (index, field, value) => {
        const newList = [...formData.experienceSnapshots];
        newList[index][field] = value;
        setFormData(prev => ({ ...prev, experienceSnapshots: newList }));
    };

    const getDomainsByRole = () => {
        const r = role?.toUpperCase();
        const legalDomains = [
            'Administrative Law', 'ADR / Arbitration', 'Alimony & Maintenance', 'Antitrust Law', 
            'Banking & Finance', 'Bankruptcy & Insolvency', 'Capital Markets', 'Civil Litigation', 
            'Constitutional Law', 'Corporate Law', 'Criminal Defense', 'Cyber & IT Law', 
            'Data Privacy', 'Divorce & Matrimonial', 'Education Law', 'Election Law', 
            'Energy & Resources', 'Entertainment & Sports', 'Environmental Law', 'Family & Domestic Relations', 
            'Franchising Law', 'GST & Indirect Tax', 'Health Care Law', 'Immigration Law', 
            'Insurance Law', 'IP Law (Patent/TM)', 'International Trade', 'Labor & Employment', 
            'Land Use & Zoning', 'M&A / Deal Advisory', 'Maritime Law', 'Media Law', 
            'Military Law', 'Municipal Law', 'Nonprofit Law', 'Oil & Gas Law', 
            'Personal Injury', 'Product Liability', 'Public Utility Law', 'Real Estate Law', 
            'Technology Law', 'Toxic Torts', 'Trusts & Estates', 'Venture Capital', 
            'White Collar Crime', 'Other Legal Matters'
        ];

        const financialDomains = [
            'Audit & Assurance', 'Business Valuation', 'Cost Accountancy', 'Direct Taxation',
            'Financial Advisory', 'Fixed Income Analysis', 'Forensic Accounting', 'GST Compliance',
            'Internal Audit', 'Insolvency Professional', 'Management Consultancy', 'Portfolio Management',
            'Quantitative Analysis', 'Risk Management', 'Statutory Audit', 'Transfer Pricing',
            'Wealth Management'
        ];

        if (r === 'LAWYER') return legalDomains.sort();
        return financialDomains.sort();
    };

    const domainOptions = getDomainsByRole();

    const handleDomainToggle = (domain) => {
        const currentDomains = [...formData.domains];
        if (currentDomains.includes(domain)) {
            setFormData(prev => ({ ...prev, domains: currentDomains.filter(d => d !== domain) }));
        } else {
            setFormData(prev => ({ ...prev, domains: [...currentDomains, domain] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.domains || formData.domains.length === 0) {
                setMessage({ type: 'error', text: 'Institutional Audit: At least one Practice Domain must be selected to proceed.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            if (!formData.bio || formData.bio.trim().length < 50) {
                setMessage({ type: 'error', text: 'Institutional Audit: Professional Biography must be at least 50 characters for credibility.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (!formData.educationList || formData.educationList.length === 0) {
                setMessage({ type: 'error', text: 'Institutional Audit: At least one Academic Pedigree milestone is required.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (!formData.consultationFee || formData.consultationFee < 500) {
                setMessage({ type: 'error', text: 'Institutional Audit: Minimum Consultation Fee is ₹500 for premium sessions.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (formData.consultationFee > 10000) {
                setMessage({ type: 'error', text: 'Institutional Audit: Maximum Consultation Fee is capped at ₹10,000.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            if (formData.textChatFee < 50 || formData.textChatFee > 250) {
                 setMessage({ type: 'error', text: 'Institutional Audit: Text Message blocks must be between ₹50 and ₹250.' });
                 setSaving(false);
                 window.scrollTo({ top: 0, behavior: 'smooth' });
                 return;
            }

            if (!formData.bankName || !formData.accountNumber || !formData.ifscCode || !formData.accountHolderName || !formData.upiId) {
                setMessage({ type: 'error', text: 'Institutional Audit: Complete Bank Details are mandatory for professional payouts.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const res = await apiClient.put('/api/profiles/my', {
                ...formData,
                chatDurationMinutes: 10,
                uid: uid
            });
            
            const isNowVerified = res.data.isVerified || res.data.verified;
            onUpdate(res.data);
            
            setMessage({ 
                type: 'success', 
                text: isNowVerified 
                    ? 'Dossier synchronized successfully. Your verified status remains active.' 
                    : 'Dossier synchronized. Your profile has been queued for a fresh Institutional Audit to verify your latest credential updates.' 
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Sync Error:", err);
            const errMsg = err.response?.data?.message || "Synchronization failed. Institutional server currently unavailable.";
            setMessage({ type: 'error', text: errMsg });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="professional-editor-form animate-reveal" onSubmit={handleSubmit}>
            <div className="form-section highlight">
                <h3 className="section-subtitle">Credential Identification</h3>
                <div className="form-row">
                    <div className="input-group">
                        <label>First Name (Institutional Record)</label>
                        <input name="firstname" value={formData.firstname || ''} className="input-readonly" readOnly />
                    </div>
                    <div className="input-group">
                        <label>Last Name (Institutional Record)</label>
                        <input name="lastname" value={formData.lastname || ''} className="input-readonly" readOnly />
                    </div>

                </div>
                <div className="form-row">
                    <div className="input-group">
                        <label>Account UID (Permanent)</label>
                        <input value={uid || ''} className="input-readonly" readOnly />
                    </div>
                    <div className="input-group">
                        <label>Professional Designation</label>
                        <input name="title" value={formData.title || ''} onChange={handleChange} placeholder="e.g. Senior Litigator, Supreme Court" required />
                    </div>
                </div>
                <div className="form-row">
                    <div className="input-group">
                        <label>Contact Phone <span className="mandatory-star">*</span></label>
                        <input 
                            name="phone" 
                            value={formData.phone || ''} 
                            onChange={handleChange} 
                            placeholder="+91 XXXXX XXXXX" 
                            maxLength={15}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Official Email (Institutional)</label>
                        <input name="email" value={formData.email || ''} className="input-readonly" readOnly />
                    </div>
                </div>
                <div className="form-row">
                    <div className="input-group">
                        <label>Official Location (City, State) <span className="mandatory-star">*</span></label>
                        <input name="location" value={formData.location || ''} onChange={handleChange} placeholder="e.g. New Delhi, India" required />
                    </div>
                    <div className="input-group">
                        <label>Total Experience <span className="mandatory-star">*</span></label>
                        <select name="experience" value={formData.experience || ''} onChange={handleChange} required>
                            <option value="">Select Seniority</option>
                            <option value="Fresher">Fresher (New Professional)</option>
                            <option value="1 Year">1 Year</option>
                            {[...Array(13)].map((_, i) => (
                                <option key={i+2} value={`${i+2} Years`}>{i+2} Years</option>
                            ))}
                            <option value="15+ Years">15+ Years (Institutional Senior)</option>
                        </select>
                    </div>
                </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Identification</button>
                </div>
            </div>


            <div className="form-section">
                <h3 className="section-subtitle">Regulatory Verification & Authority</h3>
                <div className="form-row">
                    <div className="input-group">
                        <label>{role === 'LAWYER' ? 'Bar License Number' : 'Membership Number'} <span className="mandatory-star">*</span></label>
                        <input name="licenseNumber" value={formData.licenseNumber || ''} onChange={handleChange} placeholder="e.g. D/2023/123" required />
                    </div>
                    <div className="input-group">
                        <label>Issuing Authority <span className="mandatory-star">*</span></label>
                        <input name="issuingAuthority" value={formData.issuingAuthority || ''} onChange={handleChange} placeholder="e.g. Bar Council of Delhi" required />
                    </div>
                </div>

                <div className="input-group">
                    <label>Drive Link to Verification Certificate <span className="mandatory-star">*</span></label>
                    <input name="licenseDriveLink" value={formData.licenseDriveLink || ''} onChange={handleChange} placeholder="Paste public drive/dropbox link here" required />
                </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Authority</button>
                </div>
            </div>


            <div className="form-section">
                <h3 className="section-subtitle">Expertise Bio & Institutional Profile <span className="mandatory-star">*</span></h3>
                <div className="input-group">
                    <label>Professional Biography (High Density Summary) <span className="mandatory-star">*</span></label>
                    <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="5" required />
                </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Bio</button>
                </div>
            </div>


            <div className="form-section">
                <h3 className="section-subtitle">Discipline-Specific Practice Domains <span className="mandatory-star">*</span></h3>
                <div className="domain-selector-grid">
                    {(domainOptions || []).map(d => (
                        <button key={d} type="button" className={`domain-chip-btn ${(formData.domains || []).includes(d) ? 'active' : ''}`} onClick={() => handleDomainToggle(d)}>
                            {d}
                        </button>
                    ))}
                </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Domains</button>
                </div>
            </div>


            <div className="form-section">
                <div className="section-header-row">
                    <h3 className="section-subtitle">Academic Pedigree <span className="mandatory-star">*</span></h3>
                    <button type="button" className="btn-add-small" onClick={addEducation}>+ Add Education Milestone</button>
                </div>
                {(formData.educationList || []).map((edu, idx) => (
                    <div key={idx} className="dynamic-entry-card">
                        <button type="button" className="btn-remove-milestone" onClick={() => removeEducation(idx)} title="Remove Milestone">×</button>
                        <div className="form-row">
                            <input placeholder="Name of Degree" value={edu.degree || ''} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} />
                            <input placeholder="Institute / University" value={edu.institute || ''} onChange={(e) => updateEducation(idx, 'institute', e.target.value)} />
                        </div>
                        <div className="form-row">
                             <input placeholder="Degree / Certificate Credential Link" value={edu.credentialLink || ''} onChange={(e) => updateEducation(idx, 'credentialLink', e.target.value)} />
                             <input placeholder="Pass out Year" value={edu.year || ''} onChange={(e) => updateEducation(idx, 'year', e.target.value)} style={{width: '150px'}} />
                        </div>
                    </div>
                ))}
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Pedigree</button>
                </div>
            </div>


            <div className="form-section">
                <div className="section-header-row">
                    <h3 className="section-subtitle">Professional Experience Journey</h3>
                    <button type="button" className="btn-add-small" onClick={addExperience}>+ Add Professional Chapter</button>
                </div>
                {(formData.experienceList || []).map((exp, idx) => (
                    <div key={idx} className="dynamic-entry-card">
                        <button type="button" className="btn-remove-milestone" onClick={() => removeExperience(idx)} title="Remove Chapter">×</button>
                        <div className="form-row">
                            <input placeholder="Designation" value={exp.designation || ''} onChange={(e) => updateExperience(idx, 'designation', e.target.value)} />
                            <input placeholder="Organization" value={exp.company || ''} onChange={(e) => updateExperience(idx, 'company', e.target.value)} />
                        </div>
                        <div className="form-row" style={{marginTop: '10px'}}>
                            <input placeholder="Start Year" value={exp.start || ''} onChange={(e) => updateExperience(idx, 'start', e.target.value)} />
                            <input placeholder="End Year (or Present)" value={exp.end || ''} onChange={(e) => updateExperience(idx, 'end', e.target.value)} />
                        </div>
                    </div>
                ))}
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Journey</button>
                </div>
            </div>


            <div className="form-section">
                <div className="section-header-row">
                    <h3 className="section-subtitle">Experience Snapshots (Direct Proof & Portfolio)</h3>
                    <button type="button" className="btn-add-small" onClick={addSnapshot}>+ Add Institutional Proof</button>
                </div>
                {(formData.experienceSnapshots || []).map((snap, idx) => (
                    <div key={idx} className="dynamic-entry-card snapshot-entry">
                        <div className="form-row">
                            <input 
                                placeholder="Descriptive Title (e.g. Landmark Case, Award Title)" 
                                value={snap.title || ''} 
                                onChange={(e) => updateSnapshot(idx, 'title', e.target.value)} 
                                style={{flex: 1}}
                            />
                            <select 
                                value={snap.category || 'CASE'} 
                                onChange={(e) => updateSnapshot(idx, 'category', e.target.value)}
                                style={{width: '120px'}}
                            >
                                <option value="CASE">Case Record</option>
                                <option value="AWARD">Award / Merit</option>
                                <option value="MEDIA">Media / Article</option>
                                <option value="CSR">Social Proof</option>
                            </select>
                        </div>
                        <div className="form-row" style={{marginTop: '10px'}}>
                            <input 
                                placeholder="Proof URL (Drive Link, LinkedIn Post, News Article)" 
                                value={snap.link || ''} 
                                onChange={(e) => updateSnapshot(idx, 'link', e.target.value)} 
                            />
                        </div>
                    </div>
                ))}
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Portfolio Proof</button>
                </div>
            </div>


            <div className="form-section">
                <h3 className="section-subtitle">Digital Footprint & Social Presence</h3>
                <div className="form-row">
                    <div className="input-group">
                        <label>LinkedIn Professional Profile</label>
                        <input name="linkedinLink" value={formData.linkedinLink || ''} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
                    </div>
                    <div className="input-group">
                        <label>YouTube Channel / Portfolio</label>
                        <input name="youtubeLink" value={formData.youtubeLink || ''} onChange={handleChange} placeholder="https://youtube.com/@..." />
                    </div>
                </div>

                <div className="input-group">
                    <label>Professional Website / Chamber URL</label>
                    <input name="websiteLink" value={formData.websiteLink || ''} onChange={handleChange} placeholder="https://yourchamber.com" />
                </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Footprint</button>
                </div>
            </div>


            <div className="form-section highlight-settlement">
                <h3 className="section-subtitle">Financial Settlement Coordinates <span className="mandatory-star">*</span></h3>
                <p className="section-hint-text">Enter your precise bank details for institutional payouts and earnings withdrawals.</p>
                
                <div className="form-row">
                    <div className="input-group">
                        <label>Bank Name <span className="mandatory-star">*</span></label>
                        <input name="bankName" value={formData.bankName || ''} onChange={handleChange} placeholder="e.g. HDFC Bank, ICICI Bank" required />
                    </div>
                    <div className="input-group">
                        <label>Account Holder Name <span className="mandatory-star">*</span></label>
                        <input name="accountHolderName" value={formData.accountHolderName || ''} onChange={handleChange} placeholder="As per Bank Records" required />
                    </div>
                </div>

                <div className="form-row">
                    <div className="input-group">
                        <label>Account Number <span className="mandatory-star">*</span></label>
                        <input name="accountNumber" value={formData.accountNumber || ''} onChange={handleChange} placeholder="Enter Full Account Number" required />
                    </div>
                    <div className="input-group">
                        <label>IFSC Code <span className="mandatory-star">*</span></label>
                        <input name="ifscCode" value={formData.ifscCode || ''} onChange={handleChange} placeholder="e.g. HDFC0001234" required />
                    </div>
                </div>

                <div className="input-group">
                    <label>UPI ID (Primary for Settlement) <span className="mandatory-star">*</span></label>
                    <input name="upiId" value={formData.upiId || ''} onChange={handleChange} placeholder="e.g. username@okaxis" required />
                </div>

                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Bank Details</button>
                </div>
            </div>


            <div className="form-section" style={{ gap: '15px' }}>
                <h3 className="section-subtitle" style={{ marginBottom: '5px' }}>Liquidity & Settlement Controls <span className="mandatory-star">*</span></h3>
                
                <div className="controls-side-by-side" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* LEFT: SESSION FEES */}
                    <div className="control-group-block" style={{ flex: 1, minWidth: '300px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>Consultation (1:1 Session)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Payout:</span>
                            <input type="number" name="consultationFee" value={formData.consultationFee || 0} onChange={handleChange} style={{ width: '100px', fontSize: '1rem', fontWeight: 'bold', padding: '6px' }} min="500" max="10000" required />
                        </div>
                        <small style={{ fontSize: '0.65rem', opacity: 0.5 }}>Range: ₹500 - ₹10,000</small>
                        
                        <div className="fee-breakdown-box animate-reveal" style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
                            <div className="fee-item client-view" style={{ marginBottom: '4px' }}>
                                <span className="fee-label" style={{ fontSize: '0.5rem' }}>Client Total:</span>
                                <span className="fee-value" style={{ fontSize: '0.9rem' }}>₹{Math.round(Number(formData.consultationFee || 0) * 1.2 + 50)}</span>
                            </div>
                            <small style={{ fontSize: '0.6rem', opacity: 0.5, lineHeight: 1 }}>Incl. 20% + Handling</small>
                        </div>
                    </div>

                    {/* RIGHT: MESSAGE FEES */}
                    <div className="control-group-block" style={{ flex: 1, minWidth: '300px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '20px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>Messaging (10 Min Block)</label>
                        <div className="form-row" style={{ alignItems: 'center', gap: '8px', display: 'flex', marginTop: '5px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>Fee:</span>
                                <input type="number" name="textChatFee" value={formData.textChatFee || 0} onChange={handleChange} style={{ width: '70px', fontSize: '1rem', padding: '6px' }} min="50" max="250" required />
                            </div>
                            <div style={{ width: '100px', padding: '6px', fontSize: '0.75rem', background: 'var(--heritage-stone)', borderRadius: '4px', textAlign: 'center', fontWeight: 700 }}>
                                10 MINUTES
                            </div>
                        </div>
                        <small style={{ fontSize: '0.65rem', opacity: 0.5 }}>Range: ₹50 - ₹250</small>
                        
                        <div className="fee-breakdown-box animate-reveal" style={{ marginTop: '10px', padding: '10px', background: 'rgba(67, 97, 238, 0.03)', borderStyle: 'dashed' }}>
                             <div className="fee-item expert-view" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="fee-label" style={{ fontSize: '0.5rem' }}>Your 80%:</span>
                                <span className="fee-value payout" style={{ fontSize: '0.9rem' }}>₹{Math.round(Number(formData.textChatFee || 0) * 0.8)}</span>
                            </div>
                            <small style={{ fontSize: '0.6rem', opacity: 0.5, lineHeight: 1 }}>Initial trial for clients</small>
                        </div>
                    </div>

                    {/* DOCUMENT AUDIT FEES removed as part of chat pivot */}
                </div>

                <div className="section-footer-action" style={{ marginTop: '10px', borderTop: 'none' }}>
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Fees</button>
                </div>
            </div>


            <div className="editor-master-actions">
                {message.text && (
                    <div className={`status-msg-v2 ${message.type}`}>
                        <span className="msg-icon">{message.type === 'success' ? '✅' : '❌'}</span>
                        {message.text}
                    </div>
                )}
                
                <button type="submit" className="btn-master-save" disabled={saving}>
                    {saving ? 'SYNCHRONIZING DOSSIER...' : 'SAVE & SYNCHRONIZE ALL CREDENTIALS'}
                </button>
            </div>

            
            <p className="activation-footer-hint">By clicking verify, you authorize LawEZY to audit your professional credentials.</p>
        </form>
    );
};

export default ProfessionalEditor;

