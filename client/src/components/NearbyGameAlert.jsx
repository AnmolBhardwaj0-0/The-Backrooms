import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './NearbyGameAlert.css';
import { sounds } from '../utils/sound';

export default function NearbyGameAlert({
  matchData,
  onAccept,
  onDismiss
}) {
  const [timeLeft, setTimeLeft] = useState(matchData?.expiresIn || 20);

  useEffect(() => {
    sounds.playChime();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (typeof onDismiss === 'function') onDismiss();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onDismiss]);

  if (!matchData) return null;

  const progressPercent = Math.max(0, (timeLeft / (matchData.expiresIn || 20)) * 100);

  return (
    <AnimatePresence>
      <motion.div
        className="nearby-game-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="nearby-game-card"
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          {/* Progress Countdown Bar */}
          <div className="nearby-timer-bar-track">
            <div
              className="nearby-timer-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="nearby-card-content">
            <div className="nearby-card-header">
              <div className="nearby-title-badge">
                <span className="nearby-radar-dot"></span>
                <span className="nearby-title-text">🎮 GAME NEARBY</span>
              </div>
              <span className="nearby-countdown-tag">{timeLeft}s</span>
            </div>

            <div className="nearby-card-body">
              <p className="nearby-headline">
                <strong>{matchData.playerCount || 2} players nearby</strong> are ready for
              </p>
              <h3 className="nearby-game-name">{matchData.gameName || 'Campus Scribble'}</h3>
              <p className="nearby-subtext">
                📍 Matched within ~100m proximity zone • Anonymous play
              </p>
            </div>

            <div className="nearby-card-actions">
              <button
                type="button"
                className="nearby-dismiss-btn"
                onClick={() => {
                  sounds.playPop();
                  onDismiss();
                }}
              >
                Pass
              </button>
              <button
                type="button"
                className="nearby-join-btn"
                onClick={() => {
                  sounds.playSuccess();
                  onAccept(matchData);
                }}
              >
                JOIN GAME
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
