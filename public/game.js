// Connect to server
const socket = io();

// Game state
let currentRoom = null;
let playerName = '';
let isHost = false;
let selectedGame = null;
let selectedAnswer = null;
let isJoining = false;

// DOM Elements
const screens = document.querySelectorAll('.screen');
const homeScreen = document.getElementById('home-screen');
const nameScreen = document.getElementById('name-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const triviaScreen = document.getElementById('trivia-screen');
const tictactoeScreen = document.getElementById('tictactoe-screen');
const pinpointScreen = document.getElementById('pinpoint-screen');
const gameoverScreen = document.getElementById('gameover-screen');

// Utility functions
function showScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showToast(message) {
  const toast = document.getElementById('error-toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateScoresMini(containerId, players) {
  const container = document.getElementById(containerId);
  container.innerHTML = players.map(p => `
    <div class="player-score">
      <span class="name">${p.name}</span>
      <span class="score">${p.score}</span>
    </div>
  `).join('');
}

// Home screen - Game selection
document.querySelectorAll('.game-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedGame = btn.dataset.game;
    isJoining = false;
    showScreen('name-screen');
  });
});

// Join game
document.getElementById('join-btn').addEventListener('click', () => {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (code.length !== 4) {
    showToast('Please enter a 4-character room code');
    return;
  }
  isJoining = true;
  selectedGame = code;
  showScreen('name-screen');
});

// Enter key for join code
document.getElementById('join-code').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('join-btn').click();
  }
});

// Name confirmation
document.getElementById('confirm-name-btn').addEventListener('click', () => {
  playerName = document.getElementById('player-name').value.trim();
  if (!playerName) {
    showToast('Please enter your name');
    return;
  }

  if (isJoining) {
    socket.emit('joinRoom', { roomCode: selectedGame, playerName });
  } else {
    socket.emit('createRoom', { playerName, gameType: selectedGame });
  }
});

// Enter key for name
document.getElementById('player-name').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('confirm-name-btn').click();
  }
});

// Back buttons
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target) {
      showScreen(target);
    } else if (btn.classList.contains('leave-btn')) {
      location.reload();
    }
  });
});

// Copy room code
document.getElementById('copy-code-btn').addEventListener('click', () => {
  const code = document.getElementById('room-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Room code copied!');
  });
});

// Start game
document.getElementById('start-game-btn').addEventListener('click', () => {
  socket.emit('startGame');
});

// Socket events
socket.on('roomCreated', ({ roomCode, room }) => {
  currentRoom = room;
  isHost = true;
  showLobby(roomCode, room);
});

socket.on('roomJoined', ({ roomCode, room }) => {
  currentRoom = room;
  isHost = false;
  showLobby(roomCode, room);
});

socket.on('playerJoined', ({ players }) => {
  currentRoom.players = players;
  updatePlayerList(players);
});

socket.on('playerLeft', ({ players }) => {
  currentRoom.players = players;
  const me = players.find(p => p.id === socket.id);
  if (me && me.isHost) {
    isHost = true;
  }
  updatePlayerList(players);
  updateHostUI();
});

socket.on('error', ({ message }) => {
  showToast(message);
});

socket.on('loadingGame', ({ message }) => {
  document.getElementById('start-game-btn').disabled = true;
  document.getElementById('start-game-btn').textContent = 'Loading...';
  document.querySelector('.waiting-msg').textContent = message || 'Loading game...';
});

socket.on('gameStarted', ({ gameState, room }) => {
  currentRoom = room;
  currentRoom.gameState = gameState;

  switch (room.gameType) {
    case 'trivia':
      startTrivia(gameState);
      break;
    case 'tictactoe':
      startTicTacToe(gameState, room);
      break;
    case 'pinpoint':
      startPinpoint(gameState);
      break;
  }
});

// Lobby functions
function showLobby(roomCode, room) {
  document.getElementById('room-code').textContent = roomCode;
  document.getElementById('lobby-game-type').textContent = getGameTypeName(room.gameType);
  updatePlayerList(room.players);
  updateHostUI();
  showScreen('lobby-screen');
}

function getGameTypeName(type) {
  const names = {
    trivia: 'Trivia',
    tictactoe: 'Tic Tac Toe',
    pinpoint: 'Pinpoint Challenge'
  };
  return names[type] || type;
}

function updatePlayerList(players) {
  const list = document.getElementById('player-list');
  list.innerHTML = players.map(p => `
    <li>
      <span>${p.name}</span>
      ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
    </li>
  `).join('');
}

function updateHostUI() {
  document.querySelectorAll('.host-only').forEach(el => {
    el.style.display = isHost ? 'inline-block' : 'none';
  });
  document.querySelector('.waiting-msg').style.display = isHost ? 'none' : 'block';
}

