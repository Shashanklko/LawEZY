import { create } from 'zustand';

/**
 * 📢 Global Toast Store
 * Manages institutional alerts and real-time popups.
 */
const useToastStore = create((set) => ({
    toasts: [],
    
    /**
     * @param {string} message - The notification content
     * @param {string} type - 'success' | 'error' | 'info' | 'payment' | 'appointment'
     */
    addToast: (message, type = 'info') => {
        const id = Date.now();
        const duration = 4500; // 4.5 seconds for optimal readability
        
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }));

        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, duration);
    },

    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));

export default useToastStore;
