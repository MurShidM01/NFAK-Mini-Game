// Game State
const GameState = {
  questions: [],
  currentQuestion: {},
  score: 0,
  timerInterval: null,
  userName: localStorage.getItem('userName') || '',
  totalPoints: parseInt(localStorage.getItem('totalPoints')) || 0,
  correctAnswers: parseInt(localStorage.getItem('correctAnswers')) || 0,
  totalAttempts: parseInt(localStorage.getItem('totalAttempts')) || 0,
  currentStreak: parseInt(localStorage.getItem('currentStreak')) || 0,
  bestStreak: parseInt(localStorage.getItem('bestStreak')) || 0,
  totalTimePlayed: parseInt(localStorage.getItem('totalTimePlayed')) || 0,
  TIMER_DURATION: 20,
  POINTS_PER_CORRECT: 10,
  selectedOption: null,
  quizActive: false,
  startTime: null,
  answeredQuestions: new Set(),
  achievements: {
    'Beginner': { threshold: 50, description: 'Score 50 points', icon: 'fa-award' },
    'Intermediate': { threshold: 100, description: 'Score 100 points', icon: 'fa-medal' },
    'Expert': { threshold: 200, description: 'Score 200 points', icon: 'fa-trophy' },
    'Hot Streak': { threshold: 5, description: 'Achieve a streak of 5', icon: 'fa-fire' },
    'Time Master': { threshold: 3600, description: 'Play for 1 hour', icon: 'fa-clock' },
    'Perfect Score': { threshold: 1, description: 'Get 100% accuracy in a quiz', icon: 'fa-star' },
    'Quick Thinker': { threshold: 1, description: 'Answer 5 questions in under 10 seconds', icon: 'fa-bolt' },
    'Qawwali Master': { threshold: 1, description: 'Answer all questions correctly', icon: 'fa-crown' }
  }
};

// DOM Elements
const DOM = {
  question: document.getElementById('question'),
  options: document.getElementById('options'),
  timer: document.getElementById('timer'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  totalPointsDisplay: document.getElementById('totalPointsDisplay'),
  totalScore: document.getElementById('totalScore'),
  correctAnswers: document.getElementById('correctAnswers'),
  accuracy: document.getElementById('accuracy'),
  streak: document.getElementById('streak'),
  totalQuestions: document.getElementById('totalQuestions'),
  bestStreak: document.getElementById('bestStreak'),
  totalTime: document.getElementById('totalTime'),
  rank: document.getElementById('rank'),
  historyList: document.getElementById('historyList'),
  leaderboardList: document.getElementById('leaderboardList'),
  achievementList: document.getElementById('achievementList'),
  howToPlay: document.getElementById('howToPlay'),
  quizGame: document.getElementById('quizGame'),
  startButton: document.getElementById('startQuiz'),
  nextButton: document.getElementById('nextQuestion'),
  stopButton: document.getElementById('stopQuiz')
};

// Quiz state management
let currentQuestionIndex = 0;
let score = 0;
let quizActive = false;

// Splash Screen Handling
document.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splashScreen');
  
  // Hide splash screen after 7 seconds
  setTimeout(() => {
    splashScreen.style.opacity = '0';
    splashScreen.style.transition = 'opacity 0.5s ease-out';
    
    // Add hide class to splash screen
    splashScreen.classList.add('hide');
    
    // Remove splash screen from DOM after fade out
    setTimeout(() => {
      splashScreen.remove();
      initializeGame();
    }, 500);
  }, 7000);
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeGame();
  loadLeaderboard();
  
  // Ensure DOM elements are available before adding event listeners
  if (DOM.stopButton) {
    DOM.stopButton.addEventListener('click', stopQuiz);
  }
  
  if (DOM.startButton) {
    DOM.startButton.addEventListener('click', startQuiz);
  }
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showTab(e.currentTarget.dataset.tab);
    });
  });
});

// Game Initialization
async function initializeGame() {
  try {
    await getUserName();
    await loadQuestions();
    updateStats();
    loadHistory();
    loadLeaderboard();
    loadAchievements();
  } catch (error) {
    console.error('Error initializing game:', error);
    showError('Failed to initialize game. Please refresh the page.');
  }
}