// ============ TRIVIA ============
function startTrivia(gameState) {
  showScreen('trivia-screen');
  showTriviaQuestion(gameState);
}

function showTriviaQuestion(gameState) {
  const q = gameState.questions[gameState.currentQuestion];
  document.getElementById('trivia-q-num').textContent = gameState.currentQuestion + 1;
  document.getElementById('trivia-question').textContent = q.question;

  const optionsContainer = document.getElementById('trivia-options');
  optionsContainer.innerHTML = q.options.map(opt => `
    <button class="option-btn" data-answer="${opt}">${opt}</button>
  `).join('');

  optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTriviaAnswer(btn));
  });

  document.getElementById('trivia-status').textContent = '';
  document.getElementById('trivia-reveal').style.display = 'none';
  selectedAnswer = null;

  updateScoresMini('trivia-scores', currentRoom.players);
}

function selectTriviaAnswer(btn) {
  if (selectedAnswer) return;

  selectedAnswer = btn.dataset.answer;
  btn.classList.add('selected');

  document.querySelectorAll('#trivia-options .option-btn').forEach(b => {
    b.disabled = true;
  });

  document.getElementById('trivia-status').textContent = 'Waiting for other players...';
  socket.emit('gameAction', { type: 'answer', answer: selectedAnswer });
}

socket.on('playerAnswered', ({ playerName }) => {
  document.getElementById('trivia-status').textContent = `${playerName} has answered...`;
});

socket.on('answerRevealed', ({ correct, answers, players }) => {
  currentRoom.players = players;

  document.querySelectorAll('#trivia-options .option-btn').forEach(btn => {
    if (btn.dataset.answer === correct) {
      btn.classList.add('correct');
    } else if (btn.classList.contains('selected')) {
      btn.classList.add('wrong');
    }
  });

  document.getElementById('correct-answer').textContent = correct;

  const playerAnswers = document.getElementById('player-answers');
  playerAnswers.innerHTML = players.map(p => {
    const answer = answers[p.id] || 'No answer';
    const isCorrect = answer === correct;
    return `
      <div class="player-answer ${isCorrect ? 'correct' : 'wrong'}">
        <span>${p.name}</span>
        <span>${answer} ${isCorrect ? '✓' : '✗'}</span>
      </div>
    `;
  }).join('');

  document.getElementById('trivia-reveal').style.display = 'block';
  document.getElementById('trivia-status').textContent = '';
  updateScoresMini('trivia-scores', players);
  updateHostUI();
});

document.getElementById('next-question-btn').addEventListener('click', () => {
  socket.emit('gameAction', { type: 'nextQuestion' });
});

socket.on('newQuestion', ({ gameState }) => {
  currentRoom.gameState = gameState;
  showTriviaQuestion(gameState);
});

// ============ TIC TAC TOE ============
function startTicTacToe(gameState, room) {
  showScreen('tictactoe-screen');
  renderTTTBoard(gameState, room);
}

function renderTTTBoard(gameState, room) {
  const board = document.getElementById('ttt-board');
  board.innerHTML = gameState.categories.map((cat, i) => {
    const owner = gameState.board[i];
    let cellClass = 'ttt-cell';
    let marker = '';

    if (owner !== null) {
      cellClass += ` taken player-${owner}`;
      marker = owner === 0 ? '🔴' : '🔵';
    }

    return `
      <div class="${cellClass}" data-cell="${i}">
        <span class="category">${cat}</span>
        <span class="marker">${marker}</span>
      </div>
    `;
  }).join('');

  board.querySelectorAll('.ttt-cell:not(.taken)').forEach(cell => {
    cell.addEventListener('click', () => selectTTTCell(cell, gameState, room));
  });

  updateTTTTurn(gameState, room);
  updateScoresMini('ttt-scores', room.players);
}

function updateTTTTurn(gameState, room) {
  const currentPlayer = room.players[gameState.currentPlayer];
  document.getElementById('current-player').textContent = currentPlayer ? currentPlayer.name : '';
}

function selectTTTCell(cell, gameState, room) {
  const myIndex = room.players.findIndex(p => p.id === socket.id);
  if (myIndex !== gameState.currentPlayer) {
    showToast("It's not your turn!");
    return;
  }

  const cellIndex = parseInt(cell.dataset.cell);
  socket.emit('gameAction', { type: 'selectCell', cell: cellIndex });
}

socket.on('questionAsked', ({ cell, question, player }) => {
  document.getElementById('ttt-question').style.display = 'block';
  document.getElementById('ttt-q-text').textContent = `${player}: ${question.question}`;

  const optionsContainer = document.getElementById('ttt-options');
  optionsContainer.innerHTML = question.options.map(opt => `
    <button class="option-btn" data-answer="${opt}">${opt}</button>
  `).join('');

  optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => answerTTTQuestion(btn));
  });
});

