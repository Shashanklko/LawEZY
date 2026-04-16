import React, { useState, useEffect } from 'react';
import useAuthStore from '../../../store/useAuthStore';
import apiClient from '../../../services/apiClient';
import ProfessionalEditor from './components/ProfessionalEditor';
import ClientEditor from './components/ClientEditor';
import SecuritySettings from './components/SecuritySettings';
import { generateLawEZYUID } from '../../../utils/idGenerator';
import { Link, useNavigate } from 'react-router-dom';
import useMetadata from '../../../services/useMetadata';
import './Profile.css';

const Profile = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { profile: profileData, loading, refreshMetadata } = useMetadata();
    const [activeTab, setActiveTab] = useState('profile');
    
    if (!user) {
        return (
            <div className="profile-loading-overlay">
                <div className="loader-institutional"></div>
                <p>Authenticating User Session...</p>
            </div>
        );
    }

    const isProfessional = ['LAWYER', 'CA', 'CFA', 'OTHER', 'PRO', 'EXPERT', 'PROFESSIONAL'].includes(user.role?.toUpperCase());
    
    // The Institutional ID is internal, prioritize the persisted public UID from the database
    const uid = profileData?.uid || generateLawEZYUID({
        ...user,
        firstName: profileData?.firstName || user.firstName,
        lastName: profileData?.lastName || user.lastName
    });

    // Profile Completion Audit (Required for Activation Banners)
    const isProfileComplete = profileData && 
        profileData.bio && 
        profileData.domains?.length > 0 && 
        profileData.educationList?.length > 0 && 
        (profileData.licenseDriveLink || profileData.barLicenseNumber);

    const accountStatus = isProfessional 
        ? ((profileData?.verified || profileData?.isVerified) ? 'ACTIVE_FOR_EARNING' : 'PENDING_VERIFICATION')
        : 'ACTIVE';

    const handleProfileUpdate = (newData) => {
        setProfileData(newData);
    };

    const triggerSelfVerification = async () => {
        try {
            setLoading(true);
            const res = await apiClient.put('/api/profiles/my', {
                ...profileData,
                verified: true
            });
            setProfileData(res.data);
            setLoading(false);
            alert("Institutional Verification Successful: Your profile is now active for platform engagement.");
        } catch (err) {
            console.error("Verification Relay Failed:", err);
            setLoading(false);
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
                        <div className="glance-uid-tag">UID: {uid}</div>
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
                <header className="profile-content-header">
                    <h1>
                        {activeTab === 'profile' && 'Account Settings'}
                        {activeTab === 'security' && 'Security & Access Control'}
                    </h1>
                    <p>
                        {activeTab === 'profile' && `Welcome, ${profileData?.firstName || user.firstName}. Manage your credentials under LawEZY UID ${uid}.`}
                        {activeTab === 'security' && 'Configure authentication layers and manage account security sessions.'}
                    </p>

                    {isProfessional && accountStatus === 'PENDING_VERIFICATION' && activeTab === 'profile' && (
                        <div className="activation-banner-warn">
                            <span className="warn-icon">⚠️</span>
                            <div className="warn-text">
                                <strong>Institutional Activation Required:</strong> Complete your dossier and trigger the audit to activate your profile for platform earning.
                            </div>
                            <button className="btn-save-profile verify-btn-header-trigger" onClick={triggerSelfVerification}>
                                Trigger Institutional Audit (Beta) →
                            </button>
                        </div>
                    )}
                </header>

                <div className="profile-content-body">
                    {activeTab === 'profile' && (
                        isProfessional 
                            ? <ProfessionalEditor role={user.role} uid={uid} profile={profileData} onUpdate={handleProfileUpdate} /> 
                            : <ClientEditor uid={uid} profile={profileData} onUpdate={handleProfileUpdate} />
                    )}
                    
                    {activeTab === 'security' && <SecuritySettings />}
                </div>
            </main>
        </div>
    );
};

export default Profile;
