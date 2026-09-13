import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  'https://ycrxi75f.insforge.site',
  'https://the-backrooms-1.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.insforge.site') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms ? rooms.size : 0,
    timestamp: Date.now()
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// ==========================================
// 1. GAME DATA BANKS
// ==========================================

const CAMPUS_WORDS = [
  'Coffee', 'All-Nighter', 'Boba Tea', 'Laptop Charger', 'Library Ghost',
  'Alarm Clock', 'Backpack', 'Sticky Notes', 'Final Exam', 'Pencil',
  'Calculator', 'Pizza Slice', 'Headphones', 'Campus Squirrel', 'Dorm Bed',
  'Whiteboard', 'Microphone', 'Textbook', 'Highlighter', 'Instant Ramen',
  'Energy Drink', 'Campus Clocktower', 'Lab Coat', 'Graduation Cap', 'Brain',
  'Campfire', 'Spaceship', 'Sunflower', 'Guitar', 'Sunglasses',
  'Sleeping Cat', 'Rainbow', 'Origami', 'Skateboard', 'Lightbulb'
];

const TRIVIA_BANK = [
  {
    question: "What percentage of college students pull an all-nighter at least once?",
    options: ["About 30%", "Over 70%", "Around 50%", "Less than 15%"],
    answerIndex: 1,
    category: "Campus Life"
  },
  {
    question: "Which programming language was originally called 'Oak'?",
    options: ["Python", "Java", "C++", "Ruby"],
    answerIndex: 1,
    category: "Tech"
  },
  {
    question: "How long is a power nap recommended to boost alertness without grogginess?",
    options: ["10-20 minutes", "45-60 minutes", "90 minutes", "5 minutes"],
    answerIndex: 0,
    category: "Wellness"
  },
  {
    question: "What was the first item ever purchased online with Bitcoin in 2010?",
    options: ["A MacBook", "Two Pizzas", "A College Textbook", "A Gaming Console"],
    answerIndex: 1,
    category: "Tech Trivia"
  },
  {
    question: "Which neurotransmitter is most associated with laughter and stress relief?",
    options: ["Cortisol", "Endorphins", "Melatonin", "Adrenaline"],
    answerIndex: 1,
    category: "Science"
  },
  {
    question: "What phenomenon describes studying in the same room improving recall?",
    options: ["Context-Dependent Memory", "Cognitive Drift", "Placebo Recall", "Synaptic Bounce"],
    answerIndex: 0,
    category: "Psychology"
  },
  {
    question: "In what year was the worldwide web made publicly available?",
    options: ["1985", "1991", "1995", "1999"],
    answerIndex: 1,
    category: "Tech History"
  },
  {
    question: "Which campus beverage has more caffeine per fluid ounce?",
    options: ["Drip Coffee", "Espresso", "Green Tea", "Matcha Latte"],
    answerIndex: 1,
    category: "Campus Culture"
  }
];

const TRUTH_VENT_DARE_PROMPTS = [
  { type: 'Vent', text: 'What is the most ridiculous exam curve or assignment you endured recently?' },
  { type: 'Truth', text: 'What is the biggest excuse you ever made up to skip an 8:00 AM class?' },
  { type: 'Dare', text: 'Draw your current energy level as an abstract monster in 15 seconds!' },
  { type: 'Vent', text: 'What campus dining hall food was an absolute war crime?' },
  { type: 'Truth', text: 'Have you ever secretly fallen asleep with your camera on in a Zoom class?' },
  { type: 'Dare', text: 'Send your most-used emoji 5 times in chat right now!' },
  { type: 'Vent', text: 'What textbook or software fee was an absolute scam?' },
  { type: 'Truth', text: 'What is your guilty pleasure 3:00 AM cramming snack?' },
  { type: 'Dare', text: 'Drop a 1-sentence hype speech for everyone in all capitals!' },
  { type: 'Truth', text: 'If you could swap your major right now with zero penalty, what would you pick?' }
];

const EMOJI_POP_TARGETS = ['🎯', '⭐', '🔥', '💎', '🦄', '🍕', '🎉', '⚡', '🐱', '🚀'];

// ==========================================
// 2. ROOM REGISTRY
// ==========================================
const rooms = new Map();

const defaultLounges = [
  {
    id: 'lounge-midnight-coffee',
    code: 'COFFEE',
    name: 'Midnight Espresso ☕',
    category: 'Study',
    selectedGame: 'scribble',
    description: 'Quiet crammers & 2AM chill lo-fi energy. Synchronized canvas & cozy chat.',
    tags: ['Quiet', 'Lo-Fi', 'Study'],
    lat: 23.17504,
    lng: 80.02921,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  },
  {
    id: 'lounge-scribble-arena',
    code: 'DOODLE',
    name: 'Campus Scribble Arena 🎨',
    category: 'Mini-Game',
    selectedGame: 'scribble',
    description: 'Speed Pictionary rounds with campus prompts. Guess fast & score points!',
    tags: ['Drawing', 'Fast-Paced', 'Pictionary'],
    lat: 23.17510,
    lng: 80.02930,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  },
  {
    id: 'lounge-trivia-blitz',
    code: 'TRIVIA',
    name: 'Campus Trivia Blitz ⚡',
    category: 'Mini-Game',
    selectedGame: 'trivia',
    description: 'Rapid-fire campus & tech trivia showdown. 14 seconds per question!',
    tags: ['Trivia', 'Buzzer', 'Challenge'],
    lat: 23.17490,
    lng: 80.02910,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  },
  {
    id: 'lounge-word-chain',
    code: 'CHAINS',
    name: 'Rapid Word Chain 🔗',
    category: 'Mini-Game',
    selectedGame: 'wordchain',
    description: 'Keep the word chain alive without repeating or timing out. Build huge combos!',
    tags: ['WordGame', 'Speed', 'Combo'],
    lat: 23.17520,
    lng: 80.02940,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  },
  {
    id: 'lounge-emoji-pop',
    code: 'ARCADE',
    name: 'Emoji Pop Reflex 💥',
    category: 'Mini-Game',
    selectedGame: 'emojipop',
    description: 'Fast-paced reaction arcade! Click the popping target emojis before they vanish.',
    tags: ['Arcade', 'Reflex', 'Pop'],
    lat: 23.17480,
    lng: 80.02900,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  },
  {
    id: 'lounge-truth-vent',
    code: 'CONFES',
    name: 'Truth, Vent & Dare 🎭',
    category: 'Rant',
    selectedGame: 'truthvent',
    description: 'Zero-filter campus confessionals, cathartic vents, and hilarious dares.',
    tags: ['Confessions', 'Venting', 'Cathartic'],
    lat: 23.17530,
    lng: 80.02950,
    idleTimeout: 'unlimited',
    created: Date.now(),
    isPermanent: true
  }
];

// Initialize default rooms
defaultLounges.forEach(lounge => {
  rooms.set(lounge.id, {
    ...lounge,
    users: new Map(),
    canvasStrokes: [],
    messages: [],
    game: {
      type: lounge.selectedGame || 'scribble',
      isActive: false,
      scores: {},
      timerInterval: null,
      timeLeft: 30,

      // Scribble
      currentDrawer: null,
      currentWord: '',
      revealedWord: '',
      hasGuessed: new Set(),

      // Trivia
      triviaQuestion: null,
      triviaAnswers: new Map(),

      // Word Chain
      currentLetter: 'C',
      lastWord: 'Campus',
      wordHistory: ['Campus'],
      streakCount: 1,

      // Truth/Vent
      currentPrompt: null,

      // Emoji Pop
      emojiTargets: []
    }
  });
});