// User Management
async function getUserName() {
  if (!GameState.userName) {
    try {
      const { value: name } = await Swal.fire({
        title: 'Welcome to NFAK Quiz!',
        html: `
          <div style="text-align: center;">
            <p style="margin-bottom: 20px; font-size: 16px;">Enter your name to begin your Qawwali journey</p>
            <input type="text" id="nameInput" class="swal2-input" placeholder="Enter your name" style="width: 80%; max-width: 300px; color: black">
          </div>
        `,
        allowOutsideClick: false,
        confirmButtonText: 'Start Quiz',
        showCancelButton: false,
        customClass: {
          popup: 'swal2-popup-custom',
          input: 'swal2-input-custom',
          confirmButton: 'swal2-confirm-custom'
        },
        didOpen: () => {
          const input = document.getElementById('nameInput');
          if (input) {
            input.focus();
          }
        },
        preConfirm: () => {
          const input = document.getElementById('nameInput');
          if (!input.value.trim()) {
            Swal.showValidationMessage('Please enter a name');
            return false;
          }
          return input.value.trim();
        }
      });
      
      GameState.userName = name || 'Guest';
      localStorage.setItem('userName', GameState.userName);
    } catch (error) {
      console.error('Error getting username:', error);
      GameState.userName = 'Guest';
    }
  }
}

