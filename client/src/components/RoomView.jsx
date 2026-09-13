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
  onToggleTheme
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

  // Live Poll State
  const [currentPoll, setCurrentPoll] = useState(null);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isPollMinimized, setIsPollMinimized] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  // Canvas refs
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const drawingIdleTimerRef = useRef(null);
  const lastPointRef = useRef(null);
  const strokeHistoryRef = useRef([]);

  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastHeartbeatRef = useRef(0);

  const emitActivityHeartbeat = () => {
    const now = Date.now();
    if (now - lastHeartbeatRef.current > 3000) {
      lastHeartbeatRef.current = now;
      if (socket) {
        socket.emit('room:activity', { roomId });
      }
    }
  };

  const handleChatScroll = () => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distanceToBottom > 80;
  };

  const scrollToBottom = (smooth = true) => {
    if (!isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  // Copy Room Code
  const handleCopyRoomCode = () => {
    const code = roomData.code || (roomId ? roomId.replace(/^lounge-/, '').slice(0, 6).toUpperCase() : '');
    if (!code) return;
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

    // Gentle chime on room join
    sounds.playJoin();

    socket.emit('join_room', { roomId, user: userProfile });

    socket.on('room_joined_data', (data) => {
      if (data.room) setRoomData(data.room);
      if (data.activeUsers) setActiveUsers(data.activeUsers);
      if (data.currentPoll !== undefined) setCurrentPoll(data.currentPoll);
      if (data.recentMessages) {
        setMessages(data.recentMessages);
        // Schedule auto-dissolve for existing ephemeral messages
        data.recentMessages.forEach((msg) => {
          if (msg.isEphemeral) {
            const age = Date.now() - (msg.timestamp || Date.now());
            const remaining = Math.max(800, 12000 - age);
            setTimeout(() => {
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
              sounds.playDissolve();
            }, remaining);
          }
        });
      }
      if (data.gameState) {
        setGameState(prev => ({ ...prev, ...data.gameState }));
      }
      if (data.canvasStrokes && data.canvasStrokes.length > 0) {
        setTimeout(() => replayStrokes(data.canvasStrokes), 150);
      }
    });

    socket.on('user_joined', ({ user, activeUsers: usersList }) => {
      setActiveUsers(usersList || []);
      sounds.playChime();
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

      // Auto-dissolve ephemeral message after 12s with soft dissolve chime
      if (msg.isEphemeral) {
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== msg.id));
          sounds.playDissolve();
        }, 12000);
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

    socket.on('poll_updated', ({ poll }) => {
      setCurrentPoll(poll);
    });

    socket.on('room_expired', ({ roomId: expId, message }) => {
      if (expId === roomId) {
        if (window.peer && typeof window.peer.destroy === 'function') {
          try { window.peer.destroy(); } catch (e) {}
        }
        alert(message || 'This room has expired due to inactivity.');
        onLeaveRoom();
      }
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
      socket.off('poll_updated');
      socket.off('room_expired');
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
    emitActivityHeartbeat();
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
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const replayStrokes = (strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    strokeHistoryRef.current = strokes;
    strokes.forEach(stroke => {
      drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser, stroke.timestamp);
    });
  };

  const drawSegment = (ctx, x1, y1, x2, y2, color, width, isErase, strokeTimestamp = null) => {
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
      // Soft visual depth fade for older strokes over time (does not mutate stroke data or sync logic)
      if (strokeTimestamp) {
        const age = Date.now() - strokeTimestamp;
        ctx.globalAlpha = Math.max(0.75, 1 - age / 180000);
      }
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
    drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser, stroke.timestamp);
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
    if (socket) socket.emit('clear_canvas', { roomId });
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
    setIsDrawingActive(true);
    if (drawingIdleTimerRef.current) clearTimeout(drawingIdleTimerRef.current);
    lastPointRef.current = getCanvasCoords(e);
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
      isEraser: isEraser,
      timestamp: Date.now()
    };

    drawSegment(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width, stroke.isEraser, stroke.timestamp);
    strokeHistoryRef.current.push(stroke);
    if (socket) socket.emit('draw_stroke', stroke);
    emitActivityHeartbeat();

    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    if (drawingIdleTimerRef.current) clearTimeout(drawingIdleTimerRef.current);
    drawingIdleTimerRef.current = setTimeout(() => {
      setIsDrawingActive(false);
    }, 1100);
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

    socket.emit('send_message', { roomId, text, isEphemeral });
    emitActivityHeartbeat();
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
  const handleSwitchGame = (gameType) => {
    sounds.playBoing();
    setGameState(prev => ({ ...prev, type: gameType }));
    if (socket) socket.emit('switch_game', { gameType });
  };

  const handleToggleGame = () => {
    if (gameState.isActive) {
      sounds.playPop();
      if (socket) socket.emit('toggle_game', {});
    } else {
      sounds.playSuccess();
      if (socket) socket.emit('switch_game', { gameType: gameState.type });
    }
  };

  const handleTriviaAnswer = (index) => {
    if (!socket || gameState.selectedAnswerIdx !== null) return;
    sounds.playBoing();
    socket.emit('submit_trivia_answer', { answerIndex: index });
    emitActivityHeartbeat();
  };

  const handlePopTarget = (target) => {
    if (!socket) return;
    sounds.playPop();
    socket.emit('pop_emoji_target', { targetId: target.id, points: target.points });
    emitActivityHeartbeat();
  };

  const handleNextTruthVent = () => {
    if (socket) {
      sounds.playBoing();
      socket.emit('next_truth_vent_prompt', {});
      emitActivityHeartbeat();
    }
  };

  const handleSharePromptToChat = () => {
    if (!socket || !gameState.prompt) return;
    const promptText = `🎭 [${(gameState.prompt.type || 'Vent').toUpperCase()}] ${gameState.prompt.text || ''}`;
    socket.emit('send_message', { roomId, text: promptText, isEphemeral: false });
    emitActivityHeartbeat();
    sounds.playSend();
  };

  const handleWordChainSubmit = (e) => {
    e.preventDefault();
    const word = (gameState.wordChainInput || '').trim();
    if (!word || !socket) return;

    sounds.playPop();
    socket.emit('wordchain_submit_word', { word });
    emitActivityHeartbeat();
    setGameState(prev => ({ ...prev, wordChainInput: '' }));
  };

  const handleCreatePollSubmit = (e) => {
    e.preventDefault();
    if (!socket || !newPollQuestion.trim()) return;

    const validOptions = newPollOptions.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) return;

    sounds.playSuccess();
    socket.emit('create_poll', {
      roomId,
      question: newPollQuestion.trim(),
      options: validOptions
    }, (res) => {
      if (res?.success) {
        setIsPollModalOpen(false);
        setIsPollMinimized(false);
        setNewPollQuestion('');
        setNewPollOptions(['', '']);
      }
    });
  };

  const handleVotePollOption = (optionId) => {
    if (!socket || !currentPoll || !currentPoll.isOpen) return;
    sounds.playPop();
    socket.emit('vote_poll', {
      roomId,
      pollId: currentPoll.id,
      optionId,
      voterId: userProfile?.id || userProfile?.name
    });
    emitActivityHeartbeat();
  };

  const handleClosePoll = () => {
    if (!socket || !currentPoll) return;
    sounds.playBoing();
    socket.emit('close_poll', {
      roomId,
      pollId: currentPoll.id
    });
  };

  const displayRoomCode = roomData.code || (roomId ? roomId.replace(/^lounge-/, '').slice(0, 6).toUpperCase() : '');

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

          {/* Room Poll Header Trigger */}
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="btn-pill-secondary hover-lift"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              sounds.playPop();
              if (currentPoll) {
                setIsPollMinimized(false);
              } else {
                setIsPollModalOpen(true);
              }
            }}
            title="Room Poll"
          >
            <span>📊</span>
            <span>{currentPoll ? (currentPoll.isOpen ? 'Poll Active' : 'Poll Results') : 'Poll'}</span>
          </motion.button>
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

          {/* Connected User Avatars with activity-reflective aura glow */}
          <div
            className={`presence-avatars-list ${(gameState.isActive || activeUsers.length >= 2) ? 'activity-active' : 'activity-calm'}`}
            title={`Active students in lounge (${gameState.isActive ? 'Active Game In Progress' : 'Quiet Lounge'})`}
          >
            {activeUsers.slice(0, 5).map(u => (
              <motion.div
                key={u.id}
                whileHover={{ scale: 1.25, y: -2 }}
                className="presence-avatar"
                style={{ borderColor: u.color || 'var(--accent-lavender)' }}
                title={u.name}
              >
                {u.avatar && u.avatar.startsWith('http') ? (
                  <img src={u.avatar} alt={u.name} className="presence-avatar-img" />
                ) : (
                  <span>{u.avatar || '😴'}</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            className="btn-pill-secondary hover-lift"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            onClick={() => {
              sounds.playPop();
              onToggleTheme();
            }}
            title="Toggle Light / Dark Mode"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </motion.button>
        </div>
      </header>

      {/* Main Split Layout: Left In-Window Arena | Right Real-Time Chat */}
      <main className="room-split-layout">
        {/* LEFT: Continuous In-Window Interactive Arena */}
        <section className="game-pane">
          {/* Top Activity Switcher Bar */}
          <div className="arena-activity-nav">
            <div className="arena-tabs-scroll">
              {[
                { id: 'scribble', icon: '🎨', label: 'Canvas & Scribble' },
                { id: 'trivia', icon: '⚡', label: 'Trivia Blitz' },
                { id: 'wordchain', icon: '🔗', label: 'Word Chain' },
                { id: 'emojipop', icon: '💥', label: 'Emoji Pop' },
                { id: 'truthvent', icon: '🎭', label: 'Truth & Vent' }
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`arena-tab-pill hover-lift ${gameState.type === tab.id ? 'active' : ''}`}
                  onClick={() => handleSwitchGame(tab.id)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Quick Round Control Action */}
            <div className="arena-round-actions">
              {gameState.type === 'scribble' && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-pill-secondary hover-lift"
                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                  onClick={handleToggleGame}
                >
                  {gameState.isActive ? '⏸️ Stop Round' : '▶️ Play Scribble'}
                </motion.button>
              )}
              {gameState.type === 'trivia' && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-pill-primary hover-lift"
                  style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                  onClick={handleToggleGame}
                >
                  {gameState.isActive ? 'Next Question ➔' : 'Start Trivia'}
                </motion.button>
              )}
              {gameState.type === 'truthvent' && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-pill-primary hover-lift"
                  style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                  onClick={handleNextTruthVent}
                >
                  Next Prompt ➔
                </motion.button>
              )}
              {gameState.type === 'emojipop' && (
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-pill-secondary hover-lift"
                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                  onClick={handleToggleGame}
                >
                  {gameState.isActive ? 'Pause Pop' : 'Start Pop'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Active Activity Screen Area */}
          <div className="arena-stage-container">
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

                  {/* Floating Drawing Toolbar (auto-hides when drawing, reappears on hover/idle) */}
                  <div className={`canvas-floating-toolbar ${isDrawingActive ? 'toolbar-drawing-hidden' : ''}`}>
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
                  <div className="trivia-deck unified-game-frame">
                    <div className="unified-game-header">
                      <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-lavender)' }}>
                        ⚡ CAMPUS TRIVIA BLITZ
                      </span>
                      <span className="unified-game-timer">
                        ⏱️ {gameState.timeLeft}s
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
                  <div className="wordchain-deck unified-game-frame">
                    <div className="unified-game-header">
                      <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-sage)' }}>
                        🔗 RAPID WORD CHAIN
                      </span>
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--text-primary)' }}>
                        🔥 Streak: {gameState.streakCount}x
                      </span>
                      {gameState.isActive && (
                        <span className="unified-game-timer">
                          ⏱️ {gameState.timeLeft}s
                        </span>
                      )}
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
                  <div className="emojipop-top-bar unified-game-header">
                    <span className="badge-pill" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
                      💥 EMOJI POP REFLEX
                    </span>
                    {gameState.scores && gameState.scores[userProfile.name] !== undefined && (
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--text-primary)' }}>
                        Score: {gameState.scores[userProfile.name]} pts
                      </span>
                    )}
                    {gameState.isActive && (
                      <span className="unified-game-timer">
                        ⏱️ {gameState.timeLeft}s
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
                  <div className="truthvent-deck unified-game-frame">
                    <div className="unified-game-header">
                      <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-lavender)' }}>
                        🎭 TRUTH, VENT & DARE
                      </span>
                      <span className="badge-pill" style={{ background: 'var(--bg-well)', color: 'var(--accent-amber)' }}>
                        {gameState.prompt?.type || 'Vent'}
                      </span>
                      <button
                        type="button"
                        className="unified-game-exit-btn"
                        onClick={handleNextTruthVent}
                        title="Roll next prompt"
                      >
                        🎲
                      </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="room-poll-header-pill-btn"
                onClick={() => {
                  sounds.playPop();
                  if (currentPoll) {
                    setIsPollMinimized(prev => !prev);
                  } else {
                    setIsPollModalOpen(true);
                  }
                }}
                title={currentPoll ? 'Toggle Room Poll' : 'Create a Room Poll'}
              >
                <span>📊</span>
                <span>{currentPoll ? (currentPoll.isOpen ? 'Live Poll' : 'Poll Closed') : '+ Poll'}</span>
              </button>
              <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-sage)' }}>
                🔒 Zero-Trace Chat
              </span>
            </div>
          </div>

          {/* Active Poll Widget in Chat Pane */}
          <AnimatePresence>
            {currentPoll && (
              <motion.div
                className={`room-active-poll-card ${!currentPoll.isOpen ? 'poll-closed' : ''}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24 }}
              >
                <div className="poll-card-top-strip">
                  <div className="poll-card-badge-row">
                    <span className={`poll-status-chip ${currentPoll.isOpen ? 'chip-live' : 'chip-ended'}`}>
                      {currentPoll.isOpen ? '🔴 LIVE POLL' : '✓ CONCLUDED'}
                    </span>
                    <span className="poll-creator-credit">By {currentPoll.createdBy || 'Student'}</span>
                  </div>
                  <div className="poll-header-actions">
                    <button
                      type="button"
                      className="poll-action-icon-btn"
                      onClick={() => setIsPollMinimized(prev => !prev)}
                      title={isPollMinimized ? 'Expand Poll' : 'Minimize Poll'}
                    >
                      {isPollMinimized ? '▼' : '▲'}
                    </button>
                    {currentPoll.isOpen ? (
                      <button
                        type="button"
                        className="poll-end-btn"
                        onClick={handleClosePoll}
                        title="End this poll"
                      >
                        End
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="poll-new-trigger-btn"
                        onClick={() => setIsPollModalOpen(true)}
                        title="Start a new poll"
                      >
                        + New
                      </button>
                    )}
                  </div>
                </div>

                {!isPollMinimized && (
                  <div className="poll-card-content-area">
                    <h4 className="poll-question-text">{currentPoll.question}</h4>

                    <div className="poll-options-list">
                      {(() => {
                        const totalVotes = currentPoll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                        const myVoterId = userProfile?.id || userProfile?.name;

                        return currentPoll.options.map((opt) => {
                          const hasVoted = opt.voterIds && opt.voterIds.includes(myVoterId);
                          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={`poll-option-row ${hasVoted ? 'voted-option' : ''} ${!currentPoll.isOpen ? 'disabled-voting' : ''}`}
                              onClick={() => {
                                if (currentPoll.isOpen) handleVotePollOption(opt.id);
                              }}
                              disabled={!currentPoll.isOpen}
                              title={currentPoll.isOpen ? (hasVoted ? 'Your current vote (click another to switch)' : 'Click to vote') : 'Poll closed'}
                            >
                              <div className="poll-option-fill-bar" style={{ width: `${pct}%` }} />
                              <div className="poll-option-content">
                                <span className="poll-option-text">
                                  {hasVoted && <span className="poll-check-mark">✓ </span>}
                                  {opt.text}
                                </span>
                                <span className="poll-option-stats">
                                  <strong className="poll-pct">{pct}%</strong>
                                  <span className="poll-count">({opt.votes || 0})</span>
                                </span>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    <div className="poll-card-footer">
                      <span className="poll-total-votes">
                        {currentPoll.options.reduce((sum, o) => sum + (o.votes || 0), 0)} total vote{currentPoll.options.reduce((sum, o) => sum + (o.votes || 0), 0) === 1 ? '' : 's'}
                      </span>
                      {currentPoll.isOpen && (
                        <span className="poll-hint-tap">Click any option to vote</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Feed (fully scrollable, zero interference with input form) */}
          <div className="chat-messages-container" ref={chatScrollContainerRef} onScroll={handleChatScroll}>
            <AnimatePresence initial={false}>
              {messages.map((m) => {
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
                      <span style={{ color: m.sender?.color || 'var(--text-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {m.sender?.avatar && m.sender.avatar.startsWith('http') ? (
                          <img src={m.sender.avatar} alt="" className="chat-avatar-inline" />
                        ) : (
                          <span>{m.sender?.avatar || '😴'}</span>
                        )}
                        <span>{m.sender?.name || 'Anonymous'}</span>
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

      {/* Create Poll Modal */}
      <AnimatePresence>
        {isPollModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPollModalOpen(false)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">📊 Create Room Poll</h3>
                <button
                  type="button"
                  className="btn-pill-icon"
                  onClick={() => setIsPollModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePollSubmit}>
                <div className="modal-form-group">
                  <label className="modal-label">Question / Topic *</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="e.g. Coffee run to Nescafe or Bubble tea?"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    required
                    autoFocus
                    maxLength={120}
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-label">Poll Choices (2-5 options)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newPollOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="modal-input"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newPollOptions];
                            updated[idx] = e.target.value;
                            setNewPollOptions(updated);
                          }}
                          required={idx < 2}
                          maxLength={60}
                        />
                        {newPollOptions.length > 2 && (
                          <button
                            type="button"
                            className="btn-pill-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#ef4444' }}
                            onClick={() => {
                              setNewPollOptions(newPollOptions.filter((_, i) => i !== idx));
                            }}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {newPollOptions.length < 5 && (
                    <button
                      type="button"
                      className="btn-pill-secondary"
                      style={{ marginTop: '10px', width: '100%', justifyContent: 'center', padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        sounds.playPop();
                        setNewPollOptions([...newPollOptions, '']);
                      }}
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="modal-actions" style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    className="btn-pill-secondary"
                    onClick={() => setIsPollModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pill-primary"
                  >
                    Launch Live Poll ➔
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
