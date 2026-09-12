import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Room.css';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

const PALETTE = [
  '#8b5cf6', // Lavender Accent
  '#10b981', // Sage Green
  '#f59e0b', // Amber Warm
  '#f43f5e', // Rose Coral
  '#0ea5e9', // Sky Blue
  '#12141a', // Obsidian Charcoal
  '#ffffff', // Pure White
  '#facc15'  // Mellow Yellow
];

const EMOJI_REACTIONS = ['💜', '☕', '🌿', '🔥', '😭', '🫂', '✨', '🏆'];

export default function RoomView({
  socket,
  roomId,
  userProfile,
  onLeaveRoom,
  theme = 'dark',
  onToggleTheme,
  coords
}) {
  // Room state
  const [roomData, setRoomData] = useState({
    name: 'Virtual Lounge',
    code: '',
    category: 'General',
    selectedGame: 'scribble',
    description: '',
    tags: []
  });
  const [activeUsers, setActiveUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [floatingParticles, setFloatingParticles] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [countdown, setCountdown] = useState({ isCounting: false, seconds: 5, gameName: '' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);

  // Multi-Game State
  const [gameState, setGameState] = useState({
    type: 'scribble',
    isActive: false,
    timeLeft: 30,
    scores: {},
    
    // Scribble
    isDrawer: false,
    word: '',
    maskedWord: '',
    drawer: null,

    // Trivia
    question: '',
    options: [],
    category: '',
    selectedAnswerIdx: null,
    resolvedAnswer: null,

    // Word Chain
    lastWord: 'Campus',
    currentLetter: 'C',
    streakCount: 1,
    wordHistory: ['Campus'],
    wordChainInput: '',

    // Truth / Vent
    prompt: { type: 'Vent', text: 'What campus rumor drove you crazy recently?' },

    // Emoji Pop
    targets: []
  });

  // Canvas refs
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const strokeHistoryRef = useRef([]);

  // Toolbar auto-hide: hides while drawing, reappears on idle
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const toolbarIdleTimerRef = useRef(null);

  // Canvas stroke visual-fade loop (purely presentational — does NOT alter strokeHistoryRef)
  const fadeRafRef = useRef(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Copy Room Code
  const handleCopyRoomCode = () => {
    const code = roomData.code || roomId.replace('lounge-', '').slice(0, 6).toUpperCase();
    try {
      navigator.clipboard.writeText(code);
      sounds.playPop();
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {}
  };

  // Socket & Presence Sync
  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', { roomId, user: userProfile, coords });

    socket.on('room_joined_data', (data) => {
      if (data.room) setRoomData(data.room);
      if (data.activeUsers) setActiveUsers(data.activeUsers);
      if (data.recentMessages) setMessages(data.recentMessages);
      if (data.gameState) {
        setGameState(prev => ({ ...prev, ...data.gameState }));
      }
      if (data.canvasStrokes && data.canvasStrokes.length > 0) {
        setTimeout(() => replayStrokes(data.canvasStrokes), 150);
      }
    });

    socket.on('user_joined', ({ user, activeUsers: usersList }) => {
      setActiveUsers(usersList || []);
      sounds.playJoinChime();
    });

    socket.on('user_left', ({ user, activeUsers: usersList }) => {
      setActiveUsers(usersList || []);
    });

    socket.on('active_users_update', ({ activeUsers: usersList }) => {
      setActiveUsers(usersList || []);
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (msg.sender?.name !== userProfile.name) {
        sounds.playPop();
      }
      // Front-end only: fire dissolve chime 200ms before message vaporizes
      if (msg.isEphemeral) {
        setTimeout(() => sounds.playDissolve(), 11800);
      }
    });

    socket.on('stroke_received', (stroke) => {
      drawRemoteStroke(stroke);
    });

    socket.on('canvas_cleared', () => {
      clearLocalCanvas();
      sounds.playPop();
    });

    socket.on('user_typing_update', ({ userName, isTyping }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(userName);
        else next.delete(userName);
        return next;
      });
    });

    socket.on('reaction_burst', ({ emoji }) => {
      triggerReactionParticle(emoji);
      sounds.playPop();
    });

    // Multi-Game Sync
    socket.on('game_state_sync', (syncData) => {
      setGameState(prev => ({
        ...prev,
        ...syncData,
        selectedAnswerIdx: null,
        resolvedAnswer: null
      }));
      sounds.playSuccess();
    });

    socket.on('game_timer_tick', ({ timeLeft }) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    socket.on('game_score_update', ({ scores }) => {
      setGameState(prev => ({ ...prev, scores }));
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      sounds.playSuccess();
    });

    socket.on('game_round_ended', ({ word, scores }) => {
      setGameState(prev => ({ ...prev, word, scores: scores || prev.scores }));
    });

    socket.on('game_stopped', () => {
      setGameState(prev => ({ ...prev, isActive: false }));
    });

    // Trivia
    socket.on('trivia_answer_acknowledged', ({ answerIndex }) => {
      setGameState(prev => ({ ...prev, selectedAnswerIdx: answerIndex }));
      sounds.playBoing();
    });

    socket.on('trivia_round_resolved', ({ correctIndex, correctAnswer, winners, scores }) => {
      setGameState(prev => ({
        ...prev,
        resolvedAnswer: { correctIndex, correctAnswer, winners },
        scores
      }));
      if (winners && winners.includes(userProfile.name)) {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        sounds.playSuccess();
      }
    });

    // Word Chain
    socket.on('word_chain_update', ({ lastWord, currentLetter, streakCount, scores }) => {
      setGameState(prev => ({
        ...prev,
        lastWord,
        currentLetter,
        streakCount,
        scores,
        wordHistory: [...(prev.wordHistory || []), lastWord]
      }));
      sounds.playSuccess();
    });

    // Emoji Pop
    socket.on('emoji_targets_respawn', ({ targets }) => {
      setGameState(prev => ({ ...prev, targets }));
    });

    socket.on('emoji_target_popped', ({ targetId, poppedBy, scores }) => {
      setGameState(prev => ({
        ...prev,
        targets: (prev.targets || []).filter(t => t.id !== targetId),
        scores
      }));
      triggerReactionParticle('💥');
    });

    // 5-Second Cooldown Countdown Events
    socket.on('game_countdown_start', ({ seconds, gameType, gameName }) => {
      setCountdown({ isCounting: true, seconds: seconds || 5, gameName: gameName || 'Game' });
      setGameState(prev => ({ ...prev, type: gameType || prev.type }));
      sounds.playPop();
    });

    socket.on('game_countdown_tick', ({ seconds, gameType }) => {
      setCountdown(prev => ({ ...prev, seconds }));
      sounds.playBoing();
    });

    socket.on('game_countdown_end', () => {
      setCountdown({ isCounting: false, seconds: 0, gameName: '' });
      sounds.playSuccess();
    });

    // In-Chat Game Switch Poll Sync
    socket.on('poll_updated', ({ pollId, yesCount, noCount, totalUsers }) => {
      setMessages(prev => prev.map(m => {
        if (m.poll && m.poll.id === pollId) {
          return {
            ...m,
            poll: { ...m.poll, yesCount, noCount, totalUsers }
          };
        }
        return m;
      }));
      sounds.playPop();
    });

    socket.on('poll_resolved', ({ pollId, passed, targetGame, gameName }) => {
      setMessages(prev => prev.map(m => {
        if (m.poll && m.poll.id === pollId) {
          return {
            ...m,
            poll: { ...m.poll, isResolved: true, passed }
          };
        }
        return m;
      }));
      if (passed) sounds.playSuccess();
      else sounds.playPop();
    });

    return () => {
      socket.off('room_joined_data');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('active_users_update');
      socket.off('new_message');
      socket.off('stroke_received');
      socket.off('canvas_cleared');
      socket.off('user_typing_update');
      socket.off('reaction_burst');
      socket.off('game_state_sync');
      socket.off('game_timer_tick');
      socket.off('game_score_update');
      socket.off('game_round_ended');
      socket.off('game_stopped');
      socket.off('trivia_answer_acknowledged');
      socket.off('trivia_round_resolved');
      socket.off('word_chain_update');
      socket.off('emoji_targets_respawn');
      socket.off('emoji_target_popped');
      socket.off('game_countdown_start');
      socket.off('game_countdown_tick');
      socket.off('game_countdown_end');
      socket.off('poll_updated');
      socket.off('poll_resolved');
      socket.emit('leave_room', { roomId });
    };
  }, [socket, roomId, userProfile]);

  const triggerReactionParticle = (emoji) => {
    const newParticle = {
      id: Math.random(),
      emoji,
      left: `${20 + Math.random() * 60}%`,
      bottom: '120px'
    };
    setFloatingParticles(prev => [...prev.slice(-15), newParticle]);
    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 2200);
  };

  const handleSendReaction = (emoji) => {
    if (!socket) return;
    socket.emit('send_reaction', { emoji });
  };

  // Canvas Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      if (strokeHistoryRef.current.length > 0) {
        replayStrokes(strokeHistoryRef.current);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Visual-only canvas stroke fade — paints a near-transparent overlay each frame
    // Does NOT read or mutate strokeHistoryRef; no effect on sync
    const startFadeLoop = () => {
      const step = () => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.0015)'; // ~2-min full fade at 60fps
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.restore();
        fadeRafRef.current = requestAnimationFrame(step);
      };
      fadeRafRef.current = requestAnimationFrame(step);
    };
    startFadeLoop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, []);

  const replayStrokes = (strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    strokeHistoryRef.current = strokes;
    strokes.forEach(stroke => {
      drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser);
    });
  };

  const drawSegment = (ctx, x1, y1, x2, y2, color, width, isErase) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;

    if (isErase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  const drawRemoteStroke = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser);
    strokeHistoryRef.current.push(stroke);
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistoryRef.current = [];
  };

  const handleClearCanvasClick = () => {
    clearLocalCanvas();
    sounds.playPop();
    if (socket) socket.emit('clear_canvas');
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);
    // Hide toolbar immediately when drawing starts
    setIsToolbarVisible(false);
    if (toolbarIdleTimerRef.current) clearTimeout(toolbarIdleTimerRef.current);
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoords(e);

    const stroke = {
      x1: lastPointRef.current.x,
      y1: lastPointRef.current.y,
      x2: coords.x,
      y2: coords.y,
      color: brushColor,
      width: brushWidth,
      isEraser: isEraser
    };

    drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser);
    strokeHistoryRef.current.push(stroke);
    if (socket) socket.emit('draw_stroke', stroke);

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    // Reveal toolbar after 600ms idle
    if (toolbarIdleTimerRef.current) clearTimeout(toolbarIdleTimerRef.current);
    toolbarIdleTimerRef.current = setTimeout(() => setIsToolbarVisible(true), 600);
  };

  const exportCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `thebackrooms-art-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    sounds.playSuccess();
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !socket) return;

    socket.emit('send_message', { text, isEphemeral });
    sounds.playSend();
    setInputText('');
    socket.emit('typing_status', { isTyping: false });
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket) return;
    socket.emit('typing_status', { isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_status', { isTyping: false });
    }, 1800);
  };

  // Game Control Handlers
  const handleSelectGameDropdown = (newGameType) => {
    if (newGameType === gameState.type) return;
    sounds.playBoing();
    if (socket) {
      socket.emit('propose_game_switch', { targetGame: newGameType });
    }
  };

  const handleVotePoll = (pollId, vote) => {
    if (!socket) return;
    sounds.playPop();
    socket.emit('vote_game_poll', { pollId, vote });
  };

  const handleSwitchGame = (gameType) => {
    handleSelectGameDropdown(gameType);
  };

  const handleToggleGame = () => {
    sounds.playPop();
    if (socket) socket.emit('toggle_game');
  };

  const handleTriviaAnswer = (index) => {
    if (!socket || gameState.selectedAnswerIdx !== null) return;
    sounds.playBoing();
    socket.emit('submit_trivia_answer', { answerIndex: index });
  };

  const handlePopTarget = (target) => {
    if (!socket) return;
    sounds.playPop();
    socket.emit('pop_emoji_target', { targetId: target.id, points: target.points });
  };

  const handleNextTruthVent = () => {
    if (socket) {
      sounds.playBoing();
      socket.emit('next_truth_vent_prompt');
    }
  };

  const handleSharePromptToChat = () => {
    if (!socket || !gameState.prompt) return;
    const promptText = `🎭 [${(gameState.prompt.type || 'Vent').toUpperCase()}] ${gameState.prompt.text || ''}`;
    socket.emit('send_message', { roomId, text: promptText, isEphemeral: false });
    sounds.playSend();
  };

  const handleWordChainSubmit = (e) => {
    e.preventDefault();
    const word = (gameState.wordChainInput || '').trim();
    if (!word || !socket) return;

    sounds.playPop();
    socket.emit('send_message', { text: word });
    setGameState(prev => ({ ...prev, wordChainInput: '' }));
  };

  const displayRoomCode = roomData.code || roomId.replace('lounge-', '').slice(0, 6).toUpperCase();

  return (
    <div className="room-view-container">
      {/* Floating Reaction Particles */}
      {floatingParticles.map(p => (
        <div key={p.id} className="floating-reaction-particle" style={{ left: p.left, bottom: p.bottom }}>
          {p.emoji}
        </div>
      ))}

      {/* Header Bar */}
      <header className="room-header">
        <div className="room-header-left">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.94 }}
            className="btn-pill-secondary hover-lift"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={onLeaveRoom}
          >
            ← Back
          </motion.button>
          <div className="room-title-heading">
            <span className="room-name-text">{roomData.name}</span>
            <span className="badge-pill hover-lift" style={{ background: 'var(--bg-well)', color: 'var(--accent-lavender)' }}>
              {roomData.category}
            </span>
          </div>

          {/* Room Code Badge */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="room-code-pill-btn hover-lift"
            onClick={handleCopyRoomCode}
            title="Share Room Code with friends"
          >
            <span>Code: #{displayRoomCode}</span>
            <span style={{ fontSize: '0.75rem' }}>{copiedCode ? '✓ Copied' : '📋'}</span>
          </motion.div>
        </div>

        <div className="room-header-center">
          <div className="activity-live-status-pill hover-lift">
            <span className="activity-icon">
              {gameState.type === 'scribble' && '🎨'}
              {gameState.type === 'trivia' && '⚡'}
              {gameState.type === 'wordchain' && '🔗'}
              {gameState.type === 'emojipop' && '💥'}
              {gameState.type === 'truthvent' && '🎭'}
            </span>
            <span className="activity-name">
              {gameState.type === 'scribble' && 'Canvas & Scribble'}
              {gameState.type === 'trivia' && 'Campus Trivia Blitz'}
              {gameState.type === 'wordchain' && 'Rapid Word Chain'}
              {gameState.type === 'emojipop' && 'Emoji Pop Reflex'}
              {gameState.type === 'truthvent' && 'Truth, Vent & Dare'}
            </span>
            {gameState.isActive && (
              <span className="live-pulse-badge">
                <span className="pulsing-ping-dot" style={{ width: '6px', height: '6px' }}></span>
                {gameState.timeLeft}s
              </span>
            )}
          </div>
        </div>

        <div className="room-header-right">
          {/* Live Presence Ping Indicator */}
          <div className="room-ping-indicator hover-lift" title="Live active students connected">
            <span className="pulsing-ping-dot"></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{activeUsers.length || 1} online</span>
          </div>

          {/* Connected User Avatars — glow intensity reflects room activity */}
          <div
            className="presence-avatars-list"
            title="Active students in lounge"
            style={{ '--activity-level': Math.min((activeUsers.length - 1) / 5, 1) }}
          >
            {activeUsers.slice(0, 5).map(u => (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.25, y: -2 }}
                className="presence-avatar"
                style={{ borderColor: u.color || 'var(--accent-lavender)' }}
                title={u.name}
              >
                {u.avatar || '😴'}
              </motion.div>
            ))}
          </div>

          {/* Rightmost Settings Button & Popover (Photo 5) */}
          <div className="room-settings-wrapper" style={{ position: 'relative' }}>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 30 }}
              whileTap={{ scale: 0.9 }}
              className={`btn-settings-gear hover-lift ${isSettingsOpen ? 'active' : ''}`}
              onClick={() => {
                sounds.playPop();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              title="Lounge Settings & Options"
            >
              ⚙️
            </motion.button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  className="settings-popover-card glass-panel"
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="settings-popover-header">
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>⚙️ Lounge Settings</span>
                    <button className="settings-close-x" onClick={() => setIsSettingsOpen(false)}>✕</button>
                  </div>

                  <div className="settings-options-list">
                    <button
                      className="settings-menu-item"
                      onClick={() => {
                        sounds.playPop();
                        onToggleTheme();
                      }}
                    >
                      <span>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                    </button>

                    <button
                      className="settings-menu-item"
                      onClick={() => {
                        sounds.playBoing();
                        sounds.toggleAmbient();
                        setIsLofiPlaying(prev => !prev);
                      }}
                    >
                      <span>🎵 {isLofiPlaying ? 'Pause Lo-Fi' : 'Play Lo-Fi'}</span>
                    </button>

                    <button
                      className="settings-menu-item"
                      onClick={handleCopyRoomCode}
                    >
                      <span>📋 {copiedCode ? '✓ Copied Code' : `Code: #${displayRoomCode}`}</span>
                    </button>

                    <button
                      className="settings-menu-item danger"
                      onClick={onLeaveRoom}
                    >
                      <span>🚪 Leave Lounge</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Split Layout: Left In-Window Arena | Right Real-Time Chat */}
      <main className="room-split-layout">
        {/* LEFT: Continuous In-Window Interactive Arena */}
        <section className="game-pane">
          {/* Minimal Game Section with Dropdown List (Photo 4) */}
          <div className="arena-activity-nav">
            <div className="game-select-dropdown-container">
              <span className="game-select-icon">
                {gameState.type === 'scribble' && '🎨'}
                {gameState.type === 'trivia' && '⚡'}
                {gameState.type === 'wordchain' && '🔗'}
                {gameState.type === 'emojipop' && '💥'}
                {gameState.type === 'truthvent' && '🎭'}
              </span>
              <select
                className="game-dropdown-select hover-lift"
                value={gameState.type}
                onChange={(e) => handleSelectGameDropdown(e.target.value)}
                disabled={countdown.isCounting}
                title="Select mini-game (initiates a vote if peers are present)"
              >
                <option value="scribble">🎨 Campus Scribble & Guess</option>
                <option value="trivia">⚡ Campus Trivia Blitz</option>
                <option value="wordchain">🔗 Rapid Word Chain</option>
                <option value="emojipop">💥 Emoji Pop Reflex</option>
                <option value="truthvent">🎭 Truth, Vent & Dare</option>
              </select>
            </div>

            {/* Quick Round Control Action */}
            <div className="arena-round-actions">
              {countdown.isCounting ? (
                <div className="countdown-pill-badge hover-lift">
                  <span className="pulsing-ping-dot"></span>
                  <span>Starting in {countdown.seconds}s...</span>
                </div>
              ) : (
                <>
                  {gameState.type === 'scribble' && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`btn-pill-primary hover-lift ${gameState.isActive ? 'active-stop' : ''}`}
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleToggleGame}
                    >
                      {gameState.isActive ? '⏹️ Stop Round' : '▶️ Play Scribble'}
                    </motion.button>
                  )}
                  {gameState.type === 'trivia' && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-pill-primary hover-lift"
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleToggleGame}
                    >
                      {gameState.isActive ? 'Next Question ➔' : '▶️ Start Trivia'}
                    </motion.button>
                  )}
                  {gameState.type === 'truthvent' && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-pill-primary hover-lift"
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleNextTruthVent}
                    >
                      Next Prompt ➔
                    </motion.button>
                  )}
                  {gameState.type === 'emojipop' && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`btn-pill-primary hover-lift ${gameState.isActive ? 'active-stop' : ''}`}
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleToggleGame}
                    >
                      {gameState.isActive ? '⏹️ Stop Pop' : '▶️ Start Pop'}
                    </motion.button>
                  )}
                  {gameState.type === 'wordchain' && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className={`btn-pill-primary hover-lift ${gameState.isActive ? 'active-stop' : ''}`}
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleToggleGame}
                    >
                      {gameState.isActive ? '⏹️ End Chain' : '▶️ Start Chain'}
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Active Activity Screen Area */}
          <div className="arena-stage-container" style={{ position: 'relative' }}>
            {/* 5-Second Cooldown Countdown Overlay */}
            <AnimatePresence>
              {countdown.isCounting && (
                <motion.div
                  className="countdown-overlay-modal"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="countdown-display-card glass-panel">
                    <span className="countdown-sub-title">GAME STARTING IN</span>
                    <motion.span
                      key={countdown.seconds}
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="countdown-big-number"
                    >
                      {countdown.seconds}
                    </motion.span>
                    <span className="countdown-game-tag">{countdown.gameName}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {/* 1. Canvas & Scribble Screen */}
              {gameState.type === 'scribble' && (
                <motion.div
                  key="scribble"
                  className="canvas-wrapper"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Active Scribble Word Banner */}
                  {gameState.isActive && (
                    <div className="scribble-hud-strip">
                      {gameState.isDrawer ? (
                        <div className="scribble-hud-content">
                          <span className="hud-badge">🎨 YOU ARE DRAWING:</span>
                          <span className="hud-word">{gameState.word}</span>
                          <span className="hud-note">Peers are guessing in chat alongside!</span>
                        </div>
                      ) : (
                        <div className="scribble-hud-content">
                          <span className="hud-badge">🤔 GUESS IN CHAT:</span>
                          <span className="hud-word">{gameState.maskedWord}</span>
                          <span className="hud-note">Type guesses in the chat on the right!</span>
                        </div>
                      )}
                      <span className="hud-timer">⏱️ {gameState.timeLeft}s</span>
                    </div>
                  )}

                  <canvas
                    ref={canvasRef}
                    className="drawing-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />

                  {/* Floating Drawing Toolbar — auto-hides while drawing */}
                  <div
                    className={`canvas-floating-toolbar${isToolbarVisible ? '' : ' toolbar-hidden'}`}
                    onMouseEnter={() => setIsToolbarVisible(true)}
                  >
                    {PALETTE.map((c, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className={`toolbar-color-btn ${brushColor === c && !isEraser ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setBrushColor(c);
                          setIsEraser(false);
                          sounds.playPop();
                        }}
                      />
                    ))}
                    <div className="tool-separator" />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`filter-tab-pill ${isEraser ? 'active' : ''}`}
                      onClick={() => setIsEraser(!isEraser)}
                    >
                      🧹 Eraser
                    </motion.button>
                    <input
                      type="range"
                      min="2"
                      max="28"
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(Number(e.target.value))}
                      className="size-slider"
                      title="Brush Size"
                    />
                    <div className="tool-separator" />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="filter-tab-pill"
                      onClick={handleClearCanvasClick}
                    >
                      🗑️ Clear
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="filter-tab-pill"
                      onClick={exportCanvasSnapshot}
                    >
                      📸 Save
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* 2. Campus Trivia Blitz Screen */}
              {gameState.type === 'trivia' && (
                <motion.div
                  key="trivia"
                  className="game-deck-wrapper"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="trivia-deck">
                    <div className="game-deck-header">
                      <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-lavender)' }}>
                        ⚡ CAMPUS TRIVIA BLITZ
                      </span>
                      <span className="game-timer-pill">
                        ⏱️ {gameState.timeLeft}s left
                      </span>
                    </div>

                    <h2 className="trivia-question-title">
                      {gameState.question || "Ready for rapid campus & tech trivia showdown?"}
                    </h2>

                    <div className="trivia-options-grid">
                      {(gameState.options && gameState.options.length > 0 ? gameState.options : [
                        "Option A", "Option B", "Option C", "Option D"
                      ]).map((opt, i) => {
                        const isSelected = gameState.selectedAnswerIdx === i;
                        const isResolved = gameState.resolvedAnswer !== null;
                        const isCorrect = isResolved && gameState.resolvedAnswer.correctIndex === i;

                        let btnClass = 'trivia-option-btn';
                        if (isSelected) btnClass += ' selected';
                        if (isCorrect) btnClass += ' correct';

                        return (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={btnClass}
                            onClick={() => handleTriviaAnswer(i)}
                            disabled={gameState.selectedAnswerIdx !== null}
                          >
                            <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span>
                            <span>{opt}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Leaderboard Row */}
                    {gameState.scores && Object.keys(gameState.scores).length > 0 && (
                      <div className="deck-scores-row">
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>🏆 Leaderboard:</span>
                        {Object.entries(gameState.scores).map(([name, score]) => (
                          <span key={name} className="score-pill">
                            {name}: {score} pts
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 3. Rapid Word Chain Screen */}
              {gameState.type === 'wordchain' && (
                <motion.div
                  key="wordchain"
                  className="game-deck-wrapper"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="wordchain-deck">
                    <div className="game-deck-header">
                      <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-sage)' }}>
                        🔗 RAPID WORD CHAIN
                      </span>
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--text-primary)' }}>
                        🔥 Streak: {gameState.streakCount}x
                      </span>
                    </div>

                    <div className="wordchain-hero-card">
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Next Word Must Start With
                      </span>
                      <div className="chain-letter-display">
                        {gameState.currentLetter || 'C'}
                      </div>
                      <div className="chain-last-played">
                        Last played: <strong>{gameState.lastWord || 'Campus'}</strong>
                      </div>
                    </div>

                    <form className="wordchain-form-bar" onSubmit={handleWordChainSubmit}>
                      <input
                        type="text"
                        className="wordchain-input-field"
                        placeholder={`Enter word starting with "${gameState.currentLetter || 'C'}"...`}
                        value={gameState.wordChainInput || ''}
                        onChange={(e) => setGameState(prev => ({ ...prev, wordChainInput: e.target.value }))}
                        autoFocus
                      />
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="btn-pill-primary hover-lift"
                      >
                        Submit
                      </motion.button>
                    </form>

                    {gameState.wordHistory && gameState.wordHistory.length > 0 && (
                      <div className="chain-trail-box">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recent Trail:</span>
                        <div className="chain-tags-row">
                          {gameState.wordHistory.slice(-8).map((w, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="chain-word-chip hover-lift"
                            >
                              {w}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 4. Emoji Pop Reflex Screen */}
              {gameState.type === 'emojipop' && (
                <motion.div
                  key="emojipop"
                  className="emojipop-full-arena"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="emojipop-top-bar">
                    <span className="badge-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
                      💥 EMOJI POP REFLEX
                    </span>
                    {gameState.scores && gameState.scores[userProfile.name] !== undefined && (
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--text-primary)' }}>
                        Your Score: {gameState.scores[userProfile.name]} pts
                      </span>
                    )}
                  </div>

                  <div className="emojipop-click-field">
                    <AnimatePresence>
                      {(gameState.targets || []).map(target => (
                        <motion.div
                          key={target.id}
                          initial={{ scale: 0, rotate: -15, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
                          whileHover={{ scale: 1.25 }}
                          whileTap={{ scale: 0.85 }}
                          className="emojipop-target-item"
                          style={{ left: `${target.x}%`, top: `${target.y}%`, fontSize: `${target.size}px` }}
                          onClick={() => handlePopTarget(target)}
                        >
                          <span>{target.emoji}</span>
                          <span className="target-points-badge">+{target.points}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {(!gameState.targets || gameState.targets.length === 0) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="emojipop-idle-placeholder"
                      >
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                          Click below to spawn targets and test your reflexes!
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.04, y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          className="btn-pill-primary hover-lift"
                          onClick={handleToggleGame}
                        >
                          🚀 Start Emoji Pop
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 5. Truth, Vent & Dare Screen */}
              {gameState.type === 'truthvent' && (
                <motion.div
                  key="truthvent"
                  className="game-deck-wrapper"
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="truthvent-deck">
                    <div className="game-deck-header">
                      <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-lavender)' }}>
                        🎭 TRUTH, VENT & DARE
                      </span>
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--accent-amber)' }}>
                        {gameState.prompt?.type || 'Vent'}
                      </span>
                    </div>

                    <div className="truthvent-card-content">
                      <span className="truthvent-prompt-label">Prompt for the Room:</span>
                      <p className="truthvent-prompt-body">
                        "{gameState.prompt?.text || 'What campus rumor drove you crazy recently?'}"
                      </p>
                    </div>

                    <div className="truthvent-actions-row">
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn-pill-primary hover-lift"
                        onClick={handleNextTruthVent}
                      >
                        🎲 Next Prompt
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn-pill-secondary hover-lift"
                        onClick={handleSharePromptToChat}
                        title="Send prompt to chat alongside"
                      >
                        📢 Share to Chat ➔
                      </motion.button>
                    </div>

                    <div className="truthvent-hint">
                      Respond, debate, or confess anonymously in the chat right beside this card!
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* RIGHT: Real-Time Vent Feed & Chat */}
        <section className="chat-pane">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulsing-ping-dot"></span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Real-Time Vent Feed</span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="chat-messages-container">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                if (m.isPoll && m.poll) {
                  const poll = m.poll;
                  const hasVotedYes = poll.yesVotes?.includes(socket?.id) || poll.userVote === 'yes';
                  const hasVotedNo = poll.noVotes?.includes(socket?.id) || poll.userVote === 'no';

                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="poll-chat-bubble glass-panel hover-lift"
                    >
                      <div className="poll-chat-header">
                        <span className="poll-chat-badge">📊 GAME VOTE POLL</span>
                        {poll.isResolved ? (
                          <span className={`poll-status-tag ${poll.passed ? 'passed' : 'failed'}`}>
                            {poll.passed ? '✓ PASSED' : '✕ REJECTED'}
                          </span>
                        ) : (
                          <span className="poll-live-indicator">
                            <span className="pulsing-ping-dot" style={{ width: '6px', height: '6px' }}></span>
                            Active
                          </span>
                        )}
                      </div>

                      <p className="poll-prompt-text">
                        Switch game to <strong>{poll.gameName}</strong>?
                      </p>

                      {!poll.isResolved && (
                        <div className="poll-vote-buttons-row">
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.94 }}
                            className={`poll-btn yes ${hasVotedYes ? 'active' : ''}`}
                            onClick={() => handleVotePoll(poll.id, 'yes')}
                          >
                            👍 Yes ({poll.yesCount || 0})
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.94 }}
                            className={`poll-btn no ${hasVotedNo ? 'active' : ''}`}
                            onClick={() => handleVotePoll(poll.id, 'no')}
                          >
                            👎 No ({poll.noCount || 0})
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                }

                if (m.isSystem) {
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="system-bubble"
                    >
                      {m.text}
                    </motion.div>
                  );
                }

                const isOwn = m.sender?.name === userProfile.name;

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`chat-bubble ${isOwn ? 'own' : 'other'} ${m.isEphemeral ? 'ephemeral-dissolve-bubble' : ''} hover-lift`}
                  >
                    <div className="chat-bubble-meta">
                      <span style={{ color: m.sender?.color || 'var(--accent-lavender)', fontWeight: 700 }}>
                        {m.sender?.avatar || '😴'} {m.sender?.name || 'Anonymous'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="chat-bubble-text">{m.text}</div>
                    {m.isEphemeral && <div className="ephemeral-burn-bar" />}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator Bar */}
          <div className="typing-indicator-bar">
            {typingUsers.size > 0 && (
              <span>💬 {Array.from(typingUsers).join(', ')} is typing...</span>
            )}
          </div>

          {/* Quick Reaction Bursts */}
          <div className="emoji-reactions-bar">
            {EMOJI_REACTIONS.map((emoji, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.35, y: -3 }}
                whileTap={{ scale: 0.82 }}
                className="emoji-btn"
                onClick={() => handleSendReaction(emoji)}
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          {/* Message Input Box */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder={isEphemeral ? "Type self-destructing vent (vanishes in 12s)..." : "Drop an anonymous thought or guess..."}
                value={inputText}
                onChange={handleInputChange}
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.88 }}
                className={`ephemeral-toggle-btn ${isEphemeral ? 'active' : ''}`}
                onClick={() => {
                  sounds.playPop();
                  setIsEphemeral(!isEphemeral);
                }}
                title="Toggle 12s Dissolving Message"
              >
                🔥
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.08, x: 2 }}
                whileTap={{ scale: 0.92 }}
                className="chat-send-btn"
              >
                ➔
              </motion.button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
