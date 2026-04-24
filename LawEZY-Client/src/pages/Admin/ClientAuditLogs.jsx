import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import './AdminPortal.css';

const ClientAuditLogs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientRes = await apiClient.get(`/api/admin/clients/${id}`);
      setClient(clientRes.data);

      const logsRes = await apiClient.get(`/api/admin/clients/${id}/logs`).catch(() => ({ data: [] }));
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error("Client audit data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = filterType === 'ALL' || log.type === filterType;
    
    if (filterType === 'SPENDING') {
      matchesFilter = log.type === 'FINANCE' && (log.amount < 0 || log.action?.includes('PAYMENT') || log.action?.includes('DEPOSIT') || log.action?.includes('CONSULTATION'));
    } else if (filterType === 'CREDITS') {
      matchesFilter = log.type === 'FINANCE' && (log.amount > 0 || log.action?.includes('REFUND') || log.action?.includes('CREDIT') || log.action?.includes('TOPUP'));
    }

    return matchesSearch && matchesFilter;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Category', 'Action', 'Value', 'Details'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.type,
      l.action,
      l.amount || '-',
      l.details
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClientAuditLog_${client?.firstName || id}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="admin-portal-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-lzy">LAWEZY</span>
          <span className="brand-separator">|</span>
          <span className="brand-suffix">Audit Control</span>
        </div>
        
        <nav className="admin-nav">
          <button onClick={() => navigate('/admin')}>
            <span className="nav-icon">📊</span> Return to Portal
          </button>
          <button onClick={() => navigate(`/admin/clients/${id}/profile`)}>
            <span className="nav-icon">👤</span> Profile Dossier
          </button>
          <button className="active">
            <span className="nav-icon">📜</span> Client Activity Logs
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn-public-mode" onClick={() => navigate('/')}>
            🌐 Public Mode
          </button>
          <button className="btn-logout-admin" onClick={() => { localStorage.clear(); navigate('/login'); }}>
            Exit Command Center
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-top-bar">
          <div className="header-title">
            <div className="breadcrumb-dossier">
              <span onClick={() => navigate('/admin')}>Client Management</span> / <span className="active">Activity Dossier</span>
            </div>
            <h1>Client Audit Dossier: {client?.firstName || 'Client'}</h1>
            <p>Institutional Record Verification & Activity Log</p>
          </div>
          <div className="header-meta">
             <div className="registry-id-badge dark">
                <span className="label">REGISTRY ID</span>
                <span className="id-code">{id}</span>
             </div>
          </div>
        </header>

        <div className="admin-content-area animate-reveal">
          <div className="saas-dossier-full-page">
            <div className="saas-dossier-toolbar">
              <div className="toolbar-left">
                <div className="saas-search-box">
                  <input 
                    type="text" 
                    placeholder="Search logs, transactions, or sessions..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="saas-filter-tabs">
                  {['ALL', 'SESSION', 'SPENDING', 'CREDITS'].map(type => (
                    <button 
                      key={type}
                      className={filterType === type ? 'active' : ''}
                      onClick={() => setFilterType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="toolbar-right">
                <button className="btn-saas-export" onClick={exportCSV}>
                  <span>📥</span> Export Audit Data
                </button>
              </div>
            </div>

            <div className="saas-dossier-table-wrapper">
              {loading ? (
                <div className="saas-loading-state">
                  <div className="elite-sync-spinner"></div>
                  <p>Aggregating Client Activity Data...</p>
                </div>
              ) : (
                <table className="saas-log-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>CATEGORY</th>
                      <th>ACTION</th>
                      <th>VALUE (₹)</th>
                      <th>AUDIT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td className="col-time">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="date-sub">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </td>
                        <td className="col-cat">
                          <span className={`saas-badge-log ${log.type?.toLowerCase()}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="col-action"><strong>{log.action}</strong></td>
                        <td className="col-amount">
                          {log.amount ? (
                            <span className={`value-pill ${log.amount > 0 ? 'plus' : 'minus'}`}>
                              {log.amount > 0 ? '+' : ''}{log.amount}
                            </span>
                          ) : '--'}
                        </td>
                        <td className="col-details">{log.details}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="empty-state">No activity records found for this criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientAuditLogs;
