// MLB Stats API Data Fetcher - Updated for 2024/2025 with Jomboy-style questions
const BASE_URL = 'https://statsapi.mlb.com/api/v1';

// Cache to avoid repeated API calls
let cache = {
  teams: null,
  players: {},
  stats: {},
  lastFetch: {}
};

const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const CURRENT_SEASON = 2024; // MLB API may not have full 2025 yet

// Fetch with simple error handling
async function fetchMLB(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`MLB API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('MLB API fetch error:', error.message);
    return null;
  }
}

// Get all MLB teams
async function getTeams() {
  if (cache.teams && Date.now() - cache.lastFetch.teams < CACHE_DURATION) {
    return cache.teams;
  }
  const data = await fetchMLB('/teams?sportId=1');
  if (data?.teams) {
    cache.teams = data.teams;
    cache.lastFetch.teams = Date.now();
    return data.teams;
  }
  return getFallbackTeams();
}

// Get current roster for a team
async function getTeamRoster(teamId) {
  const cacheKey = `roster_${teamId}`;
  if (cache.players[cacheKey] && Date.now() - cache.lastFetch[cacheKey] < CACHE_DURATION) {
    return cache.players[cacheKey];
  }
  const data = await fetchMLB(`/teams/${teamId}/roster?rosterType=active`);
  if (data?.roster) {
    cache.players[cacheKey] = data.roster;
    cache.lastFetch[cacheKey] = Date.now();
    return data.roster;
  }
  return [];
}

// Get league leaders for a stat
async function getLeagueLeaders(statType, season = CURRENT_SEASON) {
  const cacheKey = `leaders_${statType}_${season}`;
  if (cache.stats[cacheKey] && Date.now() - cache.lastFetch[cacheKey] < CACHE_DURATION) {
    return cache.stats[cacheKey];
  }
  const data = await fetchMLB(`/stats/leaders?leaderCategories=${statType}&season=${season}&limit=20`);
  if (data?.leagueLeaders?.[0]?.leaders) {
    cache.stats[cacheKey] = data.leagueLeaders[0].leaders;
    cache.lastFetch[cacheKey] = Date.now();
    return data.leagueLeaders[0].leaders;
  }
  return [];
}

// Get standings
async function getStandings(season = CURRENT_SEASON) {
  const cacheKey = `standings_${season}`;
  if (cache.stats[cacheKey] && Date.now() - cache.lastFetch[cacheKey] < CACHE_DURATION) {
    return cache.stats[cacheKey];
  }
  const data = await fetchMLB(`/standings?leagueId=103,104&season=${season}`);
  if (data?.records) {
    cache.stats[cacheKey] = data.records;
    cache.lastFetch[cacheKey] = Date.now();
    return data.records;
  }
  return [];
}

// Fallback teams
function getFallbackTeams() {
  return [
    { id: 147, name: 'New York Yankees', teamName: 'Yankees', abbreviation: 'NYY' },
    { id: 111, name: 'Boston Red Sox', teamName: 'Red Sox', abbreviation: 'BOS' },
    { id: 119, name: 'Los Angeles Dodgers', teamName: 'Dodgers', abbreviation: 'LAD' },
    { id: 137, name: 'San Francisco Giants', teamName: 'Giants', abbreviation: 'SF' },
    { id: 112, name: 'Chicago Cubs', teamName: 'Cubs', abbreviation: 'CHC' },
    { id: 138, name: 'St. Louis Cardinals', teamName: 'Cardinals', abbreviation: 'STL' },
    { id: 117, name: 'Houston Astros', teamName: 'Astros', abbreviation: 'HOU' },
    { id: 140, name: 'Texas Rangers', teamName: 'Rangers', abbreviation: 'TEX' },
    { id: 144, name: 'Atlanta Braves', teamName: 'Braves', abbreviation: 'ATL' },
    { id: 121, name: 'New York Mets', teamName: 'Mets', abbreviation: 'NYM' },
    { id: 143, name: 'Philadelphia Phillies', teamName: 'Phillies', abbreviation: 'PHI' },
    { id: 116, name: 'Detroit Tigers', teamName: 'Tigers', abbreviation: 'DET' },
    { id: 114, name: 'Cleveland Guardians', teamName: 'Guardians', abbreviation: 'CLE' },
    { id: 142, name: 'Minnesota Twins', teamName: 'Twins', abbreviation: 'MIN' },
    { id: 136, name: 'Seattle Mariners', teamName: 'Mariners', abbreviation: 'SEA' },
    { id: 108, name: 'Los Angeles Angels', teamName: 'Angels', abbreviation: 'LAA' },
    { id: 135, name: 'San Diego Padres', teamName: 'Padres', abbreviation: 'SD' },
    { id: 158, name: 'Milwaukee Brewers', teamName: 'Brewers', abbreviation: 'MIL' },
    { id: 134, name: 'Pittsburgh Pirates', teamName: 'Pirates', abbreviation: 'PIT' },
    { id: 113, name: 'Cincinnati Reds', teamName: 'Reds', abbreviation: 'CIN' },
    { id: 109, name: 'Arizona Diamondbacks', teamName: 'D-backs', abbreviation: 'ARI' },
    { id: 115, name: 'Colorado Rockies', teamName: 'Rockies', abbreviation: 'COL' },
    { id: 146, name: 'Miami Marlins', teamName: 'Marlins', abbreviation: 'MIA' },
    { id: 120, name: 'Washington Nationals', teamName: 'Nationals', abbreviation: 'WSH' },
    { id: 139, name: 'Tampa Bay Rays', teamName: 'Rays', abbreviation: 'TB' },
    { id: 110, name: 'Baltimore Orioles', teamName: 'Orioles', abbreviation: 'BAL' },
    { id: 141, name: 'Toronto Blue Jays', teamName: 'Blue Jays', abbreviation: 'TOR' },
    { id: 118, name: 'Kansas City Royals', teamName: 'Royals', abbreviation: 'KC' },
    { id: 145, name: 'Chicago White Sox', teamName: 'White Sox', abbreviation: 'CWS' },
    { id: 133, name: 'Oakland Athletics', teamName: 'Athletics', abbreviation: 'OAK' }
  ];
}

// ============ JOMBOY-STYLE TRIVIA QUESTIONS ============

async function generateTriviaQuestions(count = 10) {
  const questions = [];
  const teams = await getTeams();

  // Mix of question types like Jomboy trivia
  const generators = [
    () => generateWhoPlayedForQuestion(teams),
    () => generateStatLeaderQuestion(),
    () => generateJerseyNumberQuestion(),
    () => generateNicknameQuestion(),
    () => generateHistoricalMomentQuestion(),
    () => generateAwardQuestion(),
    () => generateTeamHistoryQuestion(),
    () => generateRecordQuestion(),
    () => generateWorldSeriesQuestion(),
    () => generateAllStarQuestion()
  ];

  for (let i = 0; i < count; i++) {
    try {
      const generator = generators[i % generators.length];
      const question = await generator();
      if (question) questions.push(question);
      else questions.push(getRandomHistoricalQuestion());
    } catch (e) {
      questions.push(getRandomHistoricalQuestion());
    }
  }

  return shuffleArray(questions);
}

async function generateWhoPlayedForQuestion(teams) {
  const team = teams[Math.floor(Math.random() * teams.length)];
  const roster = await getTeamRoster(team.id);
  if (roster.length < 4) return null;

  const player = roster[Math.floor(Math.random() * roster.length)];
  const wrongTeams = shuffleArray(teams.filter(t => t.id !== team.id)).slice(0, 3);

  return {
    question: `Who currently plays for the ${team.name}?`,
    options: shuffleArray([player.person.fullName, ...wrongTeams.map(t => getRandomPlayerName())]),
    correct: player.person.fullName
  };
}

async function generateStatLeaderQuestion() {
  const stats = [
    { key: 'homeRuns', label: 'home runs', year: 2024 },
    { key: 'battingAverage', label: 'batting average', year: 2024 },
    { key: 'stolenBases', label: 'stolen bases', year: 2024 },
    { key: 'rbi', label: 'RBIs', year: 2024 },
    { key: 'strikeouts', label: 'strikeouts (pitching)', year: 2024 },
    { key: 'wins', label: 'wins', year: 2024 },
    { key: 'era', label: 'lowest ERA', year: 2024 }
  ];

  const stat = stats[Math.floor(Math.random() * stats.length)];
  const leaders = await getLeagueLeaders(stat.key, stat.year);

  if (leaders.length >= 4) {
    const leader = leaders[0];
    const others = shuffleArray(leaders.slice(1, 10)).slice(0, 3);

    return {
      question: `Who led MLB in ${stat.label} in ${stat.year}?`,
      options: shuffleArray([leader.person.fullName, ...others.map(l => l.person.fullName)]),
      correct: leader.person.fullName
    };
  }
  return null;
}

function generateJerseyNumberQuestion() {
  const famous = [
    { player: 'Derek Jeter', number: '2', team: 'Yankees' },
    { player: 'Babe Ruth', number: '3', team: 'Yankees' },
    { player: 'Lou Gehrig', number: '4', team: 'Yankees' },
    { player: 'Jackie Robinson', number: '42', team: 'All MLB' },
    { player: 'Mariano Rivera', number: '42', team: 'Yankees' },
    { player: 'Ken Griffey Jr.', number: '24', team: 'Mariners' },
    { player: 'Mike Trout', number: '27', team: 'Angels' },
    { player: 'Shohei Ohtani', number: '17', team: 'Dodgers' },
    { player: 'Aaron Judge', number: '99', team: 'Yankees' },
    { player: 'Mookie Betts', number: '50', team: 'Dodgers' },
    { player: 'Ted Williams', number: '9', team: 'Red Sox' },
    { player: 'Cal Ripken Jr.', number: '8', team: 'Orioles' },
    { player: 'Hank Aaron', number: '44', team: 'Braves' },
    { player: 'Willie Mays', number: '24', team: 'Giants' },
    { player: 'Roberto Clemente', number: '21', team: 'Pirates' }
  ];

  const pick = famous[Math.floor(Math.random() * famous.length)];
  const wrongNumbers = shuffleArray(['7', '11', '13', '22', '33', '45', '51', '99', '3', '14'].filter(n => n !== pick.number)).slice(0, 3);

  return {
    question: `What number did ${pick.player} wear with the ${pick.team}?`,
    options: shuffleArray([pick.number, ...wrongNumbers]),
    correct: pick.number
  };
}

function generateNicknameQuestion() {
  const nicknames = [
    { nickname: 'The Kid', player: 'Ken Griffey Jr.' },
    { nickname: 'The Sultan of Swat', player: 'Babe Ruth' },
    { nickname: 'The Iron Horse', player: 'Lou Gehrig' },
    { nickname: 'The Say Hey Kid', player: 'Willie Mays' },
    { nickname: 'Mr. October', player: 'Reggie Jackson' },
    { nickname: 'The Big Unit', player: 'Randy Johnson' },
    { nickname: 'Big Papi', player: 'David Ortiz' },
    { nickname: 'The Hammer', player: 'Hank Aaron' },
    { nickname: 'The Wizard', player: 'Ozzie Smith' },
    { nickname: 'Charlie Hustle', player: 'Pete Rose' },
    { nickname: 'The Rocket', player: 'Roger Clemens' },
    { nickname: 'Shotime', player: 'Shohei Ohtani' },
    { nickname: 'Captain Clutch', player: 'Derek Jeter' },
    { nickname: 'The Sandman', player: 'Mariano Rivera' },
    { nickname: 'Trout', player: 'Mike Trout' }
  ];

  const pick = nicknames[Math.floor(Math.random() * nicknames.length)];
  const wrongPlayers = shuffleArray(nicknames.filter(n => n.player !== pick.player)).slice(0, 3).map(n => n.player);

  return {
    question: `Who is known as "${pick.nickname}"?`,
    options: shuffleArray([pick.player, ...wrongPlayers]),
    correct: pick.player
  };
}

function generateHistoricalMomentQuestion() {
  const moments = [
    { event: 'The Shot Heard Round the World (1951)', player: 'Bobby Thomson' },
    { event: 'broke the single-season HR record with 73', player: 'Barry Bonds' },
    { event: 'had a 56-game hitting streak', player: 'Joe DiMaggio' },
    { event: 'threw a perfect game in the World Series', player: 'Don Larsen' },
    { event: 'broke the color barrier in 1947', player: 'Jackie Robinson' },
    { event: 'hit "The Catch" in the 1954 World Series', player: 'Willie Mays' },
    { event: 'called his shot in the 1932 World Series', player: 'Babe Ruth' },
    { event: 'ended the Curse of the Bambino in 2004', player: 'David Ortiz' },
    { event: 'pitched 7 no-hitters', player: 'Nolan Ryan' },
    { event: 'hit 4 home runs in one World Series game', player: 'Reggie Jackson' }
  ];

  const pick = moments[Math.floor(Math.random() * moments.length)];
  const wrongPlayers = shuffleArray(moments.filter(m => m.player !== pick.player)).slice(0, 3).map(m => m.player);

  return {
    question: `Who ${pick.event}?`,
    options: shuffleArray([pick.player, ...wrongPlayers]),
    correct: pick.player
  };
}

function generateAwardQuestion() {
  const awards = [
    { question: 'Who has won the most MVP awards?', answer: 'Barry Bonds', wrong: ['Mike Trout', 'Mickey Mantle', 'Albert Pujols'] },
    { question: 'Who has won the most Cy Young awards?', answer: 'Roger Clemens', wrong: ['Randy Johnson', 'Greg Maddux', 'Clayton Kershaw'] },
    { question: 'Who was the 2024 AL MVP?', answer: 'Aaron Judge', wrong: ['Shohei Ohtani', 'Juan Soto', 'Bobby Witt Jr.'] },
    { question: 'Who was the 2024 NL MVP?', answer: 'Shohei Ohtani', wrong: ['Mookie Betts', 'Freddie Freeman', 'Francisco Lindor'] },
    { question: 'Who was the first unanimous MVP?', answer: 'Shohei Ohtani', wrong: ['Mike Trout', 'Bryce Harper', 'Ken Griffey Jr.'] },
    { question: 'Who has the most Gold Glove awards?', answer: 'Greg Maddux', wrong: ['Ozzie Smith', 'Roberto Clemente', 'Keith Hernandez'] },
    { question: 'Who was the first Rookie of the Year?', answer: 'Jackie Robinson', wrong: ['Willie Mays', 'Hank Aaron', 'Don Newcombe'] }
  ];

  const pick = awards[Math.floor(Math.random() * awards.length)];
  return {
    question: pick.question,
    options: shuffleArray([pick.answer, ...pick.wrong]),
    correct: pick.answer
  };
}

function generateTeamHistoryQuestion() {
  const questions = [
    { question: 'Which team has won the most World Series?', answer: 'New York Yankees', wrong: ['St. Louis Cardinals', 'Boston Red Sox', 'San Francisco Giants'] },
    { question: 'Which team moved from Montreal?', answer: 'Washington Nationals', wrong: ['Miami Marlins', 'Tampa Bay Rays', 'Toronto Blue Jays'] },
    { question: 'Which team plays at Wrigley Field?', answer: 'Chicago Cubs', wrong: ['Chicago White Sox', 'St. Louis Cardinals', 'Milwaukee Brewers'] },
    { question: 'Which team plays at Fenway Park?', answer: 'Boston Red Sox', wrong: ['New York Yankees', 'Baltimore Orioles', 'Toronto Blue Jays'] },
    { question: 'Which team did Babe Ruth play for before the Yankees?', answer: 'Boston Red Sox', wrong: ['Chicago White Sox', 'Detroit Tigers', 'Philadelphia Athletics'] },
    { question: 'Which team has the "Green Monster"?', answer: 'Boston Red Sox', wrong: ['Chicago Cubs', 'New York Yankees', 'Philadelphia Phillies'] },
    { question: 'Which team won the 2024 World Series?', answer: 'Los Angeles Dodgers', wrong: ['New York Yankees', 'San Diego Padres', 'Philadelphia Phillies'] },
    { question: 'Which team won the 2023 World Series?', answer: 'Texas Rangers', wrong: ['Arizona Diamondbacks', 'Houston Astros', 'Philadelphia Phillies'] }
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

function generateRecordQuestion() {
  const records = [
    { question: 'Who has the most career home runs?', answer: 'Barry Bonds (762)', wrong: ['Hank Aaron (755)', 'Babe Ruth (714)', 'Alex Rodriguez (696)'] },
    { question: 'Who has the most career hits?', answer: 'Pete Rose (4,256)', wrong: ['Ty Cobb (4,189)', 'Hank Aaron (3,771)', 'Stan Musial (3,630)'] },
    { question: 'Who has the most career strikeouts (pitching)?', answer: 'Nolan Ryan (5,714)', wrong: ['Randy Johnson (4,875)', 'Roger Clemens (4,672)', 'Steve Carlton (4,136)'] },
    { question: 'Who has the most career stolen bases?', answer: 'Rickey Henderson (1,406)', wrong: ['Lou Brock (938)', 'Billy Hamilton (912)', 'Ty Cobb (897)'] },
    { question: 'What is the longest hitting streak in MLB history?', answer: '56 games (Joe DiMaggio)', wrong: ['44 games (Pete Rose)', '61 games (no one)', '45 games (Wee Willie Keeler)'] },
    { question: 'Who holds the single-season HR record?', answer: 'Barry Bonds (73)', wrong: ['Mark McGwire (70)', 'Sammy Sosa (66)', 'Roger Maris (61)'] }
  ];

  return records[Math.floor(Math.random() * records.length)];
}

function generateWorldSeriesQuestion() {
  const questions = [
    { question: 'Who has the most World Series rings as a player?', answer: 'Yogi Berra (10)', wrong: ['Derek Jeter (5)', 'Joe DiMaggio (9)', 'Babe Ruth (7)'] },
    { question: 'Which team lost 4 straight World Series (1921-24)?', answer: 'New York Giants', wrong: ['Brooklyn Dodgers', 'Chicago Cubs', 'Boston Red Sox'] },
    { question: 'Who was the 2024 World Series MVP?', answer: 'Freddie Freeman', wrong: ['Mookie Betts', 'Shohei Ohtani', 'Walker Buehler'] },
    { question: 'Which team broke an 86-year drought in 2004?', answer: 'Boston Red Sox', wrong: ['Chicago Cubs', 'Cleveland Indians', 'Chicago White Sox'] },
    { question: 'Which team broke a 108-year drought in 2016?', answer: 'Chicago Cubs', wrong: ['Cleveland Indians', 'Boston Red Sox', 'Texas Rangers'] }
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

function generateAllStarQuestion() {
  const questions = [
    { question: 'Who has the most All-Star selections?', answer: 'Hank Aaron (25)', wrong: ['Willie Mays (24)', 'Stan Musial (24)', 'Cal Ripken Jr. (19)'] },
    { question: 'Where was the 2024 All-Star Game held?', answer: 'Arlington (Texas)', wrong: ['Los Angeles', 'Seattle', 'Philadelphia'] },
    { question: 'Who hit the longest All-Star Game home run (2022)?', answer: 'Juan Soto', wrong: ['Aaron Judge', 'Shohei Ohtani', 'Ronald Acuña Jr.'] }
  ];

  return questions[Math.floor(Math.random() * questions.length)];
}

function getRandomHistoricalQuestion() {
  const all = [
    ...Array(3).fill(0).map(() => generateNicknameQuestion()),
    ...Array(3).fill(0).map(() => generateJerseyNumberQuestion()),
    ...Array(2).fill(0).map(() => generateTeamHistoryQuestion()),
    ...Array(2).fill(0).map(() => generateRecordQuestion())
  ];
  return all[Math.floor(Math.random() * all.length)];
}

// ============ IMMACULATE GRID STYLE TIC TAC TOE ============

async function generateImmaculateGridCategories() {
  const teams = await getTeams();
  const teamPicks = shuffleArray(teams).slice(0, 4);

  const achievements = [
    'MVP Winner',
    'Cy Young Winner',
    'All-Star 2024',
    'World Series Champ',
    'Gold Glove Winner',
    'Silver Slugger',
    '30+ HR Season',
    '100+ RBI Season',
    '.300+ AVG Season',
    '200+ Hits Season',
    '20+ Win Season',
    '3000 Hit Club',
    '500 HR Club',
    'Rookie of Year'
  ];

  const achievementPicks = shuffleArray(achievements).slice(0, 3);

  // Create grid: 3 teams as rows, mix of teams + achievements as columns
  const rows = teamPicks.slice(0, 3).map(t => ({ type: 'team', value: t.teamName, id: t.id }));
  const cols = [
    { type: 'team', value: teamPicks[3].teamName, id: teamPicks[3].id },
    { type: 'achievement', value: achievementPicks[0] },
    { type: 'achievement', value: achievementPicks[1] }
  ];

  return { rows, cols };
}

// Players who played for multiple teams or have achievements
const MULTI_TEAM_PLAYERS = {
  'Yankees': ['Derek Jeter', 'Mariano Rivera', 'Aaron Judge', 'Giancarlo Stanton', 'Gerrit Cole', 'Anthony Rizzo', 'Juan Soto', 'Alex Rodriguez', 'CC Sabathia', 'Mark Teixeira'],
  'Red Sox': ['David Ortiz', 'Mookie Betts', 'Pedro Martinez', 'Curt Schilling', 'Johnny Damon', 'Adrian Gonzalez', 'Carl Crawford', 'Jacoby Ellsbury', 'Jon Lester'],
  'Dodgers': ['Mookie Betts', 'Freddie Freeman', 'Clayton Kershaw', 'Shohei Ohtani', 'Max Scherzer', 'Trea Turner', 'Manny Machado', 'Yu Darvish', 'Matt Kemp'],
  'Giants': ['Barry Bonds', 'Buster Posey', 'Madison Bumgarner', 'Willie Mays', 'Carlos Beltran', 'Hunter Pence', 'Jeff Kent', 'Blake Snell'],
  'Cubs': ['Anthony Rizzo', 'Kris Bryant', 'Javier Baez', 'Jon Lester', 'Sammy Sosa', 'Ryne Sandberg', 'Yu Darvish', 'Marcus Stroman'],
  'Cardinals': ['Albert Pujols', 'Yadier Molina', 'Nolan Arenado', 'Paul Goldschmidt', 'Mark McGwire', 'Matt Holliday', 'Jim Edmonds'],
  'Astros': ['Jose Altuve', 'Alex Bregman', 'Justin Verlander', 'Carlos Correa', 'George Springer', 'Gerrit Cole', 'Yordan Alvarez'],
  'Rangers': ['Corey Seager', 'Marcus Semien', 'Josh Hamilton', 'Adrian Beltre', 'Prince Fielder', 'Yu Darvish', 'Jacob deGrom'],
  'Braves': ['Ronald Acuña Jr.', 'Freddie Freeman', 'Chipper Jones', 'John Smoltz', 'Tom Glavine', 'Greg Maddux', 'Ozzie Albies'],
  'Mets': ['Jacob deGrom', 'Pete Alonso', 'Francisco Lindor', 'Max Scherzer', 'Justin Verlander', 'Carlos Beltran', 'David Wright'],
  'Phillies': ['Bryce Harper', 'Trea Turner', 'Kyle Schwarber', 'Cliff Lee', 'Roy Halladay', 'Jimmy Rollins', 'Chase Utley'],
  'Padres': ['Manny Machado', 'Fernando Tatis Jr.', 'Juan Soto', 'Yu Darvish', 'Blake Snell', 'Eric Hosmer'],
  'Mariners': ['Ken Griffey Jr.', 'Ichiro Suzuki', 'Felix Hernandez', 'Robinson Cano', 'Julio Rodriguez', 'Alex Rodriguez'],
  'Angels': ['Mike Trout', 'Shohei Ohtani', 'Albert Pujols', 'Anthony Rendon', 'Justin Upton', 'Jered Weaver'],
  'Tigers': ['Miguel Cabrera', 'Justin Verlander', 'Max Scherzer', 'Prince Fielder', 'J.D. Martinez', 'Victor Martinez'],
  'Twins': ['Joe Mauer', 'Byron Buxton', 'Carlos Correa', 'Josh Donaldson', 'Torii Hunter', 'Johan Santana'],
  'Guardians': ['Jose Ramirez', 'Francisco Lindor', 'Corey Kluber', 'Shane Bieber', 'Manny Ramirez', 'Jim Thome'],
  'Orioles': ['Cal Ripken Jr.', 'Manny Machado', 'Adam Jones', 'Gunnar Henderson', 'Adley Rutschman'],
  'Rays': ['Evan Longoria', 'Blake Snell', 'Chris Archer', 'David Price', 'Wander Franco', 'Randy Arozarena'],
  'Blue Jays': ['Vladimir Guerrero Jr.', 'Bo Bichette', 'Jose Bautista', 'Roy Halladay', 'Josh Donaldson', 'George Springer'],
  'Royals': ['Salvador Perez', 'George Brett', 'Eric Hosmer', 'Lorenzo Cain', 'Bobby Witt Jr.', 'Zack Greinke'],
  'White Sox': ['Frank Thomas', 'Tim Anderson', 'Jose Abreu', 'Chris Sale', 'Paul Konerko', 'A.J. Pierzynski'],
  'Athletics': ['Rickey Henderson', 'Reggie Jackson', 'Jose Canseco', 'Mark McGwire', 'Dennis Eckersley', 'Jason Giambi'],
  'Brewers': ['Christian Yelich', 'Prince Fielder', 'Ryan Braun', 'CC Sabathia', 'Corbin Burnes', 'Willy Adames'],
  'Pirates': ['Roberto Clemente', 'Barry Bonds', 'Andrew McCutchen', 'Gerrit Cole', 'Paul Skenes'],
  'Reds': ['Joey Votto', 'Ken Griffey Jr.', 'Barry Larkin', 'Johnny Bench', 'Aroldis Chapman'],
  'D-backs': ['Randy Johnson', 'Paul Goldschmidt', 'Zack Greinke', 'Ketel Marte', 'Corbin Carroll'],
  'Rockies': ['Todd Helton', 'Larry Walker', 'Nolan Arenado', 'Charlie Blackmon', 'Troy Tulowitzki'],
  'Marlins': ['Giancarlo Stanton', 'Miguel Cabrera', 'Josh Beckett', 'Jose Fernandez', 'Jazz Chisholm'],
  'Nationals': ['Juan Soto', 'Bryce Harper', 'Max Scherzer', 'Stephen Strasburg', 'Trea Turner']
};

const ACHIEVEMENT_PLAYERS = {
  'MVP Winner': ['Shohei Ohtani', 'Aaron Judge', 'Mookie Betts', 'Bryce Harper', 'Mike Trout', 'Ronald Acuña Jr.', 'Freddie Freeman', 'Corey Seager'],
  'Cy Young Winner': ['Justin Verlander', 'Max Scherzer', 'Clayton Kershaw', 'Jacob deGrom', 'Blake Snell', 'Corbin Burnes', 'Gerrit Cole'],
  'All-Star 2024': ['Aaron Judge', 'Shohei Ohtani', 'Mookie Betts', 'Freddie Freeman', 'Corey Seager', 'Juan Soto', 'Bryce Harper', 'Pete Alonso'],
  'World Series Champ': ['Freddie Freeman', 'Mookie Betts', 'Corey Seager', 'Justin Verlander', 'Jose Altuve', 'George Springer'],
  'Gold Glove Winner': ['Mookie Betts', 'Nolan Arenado', 'Matt Chapman', 'Andrelton Simmons', 'Kevin Kiermaier'],
  'Silver Slugger': ['Aaron Judge', 'Shohei Ohtani', 'Freddie Freeman', 'Mookie Betts', 'Ronald Acuña Jr.', 'Juan Soto'],
  '30+ HR Season': ['Aaron Judge', 'Shohei Ohtani', 'Pete Alonso', 'Kyle Schwarber', 'Matt Olson', 'Yordan Alvarez', 'Mookie Betts'],
  '100+ RBI Season': ['Freddie Freeman', 'Aaron Judge', 'Pete Alonso', 'Corey Seager', 'Yordan Alvarez', 'Matt Olson'],
  '.300+ AVG Season': ['Freddie Freeman', 'Luis Arraez', 'Mookie Betts', 'Bobby Witt Jr.', 'Steven Kwan'],
  '200+ Hits Season': ['Bobby Witt Jr.', 'Steven Kwan', 'Ichiro Suzuki', 'Derek Jeter'],
  '20+ Win Season': ['Justin Verlander', 'Max Scherzer', 'Clayton Kershaw', 'Zack Greinke'],
  '3000 Hit Club': ['Derek Jeter', 'Albert Pujols', 'Miguel Cabrera', 'Ichiro Suzuki', 'Alex Rodriguez'],
  '500 HR Club': ['Albert Pujols', 'Alex Rodriguez', 'David Ortiz', 'Miguel Cabrera'],
  'Rookie of Year': ['Shohei Ohtani', 'Aaron Judge', 'Corbin Carroll', 'Paul Skenes', 'Ronald Acuña Jr.', 'Pete Alonso']
};

function findMatchingPlayer(team, achievement) {
  const teamPlayers = MULTI_TEAM_PLAYERS[team] || [];
  const achievementPlayers = ACHIEVEMENT_PLAYERS[achievement] || [];

  const matches = teamPlayers.filter(p => achievementPlayers.includes(p));
  return matches.length > 0 ? matches : null;
}

function findCommonPlayer(team1, team2) {
  const players1 = MULTI_TEAM_PLAYERS[team1] || [];
  const players2 = MULTI_TEAM_PLAYERS[team2] || [];

  const common = players1.filter(p => players2.includes(p));
  return common.length > 0 ? common : null;
}

async function generateTicTacToeQuestion(category, rowCategory = null) {
  // For Immaculate Grid style - we just verify if the answer is correct
  // The question is implicit: "Name a player who fits both categories"
  return {
    question: `Name a player who played for the ${rowCategory?.value || category}${rowCategory ? ` AND ${category}` : ''}`,
    type: 'immaculate',
    row: rowCategory,
    col: category
  };
}

function validateImmaculateAnswer(answer, rowCat, colCat) {
  const answerLower = answer.toLowerCase().trim();

  let validPlayers = [];

  if (rowCat.type === 'team' && colCat.type === 'team') {
    validPlayers = findCommonPlayer(rowCat.value, colCat.value) || [];
  } else if (rowCat.type === 'team' && colCat.type === 'achievement') {
    validPlayers = findMatchingPlayer(rowCat.value, colCat.value) || [];
  } else if (rowCat.type === 'achievement' && colCat.type === 'team') {
    validPlayers = findMatchingPlayer(colCat.value, rowCat.value) || [];
  }

  return validPlayers.some(p => p.toLowerCase().includes(answerLower) || answerLower.includes(p.toLowerCase().split(' ').pop()));
}

// Legacy tic tac toe categories
async function generateTicTacToeCategories() {
  const teams = await getTeams();
  const teamCategories = shuffleArray(teams).slice(0, 5).map(t => t.teamName);

  const statCategories = [
    'MVP Winner',
    'Cy Young Winner',
    '30+ HR 2024',
    'All-Star 2024',
    'World Series Champ',
    'Gold Glove'
  ];

  return shuffleArray([...teamCategories, ...shuffleArray(statCategories).slice(0, 4)]).slice(0, 9);
}

// ============ PINPOINT CHALLENGE ============

async function generatePinpointRounds() {
  const rounds = [];
  const teams = await getTeams();

  // Round 1: Division teams
  const standings = await getStandings();
  if (standings.length > 0) {
    const division = standings[Math.floor(Math.random() * standings.length)];
    if (division.teamRecords) {
      rounds.push({
        type: 'division',
        title: `Name all 5 teams in the ${division.division?.name || 'AL East'}`,
        clue: 'Current MLB division alignment',
        answers: division.teamRecords.map(t => t.team.name),
        points: [100, 100, 100, 100, 100]
      });
    }
  }

  // Round 2: HR Leaders
  const hrLeaders = await getLeagueLeaders('homeRuns');
  if (hrLeaders.length >= 5) {
    rounds.push({
      type: 'leaders',
      title: 'Name the top 5 HR leaders from 2024',
      clue: 'Regular season home run leaders',
      answers: hrLeaders.slice(0, 5).map(l => l.person.fullName),
      points: [100, 80, 60, 40, 20]
    });
  }

  // Round 3: World Series winners
  rounds.push({
    type: 'world_series',
    title: 'Name the last 5 World Series winners',
    clue: '2024 → 2020',
    answers: ['Los Angeles Dodgers', 'Texas Rangers', 'Houston Astros', 'Houston Astros', 'Atlanta Braves', 'Los Angeles Dodgers'],
    points: [50, 50, 50, 50, 50]
  });

  // Round 4: Team roster
  const randomTeam = teams[Math.floor(Math.random() * teams.length)];
  const roster = await getTeamRoster(randomTeam.id);
  if (roster.length >= 5) {
    const players = roster.slice(0, 8);
    rounds.push({
      type: 'roster',
      title: `Name 5 current ${randomTeam.teamName} players`,
      clue: 'Active roster 2024-25',
      answers: players.map(p => p.person.fullName),
      points: [100, 100, 100, 100, 100]
    });
  }

  // Round 5: Career HR leaders
  rounds.push({
    type: 'career',
    title: 'Name the top 5 career home run leaders',
    clue: 'All-time MLB records',
    answers: ['Barry Bonds', 'Hank Aaron', 'Babe Ruth', 'Alex Rodriguez', 'Albert Pujols'],
    points: [100, 100, 100, 100, 100]
  });

  return rounds.slice(0, 5);
}

// Utility
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomPlayerName() {
  const names = ['John Smith', 'Mike Johnson', 'Chris Davis', 'Ryan Howard', 'Tom Brady', 'Mark Wilson'];
  return names[Math.floor(Math.random() * names.length)];
}

module.exports = {
  getTeams,
  getTeamRoster,
  getLeagueLeaders,
  getStandings,
  generateTriviaQuestions,
  generateTicTacToeCategories,
  generateTicTacToeQuestion,
  generateImmaculateGridCategories,
  validateImmaculateAnswer,
  generatePinpointRounds,
  getRandomHistoricalQuestion,
  MULTI_TEAM_PLAYERS,
  ACHIEVEMENT_PLAYERS
};
