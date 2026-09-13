import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Lobby.css';
import { sounds } from '../utils/sound';
import Reveal from './Reveal';
import CampusMap from './CampusMap';
import LostFoundModal from './LostFoundModal';
import TradeModal from './TradeModal';
import LostFoundBoardModal from './LostFoundBoardModal';
import TradeBoardModal from './TradeBoardModal';
import { calculateHaversineDistance, getUserLocation } from '../utils/geo';

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
  socket
}) {
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Geolocation state (100m campus radius)
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('prompt'); // 'prompt' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  const [locationError, setLocationError] = useState(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  // Ticking time for idle expiry progress bars
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request & periodic refresh of user geolocation (every 30s)
  const refreshUserLocation = async (isManual = false) => {
    if (isManual) setIsRefreshingLocation(true);
    try {
      const loc = await getUserLocation();
      setUserLocation(loc);
      setPinCoords(prev => ({ lat: loc.lat, lng: loc.lng }));
      setLocationStatus('granted');
      setLocationError(null);
    } catch (err) {
      console.warn('Geolocation status:', err?.message || err);
      if (err?.code === 1) {
        setLocationStatus('denied');
      } else {
        setLocationStatus('unavailable');
      }
      setLocationError(err?.message || 'Location unavailable');
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshingLocation(false), 500);
      }
    }
  };

  useEffect(() => {
    refreshUserLocation();
    const intervalId = setInterval(() => {
      refreshUserLocation();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Persistent InsForge Boards
  const [isLostFoundBoardOpen, setIsLostFoundBoardOpen] = useState(false);
  const [isTradeBoardOpen, setIsTradeBoardOpen] = useState(false);

  // Pin placement & creation state
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pinCoords, setPinCoords] = useState({ lat: 23.17504, lng: 80.02921 });
  const [activePinTab, setActivePinTab] = useState('room'); // 'room' | 'marketplace' | 'lostfound'
  const [activeLostFoundPin, setActiveLostFoundPin] = useState(null);
  const [activeTradePin, setActiveTradePin] = useState(null);

  // Reactively derive active pins from pins prop to ensure instant live comment updates
  const currentLostFoundPin = useMemo(() => {
    if (!activeLostFoundPin) return null;
    const targetId = activeLostFoundPin.id || activeLostFoundPin;
    return pins.find(p => p.id === targetId) || (typeof activeLostFoundPin === 'object' ? activeLostFoundPin : null);
  }, [pins, activeLostFoundPin]);

  const currentTradePin = useMemo(() => {
    if (!activeTradePin) return null;
    const targetId = activeTradePin.id || activeTradePin;
    return pins.find(p => p.id === targetId) || (typeof activeTradePin === 'object' ? activeTradePin : null);
  }, [pins, activeTradePin]);

  // New room/pin modal state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('General');
  const [newRoomGame, setNewRoomGame] = useState('scribble');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomTags, setNewRoomTags] = useState('');
  const [newRoomTimeout, setNewRoomTimeout] = useState('unlimited'); // 'unlimited' | 15 | 30

  // Marketplace fields
  const [mktPrice, setMktPrice] = useState('$15');
  const [mktType, setMktType] = useState('sell'); // 'sell' | 'rent' | 'trade'
  const [mktCondition, setMktCondition] = useState('Like New');
  const [mktPhotoUrl, setMktPhotoUrl] = useState('');

  // Lost & Found fields
  const [lfCategory, setLfCategory] = useState('lost'); // 'lost' | 'found'
  const [lfDateLoc, setLfDateLoc] = useState('');
  const [lfPhotoUrl, setLfPhotoUrl] = useState('');

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesCat = selectedCategory === 'All' || room.category === selectedCategory;
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.code && room.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (room.tags && room.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesCat || !matchesSearch) return false;

      // 100-meter Client-Side Geofencing Filter & Live Room Visibility
      if (locationStatus === 'granted' && userLocation) {
        const hasCoords = typeof room.lat === 'number' && typeof room.lng === 'number';
        const distMeters = hasCoords
          ? calculateHaversineDistance(userLocation.lat, userLocation.lng, room.lat, room.lng)
          : null;

        // Within 100-meter campus radius
        const isNearby = distMeters != null && distMeters <= 100;

        // Active live rooms (participants online, active game round, or permanent campus hub)
        const isLiveRoom = (room.userCount && room.userCount > 0) || room.isGameActive || room.isPermanent;

        return isNearby || isLiveRoom;
      }

      return true;
    });
  }, [rooms, selectedCategory, searchQuery, locationStatus, userLocation]);

  const getRoomPurpose = (gameType, category) => {
    if (category === 'Rant' || gameType === 'truthvent') {
      return { icon: '💬', label: 'Vent & Truth', badgeClass: 'purpose-vent' };
    }
    switch (gameType) {
      case 'trivia':
        return { icon: '❓', label: 'Trivia Blitz', badgeClass: 'purpose-trivia' };
      case 'wordchain':
        return { icon: '🔗', label: 'Word Chain', badgeClass: 'purpose-chain' };
      case 'emojipop':
        return { icon: '🎮', label: 'Arcade Pop', badgeClass: 'purpose-arcade' };
      case 'scribble':
      default:
        return { icon: '🎨', label: 'Doodle Canvas', badgeClass: 'purpose-doodle' };
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    sounds.playSuccess();

    // Prevent marker stacking by adding slight jitter if at default center
    const coords = { ...pinCoords };
    if (Math.abs(coords.lat - 23.17504) < 0.00005 && Math.abs(coords.lng - 80.02921) < 0.00005) {
      coords.lat += (Math.random() - 0.5) * 0.0012;
      coords.lng += (Math.random() - 0.5) * 0.0012;
    }

    if (activePinTab === 'room') {
      const roomPayload = {
        name: newRoomName.trim(),
        code: newRoomCode.trim().toUpperCase() || undefined,
        category: newRoomCategory,
        selectedGame: newRoomGame,
        description: newRoomDesc.trim() || 'A chill space to decompress.',
        tags: newRoomTags.split(',').map(t => t.trim()).filter(Boolean),
        lat: userLocation?.lat ?? coords.lat,
        lng: userLocation?.lng ?? coords.lng,
        idleTimeout: newRoomTimeout
      };

      if (viewMode === 'list') {
        if (typeof onCreateRoom === 'function') {
          onCreateRoom(roomPayload);
        }
      } else {
        // Map mode: atomically creates pin and linked room on server
        if (typeof onCreatePin === 'function') {
          onCreatePin({
            title: newRoomName.trim(),
            code: newRoomCode.trim().toUpperCase() || undefined,
            type: 'room',
            lat: userLocation?.lat ?? coords.lat,
            lng: userLocation?.lng ?? coords.lng,
            idleTimeout: newRoomTimeout,
            description: newRoomDesc.trim() || 'Live student lounge on campus.',
            category: newRoomCategory,
            selectedGame: newRoomGame,
            tags: newRoomTags.split(',').map(t => t.trim()).filter(Boolean),
            createdBy: userProfile
          });
        }
      }
    } else if (activePinTab === 'marketplace') {
      if (typeof onCreatePin === 'function') {
        onCreatePin({
          title: newRoomName.trim(),
          type: 'marketplace',
          lat: coords.lat,
          lng: coords.lng,
          description: newRoomDesc.trim(),
          category: 'Marketplace',
          createdBy: userProfile,
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
          lat: coords.lat,
          lng: coords.lng,
          description: newRoomDesc.trim(),
          category: 'LostFound',
          createdBy: userProfile,
          lostFoundData: {
            category: lfCategory,
            dateHappened: lfDateLoc.trim() || 'Recently',
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
    setNewRoomTimeout('unlimited');
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().replace(/^#/, '').toUpperCase();
    if (!clean) return;
    sounds.playPop();
    if (typeof onJoinRoomByCode === 'function') {
      onJoinRoomByCode(clean);
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
        <section className="identity-banner glass-panel hover-lift" style={{ '--user-color': userProfile?.color || '#ff3b3b' }}>
          <div className="identity-info">
            <div className="identity-avatar-box">
              {userProfile?.avatar && userProfile.avatar.startsWith('http') ? (
                <img src={userProfile.avatar} alt="Avatar" className="identity-avatar-img" />
              ) : (
                <span>{userProfile?.avatar || '🐱'}</span>
              )}
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
            <span className="badge-pill hover-lift" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-sage)' }}>
              🛡️ Ephemeral ID
            </span>
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

            {/* Persistent InsForge Campus Boards */}
            <div className="campus-boards-toggle" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="view-mode-btn hover-lift"
                onClick={() => {
                  sounds.playPop();
                  setIsLostFoundBoardOpen(true);
                }}
                title="Campus Lost & Found (InsForge)"
              >
                📦 Lost & Found
              </button>
              <button
                type="button"
                className="view-mode-btn hover-lift"
                onClick={() => {
                  sounds.playPop();
                  setIsTradeBoardOpen(true);
                }}
                title="Campus Trade Board (InsForge)"
              >
                🤝 Trade Board
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

              {/* Manual Refresh Nearby Rooms (100m) Action */}
              <button
                type="button"
                className={`filter-tab-pill ${isRefreshingLocation ? 'pulsing' : ''}`}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  sounds.playPop();
                  refreshUserLocation(true);
                }}
                title="Refresh nearby rooms within 100m radius"
              >
                <span>📍</span>
                <span>{locationStatus === 'granted' ? 'Nearby (100m)' : 'Location'}</span>
                <span>{isRefreshingLocation ? '⏳' : '↻'}</span>
              </button>
            </div>
          )}
        </section>
      </Reveal>

      {/* BODY VIEW: Interactive Campus Map OR Original Room Grid */}
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
              setActiveTradePin(pin);
            }}
            onOpenLostFound={(pin) => {
              setActiveLostFoundPin(pin);
            }}
            isPlacingPin={isPlacingPin}
            onStartPlacingPin={() => setIsPlacingPin(true)}
            onCancelPlacingPin={() => setIsPlacingPin(false)}
            onMapClickToPlace={(coords) => {
              setPinCoords(coords);
              setIsPlacingPin(false);
              setIsModalOpen(true);
            }}
          />
        </div>
      ) : (
        <main className="room-grid">
          {/* Permission Fallback State */}
          {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '28px 20px', textAlign: 'center', borderColor: 'rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📍</div>
              <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>
                Enable location to find nearby rooms
              </h4>
              <p style={{ margin: '0 auto 14px', color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: '420px', lineHeight: 1.4 }}>
                Room visibility is limited to a 100-meter campus radius. Enable browser location or retry to discover nearby student lounges.
              </p>
              <button
                type="button"
                className="btn-pill-primary"
                onClick={() => refreshUserLocation(true)}
              >
                {isRefreshingLocation ? 'Refreshing...' : '📍 Enable Location / Retry'}
              </button>
            </div>
          )}

          {filteredRooms.map((room, idx) => {
            const userCount = room.userCount !== undefined ? room.userCount : 1;
            const roomCode = room.code || room.id?.slice(0, 6)?.toUpperCase() || 'LOBBY';
            const purpose = getRoomPurpose(room.selectedGame, room.category);
            const isTimed = room.idleTimeout && room.idleTimeout !== 'unlimited' && room.expiresAt;
            const timeoutTotalMs = room.idleTimeoutMs || (typeof room.idleTimeout === 'number' ? room.idleTimeout * 60000 : 900000);
            const remainingMs = isTimed ? Math.max(0, room.expiresAt - now) : 0;
            const progressPct = isTimed ? Math.max(2, Math.min(100, (remainingMs / timeoutTotalMs) * 100)) : 100;
            const remainingMins = isTimed ? Math.max(1, Math.ceil(remainingMs / 60000)) : 0;

            return (
              <Reveal key={room.id} index={idx}>
                <motion.div
                  className="room-card glass-panel-interactive hover-lift"
                  whileHover={{ y: -4 }}
                  style={{ position: 'relative' }}
                  onClick={() => {
                    sounds.playChime();
                    onJoinRoom(room.id);
                  }}
                >
                  {/* Subtle Idle Expiry Progress Bar */}
                  {isTimed && (
                    <div className="room-idle-bar-track" title={`Idle timeout: ${room.idleTimeout}m (${remainingMins}m remaining)`}>
                      <div
                        className="room-idle-bar-fill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}

                  <div className="room-card-top">
                    <span className={`room-purpose-badge ${purpose.badgeClass}`} title={`Purpose: ${purpose.label}`}>
                      <span>{purpose.icon}</span>
                      <span>{purpose.label}</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {userLocation && typeof room.lat === 'number' && typeof room.lng === 'number' && (() => {
                        const d = Math.round(calculateHaversineDistance(userLocation.lat, userLocation.lng, room.lat, room.lng));
                        if (d <= 100) {
                          return (
                            <span
                              className="room-countdown-pill"
                              style={{ borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--accent-sage)', background: 'rgba(16, 185, 129, 0.08)' }}
                              title="Within 100m campus radius"
                            >
                              📍 {d < 10 ? '<10m' : `${d}m`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {isTimed && (
                        <span className="room-countdown-pill" title="Time remaining until idle room vanishes">
                          ⏱️ {remainingMins}m
                        </span>
                      )}
                      <div className="room-user-badge">
                        <span className="pulsing-ping-dot"></span>
                        <span>{userCount > 0 ? `${userCount} online` : (room.isPermanent ? 'Campus Hub' : '0 online')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="room-code-badge-row">
                    <span className="room-code-display">Code: {roomCode}</span>
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
                {searchQuery ? `No lounges match "${searchQuery}".` : 'No active student lounges found nearby right now.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="btn-pill-primary"
                onClick={() => setIsModalOpen(true)}
              >
                Create a Lounge Here ✨
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

                    {/* Inactivity Duration Selector */}
                    <div className="modal-form-group">
                      <label className="modal-label">Idle Inactivity Lifetime</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-pill-secondary"
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: newRoomTimeout === 'unlimited' ? 'var(--accent-sage, #10b981)' : 'var(--bg-well, rgba(255,255,255,0.04))',
                            color: newRoomTimeout === 'unlimited' ? '#0f172a' : 'var(--text-primary, #f1f5f9)',
                            borderColor: newRoomTimeout === 'unlimited' ? 'var(--accent-sage, #10b981)' : 'var(--border-subtle, rgba(255,255,255,0.1))'
                          }}
                          onClick={() => setNewRoomTimeout('unlimited')}
                        >
                          ∞ Unlimited
                        </button>
                        <button
                          type="button"
                          className="btn-pill-secondary"
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: newRoomTimeout === 15 ? 'var(--accent-sage, #10b981)' : 'var(--bg-well, rgba(255,255,255,0.04))',
                            color: newRoomTimeout === 15 ? '#0f172a' : 'var(--text-primary, #f1f5f9)',
                            borderColor: newRoomTimeout === 15 ? 'var(--accent-sage, #10b981)' : 'var(--border-subtle, rgba(255,255,255,0.1))'
                          }}
                          onClick={() => setNewRoomTimeout(15)}
                        >
                          ⏱️ 15 min idle
                        </button>
                        <button
                          type="button"
                          className="btn-pill-secondary"
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: newRoomTimeout === 30 ? 'var(--accent-sage, #10b981)' : 'var(--bg-well, rgba(255,255,255,0.04))',
                            color: newRoomTimeout === 30 ? '#0f172a' : 'var(--text-primary, #f1f5f9)',
                            borderColor: newRoomTimeout === 30 ? 'var(--accent-sage, #10b981)' : 'var(--border-subtle, rgba(255,255,255,0.1))'
                          }}
                          onClick={() => setNewRoomTimeout(30)}
                        >
                          ⏱️ 30 min idle
                        </button>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', display: 'block' }}>
                        Refreshes on any user interaction. Deactivates when quiet.
                      </span>
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
      <AnimatePresence>
        {currentLostFoundPin && (
          <LostFoundModal
            key={currentLostFoundPin.id || 'lf-modal'}
            pin={currentLostFoundPin}
            userProfile={userProfile}
            theme={theme}
            onClose={() => setActiveLostFoundPin(null)}
            onAddComment={onAddLostFoundComment}
            onResolve={onUpdatePin}
          />
        )}
      </AnimatePresence>

      {/* Campus Marketplace & Trade Comments Modal */}
      <AnimatePresence>
        {currentTradePin && (
          <TradeModal
            key={currentTradePin.id || 'trade-modal'}
            pin={currentTradePin}
            userProfile={userProfile}
            theme={theme}
            onClose={() => setActiveTradePin(null)}
            onAddComment={onAddTradeComment}
            onJoinRoom={onJoinRoom}
          />
        )}
      </AnimatePresence>

      {/* InsForge Persistent Lost & Found Board Modal */}
      <AnimatePresence>
        {isLostFoundBoardOpen && (
          <LostFoundBoardModal
            isOpen={isLostFoundBoardOpen}
            onClose={() => setIsLostFoundBoardOpen(false)}
            userProfile={userProfile}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* InsForge Persistent Campus Trade Board Modal */}
      <AnimatePresence>
        {isTradeBoardOpen && (
          <TradeBoardModal
            isOpen={isTradeBoardOpen}
            onClose={() => setIsTradeBoardOpen(false)}
            userProfile={userProfile}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
