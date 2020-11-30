const insertAnswer = function(userAnswerInfo, db) {
  const query = `
  INSERT INTO submissions (submitter_id, round_id, text)
  VALUES ($1, $2, $3)
  RETURNING id
  ;`;
  const params = [userAnswerInfo.userProfile.id, userAnswerInfo.round, userAnswerInfo.answer];
  return db.query(query, params)
};

const getAwaitAnswerData = function (gameID, roundID, db) {

  const query = `
    SELECT players.*, bool_and((SELECT COUNT(id)
      FROM submissions
      WHERE submitter_id = players.id
      AND round_id = $1) > 0) AS answered
    FROM players
    WHERE players.session_id = $2
    GROUP BY players.id
    ORDER BY players.id
  ;`;
  const params = [roundID, gameID];
  return db.query(query, params).then( (data) => {
    // console.log(data.rows);
    return data;
  });
};

// CREATE THIS FUNCTION:
const checkIfEveryoneHasSubmitted = function(roundID, gameID) {
  const query = `SELECT bool_and(answered) AS everyone_submitted FROM (
    SELECT players.*, bool_and((SELECT COUNT(id)
      FROM submissions
      WHERE submitter_id = players.id
      AND round_id = $1) > 0) AS answered
    FROM players
    WHERE players.session_id = $2
    GROUP BY players.id
    ORDER BY players.id
  ) AS answered;`;
  const params = [roundID, gameID];
  return db.query(query, params);
};

const getSubmissions = function(submissionInfo, db) {

  const query = `
  SELECT text, submissions.id, submitter_id
  FROM submissions
    JOIN players ON players.id = submissions.submitter_id
    JOIN sessions ON sessions.id = players.session_id
  WHERE round_id = $1
    AND sessions.id = $2;`;
  const params = [submissionInfo.round, submissionInfo.session];
  return db.query(query, params);
};

const insertChoice = function (choice, chooser, db) {
  const query = `
  INSERT INTO choices (submission_id, chooser_id)
  VALUES ($1, $2);`;
  const params = [choice, chooser];
  return db.query(query, params);
};

const getAwaitChoiceData = function (gameID, roundID, db) {
  const query = `
    SELECT players.*, bool_and((SELECT COUNT(choices.id)
      FROM choices
      JOIN submissions ON choices.submission_id = submissions.id
      WHERE chooser_id = players.id
      AND round_id = $1) > 0) AS answered
    FROM players
    WHERE players.session_id = $2
      AND players.id NOT IN (
        SELECT victim_id
        FROM rounds
        WHERE rounds.id = $1
      )
    GROUP BY players.id
    ORDER BY players.id;
  `;
  const params = [roundID, gameID];
  return db.query(query, params).then( (data) => {
    // console.log(data.rows);
    return data;
  });
};

// CREATE THIS FUNCTION:
const checkIfEveryoneHasChosen = function(roundID, gameID) {
  const query = `SELECT bool_and(chosen) AS everyone_chosen FROM (
    SELECT players.*, bool_and((SELECT COUNT(choices.id)
      FROM choices
      JOIN submissions ON choices.submission_id = submissions.id
      WHERE chooser_id = players.id
      AND round_id = $1) > 0) AS chosen
    FROM players
    WHERE players.session_id = $2
      AND players.id NOT IN (
        SELECT victim_id
        FROM rounds
        WHERE rounds.id = $1
      )
    GROUP BY players.id
  ) AS chosen;`;
  const params = [roundID, gameID];
  return db.query(query, params);
};

const getRevealData = function(roundID, db) {
  const query = `
    SELECT submissions.id as submission_id, text AS answer, players.username AS playerName, players.avatar_id AS avatarID,
    (SELECT json_agg(players_chose) FROM
      (SELECT username, avatar_id AS avatarID FROM players
      JOIN choices ON chooser_id = players.id
      WHERE submission_id = submissions.id)
      players_chose) as choosers,
    coalesce(bool_and((SELECT victim_id FROM rounds WHERE rounds.id = $1) = players.id), false) AS correct
    FROM submissions
    JOIN players ON players.id = submitter_id
    WHERE round_id = $1
    GROUP BY submissions.id, players.username, players.avatar_id, players.id
    ORDER BY correct DESC, players.id
  ;`;
  const params = [roundID];
  return db.query(query, params).then( (data) => {
    // console.log(data.rows);
    return data;
  });
};

const getScoreData = function (sessionID, db) {
  const query = `
  SELECT players.id, players.avatar_id, username, fool_count, correct_count, SUM((COALESCE(fooled.fool_count, 0) * 50) + (COALESCE(test.correct_count, 0) * 100)) as total FROM
  players
  LEFT JOIN ((
    SELECT players.id AS player_id, count(*) as correct_count
    FROM choices
       JOIN players ON players.id = choices.chooser_id
       JOIN submissions ON submissions.id = choices.submission_id
       JOIN rounds ON submissions.round_id = rounds.id
      WHERE submissions.submitter_id = rounds.victim_id
      GROUP BY players.id
  )) as test on players.id = test.player_id
    LEFT JOIN ((
      SELECT submitter_id, count(*) as fool_count
      FROM submissions
        JOIN choices on submissions.id = submission_id
        JOIN rounds on round_id = rounds.id
        WHERE submissions.submitter_id != rounds.victim_id
        GROUP BY submitter_id
    )) as fooled on players.id = fooled.submitter_id
  WHERE session_id = $1
  GROUP BY players.id, fool_count, correct_count
  ORDER BY total DESC;
  ;`;
  const params = [sessionID];
  return db.query(query, params);
};

module.exports = {insertAnswer, getAwaitAnswerData, checkIfEveryoneHasSubmitted, getSubmissions, insertChoice, getAwaitChoiceData, checkIfEveryoneHasChosen, getRevealData, getScoreData}
