import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../utils/sound';
import { getLostAndFoundPosts, createLostAndFoundPost, resolveLostAndFoundPost } from '../services/insforge';
import './LostFoundBoardModal.css';

export default function LostFoundBoardModal({
  isOpen,
  onClose,
  userProfile,
  theme = 'dark'
}) {
  const [tab, setTab] = useState('list'); // 'list' | 'create'
  const [filter, setFilter] = useState('all'); // 'all' | 'lost' | 'found' | 'resolved'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('lost');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getLostAndFoundPosts();
      setPosts(data);
    } catch (e) {
      console.error('Error fetching posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPosts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      sounds.playSuccess();
      const newPost = await createLostAndFoundPost({
        title: title.trim(),
        description: description.trim(),
        category,
        status: category,
        anonymous_handle: userProfile
      });

      if (newPost) {
        setPosts(prev => [newPost, ...prev]);
      }
      setTitle('');
      setDescription('');
      setTab('list');
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    sounds.playBoing();
    try {
      const updated = await resolveLostAndFoundPost(id);
      if (updated) {
        setPosts(prev => prev.map(p => (p.id === id ? { ...p, status: 'resolved' } : p)));
      }
    } catch (err) {
      console.error('Error resolving post:', err);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return p.status === 'resolved';
    return p.category === filter && p.status !== 'resolved';
  });

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      className="lf-board-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="lf-board-card"
        data-theme={theme}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lf-board-header">
          <div className="lf-board-title-group">
            <span className="lf-board-icon">📦</span>
            <div>
              <h3 className="lf-board-title">Campus Lost & Found</h3>
              <span className="lf-board-subtitle">Persistent campus-wide recovery board powered by InsForge</span>
            </div>
          </div>
          <button
            type="button"
            className="lf-board-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="lf-board-tabs-bar">
          <div className="lf-board-tabs">
            <button
              type="button"
              className={`lf-tab-btn ${tab === 'list' ? 'active' : ''}`}
              onClick={() => {
                sounds.playPop();
                setTab('list');
              }}
            >
              📋 Browse Items ({posts.length})
            </button>
            <button
              type="button"
              className={`lf-tab-btn ${tab === 'create' ? 'active' : ''}`}
              onClick={() => {
                sounds.playPop();
                setTab('create');
              }}
            >
              + Report Item
            </button>
          </div>

          {tab === 'list' && (
            <div className="lf-filter-pills">
              {['all', 'lost', 'found', 'resolved'].map(f => (
                <button
                  key={f}
                  type="button"
                  className={`lf-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => {
                    sounds.playPop();
                    setFilter(f);
                  }}
                >
                  {f === 'all' && 'All'}
                  {f === 'lost' && '🔴 Lost'}
                  {f === 'found' && '🟢 Found'}
                  {f === 'resolved' && '✓ Resolved'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="lf-board-body">
          {tab === 'create' ? (
            <form onSubmit={handleSubmit} className="lf-create-form">
              <div className="lf-form-row">
                <label className="lf-label">Item Status</label>
                <div className="lf-category-toggle">
                  <button
                    type="button"
                    className={`lf-toggle-btn ${category === 'lost' ? 'active lost' : ''}`}
                    onClick={() => setCategory('lost')}
                  >
                    🔴 I Lost Something
                  </button>
                  <button
                    type="button"
                    className={`lf-toggle-btn ${category === 'found' ? 'active found' : ''}`}
                    onClick={() => setCategory('found')}
                  >
                    🟢 I Found Something
                  </button>
                </div>
              </div>

              <div className="lf-form-row">
                <label className="lf-label" htmlFor="lf-input-title">Item Name / Title</label>
                <input
                  id="lf-input-title"
                  type="text"
                  className="lf-input"
                  placeholder="e.g. Blue Hydro Flask with Stickers, Student ID Card..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="lf-form-row">
                <label className="lf-label" htmlFor="lf-input-desc">Description & Location</label>
                <textarea
                  id="lf-input-desc"
                  className="lf-textarea"
                  rows={4}
                  placeholder="Where was it seen or left? Any distinguishing details?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={400}
                />
              </div>

              <div className="lf-author-preview-row">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Posting anonymously as:</span>
                <span className="lf-author-pill">
                  {userProfile?.avatar && userProfile.avatar.startsWith('http') ? (
                    <img src={userProfile.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                  ) : (
                    <span>{userProfile?.avatar || '👤'}</span>
                  )}
                  <span>{userProfile?.name || 'Anonymous Student'}</span>
                </span>
              </div>

              <div className="lf-form-actions">
                <button
                  type="button"
                  className="btn-pill-secondary"
                  onClick={() => setTab('list')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  disabled={submitting || !title.trim()}
                >
                  {submitting ? 'Posting...' : 'Publish to Board →'}
                </button>
              </div>
            </form>
          ) : (
            <div className="lf-items-list">
              {loading && (
                <div className="lf-loading-state">
                  <span className="pulsing-ping-dot" style={{ display: 'inline-block', marginRight: 8 }}></span>
                  Fetching campus posts from InsForge...
                </div>
              )}

              {!loading && filteredPosts.length === 0 && (
                <div className="lf-empty-state">
                  <p>No {filter === 'all' ? '' : filter} items reported yet.</p>
                  <button
                    type="button"
                    className="btn-pill-primary"
                    style={{ marginTop: 12 }}
                    onClick={() => setTab('create')}
                  >
                    Report an Item ✨
                  </button>
                </div>
              )}

              {!loading && filteredPosts.map((post) => {
                const isResolved = post.status === 'resolved';
                const isLost = post.category === 'lost';
                const handle = post.anonymous_handle || {};

                return (
                  <motion.div
                    key={post.id}
                    className={`lf-item-card ${isResolved ? 'resolved' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="lf-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`lf-badge ${isResolved ? 'badge-resolved' : isLost ? 'badge-lost' : 'badge-found'}`}>
                          {isResolved ? '✓ Resolved' : isLost ? '🔴 Lost' : '🟢 Found'}
                        </span>
                        <span className="lf-item-time">{formatTimestamp(post.timestamp)}</span>
                      </div>

                      {!isResolved && (
                        <button
                          type="button"
                          className="lf-resolve-btn"
                          onClick={() => handleResolve(post.id)}
                          title="Mark as resolved"
                        >
                          ✓ Resolve
                        </button>
                      )}
                    </div>

                    <h4 className="lf-item-title">{post.title}</h4>
                    {post.description && (
                      <p className="lf-item-desc">{post.description}</p>
                    )}

                    <div className="lf-item-footer">
                      <div className="lf-author-pill">
                        {handle.avatar && handle.avatar.startsWith('http') ? (
                          <img src={handle.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                        ) : (
                          <span>{handle.avatar || '🎓'}</span>
                        )}
                        <span>{handle.name || 'Anonymous Student'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
