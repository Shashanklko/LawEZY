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
        experience: profile?.experience || ''
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
                experience: profile.experience || prev.experience || ''
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

            if (!formData.consultationFee || formData.consultationFee < 99) {
                setMessage({ type: 'error', text: 'Institutional Audit: Minimum Consultation Fee is ₹99 for premium sessions.' });
                setSaving(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const res = await apiClient.put('/api/profiles/my', {
                ...formData,
                uid: uid
            });
            onUpdate(res.data);
            setMessage({ 
                type: 'success', 
                text: 'Dossier synchronized. Your profile has been queued for a fresh Institutional Audit to verify your latest milestones.' 
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
            <div className={`verification-status-banner ${ (profile?.isVerified || profile?.verified) ? 'verified' : 'pending'}`}>
                {(profile?.isVerified || profile?.verified) ? (
                    <><span className="status-icon">🛡️</span> Your professional dossier is fully audited and active in the marketplace.</>
                ) : (
                    <><span className="status-icon">⏳</span> Verification Pending: Your latest dossier updates are in the institutional audit queue.</>
                )}
            </div>
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
                            <option value="15+ Years">15+ Years (Strategic Senior)</option>
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
                <h3 className="section-subtitle">Expertise Bio & Strategic Profile <span className="mandatory-star">*</span></h3>
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


            <div className="form-section">
                <h3 className="section-subtitle">Liquidity & Settlement Controls <span className="mandatory-star">*</span></h3>
                <div className="input-group">
                    <label>Base Consultation Fee (₹ per Session) <span className="mandatory-star">*</span></label>
                    <input type="number" name="consultationFee" value={formData.consultationFee || 0} onChange={handleChange} style={{ width: '200px', fontSize: '1.2rem', fontWeight: 'bold' }} required />
                    
                    <div className="fee-breakdown-box animate-reveal">
                        <div className="fee-item client-view">
                            <span className="fee-label">Client Pays:</span>
                            <span className="fee-value">₹{Number(formData.consultationFee || 0) + 100}</span>
                            <small>(Includes ₹100 Institutional Fee)</small>
                        </div>
                        <div className="fee-item expert-view">
                            <span className="fee-label">Your Payout:</span>
                            <span className="fee-value payout">₹{Number(formData.consultationFee || 0) - 50}</span>
                            <small>(After ₹50 Platform Governance Fee)</small>
                        </div>
                    </div>
                                    </div>
                <div className="section-footer-action">
                    <button type="submit" className="btn-section-update" disabled={saving}>Update Fees</button>
                </div>
            </div>


            <div className="editor-actions">
                {message.text && (
                    <div className={`status-msg ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            
            <p className="activation-footer-hint">By clicking verify, you authorize LawEZY to audit your professional credentials.</p>
        </form>
    );
};

export default ProfessionalEditor;