// Questions Management
async function loadQuestions() {
  try {
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error('Failed to fetch questions');
    GameState.questions = await response.json();
    if (!GameState.questions.length) throw new Error('No questions available');
  } catch (error) {
    console.error('Error loading questions:', error);
    Swal.fire({
      title: 'Error Loading Questions',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 18px; margin-bottom: 20px;">We are unable to load questions at the moment.</p>
          <p style="font-size: 16px; color: var(--accent-color);">Please try again later!</p>
        </div>
      `,
      icon: 'error',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'swal2-popup-custom',
        confirmButton: 'swal2-confirm-custom'
      }
    });
    GameState.questions = [];
  }
}

function loadQuestion() {
  clearInterval(GameState.timerInterval);
  GameState.selectedOption = null;
  
  // Get unasked questions
  const unaskedQuestions = GameState.questions.filter(q => !GameState.answeredQuestions.has(q.line));
  
  if (unaskedQuestions.length === 0) {
    // If all questions have been asked, reset the answered questions set
    GameState.answeredQuestions.clear();
    showQuestionsCompletedPopup();
    return;
  }
  
  // Select a random question from unasked questions
  GameState.currentQuestion = unaskedQuestions[Math.floor(Math.random() * unaskedQuestions.length)];
  GameState.answeredQuestions.add(GameState.currentQuestion.line);
  
  DOM.question.innerText = `"${GameState.currentQuestion.line}"`;
  
  // Shuffle options
  const shuffledOptions = [...GameState.currentQuestion.options].sort(() => Math.random() - 0.5);
  
  // Create option elements
  DOM.options.innerHTML = '';
  shuffledOptions.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option';
    optionElement.textContent = option;
    optionElement.addEventListener('click', () => selectOption(optionElement, option));
    DOM.options.appendChild(optionElement);
  });
  
  startTimer();
}

function selectOption(optionElement, option) {
  if (GameState.selectedOption) return; // Prevent multiple selections
  
  GameState.selectedOption = option;
  optionElement.classList.add('selected');
  
  // Disable all options
  document.querySelectorAll('.option').forEach(opt => {
    opt.classList.add('disabled');
  });
  
  // Check answer after a short delay
  setTimeout(() => {
    const correct = option === GameState.currentQuestion.answer;
    handleAnswer(correct, option);
  }, 500);
}

function handleAnswer(correct, selectedOption) {
  GameState.totalAttempts++;
  
  // Show correct/incorrect styling
  document.querySelectorAll('.option').forEach(opt => {
    if (opt.textContent === GameState.currentQuestion.answer) {
      opt.classList.add('correct');
    } else if (opt.textContent === selectedOption && !correct) {
      opt.classList.add('incorrect');
    }
  });
  
  if (correct) {
    handleCorrectAnswer();
  } else {
    handleIncorrectAnswer();
  }
  
  updateLocalStorage();
  saveHistory(correct, selectedOption);
  updateAchievements();
  updateLeaderboard();
  updateStats();
  
  // Load next question after a delay
  setTimeout(loadQuestion, 2000);
}

function handleCorrectAnswer() {
  GameState.score += GameState.POINTS_PER_CORRECT;
  GameState.correctAnswers++;
  GameState.currentStreak++;
  GameState.totalPoints += GameState.POINTS_PER_CORRECT;
  
  // Update best streak if current streak is higher
  if (GameState.currentStreak > GameState.bestStreak) {
    GameState.bestStreak = GameState.currentStreak;
    localStorage.setItem('bestStreak', GameState.bestStreak);
  }
  
  updateScore();
}

function handleIncorrectAnswer() {
  GameState.currentStreak = 0;
  updateScore();
}

function nextQuestion() {
  if (!GameState.quizActive) return;
  loadQuestion();
}

function stopQuiz() {
  console.log('Stopping quiz...');
  if (!GameState.quizActive) {
    console.log('Quiz is not active');
    return;
  }
  
  // Stop the quiz
  GameState.quizActive = false;
  if (GameState.timerInterval) {
    clearInterval(GameState.timerInterval);
  }
  
  // Calculate and update total time played
  if (GameState.startTime) {
    const timeSpent = Math.floor((Date.now() - GameState.startTime) / 1000);
    GameState.totalTimePlayed += timeSpent;
    localStorage.setItem('totalTimePlayed', GameState.totalTimePlayed);
    updateScore();
  }
  
  // Show final score
  if (DOM.question) {
    DOM.question.innerText = `Quiz Complete! Your final score: ${GameState.score}`;
  }
  
  // Clear options
  if (DOM.options) {
    DOM.options.innerHTML = '';
  }
  
  // Disable stop button
  if (DOM.stopButton) {
    DOM.stopButton.disabled = true;
  }
  
  // Show restart button
  if (DOM.options) {
    const restartButton = document.createElement('button');
    restartButton.className = 'control-button';
    restartButton.textContent = 'Restart Quiz';
    restartButton.addEventListener('click', () => {
      if (DOM.howToPlay && DOM.quizGame && DOM.stopButton) {
        DOM.howToPlay.style.display = 'block';
        DOM.quizGame.style.display = 'none';
        DOM.stopButton.disabled = false;
      }
    });
    DOM.options.appendChild(restartButton);
  }
}

function updateScore() {
  if (DOM.totalScore) DOM.totalScore.textContent = GameState.score;
  if (DOM.totalPointsDisplay) DOM.totalPointsDisplay.textContent = `Total Points: ${GameState.totalPoints}`;
  if (DOM.correctAnswers) DOM.correctAnswers.textContent = GameState.correctAnswers;
  if (DOM.accuracy) DOM.accuracy.textContent = calculateAccuracy();
  if (DOM.streak) DOM.streak.textContent = GameState.currentStreak;
  if (DOM.totalQuestions) DOM.totalQuestions.textContent = GameState.totalAttempts;
  if (DOM.bestStreak) DOM.bestStreak.textContent = GameState.bestStreak;
  if (DOM.totalTime) DOM.totalTime.textContent = formatTime(GameState.totalTimePlayed);
  updateRank();
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function updateRank() {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  const playerIndex = leaderboard.findIndex(player => player.name === GameState.userName);
  DOM.rank.textContent = playerIndex >= 0 ? `#${playerIndex + 1}` : '#0';
}

// Timer Management
function startTimer() {
  let timeLeft = GameState.TIMER_DURATION;
  updateTimerDisplay(timeLeft);
  
  GameState.timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft);
    
    if (timeLeft <= 0) {
      handleTimeout();
    }
  }, 1000);
}

function updateTimerDisplay(timeLeft) {
  DOM.timer.innerText = `Time Left: ${timeLeft}s`;
}

