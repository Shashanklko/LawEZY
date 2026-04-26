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

const STATIC_RESOURCES = [
  {
    id: 's1',
    title: 'Constitution of India',
    category: 'const',
    driveLink: 'https://drive.google.com/file/d/18Bx-6SWtOwQD1a4GoIanfR24OEEqjEOL/view?usp=sharing',
    coverUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
    author: 'Institutional Archives'
  },
  {
    id: 's2',
    title: 'IPC Indian Penal Code',
    category: 'crim',
    driveLink: 'https://drive.google.com/file/d/1ejd2wHkPP7V-MxYIabIibF9cZiKJvNOW/view?usp=sharing',
    coverUrl: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800',
    author: 'Institutional Archives'
  },
  {
    id: 's3',
    title: 'Administrative Law',
    category: 'other',
    driveLink: 'https://drive.google.com/file/d/1T-9eP_CeKdCJErFB-gHMSdfzda7OEQI8/view?usp=sharing',
    coverUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    author: 'Institutional Archives'
  }
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
      setResources(res.data || []);
    } catch (err) {
      console.error("Library sync failed:", err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNew = async (title, blocks) => {
    try {
      const payload = {
        title: title || 'Untitled Document',
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

  const allResources = [...STATIC_RESOURCES, ...resources];

  const filteredResources = allResources.filter(res => {
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
    return <ReaderSpace book={activeBook} onExit={() => setShowReader(false)} />;
  }

  if (showNotion) {
    return (
      <NotionWorkspace 
        initialTitle={editDraft?.title}
        initialBlocks={editDraft?.blocks}
        onPublish={handlePublishNew} 
        onExit={() => { setShowNotion(false); setEditDraft(null); }} 
      />
    );
  }

  return (
    <div className="library-page-wrapper">
      <div className="library-container-elite">
        <aside className={`library-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-brand-header">
            <div className="brand-title">
              <h2>Archives</h2>
              <div className="divider"></div>
            </div>
            <button className="sidebar-toggle-trigger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? '◀' : '▶'}
            </button>
          </div>

          <nav className="library-nav-links">
            <div className="nav-section">
              <p className="nav-section-label">Jurisdictions</p>
              {MOCK_CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className="nav-icon">{cat.icon}</span>
                  <span className="nav-text">{cat.name}</span>
                  {activeCategory === cat.id && <div className="active-dot"></div>}
                </button>
              ))}
            </div>
          </nav>

          <div className="sidebar-user-footer">
            <div className="user-mini-card" onClick={() => setShowNotion(true)} style={{ cursor: 'pointer' }}>
              <div className="avatar-placeholder-library">✍️</div>
              <div className="user-text">
                <h4>Draft Intelligence</h4>
                <p>Personal Workspace</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="library-main-content">
          <header className="library-view-header">
            <div className="header-left">
              <h1>Platform Library</h1>
              <p>Institutional repository for legal resources</p>
            </div>
            
            <div className="header-actions">
              <div className="search-box-glass">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search across all archives..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {viewMode === 'ADMIN' && (
                <button className="btn-add-resource-elite" onClick={() => setShowAddModal(true)}>
                  <span>+</span> Add Resource
                </button>
              )}

              <div className="view-toggle">
                <button 
                  className={`${displayMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setDisplayMode('grid')}
                  title="Grid View"
                >⊞</button>
                <button 
                  className={`${displayMode === 'list' ? 'active' : ''}`}
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

          <div className={`library-display-container ${displayMode}-view`}>
            {loading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="resource-skeleton-card">
                    <div className="skeleton-cover skeleton-pulse"></div>
                    <div className="skeleton-info">
                      <div className="skeleton-line skeleton-pulse" style={{ width: '80%' }}></div>
                      <div className="skeleton-line skeleton-pulse" style={{ width: '40%', height: '12px' }}></div>
                      <div className="skeleton-line skeleton-pulse" style={{ width: '100%', height: '32px', marginTop: '10px' }}></div>
                    </div>
                  </div>
                ))}
              </>
            ) : sortedResources.length > 0 ? (
              sortedResources.map(resource => (
                <div 
                  key={resource.id} 
                  className={`resource-card-premium ${displayMode === 'list' ? 'list-card' : ''}`}
                  onClick={() => {
                    if (resource.driveLink) {
                      window.open(resource.driveLink, '_blank');
                    } else {
                      setActiveBook(resource);
                      setShowReader(true);
                    }
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
              <div className="library-empty-state animate-reveal">
                <div className="empty-icon-vault">📂</div>
                <h3>No resources found</h3>
              </div>
            )}
          </div>
        </main>
      </div>

      {showAddModal && (
        <div className="elite-modal-overlay animate-reveal">
          <div className="elite-modal-content glass">
            <h2>Index New Resource</h2>
            <p>Upload institutional documents or link external Google Drive archives.</p>
            
            <div className="elite-form-group">
              <label>Document Title</label>
              <input 
                type="text" 
                placeholder="e.g. Constitutional Law Handbook 2025" 
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
              />
            </div>

            <div className="elite-form-row">
              <div className="elite-form-group">
                <label>Jurisdiction/Category</label>
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
                  placeholder="e.g. 120" 
                  value={newResource.pageCount}
                  onChange={(e) => setNewResource({...newResource, pageCount: e.target.value})}
                />
              </div>
            </div>

            <div className="elite-form-group">
              <label>Google Drive / PDF Link</label>
              <input 
                type="text" 
                placeholder="https://drive.google.com/file/d/..." 
                value={newResource.driveLink}
                onChange={(e) => setNewResource({...newResource, driveLink: e.target.value})}
              />
              <p style={{ fontSize: '0.65rem', marginTop: '4px', fontStyle: 'italic', color: 'var(--elite-gold)' }}>
                * Ensure link permissions are set to "Anyone with the link" for public access.
              </p>
            </div>

            <div className="elite-form-group">
              <label>Institutional Cover URL (Optional)</label>
              <input 
                type="text" 
                placeholder="https://images.unsplash.com/..." 
                value={newResource.coverUrl}
                onChange={(e) => setNewResource({...newResource, coverUrl: e.target.value})}
              />
            </div>

            <div className="elite-form-group">
              <label>Abstract / Brief Description</label>
              <textarea 
                placeholder="Provide a summary of the resource contained in this document..."
                value={newResource.abstractText}
                onChange={(e) => setNewResource({...newResource, abstractText: e.target.value})}
              ></textarea>
            </div>

            <div className="modal-actions-elite">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={async () => {
                if (!newResource.title) { alert("Title is required."); return; }
                try {
                  const payload = {
                    ...newResource,
                    authorId: user?.id,
                    content: "[]"
                  };
                  await apiClient.post('/api/resources', payload);
                  setShowAddModal(false);
                  setNewResource({ title: '', category: 'const', abstractText: '', driveLink: '', coverUrl: '', pageCount: '' });
                  fetchResources();
                } catch (err) {
                  console.error("Index failed:", err);
                  alert("Failed to index resource.");
                }
              }}>Index Resource</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
