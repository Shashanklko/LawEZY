import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import './Community.css';




const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('All Discussions');
  const [search, setSearch] = useState('');
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isNewDiscussionModalOpen, setIsNewDiscussionModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");

  const handleStartDiscussionClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setIsNewDiscussionModalOpen(true);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/community/feed');
      setDiscussions(res.data);
    } catch (err) {
      console.error("Community Feed Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchComments = async (postId) => {
    setCommentsLoading(true);
    try {
      const res = await apiClient.get(`/api/community/posts/${postId}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error("Comment Fetch Failure:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      if (newPost.id) {
        await apiClient.put(`/api/community/posts/${newPost.id}`, {
          title: newPost.title,
          content: newPost.content,
          type: 'DISCUSSION'
        });
      } else {
        await apiClient.post('/api/community/posts', {
          ...newPost,
          type: 'DISCUSSION'
        });
      }
      fetchPosts();
      setIsNewDiscussionModalOpen(false);
      setNewPost({ title: '', content: '' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data || "Post Submission Error: Institutional policy restriction.";
      alert(errorMsg);
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newComment) return;
    try {
      await apiClient.post(`/api/community/posts/${selectedPost.id}/comment`, { content: newComment });
      setNewComment("");
      fetchComments(selectedPost.id);
      // Update local post comment count
      setDiscussions(prev => prev.map(p => 
        p.id === selectedPost.id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      ));
    } catch (err) {
      alert("Submission Error: Institutional policy mismatch.");
    }
  };

  const handleLike = async (id, e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await apiClient.post(`/api/community/posts/${id}/like`);
      // Optimistic update
      setDiscussions(prev => prev.map(p => 
        p.id === id ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p
      ));
    } catch (err) {
      console.error("Like Action Failure:", err);
    }
  };

  const handleVote = async (postId, optionId, e) => {
    e.stopPropagation();
    try {
      const response = await apiClient.post(`/api/community/posts/${postId}/poll/vote/${optionId}`);
      setDiscussions(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (err) {
      alert(err.response?.data || "Voting failed. Institutional record lock.");
    }
  };

  const handleDeletePost = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this discussion?")) return;
    try {
      await apiClient.delete(`/api/community/posts/${id}`);
      setDiscussions(prev => prev.filter(p => p.id !== id));
      if (selectedPost && selectedPost.id === id) setSelectedPost(null);
    } catch (err) {
      alert("Deletion Error: Institutional record lock.");
    }
  };

  const handleEditClick = (post, e) => {
    e.stopPropagation();
    setNewPost({ title: post.title, content: post.content, id: post.id });
    setIsNewDiscussionModalOpen(true);
  };

  const handleShare = (post, e) => {
    e.stopPropagation();
    const shareData = {
      title: post.title,
      text: post.content.substring(0, 100) + "...",
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => console.log('Share failed'));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Hub link copied to clipboard!");
    }
  };

  const filteredDiscussions = discussions.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const contributors = Array.from(new Set(discussions.map(p => p.authorId)))
    .map(id => discussions.find(p => p.authorId === id))
    .filter(Boolean)
    .slice(0, 5);

  return (
    <div className="community-page">
      <div className="community-hero">
        <div className="hero-content">
          <h1>LAWEZY Community Hub</h1>

          <div className="feed-controls">
            <div className="tabs">
              {['All Discussions', 'My Activity'].map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              className="btn-new-discussion"
              onClick={handleStartDiscussionClick}
            >
              START DISCUSSION +
            </button>
          </div>

          <div className="community-search-bar">
            <input
              type="text"
              placeholder="Search discussions, topics, or contributors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-search-community">SEARCH HUB</button>
          </div>
        </div>
      </div>

      <div className={`community-layout ${activeTab !== 'All Discussions' ? 'full-width-feed' : ''}`}>
        {/* LEFT SIDEBAR: TOPICS & CONTRIBUTORS */}
        {activeTab === 'All Discussions' && (
          <aside className="community-sidebar">



            <div className="sidebar-section">
              <div className="section-header">
                <h3>TOP CONTRIBUTORS</h3>
              </div>
              <div className="contributors-list">
                {contributors.map(author => (
                  <div key={author.authorId} className="contributor-card">
                    <div className="avatar-placeholder">{author.authorName?.charAt(0)}</div>
                    <div className="contributor-info">
                      <strong>{author.authorName}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* MAIN FEED */}
        <main className="community-feed">

            <div className="discussions-list">
              {loading ? (
                <div className="loading-state">Accessing Institutional Archives...</div>
              ) : (
                filteredDiscussions.map(post => (
                  <div
                    key={post.id}
                    className="discussion-card"
                    onClick={() => handlePostClick(post)}
                  >
                    <div className="card-top">
                      <span className="post-category">{post.type}</span>
                      <span className="post-time">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>

                    <h2 className="post-title">{post.title}</h2>

                    {post.tags && post.tags.length > 0 && (
                      <div className="post-tags">
                        {post.tags.map(tag => (
                          <span key={tag} className="tag-pill">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {post.type === 'POLL' && post.poll && (
                      <div className="poll-container">
                        <span className="poll-question">{post.poll.question}</span>
                        <div className="poll-options">
                          {post.poll.options.map(opt => {
                            const totalVotes = post.poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                            const percentage = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
                            const hasVoted = post.poll.votedUserIds?.includes(user?.uid);
                            
                            return (
                              <button 
                                key={opt.id} 
                                className="poll-option-btn"
                                onClick={(e) => handleVote(post.id, opt.id, e)}
                                disabled={hasVoted}
                              >
                                <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                                <span className="opt-text">{opt.text}</span>
                                <span className="opt-votes">{opt.votes || 0}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="post-summary">{post.content.substring(0, 150)}...</p>

                    <div className="card-bottom">
                      <div className="author-mini">
                        <div className="avatar-placeholder">
                          {post.authorName?.charAt(0)}
                        </div>
                        <div className="author-meta-mini">
                          <span>{post.authorName}</span>
                          <button 
                            className="btn-request-connect"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${post.authorId}`);
                            }}
                          >
                            Direct Connect
                          </button>
                        </div>
                      </div>
                      <div className="post-stats">
                        <span className="stat-item" onClick={(e) => handleLike(post.id, e)}>
                          ❤️ {post.likeCount || 0}
                        </span>
                        <span className="stat-item">
                          💬 {post.commentCount || 0}
                        </span>
                        <span className="stat-item" onClick={(e) => handleShare(post, e)}>
                          🔗
                        </span>
                        {user?.uid === post.authorId && (
                          <>
                            <span className="stat-item edit-action" onClick={(e) => handleEditClick(post, e)}>✏️</span>
                            <span className="stat-item delete-action" onClick={(e) => handleDeletePost(post.id, e)}>🗑️</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!loading && filteredDiscussions.length === 0 && (
                <div className="empty-state">
                  <p>No active discussions in the institutional hub.</p>
                  <button onClick={() => { setSearch(''); setActiveTab('All Discussions'); }}>Clear Filters</button>
                </div>
              )}
            </div>
        </main>
      </div>

      {/* VIEW DISCUSSION MODAL */}
      {selectedPost && (
        <div className="community-modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="community-modal detail-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedPost(null)}>×</button>
            <div className="modal-header">
              <span className="post-category">{selectedPost.type}</span>
              <h2>{selectedPost.title}</h2>
              <div className="author-full">
                <div className="avatar-placeholder">{selectedPost.authorName?.charAt(0)}</div>
                <div className="author-meta">
                  <strong>{selectedPost.authorName}</strong>
                  <span>{new Date(selectedPost.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="full-content">
                {selectedPost.content}
              </div>
              
              <div className="comments-section">
                <h4>COMMENTS</h4>
                
                <div className="comments-list">
                  {commentsLoading ? (
                    <p>Loading insights...</p>
                  ) : comments.length > 0 ? (
                    comments.map(c => (
                      <div key={c.id} className="comment-item">
                        <div className="comment-header">
                          <strong>{c.authorName}</strong>
                          <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="comment-content">{c.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="no-comments">No comments yet. Be the first to share.</p>
                  )}
                </div>

                <div className="comment-input">
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button className="btn-post-comment" onClick={handleCommentSubmit}>POST</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW DISCUSSION MODAL */}
      {isNewDiscussionModalOpen && (
        <div className="community-modal-overlay" onClick={() => setIsNewDiscussionModalOpen(false)}>
          <div className="community-modal create-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setIsNewDiscussionModalOpen(false)}>×</button>
            <h2>Institutional Legal Discussion</h2>
            <p className="modal-desc">Synthesize insights for the institutional community.</p>
            <div className="create-form">
              <input
                type="text"
                placeholder="Title (e.g., Cross-Border IP Strategy)"
                value={newPost.title}
                onChange={e => setNewPost({ ...newPost, title: e.target.value })}
              />
              <textarea
                placeholder="Expand on your legal premise..."
                value={newPost.content}
                onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                style={{minHeight: '200px'}}
              />
              <button
                className="btn-submit-discussion"
                onClick={handleCreatePost}
              >
                PUBLISH TO HUB
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Community;
