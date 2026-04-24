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

// Legacy MOCK_RESOURCES removed for institutional live data synchronization.


const Library = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showReader, setShowReader] = useState(false);
  const [showNotion, setShowNotion] = useState(false);
  const [activeBook, setActiveBook] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('title');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [hubFilter, setHubFilter] = useState(null); 
  const [editDraft, setEditDraft] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentReadings, setRecentReadings] = useState([]);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) {
      setActiveCategory(catParam);
    }
  }, [location]);


  const handlePublishNew = async (title, blocks) => {
    try {
      const payload = {
        title: title || 'Untitled Intelligence',
        content: JSON.stringify(blocks),
        category: 'ip', // Default category for notion workspace
        authorId: user?.id,
        abstractText: blocks.find(b => b.type === 'text')?.content?.substring(0, 150) || 'Drafted in personal workspace...',
        coverUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop',
        pageCount: Math.ceil(blocks.length * 1.5) // Estimate pages for Notion content
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
      alert("Failed to sync with institutional archives.");
    }
  };

  const handleEdit = (resource) => {
    let blocks = [];
    try {
      blocks = JSON.parse(resource.content);
    } catch (e) {
      blocks = [
        { id: 'b1', type: 'h2', content: resource.title },
        { id: 'b2', type: 'text', content: resource.abstract }
      ];
    }
    setEditDraft({ ...resource, blocks });
    setShowReader(false);
    setShowNotion(true);
  };

  const sortRef = useRef(null);

  useEffect(() => {
    fetchResources();
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/resources');
      const mapped = response.data.map(r => ({
        id: r.id,
        title: r.title,
        author: r.authorName || 'Anonymous',
        category: r.category,
        cover: r.coverUrl || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop',
        abstract: r.abstractText || 'Expert legal resource from LawEZY archives.',
        content: r.content,
        driveLink: r.driveLink,
        pages: Math.floor(Math.random() * 800) + 200 // Mock pages for UI since not in backend yet
      }));
      setResources(mapped);
    } catch (err) {
      console.error("Library sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently decommission this resource?")) return;
    
    try {
      await apiClient.delete(`/api/resources/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Decommissioning failed:", err);
      alert("Verification protocol failure: Could not remove resource.");
    }
  };


  const handleAddLink = async () => {
    if (!newResource.title || !newResource.driveLink) {
      alert("Title and Link are mandatory.");
      return;
    }
    
    try {
      const payload = {
        ...newResource,
        authorId: user?.id, 
        content: "Institutional resource attached via external link.",
        pageCount: parseInt(newResource.pageCount) || 0
      };
      await apiClient.post('/api/resources', payload);
      setShowAddModal(false);
      setNewResource({ title: '', category: 'const', abstractText: '', driveLink: '', coverUrl: '', pageCount: '' });
      fetchResources(); // Refresh list
    } catch (err) {
      console.error("Failed to add resource:", err);
      alert("Could not add resource. Check backend status.");
    }
  };

  const handleReportSubmit = async () => {
    if (!reportData.reason) {
      alert("Please provide a reason.");
      return;
    }
    try {
      await apiClient.post('/api/reports', {
        reporterId: user?.id,
        targetType: 'RESOURCE',
        targetId: reportData.targetId,
        reason: reportData.reason,
        details: reportData.details,
        status: 'PENDING'
      });
      setShowReportModal(false);
      setReportData({ targetId: '', reason: '', details: '', type: 'REPORT' });
      alert("Institutional report filed. Admin has been notified via real-time broadcast.");
    } catch (err) {
      console.error("Reporting failed:", err);
    }
  };


  const filteredResources = resources
    .filter(res => {
      const matchesCategory = activeCategory === 'all' || res.category === activeCategory;
      const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            res.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesHub = true;
      if (hubFilter === 'saved') matchesHub = bookmarkedIds.includes(res.id);
      if (hubFilter === 'recent') {
        const entry = recentReadings.find(r => r.id === res.id);
        if (!entry) return false;
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesHub = new Date(entry.timestamp).getTime() > oneWeekAgo;
      }
      return matchesCategory && matchesSearch && matchesHub;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      if (sortBy === 'pages') return b.pages - a.pages;
      return 0;
    });

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const handleRead = (book) => {
    setActiveBook(book);
    setShowReader(true);
    setRecentReadings(prev => {
      const filtered = prev.filter(r => r.id !== book.id);
      return [{ id: book.id, timestamp: new Date() }, ...filtered];
    });
  };

  if (showNotion) {
    return (
      <NotionWorkspace 
        onExit={() => { setShowNotion(false); setEditDraft(null); }} 
        onPublish={handlePublishNew}
        initialTitle={editDraft?.title || ''}
        initialBlocks={editDraft?.blocks || []}
      />
    );
  }

  if (showReader && activeBook) {
    // If the resource has custom blocks, use them, otherwise use the legacy converter
    const initialBlocks = activeBook.blocks || [
      { id: 'b4', type: 'h2', content: 'Executive Summary' },
      { id: 'b5', type: 'text', content: activeBook.abstract },
      { id: 'b6', type: 'image', content: activeBook.cover },
      { id: 'b7', type: 'h2', content: 'Expert Analysis' },
      { id: 'b8', type: 'text', content: 'This Expert volume provides essential legal intelligence regarding current precedents and legislative shifts. The commentary explores high-fidelity frameworks for professional execution in complex jurisdictions.' },
      { id: 'b9', type: 'bullet', content: 'In-depth analysis of 2024 amendments' },
      { id: 'b10', type: 'bullet', content: 'Practical negotiation frameworks' },
      { id: 'b11', type: 'bullet', content: 'Cross-border compliance metrics' },
    ];

    return (
      <ReaderSpace 
        initialTitle={activeBook.title}
        initialBlocks={initialBlocks}
        author={activeBook.author}
        onExit={() => setShowReader(false)}
        onEdit={() => handleEdit(activeBook)}
      />
    );
  }

  return (
    <div className="library-page-wrapper">
      <div className="library-container-elite animate-reveal">
        <aside className={`library-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
          <div className="sidebar-brand-header">
            <button className="lib-back-btn" onClick={() => navigate('/dashboard')} title="Return to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="back-text">Dashboard</span>
            </button>
            <button className="sidebar-toggle-trigger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <div className="sidebar-search-area">
            <div className="search-box-glass">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                placeholder="Find legal intelligence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <nav className="library-nav-links">
            <div className="nav-section-label">Categories</div>
            {MOCK_CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                className={`nav-item ${activeCategory === cat.id && !hubFilter ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setHubFilter(null); }}
              >
                <span className="nav-icon">{cat.icon}</span>
                <span className="nav-text">{cat.name}</span>
                {activeCategory === cat.id && !hubFilter && <div className="active-dot"></div>}
              </button>
            ))}

            <div className="nav-section-label" style={{ marginTop: '25px' }}>My Expert Hub</div>
            {(user?.role === 'EXPERT' || user?.role === 'ADMIN') && (
              <button 
                className={`nav-item ${showNotion ? 'active' : ''}`}
                onClick={() => { setShowNotion(true); setHubFilter(null); }}
              >
                <span className="nav-icon">✨</span>
                <span className="nav-text">Creative Workspace</span>
                {showNotion && <div className="active-dot"></div>}
              </button>
            )}
            <button 
              className={`nav-item ${hubFilter === 'saved' ? 'active' : ''}`}
              onClick={() => { setHubFilter('saved'); setActiveCategory('all'); }}
            >
              <span className="nav-icon">⭐</span>
              <span className="nav-text">Saved Precedents</span>
              {hubFilter === 'saved' && <div className="active-dot"></div>}
            </button>
            <button 
              className={`nav-item ${hubFilter === 'recent' ? 'active' : ''}`}
              onClick={() => { setHubFilter('recent'); setActiveCategory('all'); }}
            >
              <span className="nav-icon">🕒</span>
              <span className="nav-text">Recent Readings</span>
              {hubFilter === 'recent' && <div className="active-dot"></div>}
            </button>
          </nav>

          <div className="sidebar-user-footer">
            <div className="user-mini-card">
              <div className="avatar-placeholder-library">
                {(user?.name || user?.firstName || 'L').charAt(0)}
              </div>
              <div className="user-text">
                <h4>{user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Guest User')}</h4>
                <p>{user?.role?.replace('ROLE_', '') || 'SEEKER MODE'}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="library-main-content">
          <header className="library-view-header">
            <div className="header-left">
              <h1>{MOCK_CATEGORIES.find(c => c.id === activeCategory)?.name || 'Library'}</h1>
              <p>{filteredResources.length} curated volumes available in this compartment.</p>
            </div>
            <div className="header-actions">
              {(user?.role === 'EXPERT' || user?.role === 'ADMIN') && (
                <button className="btn-add-resource-elite" onClick={() => setShowAddModal(true)}>
                  <span>+</span> Add Resource
                </button>
              )}
              <div className="view-toggle">

                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>🔲</button>
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>☰</button>
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

          <div className={`library-display-container ${viewMode}-view`}>
            {filteredResources.map(resource => (
              <div
                key={resource.id}
                className={`resource-card-premium ${viewMode === 'list' ? 'list-card' : ''}`}
              >
                <div className="card-cover-wrapper">
                  <img src={resource.cover} alt={resource.title} />
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
                    <button className="btn-read-sm" onClick={() => handleRead(resource)}>Read</button>
                    {resource.driveLink && (
                      <button className="btn-download-sm" onClick={() => window.open(resource.driveLink, '_blank')}>Source</button>
                    )}
                    
                    <div className="card-more-wrapper">
                      <button className="btn-more-sm" onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === resource.id ? null : resource.id); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      
                      {activeMenuId === resource.id && (
                        <div className="card-more-dropdown glass animate-reveal">
                          {(user?.role === 'ADMIN' || user?.id === resource.authorId) && (
                            <>
                              <button onClick={() => { handleEdit(resource); setActiveMenuId(null); }}>✏️ Edit Content</button>
                              <button className="danger" onClick={(e) => { handleDelete(e, resource.id); setActiveMenuId(null); }}>🗑️ Decommission</button>
                            </>
                          )}
                          {user && user?.id !== resource.authorId && (
                            <>
                              <button onClick={() => { setReportData({ ...reportData, targetId: resource.id, type: 'REPORT' }); setShowReportModal(true); setActiveMenuId(null); }}>🚩 File Report</button>
                              <button onClick={() => { setReportData({ ...reportData, targetId: resource.id, type: 'SUGGESTION', reason: 'Content Improvement' }); setShowReportModal(true); setActiveMenuId(null); }}>💡 Suggest Edit</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="elite-modal-overlay animate-reveal">
          <div className="elite-modal-content glass">
            <h2>Ingest Expert Resource</h2>
            <p>Add a new document to the LawEZY library via external link.</p>
            
            <div className="elite-form-group">
              <label>Resource Title</label>
              <input 
                type="text" 
                placeholder="e.g. Constitutional Law Review 2025" 
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
              />
            </div>

            <div className="elite-form-row">
              <div className="elite-form-group">
                <label>Category</label>
                <select 
                  value={newResource.category}
                  onChange={(e) => setNewResource({...newResource, category: e.target.value})}
                >
                  {MOCK_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="elite-form-group">
                <label>Page Count</label>
                <input 
                  type="number" 
                  placeholder="e.g. 15" 
                  value={newResource.pageCount}
                  onChange={(e) => setNewResource({...newResource, pageCount: e.target.value})}
                />
              </div>
            </div>

            <div className="elite-form-group">
              <label>Abstract / Executive Summary</label>
              <textarea 
                placeholder="Provide a brief summary of the resource..." 
                value={newResource.abstractText || ''}
                onChange={(e) => setNewResource({...newResource, abstractText: e.target.value})}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="elite-form-group">
              <label>External Document Link (Google Drive / PDF)</label>
              <input 
                type="text" 
                placeholder="https://drive.google.com/..." 
                value={newResource.driveLink}
                onChange={(e) => setNewResource({...newResource, driveLink: e.target.value})}
              />
            </div>

            <div className="modal-actions-elite">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleAddLink}>Ingest Resource</button>
            </div>
          </div>
        </div>
      )}

      {/* Report / Suggest Modal */}
      {showReportModal && (
        <div className="elite-modal-overlay animate-reveal">
          <div className="elite-modal-content glass">
            <h2>{reportData.type === 'SUGGESTION' ? 'Institutional Suggestion' : 'Flag Resource'}</h2>
            <p>{reportData.type === 'SUGGESTION' ? 'Provide constructive feedback to improve this resource.' : 'Identify policy violations or inaccuracies in this document.'}</p>
            
            <div className="elite-form-group">
              <label>Reason / Subject</label>
              <input 
                type="text" 
                placeholder={reportData.type === 'SUGGESTION' ? 'e.g. Outdated section 4' : 'e.g. Misleading Information'} 
                value={reportData.reason}
                onChange={(e) => setReportData({...reportData, reason: e.target.value})}
              />
            </div>

            <div className="elite-form-group">
              <label>Elaborate Details</label>
              <textarea 
                placeholder="Provide context for the institutional review board..." 
                value={reportData.details}
                onChange={(e) => setReportData({...reportData, details: e.target.value})}
                style={{ minHeight: '120px' }}
              />
            </div>

            <div className="modal-actions-elite">
              <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleReportSubmit}>
                {reportData.type === 'SUGGESTION' ? 'Submit Suggestion' : 'File Official Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;

