import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Landing.css';
import { sounds } from '../utils/sound';
import { AVATARS, generateAnonymousIdentity } from '../utils/identity';
import Reveal from './Reveal';

export default function Landing({
  onEnterLounge,
  onCreateLoungeDirect,
  onJoinByCode,
  userProfile = {},
  onUpdateUserProfile,
  onRerollProfile,
  theme = 'dark',
  onToggleTheme
}) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [inputCode, setInputCode] = useState('');
  // One-shot intro tagline — only animates on first visit per session
  const [showTagline] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem('tbr-intro-shown')) return false;
      sessionStorage.setItem('tbr-intro-shown', '1');
    }
    return true;
  });

  const displayName = userProfile?.name !== undefined ? userProfile.name : '';
  const currentAvatar = userProfile?.avatar || '😴';

  // Cycle avatar left / right
  const handlePrevAvatar = () => {
    sounds.playPop();
    const idx = AVATARS.indexOf(currentAvatar);
    const newIdx = idx <= 0 ? AVATARS.length - 1 : idx - 1;
    if (typeof onUpdateUserProfile === 'function') {
      onUpdateUserProfile({ ...userProfile, avatar: AVATARS[newIdx] });
    }
  };

  const handleNextAvatar = () => {
    sounds.playPop();
    const idx = AVATARS.indexOf(currentAvatar);
    const newIdx = idx >= AVATARS.length - 1 ? 0 : idx + 1;
    if (typeof onUpdateUserProfile === 'function') {
      onUpdateUserProfile({ ...userProfile, avatar: AVATARS[newIdx] });
    }
  };

  const handleReroll = () => {
    sounds.playBoing();
    if (typeof onRerollProfile === 'function') {
      onRerollProfile();
    }
  };

  const handleEnter = () => {
    sounds.playJoinChime();
    if (!userProfile?.name?.trim()) {
      const generated = generateAnonymousIdentity();
      if (typeof onUpdateUserProfile === 'function') {
        onUpdateUserProfile({ ...userProfile, name: generated.name });
      }
    }
    if (typeof onEnterLounge === 'function') {
      onEnterLounge();
    }
  };

  const handleCreate = () => {
    sounds.playSuccess();
    if (typeof onCreateLoungeDirect === 'function') {
      onCreateLoungeDirect();
    } else if (typeof onEnterLounge === 'function') {
      onEnterLounge({ openCreate: true });
    }
  };

  const handleJoinCodeSubmit = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    sounds.playSuccess();
    if (typeof onJoinByCode === 'function') {
      onJoinByCode(inputCode.trim());
    }
  };

  return (
    <div className="landing-viewport">
      {/* Header Bar */}
      <header className="landing-nav">
        <div className="brand-wrapper">
          <span className="brand-glyph">✦</span>
          <span className="brand-title">TheBackrooms</span>
          <span className="brand-edition">Campus Lounge</span>
        </div>

        <div className="nav-actions">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="btn-pill-secondary nav-pill"
            onClick={() => {
              sounds.playPop();
              if (typeof onToggleTheme === 'function') onToggleTheme();
            }}
            title="Toggle Light / Dark Mode"
          >
            {theme === 'light' ? '● Dark' : '○ Light'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="btn-pill-secondary nav-pill"
            onClick={() => {
              sounds.playBoing();
              sounds.toggleAmbient();
            }}
            title="Toggle Ambient Lo-Fi"
          >
            ♫ Audio
          </motion.button>
        </div>
      </header>

      {/* Center Card Stage */}
      <main className="landing-stage">
        {/* Top Tag */}
        <Reveal index={0}>
          <div className="backrooms-tag-pill">
            <span className="tag-dot"></span>
            <span>DECOMPRESSION SANCTUARY &bull; ZERO TRACE</span>
          </div>
        </Reveal>

        {/* Big Editorial Title */}
        <Reveal index={1}>
          <h1 className="backrooms-hero-title">
            The <em>Backrooms</em>
          </h1>
        </Reveal>

        {/* Subtitle */}
        <Reveal index={2}>
          <p className="backrooms-hero-sub">
            Anonymous real-time lounges for exhausted students.
            Doodle, vent, compete, or simply exist.
          </p>
        </Reveal>

        {/* Ephemeral Tagline */}
        <AnimatePresence>
          {showTagline && (
            <motion.div
              className="landing-tagline-badge"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>No signup &nbsp;&bull;&nbsp; No logs &nbsp;&bull;&nbsp; Every word vanishes in 12s</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimalist Card */}
        <Reveal index={3}>
          <div className="backrooms-card-container">
            {/* Alias Input Row */}
            <div className="backrooms-alias-box">
              <span className="alias-label">ALIAS</span>
              <input
                type="text"
                className="backrooms-alias-input"
                placeholder="Choose alias..."
                value={displayName}
                onChange={(e) => {
                  if (typeof onUpdateUserProfile === 'function') {
                    onUpdateUserProfile({ ...userProfile, name: e.target.value });
                  }
                }}
                title="Click to customize your alias"
                maxLength={24}
              />
              <span className="backrooms-alias-edit-icon">✎</span>
            </div>

            {/* Avatar Selector Stage */}
            <div className="backrooms-avatar-stage">
              <motion.button
                whileHover={{ rotate: 180, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="backrooms-shuffle-btn"
                onClick={handleReroll}
                title="Shuffle Random Identity"
              >
                ⟲
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15, x: -2 }}
                whileTap={{ scale: 0.9 }}
                className="backrooms-nav-arrow"
                onClick={handlePrevAvatar}
                title="Previous Avatar"
              >
                ‹
              </motion.button>

              <div className="backrooms-avatar-orbit">
                <div className="backrooms-orbit-ring">
                  <span className="backrooms-orbit-dot"></span>
                </div>
                <motion.div
                  key={currentAvatar}
                  initial={{ scale: 0.85, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                  className="backrooms-avatar-emoji"
                >
                  {currentAvatar}
                </motion.div>
              </div>

              <motion.button
                whileHover={{ scale: 1.15, x: 2 }}
                whileTap={{ scale: 0.9 }}
                className="backrooms-nav-arrow"
                onClick={handleNextAvatar}
                title="Next Avatar"
              >
                ›
              </motion.button>
            </div>

            {/* Proceed Action Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="backrooms-btn-primary"
              onClick={handleEnter}
            >
              <span>Proceed</span>
              <span className="arrow-glyph">→</span>
            </motion.button>

            {/* Join by Code */}
            <div className="backrooms-code-join-row">
              <AnimatePresence mode="wait">
                {!showCodeInput ? (
                  <motion.button
                    key="code-link"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="backrooms-code-link"
                    onClick={() => setShowCodeInput(true)}
                  >
                    Have a code? Join room →
                  </motion.button>
                ) : (
                  <motion.form
                    key="code-form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="backrooms-code-form"
                    onSubmit={handleJoinCodeSubmit}
                  >
                    <input
                      type="text"
                      className="backrooms-code-input"
                      placeholder="ROOM CODE"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      maxLength={10}
                      autoFocus
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      className="backrooms-code-btn"
                    >
                      Join
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      className="backrooms-code-btn-close"
                      onClick={() => setShowCodeInput(false)}
                    >
                      ✕
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Bottom Ephemeral Assurance */}
        <Reveal index={4}>
          <p className="backrooms-footer-tag">
            Peer-to-peer WebRTC mesh &bull; Vanishes completely when empty
          </p>
        </Reveal>
      </main>

      {/* Editorial Footer */}
      <footer className="landing-mini-footer">
        <span className="footer-copyright">TheBackrooms &copy; 2026</span>
        <div className="footer-links">
          <span>Zero Trace</span>
          <span className="sep">&bull;</span>
          <span>5 Multiplayer Games</span>
          <span className="sep">&bull;</span>
          <span>Canvas &amp; Confessions</span>
        </div>
      </footer>
    </div>
  );
}