function handleTimeout() {
  clearInterval(GameState.timerInterval);
  Swal.fire({
    icon: 'warning',
    title: 'Time Out!',
    text: `Correct Answer was: ${GameState.currentQuestion.answer}`
  });
  
  GameState.currentStreak = 0;
  localStorage.setItem('currentStreak', GameState.currentStreak);
  saveHistory(false);
  updateStats();
  loadQuestion();
}

// Stats Management
function updateStats() {
  DOM.userNameDisplay.textContent = `Player: ${GameState.userName}`;
  DOM.totalPointsDisplay.textContent = `Total Points: ${GameState.totalPoints}`;
  DOM.totalScore.textContent = GameState.totalPoints;
  DOM.correctAnswers.textContent = GameState.correctAnswers;
  DOM.accuracy.textContent = calculateAccuracy();
  DOM.streak.textContent = GameState.currentStreak;
}

function calculateAccuracy() {
  return GameState.totalAttempts > 0 
    ? Math.round((GameState.correctAnswers/GameState.totalAttempts) * 100) + '%' 
    : '0%';
}

function updateLocalStorage() {
  const items = ['totalPoints', 'correctAnswers', 'totalAttempts', 'currentStreak', 'bestStreak', 'totalTimePlayed'];
  items.forEach(item => localStorage.setItem(item, GameState[item]));
}

// History Management
function saveHistory(correct, selectedOption) {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  history.unshift({
    question: GameState.currentQuestion.line,
    yourAnswer: selectedOption,
    correctAnswer: GameState.currentQuestion.answer,
    correct,
    date: new Date().toLocaleString()
  });
  localStorage.setItem('quizHistory', JSON.stringify(history.slice(0, 50)));
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  DOM.historyList.innerHTML = '';
  
  history.forEach((entry, index) => {
    const historyItem = createHistoryItem(entry, index);
    DOM.historyList.appendChild(historyItem);
  });
}

function createHistoryItem(entry, index) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.innerHTML = `
    <div>
      <b>Q:</b> "${entry.question}"<br>
      <b>Your Answer:</b> ${entry.yourAnswer}<br>
      <b>Correct Answer:</b> ${entry.correctAnswer}<br>
      <small>${entry.date}</small>
    </div>
    <button class="delete-btn" data-index="${index}">
      <i class="fas fa-trash"></i>
    </button>
  `;
  
  setupHistoryItemEvents(div);
  return div;
}

function setupHistoryItemEvents(div) {
  let touchStartX = 0;
  let touchEndX = 0;
  let isDragging = false;
  
  // Touch events
  div.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    isDragging = true;
  });
  
  div.addEventListener('touchmove', e => {
    if (!isDragging) return;
    touchEndX = e.touches[0].clientX;
    const diffX = touchStartX - touchEndX;
    
    if (diffX > 50) {
      div.classList.add('slide-left');
    } else {
      div.classList.remove('slide-left');
    }
  });
  
  div.addEventListener('touchend', () => {
    isDragging = false;
  });
  
  // Mouse events
  div.addEventListener('mousedown', e => {
    touchStartX = e.clientX;
    isDragging = true;
  });
  
  div.addEventListener('mousemove', e => {
    if (!isDragging) return;
    touchEndX = e.clientX;
    const diffX = touchStartX - touchEndX;
    
    if (diffX > 50) {
      div.classList.add('slide-left');
    } else {
      div.classList.remove('slide-left');
    }
  });
  
  div.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  div.addEventListener('mouseleave', () => {
    isDragging = false;
    div.classList.remove('slide-left');
  });
  
  // Delete button click
  div.querySelector('.delete-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    const index = this.dataset.index;
    deleteHistoryItem(index);
  });
}

function deleteHistoryItem(index) {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  history.splice(index, 1);
  localStorage.setItem('quizHistory', JSON.stringify(history));
  loadHistory();
}

