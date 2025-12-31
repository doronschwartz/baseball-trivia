const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mlbData = require('./mlb-data');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = new Map();

// Generate a random 4-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', ({ playerName, gameType }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const room = {
      code: roomCode,
      gameType: gameType,
      host: socket.id,
      players: [{
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: true
      }],
      gameState: null,
      started: false
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('roomCreated', { roomCode, room });
    console.log(`Room ${roomCode} created for ${gameType}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode.toUpperCase());

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.started) {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (room.players.length >= 8) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.players.push({
      id: socket.id,
      name: playerName,
      score: 0,
      isHost: false
    });

    socket.join(roomCode.toUpperCase());
    socket.roomCode = roomCode.toUpperCase();

    socket.emit('roomJoined', { roomCode: roomCode.toUpperCase(), room });
    io.to(roomCode.toUpperCase()).emit('playerJoined', { players: room.players });
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Start the game
  socket.on('startGame', async () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;

    room.started = true;
    io.to(socket.roomCode).emit('loadingGame', { message: 'Loading questions from MLB...' });

    await initializeGameState(room);
    io.to(socket.roomCode).emit('gameStarted', { gameState: room.gameState, room });
  });

  // Handle game actions
  socket.on('gameAction', (action) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    handleGameAction(room, socket, action, io);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length === 0) {
          rooms.delete(socket.roomCode);
          console.log(`Room ${socket.roomCode} deleted (empty)`);
        } else {
          // If host left, assign new host
          if (room.host === socket.id) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
          }
          io.to(socket.roomCode).emit('playerLeft', { players: room.players });
        }
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Initialize game state based on game type
async function initializeGameState(room) {
  console.log(`Initializing ${room.gameType} game with MLB data...`);

  switch (room.gameType) {
    case 'trivia':
      const triviaQuestions = await mlbData.generateTriviaQuestions(10);
      room.gameState = {
        currentQuestion: 0,
        questions: triviaQuestions,
        answers: {},
        revealed: false,
        roundScores: {}
      };
      break;
    case 'tictactoe':
      const categories = await mlbData.generateTicTacToeCategories();
      room.gameState = {
        board: Array(9).fill(null),
        categories: categories,
        currentPlayer: 0,
        currentQuestion: null,
        winner: null
      };
      break;
    case 'pinpoint':
      const rounds = await mlbData.generatePinpointRounds();
      room.gameState = {
        currentRound: 0,
        rounds: rounds,
        guesses: {},
        revealed: false,
        roundScores: {}
      };
      break;
  }

  console.log(`Game initialized for room ${room.code}`);
}

// Handle game actions based on game type
async function handleGameAction(room, socket, action, io) {
  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  switch (room.gameType) {
    case 'trivia':
      handleTriviaAction(room, socket, player, action, io);
      break;
    case 'tictactoe':
      await handleTicTacToeAction(room, socket, player, action, io);
      break;
    case 'pinpoint':
      handlePinpointAction(room, socket, player, action, io);
      break;
  }
}

// Trivia game logic
function handleTriviaAction(room, socket, player, action, io) {
  const gs = room.gameState;

  if (action.type === 'answer') {
    gs.answers[socket.id] = action.answer;
    io.to(socket.roomCode).emit('playerAnswered', { playerId: socket.id, playerName: player.name });

    // Check if all players answered
    if (Object.keys(gs.answers).length === room.players.length) {
      revealTriviaAnswer(room, io);
    }
  } else if (action.type === 'nextQuestion' && room.host === socket.id) {
    gs.currentQuestion++;
    gs.answers = {};
    gs.revealed = false;

    if (gs.currentQuestion >= gs.questions.length) {
      io.to(socket.roomCode).emit('gameOver', { players: room.players });
    } else {
      io.to(socket.roomCode).emit('newQuestion', { gameState: gs });
    }
  } else if (action.type === 'revealAnswer' && room.host === socket.id) {
    revealTriviaAnswer(room, io);
  }
}

function revealTriviaAnswer(room, io) {
  const gs = room.gameState;
  const question = gs.questions[gs.currentQuestion];
  gs.revealed = true;

  // Score players who got it right
  room.players.forEach(p => {
    if (gs.answers[p.id] === question.correct) {
      p.score += 100;
    }
  });

  io.to(room.code).emit('answerRevealed', {
    correct: question.correct,
    answers: gs.answers,
    players: room.players
  });
}

// Tic Tac Toe game logic
async function handleTicTacToeAction(room, socket, player, action, io) {
  const gs = room.gameState;
  const playerIndex = room.players.findIndex(p => p.id === socket.id);

  if (action.type === 'selectCell') {
    if (playerIndex !== gs.currentPlayer || gs.board[action.cell] !== null) return;

    const question = await mlbData.generateTicTacToeQuestion(gs.categories[action.cell]);
    gs.currentQuestion = {
      cell: action.cell,
      category: gs.categories[action.cell],
      question: question
    };

    io.to(socket.roomCode).emit('questionAsked', {
      cell: action.cell,
      question: gs.currentQuestion.question,
      player: player.name
    });
  } else if (action.type === 'answerTicTacToe') {
    if (!gs.currentQuestion || playerIndex !== gs.currentPlayer) return;

    const correct = action.answer === gs.currentQuestion.question.correct;

    if (correct) {
      gs.board[gs.currentQuestion.cell] = playerIndex;
      player.score += 100;
    }

    gs.currentPlayer = (gs.currentPlayer + 1) % Math.min(room.players.length, 2);

    const winner = checkTicTacToeWinner(gs.board);
    if (winner !== null) {
      gs.winner = winner;
      io.to(socket.roomCode).emit('gameOver', {
        winner: winner === -1 ? 'tie' : room.players[winner].name,
        board: gs.board,
        players: room.players
      });
    } else {
      io.to(socket.roomCode).emit('cellResult', {
        cell: gs.currentQuestion.cell,
        correct,
        correctAnswer: gs.currentQuestion.question.correct,
        board: gs.board,
        currentPlayer: gs.currentPlayer,
        players: room.players
      });
    }

    gs.currentQuestion = null;
  }
}

function checkTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== null)) return -1; // Tie
  return null;
}

// Pinpoint game logic
function handlePinpointAction(room, socket, player, action, io) {
  const gs = room.gameState;

  if (action.type === 'guess') {
    gs.guesses[socket.id] = action.guesses;
    io.to(socket.roomCode).emit('playerGuessed', { playerId: socket.id, playerName: player.name });

    if (Object.keys(gs.guesses).length === room.players.length) {
      revealPinpointAnswer(room, io);
    }
  } else if (action.type === 'revealAnswer' && room.host === socket.id) {
    revealPinpointAnswer(room, io);
  } else if (action.type === 'nextRound' && room.host === socket.id) {
    gs.currentRound++;
    gs.guesses = {};
    gs.revealed = false;

    if (gs.currentRound >= gs.rounds.length) {
      io.to(socket.roomCode).emit('gameOver', { players: room.players });
    } else {
      io.to(socket.roomCode).emit('newRound', { gameState: gs });
    }
  }
}

function revealPinpointAnswer(room, io) {
  const gs = room.gameState;
  const round = gs.rounds[gs.currentRound];
  gs.revealed = true;

  // Score based on correct guesses
  room.players.forEach(p => {
    const guesses = gs.guesses[p.id] || [];
    let roundScore = 0;
    guesses.forEach((guess, i) => {
      if (guess === round.answers[i]) {
        roundScore += round.points[i] || 100;
      }
    });
    p.score += roundScore;
  });

  io.to(room.code).emit('pinpointRevealed', {
    answers: round.answers,
    guesses: gs.guesses,
    players: room.players
  });
}

// Old hardcoded functions removed - now using mlb-data.js module

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Baseball Trivia server running on http://localhost:${PORT}`);
});
