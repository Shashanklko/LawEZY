import React, { useState, useEffect } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import apiClient from '../../../services/apiClient';
import ProfessionalEditor from './components/ProfessionalEditor';
import ClientEditor from './components/ClientEditor';
import SecuritySettings from './components/SecuritySettings';
import { Link, useNavigate } from 'react-router-dom';
import useMetadata from '../../../services/useMetadata';
import './Profile.css';

const Profile = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { profile: profileData, loading, refreshMetadata } = useMetadata();
    const [activeTab, setActiveTab] = useState('profile');
    const [processing, setProcessing] = useState(false);
    
    if (!user) {
        return (
            <div className="profile-loading-overlay">
                <div className="loader-institutional"></div>
                <p>Authenticating User Session...</p>
            </div>
        );
    }

    const isProfessional = ['LAWYER', 'CA', 'CFA', 'OTHER', 'PRO', 'EXPERT', 'PROFESSIONAL'].includes(user.role?.toUpperCase());
    
    // The Institutional ID is the primary identifier for all platform operations
    const id = profileData?.id || user.id;

    // Profile Completion Auditor (Calculates readiness for institutional verification)
    const calculateCompletion = () => {
        if (!profileData) return 0;
        const fields = [
            profileData.firstName || user.firstName,
            profileData.lastName || user.lastName,
            profileData.bio && profileData.bio.length > 20,
            profileData.title,
            profileData.location,
            profileData.phoneNumber || profileData.phone,
            profileData.barLicenseNumber || profileData.membershipNumber || profileData.charterNumber,
            profileData.licenseDriveLink,
            profileData.domains && profileData.domains.length > 0,
            profileData.educationList && profileData.educationList.length > 0,
            profileData.experienceList && profileData.experienceList.length > 0
        ];
        const completed = fields.filter(Boolean).length;
        return Math.round((completed / fields.length) * 100);
    };

    const completionPercentage = calculateCompletion();
    const isReadyForVerification = completionPercentage >= 60;
    
    const accountStatus = isProfessional 
        ? ((profileData?.verified || profileData?.isVerified) ? 'ACTIVE_FOR_EARNING' : 'PENDING_VERIFICATION')
        : 'ACTIVE';

    const isPending = accountStatus === 'PENDING_VERIFICATION';
    const isVerified = accountStatus === 'ACTIVE_FOR_EARNING';

    const handleProfileUpdate = () => {
        refreshMetadata();
    };

    const triggerSelfVerification = async () => {
        try {
            setProcessing(true);
            await apiClient.put('/api/profiles/my', {
                ...profileData,
                verified: true
            });
            await refreshMetadata();
            setProcessing(false);
            alert("Institutional Verification Triggered: Your dossier is now in the administrative audit queue.");
        } catch (err) {
            console.error("Verification Relay Failed:", err);
            setProcessing(false);
            const errorMsg = err.response?.data?.message || err.message || "Institutional Audit Failed";
            alert(`Audit Error: ${errorMsg}`);
        }
    };

    return (
        <div className="profile-page-container">
            <div className="profile-sidebar">
                {isProfessional && (
                    <button className="nav-item-btn back-to-dashboard-btn top-docked" onClick={() => navigate('/dashboard')}>
                        <span className="nav-icon">←</span> Back to Dashboard
                    </button>
                )}
                <div className="sidebar-user-glance">
                    <div className="avatar-preview-circle">
                        {(profileData?.firstName || user.firstName || 'U').charAt(0)}
                        {(profileData?.lastName || user.lastName || 'S').charAt(0)}
                    </div>
                    <div className="glance-info">
                        <span className="glance-name">
                            {profileData?.firstName || user.firstName || 'LawEZY'} {profileData?.lastName || user.lastName || 'User'}
                        </span>
                        <div className="glance-uid-tag">ID: {id}</div>
                        <span className="glance-role">{user.role}</span>
                    </div>
                </div>

                <nav className="profile-nav-vertical">
                    <button className={`nav-item-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                        <span className="nav-icon">👤</span> Account Profile
                    </button>
                    <button className={`nav-item-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                        <span className="nav-icon">🛡️</span> Security & Access
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className={`status-indicator ${accountStatus.toLowerCase()}`}>
                        <span className={`status-dot ${accountStatus === 'PENDING_VERIFICATION' ? 'pending' : 'online'}`}></span>
                        {accountStatus === 'ACTIVE_FOR_EARNING' && 'Active for Earning'}
                        {accountStatus === 'PENDING_VERIFICATION' && 'Pending Verification'}
                        {accountStatus === 'ACTIVE' && 'Account Active'}
                    </div>
                </div>
            </div>

            <main className="profile-main-content">
                <header className="profile-content-header-v2">
                    <div className="header-top-row">
                        <div className="header-spacer"></div>
                        <h1 className="centered-welcome">
                            Welcome back, <strong>{profileData?.firstName || user.firstName}</strong>
                        </h1>
                        <div className="header-actions-right">
                            {isProfessional && !isVerified && (
                                <button 
                                    className={`btn-verify-institutional ${!isReadyForVerification ? 'disabled' : ''}`}
                                    disabled={!isReadyForVerification || processing || isPending}
                                    onClick={triggerSelfVerification}
                                >
                                    {isPending ? 'AUDIT IN PROGRESS' : 'VERIFY YOUR PROFILE'}
                                </button>
                            )}
                            {isVerified && <span className="verified-badge-elite">✅ VERIFIED PRO</span>}
                        </div>
                    </div>

                    {isProfessional && (
                        <div className="governance-audit-banner">
                            {completionPercentage < 100 && (
                                <div className="completion-tracker">
                                    <div className="tracker-label">Dossier Completion: <strong>{completionPercentage}%</strong></div>
                                    <div className="tracker-bar">
                                        <div className="tracker-fill" style={{ width: `${completionPercentage}%` }}></div>
                                    </div>
                                </div>
                            )}

                            {!isVerified && !isPending && completionPercentage < 60 && (
                                <div className="banner-alert-msg warn">
                                    <span className="icon">⚠️</span>
                                    <span>Please complete essential details (min. 60%) to unlock institutional verification.</span>
                                </div>
                            )}

                            {!isVerified && !isPending && completionPercentage >= 60 && (
                                <div className="banner-alert-msg info">
                                    <span className="icon">🚀</span>
                                    <span>Your dossier meets the minimum threshold. Trigger the audit to activate your profile.</span>
                                </div>
                            )}

                            {isPending && (
                                <div className="banner-alert-msg processing">
                                    <span className="icon">⏳</span>
                                    <span>Your credentials have been submitted. Please wait while our administrators approve your account.</span>
                                </div>
                            )}
                        </div>
                    )}
                </header>

                <div className="profile-content-body">
                    {activeTab === 'profile' && (
                        isProfessional 
                            ? <ProfessionalEditor role={user.role} uid={id} profile={profileData} onUpdate={handleProfileUpdate} /> 
                            : <ClientEditor uid={id} profile={profileData} onUpdate={handleProfileUpdate} />
                    )}
                    
                    {activeTab === 'security' && <SecuritySettings />}
                </div>
            </main>
        </div>
    );
};

export default Profile;