// Leaderboard Management
function loadLeaderboard() {
  const leaderboardList = document.getElementById('leaderboardList');
  
  if (!leaderboardList) {
    console.error('Leaderboard list element not found');
    return;
  }

  leaderboardList.innerHTML = '';
  
  // Virtual top 30 players with random, realistic scores
  const virtualPlayers = [
    { name: 'Ali Khan Jalbani', score: 78654387609 },
    { name: 'Rahat Fateh Ali Khan', score: 5123456789 },
    { name: 'Qawwal Master', score: 3876543210 },
    { name: 'Sufi Legend', score: 2876543210 },
    { name: 'Qawwali King', score: 2123456789 },
    { name: 'Nusrat Fan', score: 1876543210 },
    { name: 'Music Maestro', score: 1567894321 },
    { name: 'Melody Master', score: 1234567890 },
    { name: 'Rhythm King', score: 987654321 },
    { name: 'Tune Master', score: 876543210 },
    { name: 'Harmony Hero', score: 765432109 },
    { name: 'Sufi Singer', score: 654321098 },
    { name: 'Qawwali Pro', score: 543210987 },
    { name: 'Music Lover', score: 432109876 },
    { name: 'Nusrat Fanatic', score: 387654321 },
    { name: 'Sufi Soul', score: 321098765 },
    { name: 'Qawwali Expert', score: 276543210 },
    { name: 'Music Guru', score: 210987654 },
    { name: 'Melody Maker', score: 187654321 },
    { name: 'Rhythm Pro', score: 154321098 },
    { name: 'Tune Expert', score: 123456789 },
    { name: 'Harmony Master', score: 109876543 },
    { name: 'Sufi Pro', score: 98765432 },
    { name: 'Qawwali Star', score: 87654321 },
    { name: 'Music Star', score: 76543210 },
    { name: 'Nusrat Lover', score: 65432109 },
    { name: 'Sufi Star', score: 54321098 },
    { name: 'Qawwali Fan', score: 43210987 },
    { name: 'Music Fan', score: 32109876 },
    { name: 'Nusrat Fan', score: 21098765 }
  ];

  // Add virtual players to leaderboard
  virtualPlayers.forEach((player, index) => {
    const isTopPlayer = index < 3;
    const playerElement = document.createElement('div');
    playerElement.className = `leaderboard-item ${isTopPlayer ? 'top-player' : ''}`;
    playerElement.innerHTML = `
      <div class="rank-badge">
        ${getRankBadge(index)}
      </div>
      <div class="player-info">
        <span class="player-name">${player.name}</span>
      </div>
      <div class="player-score">${formatScore(player.score)} points</div>
      <div class="player-rank">#${index + 1}</div>
    `;
    leaderboardList.appendChild(playerElement);
  });

  // Add separator
  const separator = document.createElement('div');
  separator.className = 'leaderboard-separator';
  leaderboardList.appendChild(separator);

  // Calculate user's rank based on points
  const userScore = GameState.totalPoints;
  const baseRank = 1500; // Starting rank for 0 points
  const rankDecreasePerPoint = 1; // Rank decreases by 1 for every 2 points
  const userRank = Math.max(1, baseRank - Math.floor(userScore / 2)); // Ensure rank is at least 1
  
  // Add current user's position
  const userElement = document.createElement('div');
  userElement.className = 'leaderboard-item current-user';
  userElement.innerHTML = `
    <div class="rank-badge">
      <span class="rank-number">${userRank}</span>
    </div>
    <div class="player-info">
      <span class="player-name">${GameState.userName}</span>
      <span class="you-badge">You</span>
    </div>
    <div class="player-score">${formatScore(userScore)} points</div>
    <div class="player-rank">#${userRank}</div>
  `;
  leaderboardList.appendChild(userElement);
}

function getRankBadge(index) {
  switch(index) {
    case 0:
      return '<i class="fas fa-fire" style="color: #ffd700;"></i>';
    case 1:
      return '<i class="fas fa-medal" style="color: #c0c0c0;"></i>';
    case 2:
      return '<i class="fas fa-medal" style="color: #cd7f32;"></i>';
    default:
      return `<span class="rank-number">${index + 1}</span>`;
  }
}

function formatScore(score) {
  if (score >= 1000000) {
    return (score / 1000000).toFixed(1) + 'M';
  } else if (score >= 1000) {
    return (score / 1000).toFixed(1) + 'K';
  }
  return score;
}

