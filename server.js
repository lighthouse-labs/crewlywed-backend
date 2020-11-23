// Load .env data into process.env:
require('dotenv').config();

// Web server config:
const PORT       = process.env.PORT || 8080;
const ENV        = process.env.ENV || "development";
const express    = require("express");
const bodyParser = require("body-parser");
const sass       = require("node-sass-middleware");
const app        = express();
const morgan     = require('morgan');
const server     = require('http').createServer(app);


// generate random code
const {generateRoomCode} = require('./helpers');


const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});


// PG database client/connection setup:
const { Pool } = require('pg');
const dbParams = require('./lib/db.js');
const db = new Pool(dbParams);
db.connect();


// See HTTP requests in terminal:
app.use(morgan('dev'));


//Establish socket.io connection & listen for events:
io.on('connection', socket => {
  console.log('user connected')

  //EXAMPLE of getting data from DB and sending it as JSON object to client, upon connection:
  db.query(`SELECT * FROM submissions;`)
    .then(data => {
      const submissions = data.rows;
      io.emit('getSubmissions', submissions);
    })

    // room code

    socket.on("join room", (room) => {
      socket.join(room);
      io.to(room).emit('show code', room);
    });

    socket.on('message', (messageData) => {
      io.to(messageData.room).emit('message', messageData);
    });
});


// Basic "Hello World" route to test this server is working:
app.get('/', (req, res) => {
  res.send("Hello world");
});


// RESTful route below. NOTE: We are probably using sockets in lieu of RESTful routes. But I am keeping the below for now (which could be used as a template for routes for other resources) until that decision is final.
const avatarsRoutes = require("./routes/avatars");
const { Socket } = require('socket.io');
app.use("/api/avatars", avatarsRoutes(db));


server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