function formatRoomForLobby(room) {
  return {
    id: room.id,
    code: room.code || (room.id.replace('lounge-', '').slice(0, 6).toUpperCase()),
    name: room.name,
    category: room.category,
    selectedGame: room.game?.type || room.selectedGame || 'scribble',
    description: room.description,
    tags: room.tags || [],
    userCount: room.users ? room.users.size : 0,
    created: room.created,
    isGameActive: room.game?.isActive || false,
    lat: typeof room.lat === 'number' ? room.lat : null,
    lng: typeof room.lng === 'number' ? room.lng : null,
    isPermanent: room.isPermanent || false,
    idleTimeout: room.idleTimeout || 'unlimited',
    idleTimeoutMs: room.idleTimeoutMs || null,
    lastActivityAt: room.lastActivityAt || room.created,
    expiresAt: room.expiresAt || null
  };
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  res.json(Array.from(rooms.values()).map(formatRoomForLobby));
});

// ==========================================
// 2.5 PIN REGISTRY (CAMPUS MAP SYSTEM)
// ==========================================
const pins = new Map();

// Helper to seed marketplace rooms
function createMarketRoom(id, code, title, price, listingType, description, creator) {
  const room = {
    id,
    code,
    name: `🏷️ ${title} (${price})`,
    category: 'General',
    selectedGame: 'scribble',
    description: `Negotiation lounge for "${title}". Price: ${price} (${listingType.toUpperCase()}). ${description}`,
    tags: ['Marketplace', listingType.toUpperCase()],
    created: Date.now(),
    isPermanent: true,
    users: new Map(),
    canvasStrokes: [],
    messages: [
      {
        id: `sys-market-${Date.now()}`,
        sender: { name: '🏷️ Campus Market Bot', color: '#10b981', avatar: '🏷️' },
        text: `Listing open: "${title}" for ${price} (${listingType.toUpperCase()}). Use this lounge to chat, negotiate, and arrange campus pickup!`,
        timestamp: Date.now(),
        isSystem: true
      }
    ],
    game: {
      type: 'scribble',
      isActive: false,
      scores: {},
      timerInterval: null,
      timeLeft: 30,
      currentDrawer: null,
      currentWord: '',
      revealedWord: '',
      hasGuessed: new Set(),
      triviaQuestion: null,
      triviaAnswers: new Map(),
      currentLetter: 'C',
      lastWord: 'Campus',
      wordHistory: ['Campus'],
      streakCount: 1,
      currentPrompt: null,
      emojiTargets: []
    }
  };
  rooms.set(id, room);
  return room;
}

// Seed initial marketplace rooms
createMarketRoom(
  'room-mkt-ti84',
  'TI84',
  'TI-84 Plus Graphing Calculator',
  '$25',
  'sell',
  'Barely used, includes slide cover and USB cable.',
  { name: 'Senior Dev', avatar: '🎓', color: '#3b82f6' }
);

createMarketRoom(
  'room-mkt-chair',
  'CHAIR',
  'Ergonomic Mesh Desk Chair',
  '$10/mo',
  'rent',
  'Great lumbar support, adjustable height and armrests.',
  { name: 'Campus Hopper', avatar: '⚡', color: '#10b981' }
);

createMarketRoom(
  'room-mkt-math',
  'MATH8',
  'Discrete Mathematics (Rosen 8th Ed)',
  'Trade',
  'trade',
  'Looking to trade for Algorithms (CLRS) or Data Structures book.',
  { name: 'Algo Enthusiast', avatar: '🦉', color: '#8b5cf6' }
);

