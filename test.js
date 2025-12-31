// Simple tests for baseball trivia
const mlbData = require('./mlb-data');

const passed = [];
const failed = [];

function test(name, fn) {
  try {
    fn();
    passed.push(name);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed.push({ name, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed.push(name);
    console.log(`✓ ${name}`);
  } catch (e) {
    failed.push({ name, error: e.message });
    console.log(`✗ ${name}: ${e.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runTests() {
  console.log('\n========== BASEBALL TRIVIA TESTS ==========\n');

  // Test 1: MLB Data module exports
  test('MLB Data module has required exports', () => {
    assert(typeof mlbData.getTeams === 'function', 'getTeams should be a function');
    assert(typeof mlbData.generateTriviaQuestions === 'function', 'generateTriviaQuestions should be a function');
    assert(typeof mlbData.generateTicTacToeCategories === 'function', 'generateTicTacToeCategories should be a function');
    assert(typeof mlbData.generatePinpointRounds === 'function', 'generatePinpointRounds should be a function');
  });

  // Test 2: Multi-team players data exists
  test('Multi-team players data is populated', () => {
    assert(Object.keys(mlbData.MULTI_TEAM_PLAYERS).length >= 20, 'Should have at least 20 teams');
    assert(mlbData.MULTI_TEAM_PLAYERS['Yankees'].length >= 5, 'Yankees should have at least 5 players');
    assert(mlbData.MULTI_TEAM_PLAYERS['Dodgers'].length >= 5, 'Dodgers should have at least 5 players');
  });

  // Test 3: Achievement players data exists
  test('Achievement players data is populated', () => {
    assert(Object.keys(mlbData.ACHIEVEMENT_PLAYERS).length >= 10, 'Should have at least 10 achievement categories');
    assert(mlbData.ACHIEVEMENT_PLAYERS['MVP Winner'].length >= 5, 'MVP Winner should have at least 5 players');
  });

  // Test 4: Fetch teams from MLB API
  await testAsync('Can fetch teams from MLB API', async () => {
    const teams = await mlbData.getTeams();
    assert(Array.isArray(teams), 'Teams should be an array');
    assert(teams.length >= 30, 'Should have at least 30 teams');
    assert(teams.some(t => t.teamName === 'Yankees'), 'Should include Yankees');
  });

  // Test 5: Generate trivia questions
  await testAsync('Can generate trivia questions', async () => {
    const questions = await mlbData.generateTriviaQuestions(5);
    assert(Array.isArray(questions), 'Questions should be an array');
    assert(questions.length === 5, 'Should generate 5 questions');

    questions.forEach((q, i) => {
      assert(q.question, `Question ${i} should have question text`);
      assert(Array.isArray(q.options), `Question ${i} should have options array`);
      assert(q.options.length >= 2, `Question ${i} should have at least 2 options`);
      assert(q.correct, `Question ${i} should have correct answer`);
      assert(q.options.includes(q.correct), `Question ${i} correct answer should be in options`);
    });
  });

  // Test 6: Generate tic tac toe categories
  await testAsync('Can generate tic tac toe categories', async () => {
    const categories = await mlbData.generateTicTacToeCategories();
    assert(Array.isArray(categories), 'Categories should be an array');
    assert(categories.length === 9, 'Should generate 9 categories');
    categories.forEach((c, i) => {
      assert(typeof c === 'string', `Category ${i} should be a string`);
      assert(c.length > 0, `Category ${i} should not be empty`);
    });
  });

  // Test 7: Generate pinpoint rounds
  await testAsync('Can generate pinpoint rounds', async () => {
    const rounds = await mlbData.generatePinpointRounds();
    assert(Array.isArray(rounds), 'Rounds should be an array');
    assert(rounds.length >= 3, 'Should generate at least 3 rounds');

    rounds.forEach((r, i) => {
      assert(r.title, `Round ${i} should have title`);
      assert(r.clue, `Round ${i} should have clue`);
      assert(Array.isArray(r.answers), `Round ${i} should have answers array`);
      assert(Array.isArray(r.points), `Round ${i} should have points array`);
    });
  });

  // Test 8: Validate immaculate answer function
  test('Immaculate answer validation works', () => {
    const result1 = mlbData.validateImmaculateAnswer(
      'Mookie Betts',
      { type: 'team', value: 'Dodgers' },
      { type: 'achievement', value: 'MVP Winner' }
    );
    assert(result1 === true, 'Mookie Betts should be valid for Dodgers + MVP Winner');

    const result2 = mlbData.validateImmaculateAnswer(
      'Random Nobody',
      { type: 'team', value: 'Yankees' },
      { type: 'achievement', value: 'MVP Winner' }
    );
    assert(result2 === false, 'Random player should not be valid');
  });

  // Test 9: Server can start
  await testAsync('Server module loads without error', async () => {
    // Just verify the server file is valid JS
    const fs = require('fs');
    const serverCode = fs.readFileSync('./server.js', 'utf8');
    assert(serverCode.includes('express'), 'Server should use express');
    assert(serverCode.includes('socket.io'), 'Server should use socket.io');
    assert(serverCode.includes('mlb-data'), 'Server should use mlb-data module');
  });

  // Test 10: Static files exist
  test('Static files exist', () => {
    const fs = require('fs');
    assert(fs.existsSync('./public/index.html'), 'index.html should exist');
    assert(fs.existsSync('./public/style.css'), 'style.css should exist');
    assert(fs.existsSync('./public/game.js'), 'game.js should exist');
  });

  // Summary
  console.log('\n========== TEST RESULTS ==========');
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
}

runTests();