function answerTTTQuestion(btn) {
  const myIndex = currentRoom.players.findIndex(p => p.id === socket.id);
  if (myIndex !== currentRoom.gameState.currentPlayer) return;

  socket.emit('gameAction', { type: 'answerTicTacToe', answer: btn.dataset.answer });
  document.querySelectorAll('#ttt-options .option-btn').forEach(b => b.disabled = true);
}

socket.on('cellResult', ({ cell, correct, correctAnswer, board, currentPlayer, players }) => {
  currentRoom.players = players;
  currentRoom.gameState.board = board;
  currentRoom.gameState.currentPlayer = currentPlayer;

  const resultDiv = document.getElementById('ttt-result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = correct
    ? '<span style="color: var(--success)">Correct! ✓</span>'
    : `<span style="color: var(--error)">Wrong! The answer was: ${correctAnswer}</span>`;

  setTimeout(() => {
    resultDiv.style.display = 'none';
    document.getElementById('ttt-question').style.display = 'none';
    renderTTTBoard(currentRoom.gameState, currentRoom);
  }, 2000);
});

// ============ PINPOINT ============
function startPinpoint(gameState) {
  showScreen('pinpoint-screen');
  showPinpointRound(gameState);
}

function showPinpointRound(gameState) {
  const round = gameState.rounds[gameState.currentRound];
  document.getElementById('pinpoint-round').textContent = gameState.currentRound + 1;
  document.getElementById('pinpoint-title').textContent = round.title;
  document.getElementById('pinpoint-clue').textContent = round.clue;

  const inputsContainer = document.getElementById('pinpoint-inputs');
  const numInputs = round.answers.length > 5 ? 5 : round.answers.length;

  inputsContainer.innerHTML = Array(numInputs).fill(0).map((_, i) => `
    <div class="pinpoint-input">
      <span>${i + 1}.</span>
      <input type="text" data-index="${i}" placeholder="Your answer...">
    </div>
  `).join('');

  document.getElementById('submit-pinpoint-btn').disabled = false;
  document.getElementById('pinpoint-reveal').style.display = 'none';

  updateScoresMini('pinpoint-scores', currentRoom.players);
}

document.getElementById('submit-pinpoint-btn').addEventListener('click', () => {
  const inputs = document.querySelectorAll('#pinpoint-inputs input');
  const guesses = Array.from(inputs).map(input => input.value.trim());

  socket.emit('gameAction', { type: 'guess', guesses });
  document.getElementById('submit-pinpoint-btn').disabled = true;
  inputs.forEach(input => input.disabled = true);
});

socket.on('playerGuessed', ({ playerName }) => {
  showToast(`${playerName} has submitted their answers`);
});

socket.on('pinpointRevealed', ({ answers, guesses, players }) => {
  currentRoom.players = players;

  const revealDiv = document.getElementById('pinpoint-reveal');
  const answersDiv = document.getElementById('pinpoint-answers');

  answersDiv.innerHTML = answers.slice(0, 5).map((ans, i) => `
    <div class="pinpoint-answer-row">
      <span>${i + 1}. <span class="answer">${ans}</span></span>
      <span class="points">+${currentRoom.gameState.rounds[currentRoom.gameState.currentRound].points[i] || 100}</span>
    </div>
  `).join('');

  revealDiv.style.display = 'block';
  updateScoresMini('pinpoint-scores', players);
  updateHostUI();
});

document.getElementById('next-round-btn').addEventListener('click', () => {
  socket.emit('gameAction', { type: 'nextRound' });
});

socket.on('newRound', ({ gameState }) => {
  currentRoom.gameState = gameState;
  showPinpointRound(gameState);
});

// ============ GAME OVER ============
socket.on('gameOver', ({ players, winner, board }) => {
  showScreen('gameover-screen');

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const scoresDiv = document.getElementById('final-scores');

  if (winner) {
    // Tic Tac Toe game over
    scoresDiv.innerHTML = `
      <h2 style="margin-bottom: 20px;">${winner === 'tie' ? "It's a Tie!" : `${winner} Wins!`}</h2>
      ${sortedPlayers.map((p, i) => `
        <div class="final-score-row">
          <span class="position">#${i + 1}</span>
          <span class="name">${p.name}</span>
          <span class="score">${p.score} pts</span>
        </div>
      `).join('')}
    `;
  } else {
    scoresDiv.innerHTML = sortedPlayers.map((p, i) => `
      <div class="final-score-row">
        <span class="position">#${i + 1}</span>
        <span class="name">${p.name}${i === 0 ? ' 🏆' : ''}</span>
        <span class="score">${p.score} pts</span>
      </div>
    `).join('');
  }
});

document.getElementById('play-again-btn').addEventListener('click', () => {
  location.reload();
});

document.getElementById('home-btn').addEventListener('click', () => {
  location.reload();
});