// Initial Default Pins with real coordinates from map.geojson (IIITDM Jabalpur campus)
const defaultPins = [
  // 1. Social Room Pins (🗣️)
  {
    id: 'pin-room-midnight-coffee',
    type: 'room',
    lat: 23.1762,
    lng: 80.0275,
    title: 'Midnight Espresso ☕',
    createdBy: { name: 'Barista Cat', avatar: '🐱', color: '#f59e0b' },
    createdAt: Date.now() - 3600000,
    roomId: 'lounge-midnight-coffee',
    category: 'Study',
    selectedGame: 'scribble',
    description: 'Quiet crammers & 2AM chill lo-fi energy. Synchronized canvas & cozy chat.',
    tags: ['Quiet', 'Lo-Fi', 'Study']
  },
  {
    id: 'pin-room-scribble-arena',
    type: 'room',
    lat: 23.1755,
    lng: 80.0305,
    title: 'Campus Scribble Arena 🎨',
    createdBy: { name: 'Pixel Artist', avatar: '🎨', color: '#ec4899' },
    createdAt: Date.now() - 7200000,
    roomId: 'lounge-scribble-arena',
    category: 'Mini-Game',
    selectedGame: 'scribble',
    description: 'Speed Pictionary rounds with campus prompts. Guess fast & score points!',
    tags: ['Drawing', 'Fast-Paced', 'Pictionary']
  },
  {
    id: 'pin-room-trivia-blitz',
    type: 'room',
    lat: 23.1740,
    lng: 80.0280,
    title: 'Campus Trivia Blitz ⚡',
    createdBy: { name: 'Quiz Whiz', avatar: '⚡', color: '#3b82f6' },
    createdAt: Date.now() - 5400000,
    roomId: 'lounge-trivia-blitz',
    category: 'Mini-Game',
    selectedGame: 'trivia',
    description: 'Rapid-fire campus & tech trivia showdown. 14 seconds per question!',
    tags: ['Trivia', 'Buzzer', 'Challenge']
  },
  {
    id: 'pin-room-truth-vent',
    type: 'room',
    lat: 23.1770,
    lng: 80.0315,
    title: 'Truth, Vent & Dare 🎭',
    createdBy: { name: 'Anonymous Owl', avatar: '🦉', color: '#8b5cf6' },
    createdAt: Date.now() - 1800000,
    roomId: 'lounge-truth-vent',
    category: 'Rant',
    selectedGame: 'truthvent',
    description: 'Zero-filter campus confessionals, cathartic vents, and hilarious dares.',
    tags: ['Confessions', 'Venting', 'Cathartic']
  },

  // 2. Marketplace Pins (🏷️)
  {
    id: 'pin-mkt-ti84',
    type: 'marketplace',
    lat: 23.1768,
    lng: 80.0268,
    title: 'TI-84 Plus Graphing Calculator',
    createdBy: { name: 'Senior Dev', avatar: '🎓', color: '#3b82f6' },
    createdAt: Date.now() - 4000000,
    roomId: 'room-mkt-ti84',
    marketData: {
      price: '$25',
      listingType: 'sell',
      photoUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=400&auto=format&fit=crop&q=80',
      condition: 'Like New',
      comments: [
        {
          id: 'tc-1',
          author: { name: 'CS Junior', avatar: '💻', color: '#3b82f6' },
          text: 'Is this still available? Can meet at the Library entrance at 4 PM!',
          offer: '$20 Cash',
          createdAt: Date.now() - 3600000
        },
        {
          id: 'tc-2',
          author: { name: 'Senior Dev', avatar: '🎓', color: '#3b82f6' },
          text: 'Yes! $20 works if you can meet today. Let me know!',
          offer: null,
          createdAt: Date.now() - 1800000
        }
      ]
    }
  },
  {
    id: 'pin-mkt-chair',
    type: 'marketplace',
    lat: 23.1735,
    lng: 80.0320,
    title: 'Ergonomic Mesh Desk Chair',
    createdBy: { name: 'Campus Hopper', avatar: '⚡', color: '#10b981' },
    createdAt: Date.now() - 86400000,
    roomId: 'room-mkt-chair',
    marketData: {
      price: '$10/mo',
      listingType: 'rent',
      photoUrl: 'https://images.unsplash.com/photo-1580481077197-2023a85b1411?w=400&auto=format&fit=crop&q=80',
      condition: 'Excellent',
      comments: [
        {
          id: 'tc-3',
          author: { name: 'Dorm Styler', avatar: '🛋️', color: '#ec4899' },
          text: 'Does this recline? Looking to rent for the whole semester.',
          offer: '$40 Semester',
          createdAt: Date.now() - 43200000
        }
      ]
    }
  },
  {
    id: 'pin-mkt-math',
    type: 'marketplace',
    lat: 23.1758,
    lng: 80.0288,
    title: 'Discrete Mathematics (Rosen 8th Ed)',
    createdBy: { name: 'Algo Enthusiast', avatar: '🦉', color: '#8b5cf6' },
    createdAt: Date.now() - 12000000,
    roomId: 'room-mkt-math',
    marketData: {
      price: 'Trade',
      listingType: 'trade',
      photoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
      condition: 'Good',
      comments: [
        {
          id: 'tc-4',
          author: { name: 'Math Major', avatar: '📐', color: '#f59e0b' },
          text: 'Would you swap this for Linear Algebra 4th Edition?',
          offer: 'Swap Linear Algebra',
          createdAt: Date.now() - 6000000
        }
      ]
    }
  },

  // 3. Lost & Found Pins (📝)
  {
    id: 'pin-lf-hydroflask',
    type: 'lostfound',
    lat: 23.1748,
    lng: 80.0335,
    title: 'Lost: Blue Hydro Flask with Anime Stickers',
    createdBy: { name: 'Sleepy Fox', avatar: '🦊', color: '#ef4444' },
    createdAt: Date.now() - 7200000,
    lostFoundData: {
      category: 'lost',
      description: 'Left near the basketball bleachers around 5:30 PM yesterday. Has a distinctive Cyberpunk sticker on the base.',
      photoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&auto=format&fit=crop&q=80',
      dateHappened: 'Yesterday afternoon',
      comments: [
        {
          id: 'c-1',
          author: { name: 'Court Runner', avatar: '🏃', color: '#10b981' },
          text: 'I think I saw someone move a blue bottle to the bench near court 2 around 7 PM!',
          createdAt: Date.now() - 5000000
        },
        {
          id: 'c-2',
          author: { name: 'Sleepy Fox', avatar: '🦊', color: '#ef4444' },
          text: 'Thanks so much! Walking over to check right now 🙏',
          createdAt: Date.now() - 3000000
        }
      ]
    }
  },
  {
    id: 'pin-lf-keyring',
    type: 'lostfound',
    lat: 23.1752,
    lng: 80.0298,
    title: 'Found: Silver Keyring with 3 Keys & Car Fob',
    createdBy: { name: 'Morning Bird', avatar: '🐦', color: '#3b82f6' },
    createdAt: Date.now() - 14400000,
    lostFoundData: {
      category: 'found',
      description: 'Found lying on the counter at Nescafe Kiosk this morning around 9:00 AM.',
      photoUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&auto=format&fit=crop&q=80',
      dateHappened: 'This morning, 9:00 AM',
      comments: [
        {
          id: 'c-3',
          author: { name: 'Morning Bird', avatar: '🐦', color: '#3b82f6' },
          text: 'Handed it over to the cafe counter manager for safekeeping! Just ask for the silver ring.',
          createdAt: Date.now() - 14000000
        }
      ]
    }
  }
];

defaultPins.forEach(p => pins.set(p.id, p));

app.get('/api/pins', (req, res) => {
  res.json(Array.from(pins.values()));
});

// ==========================================
// 3. MULTI-GAME ENGINE HANDLERS
// ==========================================

function clearRoomTimer(room) {
  if (room.game.timerInterval) {
    clearInterval(room.game.timerInterval);
    room.game.timerInterval = null;
  }
}

// 1. Scribble Game
function startScribbleGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return;

  const userList = Array.from(room.users.values());
  const nextDrawer = userList[Math.floor(Math.random() * userList.length)];
  const randomWord = CAMPUS_WORDS[Math.floor(Math.random() * CAMPUS_WORDS.length)];
  const maskedWord = randomWord.replace(/[a-zA-Z]/g, '_ ');

  room.canvasStrokes = [];
  io.to(roomId).emit('canvas_cleared', { by: 'System' });

  clearRoomTimer(room);
  room.game.type = 'scribble';
  room.game.isActive = true;
  room.game.currentDrawer = nextDrawer;
  room.game.currentWord = randomWord;
  room.game.revealedWord = maskedWord;
  room.game.timeLeft = 45;
  room.game.hasGuessed = new Set();

  userList.forEach(u => {
    if (room.game.scores[u.id] === undefined) room.game.scores[u.id] = 0;
  });

  io.to(nextDrawer.socketId).emit('game_state_sync', {
    type: 'scribble',
    isActive: true,
    isDrawer: true,
    word: randomWord,
    maskedWord: randomWord,
    drawer: nextDrawer,
    timeLeft: 45,
    scores: room.game.scores
  });

  room.users.forEach(user => {
    if (user.socketId !== nextDrawer.socketId) {
      io.to(user.socketId).emit('game_state_sync', {
        type: 'scribble',
        isActive: true,
        isDrawer: false,
        word: maskedWord,
        maskedWord: maskedWord,
        drawer: nextDrawer,
        timeLeft: 45,
        scores: room.game.scores
      });
    }
  });

  const sysMsg = {
    id: `sys-${Date.now()}`,
    sender: { name: '🎮 Soulnook Bot', color: '#f59e0b', avatar: '🎨' },
    text: `Scribble round started! ${nextDrawer.name} is drawing. Guess the word in chat!`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', sysMsg);

  room.game.timerInterval = setInterval(() => {
    if (!room.game.isActive) {
      clearRoomTimer(room);
      return;
    }
    room.game.timeLeft -= 1;
    io.to(roomId).emit('game_timer_tick', { timeLeft: room.game.timeLeft });

    if (room.game.timeLeft <= 0) {
      clearRoomTimer(room);
      endScribbleRound(roomId, 'Time is up!');
    }
  }, 1000);
}

