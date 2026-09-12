import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Lobby.css';
import { sounds } from '../utils/sound';
import Reveal from './Reveal';
import CampusMap, { CAMPUS_CENTER, isWithinCampus } from './CampusMap';
import LostFoundModal from './LostFoundModal';
import TradeModal from './TradeModal';

const CATEGORIES = ['All', 'General', 'Study', 'Rant', 'Art', 'Mini-Game'];

const GAME_OPTIONS = [
  { id: 'scribble', name: '🎨 Campus Scribble (Speed Pictionary)' },
  { id: 'trivia', name: '⚡ Campus Trivia Blitz (14s Countdown)' },
  { id: 'wordchain', name: '🔗 Rapid Word Chain (Combo Builder)' },
  { id: 'emojipop', name: '💥 Emoji Pop Reflex (Fast Reaction)' },
  { id: 'truthvent', name: '🎭 Truth, Vent & Dare (Confessions)' }
];

export default function Lobby({
  rooms = [],
  pins = [],
  userProfile,
  onUpdateUserProfile,
  onRerollProfile,
  onJoinRoom,
  onJoinRoomByCode,
  onCreateRoom,
  onCreatePin,
  onUpdatePin,
  onAddLostFoundComment,
  onAddTradeComment,
  onBackToLanding,
  theme = 'dark',
  onToggleTheme,
  coords
}) {
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Pin placement & creation state (defaulted to PDPM IIITDMJ Campus Center)
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pinCoords, setPinCoords] = useState({ lat: CAMPUS_CENTER[0], lng: CAMPUS_CENTER[1] });
  const [activePinTab, setActivePinTab] = useState('room'); // 'room' | 'marketplace' | 'lostfound'
  const [activeLostFoundPinId, setActiveLostFoundPinId] = useState(null);
  const [activeTradePinId, setActiveTradePinId] = useState(null);

  // Reactively derive active pins from pins prop to ensure instant live comment updates
  const currentLostFoundPin = useMemo(() => {
    return pins.find(p => p.id === activeLostFoundPinId) || null;
  }, [pins, activeLostFoundPinId]);

  const currentTradePin = useMemo(() => {
    return pins.find(p => p.id === activeTradePinId) || null;
  }, [pins, activeTradePinId]);

  // New room/pin modal state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('General');
  const [newRoomGame, setNewRoomGame] = useState('scribble');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomTags, setNewRoomTags] = useState('');

  // Marketplace fields
  const [mktPrice, setMktPrice] = useState('$15');
  const [mktType, setMktType] = useState('sell'); // 'sell' | 'rent' | 'trade'
  const [mktCondition, setMktCondition] = useState('Like New');
  const [mktPhotoUrl, setMktPhotoUrl] = useState('');

  // Lost & Found fields
  const [lfCategory, setLfCategory] = useState('lost'); // 'lost' | 'found'
  const [lfDateLoc, setLfDateLoc] = useState('');
  const [lfPhotoUrl, setLfPhotoUrl] = useState('');

  const filteredRooms = rooms.filter(room => {
    const matchesCat = selectedCategory === 'All' || room.category === selectedCategory;
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.code && room.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (room.tags && room.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    // Strict Geofence Validation: prevent any event/pin outside campus
    if (!isWithinCampus(pinCoords.lat, pinCoords.lng)) {
      sounds.playBoing();
      alert('⛔ Strict Campus Rule: Lounges and pins can only be created inside the PDPM IIITDMJ campus grounds.');
      return;
    }

    sounds.playSuccess();

    const safeLat = pinCoords.lat;
    const safeLng = pinCoords.lng;

    if (activePinTab === 'room') {
      const roomPayload = {
        name: newRoomName.trim(),
        code: newRoomCode.trim().toUpperCase() || undefined,
        category: newRoomCategory,
        selectedGame: newRoomGame,
        description: newRoomDesc.trim() || 'A chill space to decompress.',
        tags: newRoomTags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (typeof onCreateRoom === 'function') {
        onCreateRoom(roomPayload);
      }

      if (typeof onCreatePin === 'function') {
        onCreatePin({
          title: newRoomName.trim(),
          type: 'room',
          lat: safeLat,
          lng: safeLng,
          description: newRoomDesc.trim() || 'Live student lounge on campus.',
          category: newRoomCategory,
          user: userProfile
        });
      }
    } else if (activePinTab === 'marketplace') {
      if (typeof onCreatePin === 'function') {
        onCreatePin({
          title: newRoomName.trim(),
          type: 'marketplace',
          lat: safeLat,
          lng: safeLng,
          description: newRoomDesc.trim(),
          category: 'Marketplace',
          user: userProfile,
          marketData: {
            price: mktPrice.trim() || '$0',
            listingType: mktType,
            condition: mktCondition,
            photoUrl: mktPhotoUrl.trim()
          }
        });
      }
    } else if (activePinTab === 'lostfound') {
      if (typeof onCreatePin === 'function') {
        onCreatePin({
          title: newRoomName.trim(),
          type: 'lostfound',
          lat: safeLat,
          lng: safeLng,
          description: newRoomDesc.trim(),
          category: 'LostFound',
          user: userProfile,
          lostFoundData: {
            category: lfCategory,
            dateLocation: lfDateLoc.trim() || 'Campus area',
            photoUrl: lfPhotoUrl.trim(),
            description: newRoomDesc.trim()
          }
        });
      }
    }

    setIsModalOpen(false);
    setNewRoomName('');
    setNewRoomCode('');
    setNewRoomDesc('');
    setNewRoomTags('');
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    sounds.playSuccess();
    if (typeof onJoinRoomByCode === 'function') {
      onJoinRoomByCode(joinCodeInput.trim().toUpperCase());
    }
  };

  const handleCopyCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      sounds.playPop();
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {}
  };

  const getGameLabel = (gameType) => {
    switch (gameType) {
      case 'trivia': return '⚡ Trivia Blitz';
      case 'wordchain': return '🔗 Word Chain';
      case 'emojipop': return '💥 Emoji Pop';
      case 'truthvent': return '🎭 Truth & Vent';
      case 'scribble':
      default: return '🎨 Scribble';
    }
  };

  return (
    <div className="lobby-container">
      {/* Header */}
      <header className="lobby-header-bar">
        <div className="lobby-brand hover-lift" onClick={onBackToLanding} title="Back to home">
          <div className="brand-icon-box" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>🪐</div>
          <h2 className="brand-title">TheBackrooms</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            className="btn-pill-secondary"
            onClick={() => {
              sounds.playPop();
              onToggleTheme();
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            className="btn-pill-secondary"
            onClick={onBackToLanding}
            title="Back to landing"
          >
            ← Back
          </motion.button>
        </div>
      </header>

      {/* Identity Card */}
      <Reveal index={0}>
        <section className="identity-banner glass-panel hover-lift" style={{ '--user-color': userProfile?.color || '#8b5cf6' }}>
          <div className="identity-info">
            <div className="identity-avatar-box">
              <span>{userProfile?.avatar || '😴'}</span>
              <span className="identity-avatar-badge"></span>
            </div>

            <div className="identity-details">
              <div className="identity-name-row">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Alias:</span>
                <input
                  type="text"
                  className="identity-name-input"
                  placeholder="Enter your alias..."
                  value={userProfile?.name !== undefined ? userProfile.name : ''}
                  onChange={(e) => onUpdateUserProfile({ ...userProfile, name: e.target.value })}
                  title="Click to edit your alias"
                />
              </div>
              <span className="identity-mood">{userProfile?.mood || 'Decompressing in TheBackrooms'}</span>
            </div>
          </div>

          <div className="identity-actions">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="btn-pill-secondary"
              onClick={() => {
                sounds.playBoing();
                onRerollProfile();
              }}
            >
              🎲 Re-Roll Alias
            </motion.button>
          </div>
        </section>
      </Reveal>

      {/* Code Join Bar */}
      <Reveal index={1}>
        <section className="join-code-strip glass-panel hover-lift">
          <form className="join-code-form" onSubmit={handleCodeSubmit}>
            <div className="join-code-label">
              <span className="key-icon">🔑</span>
              <span>Join Custom Room:</span>
            </div>
            <input
              type="text"
              className="join-code-input"
              placeholder="Enter Room Code (e.g. COFFEE, DOODLE)..."
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={12}
            />
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              type="submit"
              className="btn-pill-primary"
              style={{ padding: '8px 22px', fontSize: '0.85rem' }}
            >
              Join Room →
            </motion.button>
          </form>
        </section>
      </Reveal>

      {/* Controls & Filter Section */}
      <Reveal index={2}>
        <section className="lobby-controls-section">
          <div className="controls-top-row">
            <div className="search-box-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search lounges by name, tag, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Segmented View Mode Toggle: Campus Map vs. Room List */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'map' ? 'active' : ''}`}
                onClick={() => {
                  sounds.playPop();
                  setViewMode('map');
                }}
              >
                🗺️ Campus Map
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => {
                  sounds.playPop();
                  setViewMode('list');
                }}
              >
                📋 Room List
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="btn-pill-primary"
              onClick={() => {
                sounds.playPop();
                setIsModalOpen(true);
              }}
            >
              {viewMode === 'map' ? '📍 Create Campus Pin' : '+ Create Lounge'}
            </motion.button>
          </div>

          {viewMode === 'list' && (
            <div className="category-filter-bar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`filter-tab-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedCategory(cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* BODY VIEW: Interactive Campus Map OR Room Grid */}
      {viewMode === 'map' ? (
        <div className="lobby-map-section">
          <CampusMap
            pins={pins}
            userProfile={userProfile}
            theme={theme}
            onOpenRoom={(roomId) => {
              if (roomId) onJoinRoom(roomId);
            }}
            onOpenMarketplace={(pin) => {
              setActiveTradePinId(pin?.id || pin);
            }}
            onOpenLostFound={(pin) => {
              setActiveLostFoundPinId(pin?.id || pin);
            }}
            isPlacingPin={isPlacingPin}
            onCancelPlacingPin={() => setIsPlacingPin(false)}
            onMapClickToPlace={(clickedCoords) => {
              setPinCoords(clickedCoords);
              setIsPlacingPin(false);
              setIsModalOpen(true);
            }}
          />
        </div>
      ) : (
        <main className="room-grid">
          {filteredRooms.map((room, idx) => {
            const userCount = room.userCount !== undefined ? room.userCount : 1;
            const roomCode = room.code || room.id?.slice(0, 6)?.toUpperCase() || 'LOBBY';

            return (
              <Reveal key={room.id} index={idx}>
                <motion.div
                  className="room-card glass-panel-interactive hover-lift"
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    sounds.playChime();
                    onJoinRoom(room.id);
                  }}
                >
                  <div className="room-card-top">
                    <span className="room-card-game-badge">
                      {getGameLabel(room.selectedGame)}
                    </span>
                    <div className="room-user-badge">
                      <span className="pulsing-ping-dot"></span>
                      <span>{userCount} online</span>
                    </div>
                  </div>

                  <div className="room-code-badge-row">
                    <span className="room-code-display">Code: #{roomCode}</span>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      className="room-code-copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCode(roomCode);
                      }}
                      title="Copy room code"
                    >
                      {copiedCode === roomCode ? '✓ Copied' : '📋 Copy'}
                    </motion.button>
                  </div>

                  <div>
                    <h3 className="room-card-title">{room.name}</h3>
                    <p className="room-card-desc">{room.description}</p>
                  </div>

                  {room.tags && room.tags.length > 0 && (
                    <div className="room-tag-pills">
                      {room.tags.map((tag, i) => (
                        <span key={i} className="room-tag hover-lift">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="room-card-footer">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1.5 }}
                      whileTap={{ scale: 0.96 }}
                      className="btn-pill-primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                      onClick={() => {
                        sounds.playChime();
                        onJoinRoom(room.id);
                      }}
                    >
                      <span>Step Inside</span>
                      <span>➔</span>
                    </motion.button>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}

          {filteredRooms.length === 0 && (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {searchQuery ? `No lounges match "${searchQuery}".` : 'No active lounges right now. Create the first one!'}
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="btn-pill-primary"
                onClick={() => setIsModalOpen(true)}
              >
                + Create Lounge ✨
              </motion.button>
            </div>
          )}
        </main>
      )}

      {/* Create Modal with Tabs for Room, Marketplace, Lost & Found */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">
                  {viewMode === 'map' ? 'Create Campus Location Pin' : 'Create a Lounge'}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="btn-pill-icon"
                  onClick={() => setIsModalOpen(false)}
                >
                  ✕
                </motion.button>
              </div>

              {/* Pin Type Tabs */}
              <div className="pin-type-tabs">
                <button
                  type="button"
                  className={`pin-type-tab ${activePinTab === 'room' ? 'active' : ''}`}
                  onClick={() => setActivePinTab('room')}
                >
                  🗣️ Social Lounge
                </button>
                <button
                  type="button"
                  className={`pin-type-tab ${activePinTab === 'marketplace' ? 'active' : ''}`}
                  onClick={() => setActivePinTab('marketplace')}
                >
                  🏷️ Campus Market
                </button>
                <button
                  type="button"
                  className={`pin-type-tab ${activePinTab === 'lostfound' ? 'active' : ''}`}
                  onClick={() => setActivePinTab('lostfound')}
                >
                  📝 Lost & Found
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-form-group">
                  <label className="modal-label">
                    {activePinTab === 'room' ? 'Lounge Name *' : activePinTab === 'marketplace' ? 'Item Title *' : 'Item Description / Name *'}
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder={
                      activePinTab === 'room'
                        ? 'e.g. 3AM Chill Corner, Late Night Cram'
                        : activePinTab === 'marketplace'
                        ? 'e.g. TI-84 Plus CE, Mini Fridge, Bike'
                        : 'e.g. Blue Hydro Flask, Sony WH-1000XM4'
                    }
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Specific Fields for Social Lounge */}
                {activePinTab === 'room' && (
                  <>
                    <div className="modal-form-group">
                      <label className="modal-label">Custom Room Code (Optional)</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="e.g. COZY42 (or leave blank to auto-generate)"
                        value={newRoomCode}
                        onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                        maxLength={10}
                      />
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Friends can enter this code to join your room immediately.
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="modal-form-group">
                        <label className="modal-label">Category</label>
                        <select
                          className="modal-input"
                          value={newRoomCategory}
                          onChange={(e) => setNewRoomCategory(e.target.value)}
                        >
                          <option value="General">🛋️ General Chill</option>
                          <option value="Study">📚 Study / Focus</option>
                          <option value="Rant">📢 Anonymous Vent</option>
                          <option value="Art">🎨 Art / Canvas</option>
                          <option value="Mini-Game">🎮 Multiplayer Games</option>
                        </select>
                      </div>

                      <div className="modal-form-group">
                        <label className="modal-label">Multiplayer Mini-Game</label>
                        <select
                          className="modal-input"
                          value={newRoomGame}
                          onChange={(e) => setNewRoomGame(e.target.value)}
                        >
                          {GAME_OPTIONS.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="modal-form-group">
                      <label className="modal-label">Tags (comma separated)</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="exams, chill, coffee, lofi"
                        value={newRoomTags}
                        onChange={(e) => setNewRoomTags(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Specific Fields for Marketplace */}
                {activePinTab === 'marketplace' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="modal-form-group">
                        <label className="modal-label">Price / Terms</label>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="$25, Free, or Trade"
                          value={mktPrice}
                          onChange={(e) => setMktPrice(e.target.value)}
                        />
                      </div>
                      <div className="modal-form-group">
                        <label className="modal-label">Listing Type</label>
                        <select
                          className="modal-input"
                          value={mktType}
                          onChange={(e) => setMktType(e.target.value)}
                        >
                          <option value="sell">Sell</option>
                          <option value="rent">Rent / Borrow</option>
                          <option value="trade">Trade</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="modal-form-group">
                        <label className="modal-label">Condition</label>
                        <select
                          className="modal-input"
                          value={mktCondition}
                          onChange={(e) => setMktCondition(e.target.value)}
                        >
                          <option value="Brand New">Brand New</option>
                          <option value="Like New">Like New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                        </select>
                      </div>
                      <div className="modal-form-group">
                        <label className="modal-label">Photo URL (Optional)</label>
                        <input
                          type="url"
                          className="modal-input"
                          placeholder="https://images.unsplash.com/..."
                          value={mktPhotoUrl}
                          onChange={(e) => setMktPhotoUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Specific Fields for Lost & Found */}
                {activePinTab === 'lostfound' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="modal-form-group">
                        <label className="modal-label">Post Type</label>
                        <select
                          className="modal-input"
                          value={lfCategory}
                          onChange={(e) => setLfCategory(e.target.value)}
                        >
                          <option value="lost">🔍 I Lost Something</option>
                          <option value="found">🙌 I Found Something</option>
                        </select>
                      </div>
                      <div className="modal-form-group">
                        <label className="modal-label">Date & Location Spotted</label>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder="Today near Library 2nd floor"
                          value={lfDateLoc}
                          onChange={(e) => setLfDateLoc(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="modal-form-group">
                      <label className="modal-label">Photo URL (Optional)</label>
                      <input
                        type="url"
                        className="modal-input"
                        placeholder="https://..."
                        value={lfPhotoUrl}
                        onChange={(e) => setLfPhotoUrl(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="modal-form-group">
                  <label className="modal-label">Description</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Provide details for campus peers..."
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                  />
                </div>

                {/* Pin Location Indicator */}
                {viewMode === 'map' && (
                  <div
                    style={{
                      background: 'var(--bg-well)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      marginBottom: '16px'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Pin Location: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {pinCoords.lat.toFixed(4)}, {pinCoords.lng.toFixed(4)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn-pill-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => {
                        setIsModalOpen(false);
                        setIsPlacingPin(true);
                      }}
                    >
                      🎯 Pick on Map
                    </button>
                  </div>
                )}

                <div className="modal-actions">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    className="btn-pill-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    className="btn-pill-primary"
                  >
                    {activePinTab === 'room' ? 'Create Lounge ➔' : 'Drop Pin on Campus ➔'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lost & Found Comments Modal */}
      {currentLostFoundPin && (
        <LostFoundModal
          pin={currentLostFoundPin}
          userProfile={userProfile}
          theme={theme}
          onClose={() => setActiveLostFoundPinId(null)}
          onAddComment={onAddLostFoundComment}
          onResolve={onUpdatePin}
        />
      )}

      {/* Campus Marketplace & Trade Comments Modal */}
      {currentTradePin && (
        <TradeModal
          pin={currentTradePin}
          userProfile={userProfile}
          theme={theme}
          onClose={() => setActiveTradePinId(null)}
          onAddComment={onAddTradeComment}
          onJoinRoom={onJoinRoom}
        />
      )}
    </div>
  );
}