// Achievement Management
function updateAchievements() {
  const unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');
  const newAchievements = [];
  
  // Check each achievement
  for (const [name, achievement] of Object.entries(GameState.achievements)) {
    if (!unlockedAchievements.includes(name)) {
      let unlocked = false;
      
      switch (name) {
        case 'Beginner':
        case 'Intermediate':
        case 'Expert':
          unlocked = GameState.totalPoints >= achievement.threshold;
          break;
        case 'Hot Streak':
          unlocked = GameState.currentStreak >= achievement.threshold;
          break;
        case 'Time Master':
          unlocked = GameState.totalTimePlayed >= achievement.threshold;
          break;
        case 'Perfect Score':
          unlocked = GameState.correctAnswers === GameState.totalAttempts && GameState.totalAttempts > 0;
          break;
        case 'Quick Thinker':
          // This would need additional tracking of quick answers
          break;
        case 'Qawwali Master':
          unlocked = GameState.correctAnswers === GameState.questions.length;
          break;
      }
      
      if (unlocked) {
        newAchievements.push(name);
        showAchievementUnlocked(name, achievement.description);
      }
    }
  }
  
  if (newAchievements.length > 0) {
    const updatedAchievements = [...unlockedAchievements, ...newAchievements];
    localStorage.setItem('achievements', JSON.stringify(updatedAchievements));
  }
}

function showAchievementUnlocked(name, description) {
  Swal.fire({
    title: 'Achievement Unlocked!',
    html: `
      <div style="text-align: center;">
        <i class="fas ${GameState.achievements[name].icon}" style="font-size: 48px; color: var(--accent-color); margin-bottom: 20px;"></i>
        <h3 style="color: var(--accent-color);">${name}</h3>
        <p style="font-size: 16px;">${description}</p>
      </div>
    `,
    icon: 'success',
    confirmButtonText: 'Awesome!',
    customClass: {
      popup: 'swal2-popup-custom',
      confirmButton: 'swal2-confirm-custom'
    }
  });
}

function loadAchievements() {
  const unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');
  DOM.achievementList.innerHTML = '';
  
  // Display all achievements, showing locked/unlocked status
  for (const [name, achievement] of Object.entries(GameState.achievements)) {
    const isUnlocked = unlockedAchievements.includes(name);
    DOM.achievementList.innerHTML += `
      <div class="achievement ${isUnlocked ? 'unlocked' : 'locked'}">
        <i class="fas ${achievement.icon}"></i>
        <div>
          <h3>${name}</h3>
          <p>${achievement.description}</p>
          ${!isUnlocked ? '<i class="fas fa-lock"></i>' : ''}
        </div>
      </div>
    `;
  }
}

// Navigation
function showTab(tab) {
  document.querySelectorAll('main > div').forEach(div => div.classList.add('hide'));
  document.getElementById(tab).classList.remove('hide');
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  
  // Refresh content if needed
  if (tab === 'history') loadHistory();
  if (tab === 'leaderboard') {
    loadLeaderboard();
  }
  if (tab === 'achievements') loadAchievements();
}

// Error Handling
function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: message
  });
}

function startQuiz() {
  console.log('Starting quiz...');
  GameState.quizActive = true;
  GameState.score = 0;
  GameState.startTime = Date.now();
  GameState.answeredQuestions.clear(); // Reset answered questions when starting new quiz
  updateScore();
  
  // Hide how to play section and show quiz game
  DOM.howToPlay.style.display = 'none';
  DOM.quizGame.style.display = 'block';
  
  // Load first question
  loadQuestion();
  
  // Enable stop button
  if (DOM.stopButton) {
    DOM.stopButton.disabled = false;
  }
}

function showQuestionsCompletedPopup() {
  Swal.fire({
    title: 'Questions Completed!',
    html: `
      <div style="text-align: center;">
        <p style="font-size: 18px; margin-bottom: 20px;">We are working on adding more questions!</p>
        <p style="font-size: 16px; color: var(--accent-color);">Stay tuned for updates!</p>
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'OK',
    customClass: {
      popup: 'swal2-popup-custom',
      confirmButton: 'swal2-confirm-custom'
    }
  }).then(() => {
    // Return to dashboard
    showTab('dashboard');
    updateScore();
  });
} 