function endScribbleRound(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room) return;
  clearRoomTimer(room);

  const word = room.game.currentWord;
  io.to(roomId).emit('game_round_ended', {
    word,
    reason,
    scores: room.game.scores
  });

  const endMsg = {
    id: `sys-end-${Date.now()}`,
    sender: { name: '🎮 Soulnook Bot', color: '#f59e0b', avatar: '🏆' },
    text: `Round over! The secret word was: "${word}". Next round starting shortly...`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', endMsg);

  setTimeout(() => {
    if (room.users.size >= 1 && room.game.isActive && room.game.type === 'scribble') {
      startScribbleGame(roomId);
    }
  }, 5000);
}

// 2. Trivia Blitz Game
function startTriviaGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return;

  clearRoomTimer(room);
  const q = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
  room.game.type = 'trivia';
  room.game.isActive = true;
  room.game.triviaQuestion = q;
  room.game.triviaAnswers = new Map();
  room.game.timeLeft = 14;

  const userList = Array.from(room.users.values());
  userList.forEach(u => {
    if (room.game.scores[u.id] === undefined) room.game.scores[u.id] = 0;
  });

  io.to(roomId).emit('game_state_sync', {
    type: 'trivia',
    isActive: true,
    question: q.question,
    options: q.options,
    category: q.category,
    timeLeft: 14,
    scores: room.game.scores
  });

  const sysMsg = {
    id: `sys-triv-${Date.now()}`,
    sender: { name: '⚡ Trivia Bot', color: '#8b5cf6', avatar: '🧠' },
    text: `New Trivia Question! Select your answer within 14 seconds!`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', sysMsg);

  room.game.timerInterval = setInterval(() => {
    if (!room.game.isActive) {
      clearRoomTimer(room);
      return;
    }
    room.game.timeLeft -= 1;
    io.to(roomId).emit('game_timer_tick', { timeLeft: room.game.timeLeft });

    if (room.game.timeLeft <= 0) {
      clearRoomTimer(room);
      resolveTriviaRound(roomId);
    }
  }, 1000);
}

function resolveTriviaRound(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game.triviaQuestion) return;

  const q = room.game.triviaQuestion;
  const correctIdx = q.answerIndex;
  const correctOption = q.options[correctIdx];

  const winners = [];
  room.game.triviaAnswers.forEach((ansIdx, userId) => {
    if (ansIdx === correctIdx) {
      room.game.scores[userId] = (room.game.scores[userId] || 0) + 20;
      const user = Array.from(room.users.values()).find(u => u.id === userId);
      if (user) winners.push(user.name);
    }
  });

  io.to(roomId).emit('trivia_round_resolved', {
    correctIndex: correctIdx,
    correctAnswer: correctOption,
    winners,
    scores: room.game.scores
  });

  const resMsg = {
    id: `sys-triv-end-${Date.now()}`,
    sender: { name: '⚡ Trivia Bot', color: '#10b981', avatar: '🏆' },
    text: `Correct Answer: "${correctOption}". ${winners.length > 0 ? `Scored +20: ${winners.join(', ')}!` : 'No one answered correctly!'}`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', resMsg);

  setTimeout(() => {
    if (room.users.size >= 1 && room.game.isActive && room.game.type === 'trivia') {
      startTriviaGame(roomId);
    }
  }, 4500);
}

// 3. Word Chain Game
function startWordChainGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return;

  clearRoomTimer(room);
  const starterWords = ['Campus', 'Lecture', 'Exam', 'Coffee', 'Library', 'Design', 'Science', 'Student'];
  const startWord = starterWords[Math.floor(Math.random() * starterWords.length)];
  const nextChar = startWord.slice(-1).toUpperCase();

  room.game.type = 'wordchain';
  room.game.isActive = true;
  room.game.lastWord = startWord;
  room.game.currentLetter = nextChar;
  room.game.wordHistory = [startWord];
  room.game.streakCount = 1;
  room.game.timeLeft = 16;

  const userList = Array.from(room.users.values());
  userList.forEach(u => {
    if (room.game.scores[u.id] === undefined) room.game.scores[u.id] = 0;
  });

  io.to(roomId).emit('game_state_sync', {
    type: 'wordchain',
    isActive: true,
    lastWord: startWord,
    currentLetter: nextChar,
    streakCount: 1,
    wordHistory: room.game.wordHistory,
    timeLeft: 16,
    scores: room.game.scores
  });

  const sysMsg = {
    id: `sys-chain-${Date.now()}`,
    sender: { name: '🔗 Word Chain', color: '#06b6d4', avatar: '🔤' },
    text: `Word Chain started! Next word must begin with letter "${nextChar}"!`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', sysMsg);

  room.game.timerInterval = setInterval(() => {
    if (!room.game.isActive) {
      clearRoomTimer(room);
      return;
    }
    room.game.timeLeft -= 1;
    io.to(roomId).emit('game_timer_tick', { timeLeft: room.game.timeLeft });

    if (room.game.timeLeft <= 0) {
      clearRoomTimer(room);
      const timeoutMsg = {
        id: `sys-chain-reset-${Date.now()}`,
        sender: { name: '🔗 Word Chain', color: '#f43f5e', avatar: '⏳' },
        text: `Time's up! The chain broke at a streak of ${room.game.streakCount}. Resetting chain!`,
        timestamp: Date.now(),
        isSystem: true
      };
      io.to(roomId).emit('new_message', timeoutMsg);

      setTimeout(() => {
        if (room.game.isActive && room.game.type === 'wordchain') {
          startWordChainGame(roomId);
        }
      }, 3000);
    }
  }, 1000);
}

// 4. Truth, Vent or Dare
function startTruthVentGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return;

  clearRoomTimer(room);
  const prompt = TRUTH_VENT_DARE_PROMPTS[Math.floor(Math.random() * TRUTH_VENT_DARE_PROMPTS.length)];
  room.game.type = 'truthvent';
  room.game.isActive = true;
  room.game.currentPrompt = prompt;
  room.game.timeLeft = 60;

  io.to(roomId).emit('game_state_sync', {
    type: 'truthvent',
    isActive: true,
    prompt: prompt,
    timeLeft: 60,
    scores: room.game.scores
  });

  const sysMsg = {
    id: `sys-tvd-${Date.now()}`,
    sender: { name: '🎭 Confessions', color: '#f43f5e', avatar: '🔮' },
    text: `[${prompt.type.toUpperCase()}]: ${prompt.text}`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', sysMsg);
}

