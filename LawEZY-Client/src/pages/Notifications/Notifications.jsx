import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import apiClient from '../../services/apiClient';
import { getSocket } from '../../services/socket';
import './Notifications.css';

// ─── Category Config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'ALL',
    label: 'All',
    icon: '⚡',
    color: '#7f1d1d',
    desc: 'Complete alert history'
  },
  {
    id: 'FINANCIAL',
    label: 'Financial',
    icon: '₹',
    color: '#059669',
    desc: 'Wallet, deposits & revenue'
  },
  {
    id: 'ENGAGEMENT',
    label: 'Engagement',
    icon: '📅',
    color: '#2563eb',
    desc: 'Consultations & reminders'
  },
  {
    id: 'SOCIAL',
    label: 'Social',
    icon: '💬',
    color: '#7c3aed',
    desc: 'Community activity'
  },
  {
    id: 'SYSTEM',
    label: 'System',
    icon: '🛡️',
    color: '#64748b',
    desc: 'Platform & security alerts'
  },
];

// ─── Utility: parse timestamp from array or string ────────────────────────────
const parseTimestamp = (ts) => {
  if (!ts) return null;
  try {
    if (Array.isArray(ts)) {
      const [y, m, d, h, min, s] = ts;
      return new Date(y, m - 1, d, h, min, s || 0);
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const timeAgo = (ts) => {
  const date = parseTimestamp(ts);
  if (!date) return 'Just now';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatFull = (ts) => {
  const date = parseTimestamp(ts);
  if (!date) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ─── Type → icon mapping ───────────────────────────────────────────────────────
const typeIcon = (type, category) => {
  const t = (type || '').toUpperCase();
  const c = (category || '').toUpperCase();
  if (c === 'FINANCIAL' || t === 'PAYMENT') return '₹';
  if (t === 'APPOINTMENT') return '📅';
  if (t === 'MESSAGE') return '💬';
  if (t === 'SOCIAL') return '❤️';
  if (t === 'ENGAGEMENT') return '🔔';
  return '🛡️';
};

const typeColor = (category) => {
  const cat = CATEGORIES.find(c => c.id === (category || '').toUpperCase());
  return cat ? cat.color : '#64748b';
};

// ─── Component ─────────────────────────────────────────────────────────────────
const Notifications = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('ALL');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const userId = user?.uid || user?.id;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/notifications?userId=${userId}`);
      setNotifications(res.data?.data || []);
    } catch (e) {
      console.warn('[NOTIFICATIONS] Fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/notifications/unread-count?userId=${userId}`);
      setUnreadCount(res.data?.data || 0);
    } catch { /* silent */ }
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchAll();
    fetchUnread();
  }, [isAuthenticated, fetchAll, fetchUnread, navigate]);

  // ── Real-time pulse ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = getSocket(token);
    const handler = (n) => {
      setNotifications(prev => [n, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification_received', handler);
    return () => socket.off('notification_received', handler);
  }, [isAuthenticated, token]);

  // ── Mark one read ──────────────────────────────────────────────────────────
  const markRead = async (id, actionLink) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
    if (actionLink) navigate(actionLink);
  };

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await apiClient.put(`/api/notifications/mark-all-read?userId=${userId}`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ } finally {
      setMarkingAll(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = activeTab === 'ALL'
    ? notifications
    : notifications.filter(n => (n.category || '').toUpperCase() === activeTab);

  const tabUnread = (tabId) => tabId === 'ALL'
    ? notifications.filter(n => !n.read).length
    : notifications.filter(n => !n.read && (n.category || '').toUpperCase() === tabId).length;

  return (
    <div className="nh-page">
      {/* ─ Header ───────────────────────────────────────────────────────────── */}
      <div className="nh-header">
        <div className="nh-header-left">
          <button className="nh-back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div>
            <h1 className="nh-title">Notification Centre</h1>
            <p className="nh-subtitle">
              {unreadCount > 0
                ? <><span className="nh-unread-pill">{unreadCount}</span> unread alerts across your institutional account</>
                : 'You\'re all caught up — no pending alerts'
              }
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button className="nh-mark-all-btn" onClick={markAllRead} disabled={markingAll}>
            {markingAll ? (
              <><span className="nh-spinner" />Clearing...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Mark all read</>
            )}
          </button>
        )}
      </div>

      {/* ─ Category Tabs ────────────────────────────────────────────────────── */}
      <div className="nh-tabs">
        {CATEGORIES.map(cat => {
          const count = tabUnread(cat.id);
          return (
            <button
              key={cat.id}
              className={`nh-tab ${activeTab === cat.id ? 'active' : ''}`}
              style={{ '--tab-color': cat.color }}
              onClick={() => setActiveTab(cat.id)}
            >
              <span className="nh-tab-icon">{cat.icon}</span>
              <span className="nh-tab-label">{cat.label}</span>
              {count > 0 && <span className="nh-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ─ Category description ─────────────────────────────────────────────── */}
      <div className="nh-cat-desc">
        {CATEGORIES.find(c => c.id === activeTab)?.desc}
      </div>

      {/* ─ Feed ─────────────────────────────────────────────────────────────── */}
      <div className="nh-feed">
        {loading ? (
          <div className="nh-loading">
            {[1, 2, 3, 4].map(i => <div key={i} className="nh-skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="nh-empty">
            <div className="nh-empty-icon">
              {CATEGORIES.find(c => c.id === activeTab)?.icon || '🔕'}
            </div>
            <h3>No alerts in this channel</h3>
            <p>When activity happens here, you'll see it.</p>
          </div>
        ) : (
          filtered.map((n, idx) => (
            <div
              key={n.id}
              className={`nh-item ${n.read ? 'read' : 'unread'}`}
              style={{ animationDelay: `${idx * 30}ms` }}
              onClick={() => markRead(n.id, n.actionLink)}
            >
              {/* Left: type icon */}
              <div className="nh-item-icon" style={{ background: `${typeColor(n.category)}18`, color: typeColor(n.category) }}>
                {typeIcon(n.type, n.category)}
              </div>

              {/* Centre: content */}
              <div className="nh-item-body">
                <div className="nh-item-top">
                  <span className="nh-item-title">{n.title}</span>
                  <span className="nh-item-time" title={formatFull(n.timestamp)}>
                    {timeAgo(n.timestamp)}
                  </span>
                </div>
                <p className="nh-item-msg">{n.message}</p>
                <div className="nh-item-meta">
                  {n.category && (
                    <span
                      className="nh-item-cat"
                      style={{ color: typeColor(n.category), background: `${typeColor(n.category)}14` }}
                    >
                      {n.category}
                    </span>
                  )}
                  {n.actionLink && (
                    <span className="nh-item-link">
                      View →
                    </span>
                  )}
                </div>
              </div>

              {/* Right: unread dot */}
              {!n.read && <div className="nh-item-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
