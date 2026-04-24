import { useState, useEffect, useCallback } from 'react';
import apiClient from './apiClient';

/**
 * Global Metadata Hook for Instant-Load (SWR) performance.
 * Persists critical user data (Profile, Wallet) in localStorage to eliminate
 * initial loading screens and perceived delay.
 */
const useMetadata = () => {
    const [profile, setProfile] = useState(() => {
        const cached = localStorage.getItem('lawezy_profile_cache');
        return cached ? JSON.parse(cached) : null;
    });

    const [wallet, setWallet] = useState(() => {
        const cached = localStorage.getItem('lawezy_wallet_cache');
        return cached ? JSON.parse(cached) : null;
    });

    const [loading, setLoading] = useState(true);

    const refreshMetadata = useCallback(async () => {
        try {
            const [profileRes, walletRes] = await Promise.allSettled([
                apiClient.get('/api/profiles/my'),
                apiClient.get('/api/wallet/balance')
            ]);

            if (profileRes.status === 'fulfilled') {
                const data = profileRes.value.data;
                setProfile(data);
                localStorage.setItem('lawezy_profile_cache', JSON.stringify(data));
            }

            if (walletRes.status === 'fulfilled') {
                const data = walletRes.value.data;
                setWallet(data);
                localStorage.setItem('lawezy_wallet_cache', JSON.stringify(data));
            }
        } catch (err) {
            console.error("Metadata background sync failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshMetadata();
    }, []);

    return { profile, wallet, loading, refreshMetadata };
};

export default useMetadata;

