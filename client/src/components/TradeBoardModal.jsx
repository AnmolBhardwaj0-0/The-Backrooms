import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../utils/sound';
import { getTradeMessages, createTradeMessage, resolveTradeMessage } from '../services/insforge';
import './TradeBoardModal.css';

export default function TradeBoardModal({
  isOpen,
  onClose,
  userProfile,
  theme = 'dark'
}) {
  const [tab, setTab] = useState('list'); // 'list' | 'create'
  const [filter, setFilter] = useState('open'); // 'open' | 'all' | 'resolved'
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [itemOffered, setItemOffered] = useState('');
  const [itemWanted, setItemWanted] = useState('');
  const [description, setDescription] = useState('');

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const data = await getTradeMessages();
      setTrades(data);
    } catch (e) {
      console.error('Error fetching trades:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrades();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemOffered.trim() || !itemWanted.trim()) return;

    setSubmitting(true);
    try {
      sounds.playSuccess();
      const newTrade = await createTradeMessage({
        item_offered: itemOffered.trim(),
        item_wanted: itemWanted.trim(),
        description: description.trim(),
        anonymous_handle: userProfile
      });

      if (newTrade) {
        setTrades(prev => [newTrade, ...prev]);
      }
      setItemOffered('');
      setItemWanted('');
      setDescription('');
      setTab('list');
    } catch (err) {
      console.error('Error creating trade:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    sounds.playBoing();
    try {
      const updated = await resolveTradeMessage(id);
      if (updated) {
        setTrades(prev => prev.map(t => (t.id === id ? { ...t, status: 'resolved' } : t)));
      }
    } catch (err) {
      console.error('Error resolving trade:', err);
    }
  };

  const filteredTrades = trades.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'resolved') return t.status === 'resolved';
    return t.status !== 'resolved';
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
      className="trade-board-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="trade-board-card"
        data-theme={theme}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="trade-board-header">
          <div className="trade-board-title-group">
            <span className="trade-board-icon">🤝</span>
            <div>
              <h3 className="trade-board-title">Campus Trade Messages</h3>
              <span className="trade-board-subtitle">Persistent peer-to-peer item exchanges powered by InsForge</span>
            </div>
          </div>
          <button
            type="button"
            className="trade-board-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="trade-board-tabs-bar">
          <div className="trade-board-tabs">
            <button
              type="button"
              className={`trade-tab-btn ${tab === 'list' ? 'active' : ''}`}
              onClick={() => {
                sounds.playPop();
                setTab('list');
              }}
            >
              📋 Active Offers ({trades.length})
            </button>
            <button
              type="button"
              className={`trade-tab-btn ${tab === 'create' ? 'active' : ''}`}
              onClick={() => {
                sounds.playPop();
                setTab('create');
              }}
            >
              + Post Trade
            </button>
          </div>

          {tab === 'list' && (
            <div className="trade-filter-pills">
              {['open', 'all', 'resolved'].map(f => (
                <button
                  key={f}
                  type="button"
                  className={`trade-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => {
                    sounds.playPop();
                    setFilter(f);
                  }}
                >
                  {f === 'open' && '🟢 Open Trades'}
                  {f === 'all' && 'All'}
                  {f === 'resolved' && '✓ Completed'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="trade-board-body">
          {tab === 'create' ? (
            <form onSubmit={handleSubmit} className="trade-create-form">
              <div className="trade-form-row">
                <label className="trade-label" htmlFor="trade-input-offered">🎁 Item Offered</label>
                <input
                  id="trade-input-offered"
                  type="text"
                  className="trade-input"
                  placeholder="e.g. TI-84 Plus CE, Mechanical Keyboard, Bio Lab Manual..."
                  value={itemOffered}
                  onChange={(e) => setItemOffered(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="trade-form-row">
                <label className="trade-label" htmlFor="trade-input-wanted">🔍 Item Wanted in Exchange</label>
                <input
                  id="trade-input-wanted"
                  type="text"
                  className="trade-input"
                  placeholder="e.g. Discrete Mathematics Textbook, Coffee beans, Dorm fan..."
                  value={itemWanted}
                  onChange={(e) => setItemWanted(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="trade-form-row">
                <label className="trade-label" htmlFor="trade-input-desc">Details / Notes</label>
                <textarea
                  id="trade-input-desc"
                  className="trade-textarea"
                  rows={3}
                  placeholder="Condition, campus meeting preference, or contact notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={400}
                />
              </div>

              <div className="trade-author-preview-row">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trading anonymously as:</span>
                <span className="trade-author-pill">
                  {userProfile?.avatar && userProfile.avatar.startsWith('http') ? (
                    <img src={userProfile.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                  ) : (
                    <span>{userProfile?.avatar || '🏷️'}</span>
                  )}
                  <span>{userProfile?.name || 'Anonymous Student'}</span>
                </span>
              </div>

              <div className="trade-form-actions">
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
                  disabled={submitting || !itemOffered.trim() || !itemWanted.trim()}
                >
                  {submitting ? 'Posting...' : 'Post Trade Offer →'}
                </button>
              </div>
            </form>
          ) : (
            <div className="trade-items-list">
              {loading && (
                <div className="trade-loading-state">
                  <span className="pulsing-ping-dot" style={{ display: 'inline-block', marginRight: 8 }}></span>
                  Fetching campus trade messages from InsForge...
                </div>
              )}

              {!loading && filteredTrades.length === 0 && (
                <div className="trade-empty-state">
                  <p>No trade messages found.</p>
                  <button
                    type="button"
                    className="btn-pill-primary"
                    style={{ marginTop: 12 }}
                    onClick={() => setTab('create')}
                  >
                    Post an Exchange ✨
                  </button>
                </div>
              )}

              {!loading && filteredTrades.map((trade) => {
                const isResolved = trade.status === 'resolved';
                const handle = trade.anonymous_handle || {};

                return (
                  <motion.div
                    key={trade.id}
                    className={`trade-item-card ${isResolved ? 'resolved' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="trade-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`trade-badge ${isResolved ? 'badge-resolved' : 'badge-open'}`}>
                          {isResolved ? '✓ Completed' : '🟢 Open Trade'}
                        </span>
                        <span className="trade-item-time">{formatTimestamp(trade.timestamp)}</span>
                      </div>

                      {!isResolved && (
                        <button
                          type="button"
                          className="trade-resolve-btn"
                          onClick={() => handleResolve(trade.id)}
                          title="Mark trade completed"
                        >
                          ✓ Complete Trade
                        </button>
                      )}
                    </div>

                    <div className="trade-exchange-row">
                      <div className="trade-exchange-box offering">
                        <span className="trade-box-tag">Offering</span>
                        <span className="trade-box-val">{trade.item_offered}</span>
                      </div>
                      <span className="trade-exchange-arrow">⇄</span>
                      <div className="trade-exchange-box wanting">
                        <span className="trade-box-tag">Seeking</span>
                        <span className="trade-box-val">{trade.item_wanted}</span>
                      </div>
                    </div>

                    {trade.description && (
                      <p className="trade-item-desc">{trade.description}</p>
                    )}

                    <div className="trade-item-footer">
                      <div className="trade-author-pill">
                        {handle.avatar && handle.avatar.startsWith('http') ? (
                          <img src={handle.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                        ) : (
                          <span>{handle.avatar || '🏷️'}</span>
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
