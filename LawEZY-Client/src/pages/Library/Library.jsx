import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotionWorkspace from './NotionWorkspace';
import ReaderSpace from './ReaderSpace';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import './Library.css';

const MOCK_CATEGORIES = [
  { id: 'all', name: 'All Resources', icon: '📚' },
  { id: 'const', name: 'Constitutional Law', icon: '🏛️' },
  { id: 'corp', name: 'Corporate & M&A', icon: '🏢' },
  { id: 'crim', name: 'Criminal Justice', icon: '⚖️' },
  { id: 'tax', name: 'Taxation & Finance', icon: '📊' },
  { id: 'ip', name: 'Intellectual Property', icon: '💡' },
  { id: 'other', name: 'Other Contexts', icon: '📁' },
];

const Library = () => {
  const navigate = useNavigate();
  const { user, viewMode } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showReader, setShowReader] = useState(false);
  const [showNotion, setShowNotion] = useState(false);
  const [activeBook, setActiveBook] = useState(null);
  const [displayMode, setDisplayMode] = useState('grid');
  const [sortBy, setSortBy] = useState('title');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    category: 'const',
    abstractText: '',
    driveLink: '',
    coverUrl: '',
    pageCount: ''
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({ targetId: '', reason: '', details: '', type: 'REPORT' });
  const location = useLocation();
  const sortRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) {
      setActiveCategory(catParam);
    }
    fetchResources();
  }, [location]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/resources');
      setResources(res.data);
    } catch (err) {
      console.error("Library sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNew = async (title, blocks) => {
    try {
      const payload = {
        title: title || 'Untitled Intelligence',
        content: JSON.stringify(blocks),
        category: 'ip', 
        authorId: user?.id,
        abstractText: blocks.find(b => b.type === 'text')?.content?.substring(0, 150) || 'Drafted in personal workspace...',
        coverUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop',
        pageCount: Math.ceil(blocks.length * 1.5)
      };

      if (editDraft && editDraft.id) {
        await apiClient.put(`/api/resources/${editDraft.id}`, payload);
      } else {
        await apiClient.post('/api/resources', payload);
      }

      setShowNotion(false);
      setEditDraft(null);
      fetchResources();
    } catch (err) {
      console.error("Publish failed:", err);
    }
  };

  const handleEdit = (resource) => {
    let blocks = [];
    try {
      blocks = JSON.parse(resource.content);
    } catch (e) {
      blocks = [
        { id: 'b1', type: 'h2', content: resource.title },
        { id: 'b2', type: 'text', content: resource.abstractText }
      ];
    }
    setEditDraft({ ...resource, blocks });
    setShowNotion(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Permanently de-list this resource from archives?")) return;
    try {
      await apiClient.delete(`/api/resources/${id}`);
      fetchResources();
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const filteredResources = resources.filter(res => {
    const matchesCat = activeCategory === 'all' || res.category === activeCategory;
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'pages') return (b.pageCount || 0) - (a.pageCount || 0);
    return (a.author || '').localeCompare(b.author || '');
  });

  if (showReader && activeBook) {
    return <ReaderSpace book={activeBook} onBack={() => setShowReader(false)} />;
  }

  if (showNotion) {
    return (
      <NotionWorkspace 
        initialTitle={editDraft?.title}
        initialBlocks={editDraft?.blocks}
        onSave={handlePublishNew} 
        onBack={() => { setShowNotion(false); setEditDraft(null); }} 
      />
    );
  }

  return (
    <div className="library-layout">
      {/* Sidebar Navigation */}
      <aside className={`library-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <span className="logo-icon">⚖️</span>
            <span className="logo-text">Archives</span>
          </div>
          <button className="collapse-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <p className="group-label">Jurisdictions</p>
            {MOCK_CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="nav-icon">{cat.icon}</span>
                {isSidebarOpen && <span className="nav-label">{cat.name}</span>}
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="notion-entry-card" onClick={() => setShowNotion(true)}>
            <div className="card-icon">✍️</div>
            {isSidebarOpen && (
              <div className="card-text">
                <p className="card-title">Draft Intelligence</p>
                <p className="card-sub">Open Personal Workspace</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="library-main">
        <header className="library-header">
          <div className="header-left">
            <h1>Platform Library</h1>
            <p>Institutional repository for verified legal intelligence</p>
          </div>
          
          <div className="header-right">
            <div className="search-bar-premium">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search across all archives..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {viewMode === 'ADMIN' && (
              <button className="btn-add-elite" onClick={() => setShowAddModal(true)}>
                <span>+</span> Add Resource
              </button>
            )}

            <div className="view-controls">
              <button 
                className={`control-btn ${displayMode === 'grid' ? 'active' : ''}`}
                onClick={() => setDisplayMode('grid')}
                title="Grid View"
              >⊞</button>
              <button 
                className={`control-btn ${displayMode === 'list' ? 'active' : ''}`}
                onClick={() => setDisplayMode('list')}
                title="List View"
              >☰</button>
            </div>

            <div className="sort-wrapper" ref={sortRef}>
              <button className="filter-button" onClick={() => setShowSortDropdown(!showSortDropdown)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                {sortBy === 'title' ? 'Sort by Title' : sortBy === 'pages' ? 'Sort by Pages' : 'Sort by Author'}
              </button>
              {showSortDropdown && (
                <div className="sort-dropdown glass">
                  <button onClick={() => { setSortBy('title'); setShowSortDropdown(false); }}>Title (A-Z)</button>
                  <button onClick={() => { setSortBy('author'); setShowSortDropdown(false); }}>Author (A-Z)</button>
                  <button onClick={() => { setSortBy('pages'); setShowSortDropdown(false); }}>Page Count (Max)</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`resources-dynamic-grid ${displayMode}`}>
          {loading ? (
            <div className="loading-state">Syncing with Archives...</div>
          ) : sortedResources.length > 0 ? (
            sortedResources.map(resource => (
              <div 
                key={resource.id} 
                className={`resource-card-elite ${displayMode}`}
                onClick={() => {
                  setActiveBook(resource);
                  setShowReader(true);
                }}
              >
                <div className="card-cover-wrapper">
                  <img src={resource.coverUrl || 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800'} alt={resource.title} />
                  <button 
                    className={`bookmark-trigger ${bookmarkedIds.includes(resource.id) ? 'bookmarked' : ''}`}
                    onClick={(e) => toggleBookmark(e, resource.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarkedIds.includes(resource.id) ? "var(--elite-gold)" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  </button>
                </div>
                <div className="card-info">
                  <h3 title={resource.title}>{resource.title}</h3>
                  {resource.author && <p className="author-name">by {resource.author}</p>}
                  <div className="card-meta">
                    <span className="pages">{resource.pageCount || '---'} pages</span>
                    <span className="type-pill">{resource.driveLink ? 'PDF/Link' : 'Digital'}</span>
                  </div>
                  <div className="card-primary-actions">
                    <button className="btn-read-sm">Read</button>
                    {resource.driveLink && (
                      <button className="btn-download-sm" onClick={(e) => { e.stopPropagation(); window.open(resource.driveLink, '_blank'); }}>Source</button>
                    )}
                    
                    <div className="card-more-wrapper">
                      <button className="btn-more-sm" onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === resource.id ? null : resource.id); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      
                      {activeMenuId === resource.id && (
                        <div className="card-more-dropdown glass animate-reveal">
                          {(viewMode === 'ADMIN' || user?.id === resource.authorId) && (
                            <>
                              <button onClick={() => handleEdit(resource)}>✏️ Edit Content</button>
                              <button className="danger" onClick={(e) => handleDelete(e, resource.id)}>🗑️ Decommission</button>
                            </>
                          )}
                          {user && user?.id !== resource.authorId && (
                            <>
                              <button onClick={() => { setReportData({ ...reportData, targetId: resource.id, type: 'REPORT' }); setShowReportModal(true); }}>🚩 File Report</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No resources found in this jurisdiction.</div>
          )}
        </div>
      </main>

      {/* Add Resource Modal (Simplified for the fix) */}
      {showAddModal && (
        <div className="elite-modal-overlay">
           <div className="elite-modal-content glass">
              <h2>Add Resource</h2>
              <button onClick={() => setShowAddModal(false)}>Close</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Library;