// 5. Emoji Pop Reflex Arcade
function startEmojiPopGame(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size === 0) return;

  clearRoomTimer(room);
  room.game.type = 'emojipop';
  room.game.isActive = true;
  room.game.timeLeft = 30;

  // Generate 6 random floating target emojis with coords & points
  const spawnTargets = () => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `target-${Date.now()}-${i}-${Math.random()}`,
      emoji: EMOJI_POP_TARGETS[Math.floor(Math.random() * EMOJI_POP_TARGETS.length)],
      x: 10 + Math.random() * 80,
      y: 15 + Math.random() * 70,
      size: 44 + Math.random() * 20,
      points: 10 + Math.floor(Math.random() * 15)
    }));
  };

  room.game.emojiTargets = spawnTargets();

  io.to(roomId).emit('game_state_sync', {
    type: 'emojipop',
    isActive: true,
    timeLeft: 30,
    targets: room.game.emojiTargets,
    scores: room.game.scores
  });

  const sysMsg = {
    id: `sys-pop-${Date.now()}`,
    sender: { name: '💥 Pop Arcade', color: '#ec4899', avatar: '🎯' },
    text: `Emoji Pop Arena started! Click the floating emojis fast to rack up combo points!`,
    timestamp: Date.now(),
    isSystem: true
  };
  io.to(roomId).emit('new_message', sysMsg);

  room.game.timerInterval = setInterval(() => {
    if (!room.game.isActive) {
      clearRoomTimer(room);
      return;
    }
    room.game.timeLeft -= 1;
    io.to(roomId).emit('game_timer_tick', { timeLeft: room.game.timeLeft });

    // Respawn targets periodically
    if (room.game.timeLeft % 4 === 0) {
      room.game.emojiTargets = spawnTargets();
      io.to(roomId).emit('emoji_targets_respawn', { targets: room.game.emojiTargets });
    }

    if (room.game.timeLeft <= 0) {
      clearRoomTimer(room);
      io.to(roomId).emit('game_round_ended', {
        reason: 'Arcade Round Finished!',
        scores: room.game.scores
      });

      const endMsg = {
        id: `sys-pop-end-${Date.now()}`,
        sender: { name: '💥 Pop Arcade', color: '#10b981', avatar: '🏆' },
        text: `Game over! Check the scoreboard. Next round launching in 5 seconds!`,
        timestamp: Date.now(),
        isSystem: true
      };
      io.to(roomId).emit('new_message', endMsg);

      setTimeout(() => {
        if (room.users.size >= 1 && room.game.isActive && room.game.type === 'emojipop') {
          startEmojiPopGame(roomId);
        }
      }, 5000);
    }
  }, 1000);
}

function launchGame(roomId, gameType) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.game.type = gameType;
  switch (gameType) {
    case 'trivia':
      startTriviaGame(roomId);
      break;
    case 'wordchain':
      startWordChainGame(roomId);
      break;
    case 'truthvent':
      startTruthVentGame(roomId);
      break;
    case 'emojipop':
      startEmojiPopGame(roomId);
      break;
    case 'scribble':
    default:
      startScribbleGame(roomId);
      break;
  }
}

