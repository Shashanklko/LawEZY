import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      viewMode: null, // 'CLIENT' or 'EXPERT'
      systemMode: 'ACTIVE', // 'ACTIVE', 'TESTING', 'MAINTENANCE'
      floatingChatOpen: false,
      floatingChatDismissed: false,
      unreadCount: 0, // General notifications
      msgUnreadCount: 0, // Chat messages

      setUnreadCount: (count) => set({ unreadCount: count }),
      setMsgUnreadCount: (count) => set({ msgUnreadCount: count }),
      incrementMsgUnreadCount: () => set((state) => ({ msgUnreadCount: state.msgUnreadCount + 1 })),
      
      setSystemMode: (mode) => set({ systemMode: mode }),
      setFloatingChatOpen: (isOpen) => set({ floatingChatOpen: isOpen, floatingChatDismissed: false }),
      toggleFloatingChat: () => set((state) => ({ 
        floatingChatOpen: !state.floatingChatOpen,
        floatingChatDismissed: state.floatingChatOpen ? state.floatingChatDismissed : false // Reset dismiss when opening
      })),
      setFloatingChatDismissed: (isDismissed) => set({ floatingChatDismissed: isDismissed }),

      setAuth: (user, token) => {
        localStorage.setItem('lawezy_token', token);
        const roleStr = String(user?.role || '').toUpperCase();
        
        let initialViewMode = 'CLIENT';
        if (roleStr === 'ADMIN' || roleStr === 'MASTER_ADMIN') {
          initialViewMode = 'ADMIN';
        } else {
          const isExpert = ['LAWYER', 'CA', 'CFA', 'PRO', 'EXPERT', 'PROFESSIONAL'].some(r => 
            roleStr.includes(r)
          );
          initialViewMode = isExpert ? 'EXPERT' : 'CLIENT';
        }
        
        set({ user, token, isAuthenticated: true, viewMode: initialViewMode, impersonatedUser: null });
        set({ lastSeen: Date.now() }); // Refresh activity timer on login
      },

      logout: () => {
        localStorage.removeItem('lawezy_token');
        set({ user: null, token: null, isAuthenticated: false, viewMode: null, impersonatedUser: null });
      },

      updateUser: (userData) => {
        set((state) => ({ user: { ...state.user, ...userData } }));
      },

      toggleViewMode: () => {
        const currentMode = get().viewMode;
        const newMode = currentMode === 'CLIENT' ? 'EXPERT' : 'CLIENT';
        set({ viewMode: newMode });
      },

      impersonate: (user, mode) => {
        set({ impersonatedUser: user, viewMode: mode });
      },

      stopImpersonating: () => {
        set({ impersonatedUser: null, viewMode: 'ADMIN' }); // Assuming Admin mode
      },

      lastSeen: Date.now(),
      updateLastSeen: () => set({ lastSeen: Date.now() })
    }),
    {
      name: 'lawezy-auth-storage',
      version: 2, // V2: Purge stale mock-admin-token artifacts
      getStorage: () => localStorage,
      migrate: (persistedState, version) => {
        if (version < 2) {
          // Force full logout to purge any stale mock tokens
          localStorage.removeItem('lawezy_token');
          return { ...persistedState, user: null, token: null, isAuthenticated: false, viewMode: null };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.isAuthenticated && state.lastSeen) {
          const threeHoursInMs = 3 * 60 * 60 * 1000;
          const timeSinceLastSeen = Date.now() - state.lastSeen;
          
          if (timeSinceLastSeen > threeHoursInMs) {
            console.log("Institutional Security: Session expired (3hr+ inactivity). Initiating logout.");
            state.logout();
          } else {
            // Update lastSeen immediately on return to refresh the window
            state.updateLastSeen();
          }
        }
      }
    }
  )
);

export default useAuthStore;

