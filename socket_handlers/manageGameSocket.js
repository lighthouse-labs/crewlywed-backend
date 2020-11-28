const { updateStartedAt, updateFinishedAt, getPlayerIDs, getNumRoundsPerPlayer, getQuestionIDs, getMostRecentRoundsID, createRoundsRows, insertRoundsRows } = require('../db/helpers/manageGame');

const manageGameSocket = (socket, db, io) => {

  socket.on('startGame', (userProfile) => {
    const gameRoom = userProfile.code;
    const gameID = userProfile.session_id;

    io.in(gameRoom).emit('startGameReturn');


    // Update the session's started_at field in the sessions table:
    updateStartedAt(gameID, db)
    .then(data => {
      console.log(`Started_at updated for session ${gameID}:`, data.rows[0]);
    });

    // Create rows for the session in the rounds table:
    getPlayerIDs(gameID, db)
      .then(data => {
        playerIDs = data.rows;
      getNumRoundsPerPlayer(gameID, db)
        .then(data => {
          numRounds = data.rows[0].rounds_per_player;
          numQuestions = (playerIDs.length * numRounds);
          io.in(gameRoom).emit('initialNumRounds', numQuestions);
          getQuestionIDs(numQuestions, db)
            .then(data => {
              questionIDs = data.rows;
              getMostRecentRoundsID(db)
              .then(data => {
                const mostRecentRoundsID = data.rows[0].id;
                const roundsRows = createRoundsRows(playerIDs, questionIDs, numRounds, mostRecentRoundsID, db);
                // Convert object to JSON to sent to DB:
                const JSONroundsRows = JSON.stringify(roundsRows);
                // Console.log's to make sure correct data was generated:
                console.log('roundsRows:', roundsRows);
                console.log('JSONroundsRows:', JSONroundsRows);
                // Insert data into DB:
                insertRoundsRows(JSONroundsRows, db);
                // Send roundsRows to FE to manage rounds state:
                io.in(gameRoom).emit('allRoundsData', roundsRows);
                })
            })
        })
    })


    // setTimeout to transition to end of game (this is a placeholder for now; will be updated later):
    // setTimeout(() => {
    //   io.in(gameRoom).emit('finalScore');
    //   updateFinishedAt(gameID, db)
    //   .then(data => {
    //     console.log(`Finished_at updated for session ${gameID}:`, data.rows[0]);
    //   });
    // }, 3000)


  });

};

module.exports = { manageGameSocket };