// ==========================================
// 4. SOCKET.IO EVENT LOOP
// ==========================================
io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  socket.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));
  socket.emit('pins_update', Array.from(pins.values()));

  // Pins Event Handlers
  socket.on('get_pins', () => {
    socket.emit('pins_update', Array.from(pins.values()));
  });

  socket.on('create_pin', (pinData, callback) => {
    if (!pinData || !pinData.type || !pinData.title) {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid pin payload' });
      return;
    }

    const pinId = `pin-${pinData.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let linkedRoomId = pinData.roomId;

    // If type is room or marketplace, ensure linked room exists or create one
    if (pinData.type === 'room' && !linkedRoomId) {
      const roomCode = (pinData.code || Math.random().toString(36).substring(2, 8)).toUpperCase();
      linkedRoomId = `lounge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const idleTimeout = pinData?.idleTimeout || 'unlimited';
      const idleTimeoutMs = (idleTimeout === 15 || idleTimeout === '15')
        ? 15 * 60 * 1000
        : (idleTimeout === 30 || idleTimeout === '30')
          ? 30 * 60 * 1000
          : (typeof idleTimeout === 'number' && idleTimeout > 0 ? Math.round(idleTimeout * 60 * 1000) : null);
      const now = Date.now();

      const newRoom = {
        id: linkedRoomId,
        code: roomCode,
        name: pinData.title,
        category: pinData.category || 'General',
        selectedGame: pinData.selectedGame || 'scribble',
        description: pinData.description || 'A cozy pin lounge on campus.',
        tags: pinData.tags || ['MapPin'],
        lat: typeof pinData.lat === 'number' ? pinData.lat : null,
        lng: typeof pinData.lng === 'number' ? pinData.lng : null,
        idleTimeout,
        idleTimeoutMs,
        lastActivityAt: now,
        expiresAt: idleTimeoutMs ? now + idleTimeoutMs : null,
        created: now,
        isPermanent: false,
        users: new Map(),
        canvasStrokes: [],
        messages: [],
        game: {
          type: pinData.selectedGame || 'scribble',
          isActive: false,
          scores: {},
          timerInterval: null,
          timeLeft: 30,
          currentDrawer: null,
          currentWord: '',
          revealedWord: '',
          hasGuessed: new Set(),
          triviaQuestion: null,
          triviaAnswers: new Map(),
          currentLetter: 'C',
          lastWord: 'Campus',
          wordHistory: ['Campus'],
          streakCount: 1,
          currentPrompt: null,
          emojiTargets: []
        }
      };
      rooms.set(linkedRoomId, newRoom);
    } else if (pinData.type === 'marketplace' && !linkedRoomId) {
      const roomCode = ('MKT' + Math.random().toString(36).substring(2, 5)).toUpperCase();
      linkedRoomId = `room-mkt-${Date.now()}`;
      const priceStr = pinData.marketData?.price ? String(pinData.marketData.price) : '$0';
      const mktType = pinData.marketData?.listingType || 'sell';
      const newRoom = {
        id: linkedRoomId,
        code: roomCode,
        name: `🏷️ ${pinData.title} (${priceStr})`,
        category: 'General',
        selectedGame: 'scribble',
        description: `Negotiation chat for "${pinData.title}" (${priceStr}).`,
        tags: ['Marketplace', mktType.toUpperCase()],
        created: Date.now(),
        isPermanent: false,
        users: new Map(),
        canvasStrokes: [],
        messages: [
          {
            id: `sys-mkt-${Date.now()}`,
            sender: { name: '🏷️ Campus Market', color: '#10b981', avatar: '🏷️' },
            text: `Listing created for "${pinData.title}" at ${priceStr}. Discuss pickup details here!`,
            timestamp: Date.now(),
            isSystem: true
          }
        ],
        game: {
          type: 'scribble',
          isActive: false,
          scores: {},
          timerInterval: null,
          timeLeft: 30,
          currentDrawer: null,
          currentWord: '',
          revealedWord: '',
          hasGuessed: new Set(),
          triviaQuestion: null,
          triviaAnswers: new Map(),
          currentLetter: 'C',
          lastWord: 'Campus',
          wordHistory: ['Campus'],
          streakCount: 1,
          currentPrompt: null,
          emojiTargets: []
        }
      };
      rooms.set(linkedRoomId, newRoom);
    }

    const newPin = {
      id: pinId,
      type: pinData.type,
      lat: Number(pinData.lat) || 23.1750,
      lng: Number(pinData.lng) || 80.0292,
      title: pinData.title,
      createdBy: pinData.createdBy || { name: 'Anonymous Student', avatar: '🎓', color: '#8b5cf6' },
      createdAt: Date.now(),
      roomId: linkedRoomId,
      category: pinData.category,
      selectedGame: pinData.selectedGame,
      description: pinData.description,
      tags: pinData.tags,
      marketData: pinData.marketData ? {
        ...pinData.marketData,
        comments: []
      } : (pinData.type === 'marketplace' ? { price: '$0', listingType: 'sell', comments: [] } : undefined),
      lostFoundData: pinData.lostFoundData ? {
        category: pinData.lostFoundData.category || 'lost',
        description: pinData.lostFoundData.description || '',
        photoUrl: pinData.lostFoundData.photoUrl || '',
        dateHappened: pinData.lostFoundData.dateHappened || 'Recently',
        comments: []
      } : (pinData.type === 'lostfound' ? {
        category: 'lost',
        description: pinData.description || '',
        photoUrl: pinData.photoUrl || '',
        dateHappened: 'Recently',
        comments: []
      } : undefined)
    };

    pins.set(pinId, newPin);

    io.emit('pins_update', Array.from(pins.values()));
    io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));

    if (typeof callback === 'function') {
      callback({ success: true, pin: newPin, roomId: linkedRoomId });
    }
  });

  socket.on('update_pin', ({ pinId, updates }, callback) => {
    const pin = pins.get(pinId);
    if (!pin) {
      if (typeof callback === 'function') callback({ success: false, error: 'Pin not found' });
      return;
    }

    if (updates.title) pin.title = updates.title;
    if (typeof updates.lat === 'number') pin.lat = updates.lat;
    if (typeof updates.lng === 'number') pin.lng = updates.lng;
    if (updates.description) pin.description = updates.description;
    if (updates.marketData) pin.marketData = { ...pin.marketData, ...updates.marketData };

    pins.set(pinId, pin);
    io.emit('pins_update', Array.from(pins.values()));

    if (typeof callback === 'function') {
      callback({ success: true, pin });
    }
  });

  socket.on('add_lostfound_comment', ({ pinId, comment }, callback) => {
    const pin = pins.get(pinId);
    if (!pin || pin.type !== 'lostfound' || !pin.lostFoundData) {
      if (typeof callback === 'function') callback({ success: false, error: 'Lost & Found pin not found' });
      return;
    }

    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: comment?.author || { name: 'Anonymous Student', avatar: '🐱', color: '#10b981' },
      text: comment?.text || '',
      createdAt: Date.now()
    };

    pin.lostFoundData.comments = pin.lostFoundData.comments || [];
    pin.lostFoundData.comments.push(newComment);
    pins.set(pinId, pin);

    io.emit('pins_update', Array.from(pins.values()));

    if (typeof callback === 'function') {
      callback({ success: true, comment: newComment });
    }
  });

  socket.on('add_trade_comment', ({ pinId, comment }, callback) => {
    const pin = pins.get(pinId);
    if (!pin || pin.type !== 'marketplace') {
      if (typeof callback === 'function') callback({ success: false, error: 'Marketplace pin not found' });
      return;
    }

    pin.marketData = pin.marketData || {};
    pin.marketData.comments = pin.marketData.comments || [];

    const newComment = {
      id: `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      author: comment?.author || { name: 'Anonymous Student', avatar: '🏷️', color: '#10b981' },
      text: comment?.text || '',
      offer: comment?.offer || null,
      createdAt: Date.now()
    };

    pin.marketData.comments.push(newComment);
    pins.set(pinId, pin);

    io.emit('pins_update', Array.from(pins.values()));

    if (typeof callback === 'function') {
      callback({ success: true, comment: newComment });
    }
  });

  // Create Room
  socket.on('create_room', (roomData, callback) => {
    const roomCode = (roomData?.code || Math.random().toString(36).substring(2, 8)).toUpperCase();
    const roomId = `lounge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const selectedGame = roomData?.selectedGame || 'scribble';
    const idleTimeout = roomData?.idleTimeout || 'unlimited';
    const idleTimeoutMs = (idleTimeout === 15 || idleTimeout === '15')
      ? 15 * 60 * 1000
      : (idleTimeout === 30 || idleTimeout === '30')
        ? 30 * 60 * 1000
        : (typeof idleTimeout === 'number' && idleTimeout > 0 ? Math.round(idleTimeout * 60 * 1000) : null);
    const now = Date.now();

    const newRoom = {
      id: roomId,
      code: roomCode,
      name: roomData.name || 'Cozy Anonymous Corner ☕',
      category: roomData.category || 'General',
      selectedGame,
      description: roomData.description || 'A cozy space to vent and recharge.',
      tags: roomData.tags || ['Ephemeral', 'Vent'],
      lat: typeof roomData?.lat === 'number' ? roomData.lat : null,
      lng: typeof roomData?.lng === 'number' ? roomData.lng : null,
      idleTimeout,
      idleTimeoutMs,
      lastActivityAt: now,
      expiresAt: idleTimeoutMs ? now + idleTimeoutMs : null,
      created: now,
      isPermanent: false,
      users: new Map(),
      canvasStrokes: [],
      messages: [],
      game: {
        type: selectedGame,
        isActive: false,
        scores: {},
        timerInterval: null,
        timeLeft: 30,
        currentDrawer: null,
        currentWord: '',
        revealedWord: '',
        hasGuessed: new Set(),
        triviaQuestion: null,
        triviaAnswers: new Map(),
        currentLetter: 'C',
        lastWord: 'Campus',
        wordHistory: ['Campus'],
        streakCount: 1,
        currentPrompt: null,
        emojiTargets: []
      }
    };

    rooms.set(roomId, newRoom);
    io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));

    if (typeof callback === 'function') {
      callback({ success: true, roomId, code: roomCode });
    }
  });

  // Room Activity Heartbeat (from client-side P2P or action triggers)
  socket.on('room:activity', ({ roomId }) => {
    const targetId = roomId || currentRoomId;
    if (!targetId) return;
    const room = rooms.get(targetId);
    if (!room) return;

    room.lastActivityAt = Date.now();
    if (room.idleTimeout && room.idleTimeout !== 'unlimited' && room.idleTimeoutMs) {
      room.expiresAt = Date.now() + room.idleTimeoutMs;
      io.emit('room:activity_updated', {
        roomId: targetId,
        lastActivityAt: room.lastActivityAt,
        expiresAt: room.expiresAt,
        idleTimeoutMs: room.idleTimeoutMs
      });
    }
  });

  // Join Room by Code
  socket.on('join_room_by_code', ({ code }, callback) => {
    const rawCode = (code || '').trim();
    const cleanCode = rawCode.replace(/^#/, '').toUpperCase();

    if (!cleanCode) {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Please enter a valid lounge code.' });
      }
      return;
    }

    const targetRoom = Array.from(rooms.values()).find(r => {
      if (!r) return false;
      const rCode = (r.code || '').toUpperCase();
      const rId = (r.id || '').toUpperCase();
      const rIdClean = (r.id || '').replace(/^LOUNGE-/, '').toUpperCase();
      const rIdSlice = rIdClean.slice(0, 6);

      return rCode === cleanCode ||
             rId === cleanCode ||
             rIdClean === cleanCode ||
             rIdSlice === cleanCode;
    });

    if (targetRoom) {
      if (typeof callback === 'function') {
        callback({ success: true, roomId: targetRoom.id, code: targetRoom.code });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: `No active lounge found matching code "${cleanCode}".` });
      }
    }
  });

  // Join Room
  socket.on('join_room', ({ roomId, user }) => {
    let room = rooms.get(roomId);
    if (!room) {
      socket.emit('error_message', 'Room does not exist or has expired.');
      return;
    }

    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
      const prevRoom = rooms.get(currentRoomId);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        io.to(currentRoomId).emit('user_left', {
          socketId: socket.id,
          user: currentUser,
          activeUsers: Array.from(prevRoom.users.values())
        });
      }
    }

    currentRoomId = roomId;
    currentUser = {
      ...user,
      socketId: socket.id,
      joinedAt: Date.now()
    };

    socket.join(roomId);
    room.users.set(socket.id, currentUser);

    socket.emit('room_joined_data', {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        category: room.category,
        selectedGame: room.game.type,
        description: room.description,
        tags: room.tags,
        lat: typeof room.lat === 'number' ? room.lat : null,
        lng: typeof room.lng === 'number' ? room.lng : null,
        isPermanent: room.isPermanent || false
      },
      activeUsers: Array.from(room.users.values()),
      currentPoll: room.currentPoll || null,
      canvasStrokes: room.canvasStrokes,
      recentMessages: room.messages.slice(-50),
      gameState: {
        type: room.game.type,
        isActive: room.game.isActive,
        isDrawer: room.game.currentDrawer?.id === currentUser.id,
        word: room.game.currentDrawer?.id === currentUser.id
          ? room.game.currentWord
          : room.game.revealedWord,
        maskedWord: room.game.revealedWord,
        drawer: room.game.currentDrawer,
        timeLeft: room.game.timeLeft,
        scores: room.game.scores,
        triviaQuestion: room.game.triviaQuestion,
        currentLetter: room.game.currentLetter,
        lastWord: room.game.lastWord,
        streakCount: room.game.streakCount,
        prompt: room.game.currentPrompt,
        targets: room.game.emojiTargets
      }
    });

    socket.to(roomId).emit('user_joined', {
      user: currentUser,
      activeUsers: Array.from(room.users.values())
    });

    const welcomeMsg = {
      id: `sys-${Date.now()}-${Math.random()}`,
      sender: { name: '✨ Soulnook Sanctuary', color: '#10b981', avatar: '🌿' },
      text: `${currentUser.name} stepped into the lounge.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.messages.push(welcomeMsg);
    io.to(roomId).emit('new_message', welcomeMsg);

    io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));
  });

  // Canvas
  socket.on('draw_stroke', (strokeData) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.game.isActive && room.game.type === 'scribble') {
      if (room.game.currentDrawer?.id !== currentUser?.id) return;
    }

    room.canvasStrokes.push(strokeData);
    if (room.canvasStrokes.length > 2000) room.canvasStrokes.shift();
    socket.to(currentRoomId).emit('stroke_received', strokeData);
  });

  socket.on('clear_canvas', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.canvasStrokes = [];
    io.to(currentRoomId).emit('canvas_cleared', { by: currentUser?.name || 'Someone' });
  });

  // Chat message & game checking
  socket.on('send_message', (msgPayload) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const messageText = (msgPayload.text || '').trim();
    if (!messageText) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender: currentUser || { name: 'Anonymous', color: '#8b5cf6', avatar: '🎭' },
      text: messageText,
      timestamp: Date.now(),
      isEphemeral: msgPayload.isEphemeral || false,
      isSystem: false
    };

    // 1. Scribble Guess Check
    if (room.game.isActive && room.game.type === 'scribble' && room.game.currentWord) {
      const isDrawer = room.game.currentDrawer?.id === currentUser?.id;
      const cleanGuess = messageText.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTarget = room.game.currentWord.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!isDrawer && cleanGuess === cleanTarget) {
        if (!room.game.hasGuessed.has(currentUser.id)) {
          room.game.hasGuessed.add(currentUser.id);
          const guesserPoints = Math.max(10, Math.floor(room.game.timeLeft * 2));
          room.game.scores[currentUser.id] = (room.game.scores[currentUser.id] || 0) + guesserPoints;
          const drawerId = room.game.currentDrawer.id;
          room.game.scores[drawerId] = (room.game.scores[drawerId] || 0) + 15;

          const correctMsg = {
            id: `sys-guess-${Date.now()}`,
            sender: { name: '🎉 Scribble Bot', color: '#10b981', avatar: '🏆' },
            text: `🎯 ${currentUser.name} guessed the word correctly! (+${guesserPoints} pts)`,
            timestamp: Date.now(),
            isSystem: true
          };
          io.to(currentRoomId).emit('new_message', correctMsg);
          io.to(currentRoomId).emit('game_score_update', { scores: room.game.scores });

          const nonDrawers = Array.from(room.users.values()).filter(u => u.id !== drawerId);
          if (room.game.hasGuessed.size >= nonDrawers.length && nonDrawers.length > 0) {
            endScribbleRound(currentRoomId, 'Everyone guessed it!');
          }
          return;
        }
      }
    }

    // 2. Word Chain Check
    if (room.game.isActive && room.game.type === 'wordchain') {
      const cleanWord = messageText.trim().toUpperCase();
      const requiredChar = room.game.currentLetter;

      if (cleanWord.length >= 2 && cleanWord.startsWith(requiredChar)) {
        if (!room.game.wordHistory.includes(cleanWord)) {
          room.game.wordHistory.push(cleanWord);
          room.game.lastWord = cleanWord;
          room.game.currentLetter = cleanWord.slice(-1);
          room.game.streakCount += 1;
          room.game.timeLeft = 16;

          room.game.scores[currentUser.id] = (room.game.scores[currentUser.id] || 0) + (room.game.streakCount * 5);

          const chainMsg = {
            id: `sys-chain-hit-${Date.now()}`,
            sender: { name: '🔗 Word Chain', color: '#06b6d4', avatar: '⚡' },
            text: `✨ ${currentUser.name} played "${cleanWord}"! (Streak: ${room.game.streakCount}x). Next letter: "${room.game.currentLetter}"`,
            timestamp: Date.now(),
            isSystem: true
          };
          io.to(currentRoomId).emit('new_message', chainMsg);
          io.to(currentRoomId).emit('word_chain_update', {
            lastWord: cleanWord,
            currentLetter: room.game.currentLetter,
            streakCount: room.game.streakCount,
            scores: room.game.scores
          });
          return;
        }
      }
    }

    room.messages.push(message);
    if (room.messages.length > 100) room.messages.shift();
    io.to(currentRoomId).emit('new_message', message);
  });

  // Trivia answer submit
  socket.on('submit_trivia_answer', ({ answerIndex }) => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.game.isActive || room.game.type !== 'trivia') return;

    room.game.triviaAnswers.set(currentUser.id, answerIndex);
    socket.emit('trivia_answer_acknowledged', { answerIndex });
  });

  // Emoji Pop Target Clicked
  socket.on('pop_emoji_target', ({ targetId, points }) => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.game.isActive || room.game.type !== 'emojipop') return;

    // Filter out popped target
    room.game.emojiTargets = (room.game.emojiTargets || []).filter(t => t.id !== targetId);
    room.game.scores[currentUser.id] = (room.game.scores[currentUser.id] || 0) + (points || 10);

    io.to(currentRoomId).emit('emoji_target_popped', {
      targetId,
      poppedBy: currentUser,
      scores: room.game.scores
    });
  });

  // Switch or Toggle Game
  socket.on('switch_game', ({ gameType }) => {
    if (!currentRoomId) return;
    launchGame(currentRoomId, gameType);
  });

  socket.on('toggle_game', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (room.game.isActive) {
      room.game.isActive = false;
      clearRoomTimer(room);
      io.to(currentRoomId).emit('game_stopped');
    } else {
      launchGame(currentRoomId, room.game.type || 'scribble');
    }
  });

  socket.on('next_truth_vent_prompt', () => {
    if (!currentRoomId) return;
    startTruthVentGame(currentRoomId);
  });

  socket.on('typing_status', ({ isTyping }) => {
    if (!currentRoomId || !currentUser) return;
    socket.to(currentRoomId).emit('user_typing_update', {
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping
    });
  });

  socket.on('send_reaction', ({ emoji }) => {
    if (!currentRoomId || !currentUser) return;
    io.to(currentRoomId).emit('reaction_burst', {
      emoji,
      userId: currentUser.id,
      userName: currentUser.name,
      id: Math.random()
    });
  });

  // Room Poll Feature (Real-Time Live Polls)
  socket.on('create_poll', ({ roomId, question, options }, callback) => {
    const targetRoomId = roomId || currentRoomId;
    if (!targetRoomId) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room ID required' });
      return;
    }
    const room = rooms.get(targetRoomId);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
      return;
    }
    if (!question || !question.trim()) {
      if (typeof callback === 'function') callback({ success: false, error: 'Poll question is required' });
      return;
    }
    const cleanOptions = (Array.isArray(options) ? options : [])
      .map((opt) => (typeof opt === 'string' ? opt.trim() : (opt?.text || '').trim()))
      .filter(Boolean);

    if (cleanOptions.length < 2) {
      if (typeof callback === 'function') callback({ success: false, error: 'At least 2 options required' });
      return;
    }

    const poll = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: question.trim(),
      options: cleanOptions.map((text, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        text,
        votes: 0,
        voterIds: []
      })),
      createdBy: currentUser?.name || 'Student',
      creatorId: currentUser?.id || socket.id,
      createdAt: Date.now(),
      isOpen: true
    };

    room.currentPoll = poll;
    io.to(targetRoomId).emit('poll_updated', { poll });

    const sysMsg = {
      id: `sys-poll-${Date.now()}`,
      sender: { name: '📊 Room Poll', color: '#38bdf8', avatar: '📊' },
      text: `New live poll opened: "${poll.question}"`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.messages.push(sysMsg);
    io.to(targetRoomId).emit('new_message', sysMsg);

    if (typeof callback === 'function') {
      callback({ success: true, poll });
    }
  });

  socket.on('vote_poll', ({ roomId, pollId, optionId, voterId }, callback) => {
    const targetRoomId = roomId || currentRoomId;
    if (!targetRoomId) return;
    const room = rooms.get(targetRoomId);
    if (!room || !room.currentPoll || room.currentPoll.id !== pollId || !room.currentPoll.isOpen) {
      if (typeof callback === 'function') callback({ success: false, error: 'Poll not active' });
      return;
    }

    const poll = room.currentPoll;
    const effectiveVoterId = voterId || currentUser?.id || currentUser?.name || socket.id;

    const targetOpt = poll.options.find(o => o.id === optionId);
    if (!targetOpt) {
      if (typeof callback === 'function') callback({ success: false, error: 'Option not found' });
      return;
    }

    // Remove previous votes by this user across all options in this poll
    poll.options.forEach(opt => {
      const idx = opt.voterIds.indexOf(effectiveVoterId);
      if (idx !== -1) {
        opt.voterIds.splice(idx, 1);
        opt.votes = Math.max(0, opt.votes - 1);
      }
    });

    // Cast vote
    targetOpt.voterIds.push(effectiveVoterId);
    targetOpt.votes += 1;

    io.to(targetRoomId).emit('poll_updated', { poll });
    if (typeof callback === 'function') {
      callback({ success: true, poll });
    }
  });

  socket.on('close_poll', ({ roomId, pollId }, callback) => {
    const targetRoomId = roomId || currentRoomId;
    if (!targetRoomId) return;
    const room = rooms.get(targetRoomId);
    if (!room || !room.currentPoll || room.currentPoll.id !== pollId) {
      if (typeof callback === 'function') callback({ success: false, error: 'Poll not found' });
      return;
    }

    room.currentPoll.isOpen = false;
    io.to(targetRoomId).emit('poll_updated', { poll: room.currentPoll });

    const totalVotes = room.currentPoll.options.reduce((sum, o) => sum + o.votes, 0);
    const sysMsg = {
      id: `sys-poll-close-${Date.now()}`,
      sender: { name: '📊 Room Poll', color: '#94a3b8', avatar: '📊' },
      text: `Poll closed with ${totalVotes} total vote${totalVotes === 1 ? '' : 's'}.`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.messages.push(sysMsg);
    io.to(targetRoomId).emit('new_message', sysMsg);

    if (typeof callback === 'function') {
      callback({ success: true, poll: room.currentPoll });
    }
  });

  const handleLeave = () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoomId).emit('user_left', {
          socketId: socket.id,
          user: currentUser,
          activeUsers: Array.from(room.users.values())
        });

        if (room.game.isActive && room.game.type === 'scribble' && room.game.currentDrawer?.id === currentUser?.id) {
          endScribbleRound(currentRoomId, 'The drawer stepped out.');
        }

        if (!room.isPermanent && room.users.size === 0) {
          clearRoomTimer(room);
          setTimeout(() => {
            const checkRoom = rooms.get(currentRoomId);
            if (checkRoom && checkRoom.users.size === 0 && !checkRoom.isPermanent) {
              rooms.delete(currentRoomId);
              io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));
            }
          }, 60000);
        }
      }

      io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));
      currentRoomId = null;
    }
  };

  socket.on('leave_room', handleLeave);
  socket.on('disconnect', handleLeave);
});

const clientDist = path.join(__dirname, '../client/dist');
const indexHtml = path.join(clientDist, 'index.html');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

app.get('*', (req, res) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.json({
      status: 'live',
      service: 'TheBackrooms Socket.io Backend',
      socketEndpoint: '/socket.io/',
      activeRooms: rooms.size
    });
  }
});

// Background sweep for idle-expired rooms (every 5 seconds)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [roomId, room] of rooms.entries()) {
    if (!room.isPermanent && room.idleTimeout && room.idleTimeout !== 'unlimited' && room.expiresAt) {
      if (now >= room.expiresAt) {
        console.log(`[Room Expiry] Room ${roomId} idle timeout (${room.idleTimeout}m) elapsed. Deactivating.`);
        io.to(roomId).emit('room_expired', {
          roomId,
          message: 'This room has expired due to inactivity.'
        });
        clearRoomTimer(room);
        rooms.delete(roomId);
        for (const [pinId, pin] of pins.entries()) {
          if (pin.roomId === roomId) {
            pins.delete(pinId);
          }
        }
        changed = true;
      }
    }
  }
  if (changed) {
    io.emit('rooms_update', Array.from(rooms.values()).map(formatRoomForLobby));
    io.emit('pins_update', Array.from(pins.values()));
  }
}, 5000);

httpServer.listen(PORT, () => {
  console.log(`🌌 Soulnook Decompression Lounge server live on port ${PORT}`);
});
