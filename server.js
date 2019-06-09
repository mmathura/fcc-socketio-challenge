'use strict';

const express     = require('express');
const session     = require('express-session');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const auth        = require('./app/auth.js');
const routes      = require('./app/routes.js');
const mongo       = require('mongodb').MongoClient;
const passport    = require('passport');
const cookieParser= require('cookie-parser')
const app         = express();
const http        = require('http').Server(app);
const sessionStore= new session.MemoryStore();

const io = require('socket.io')(http);
const cors = require('cors');
app.use(cors());
const passportSocketIo = require('passport.socketio');
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key:          'express.sid',
  secret:       process.env.SESSION_SECRET,
  store:        sessionStore
}));
// success:      onAuthorizeSuccess,  // *optional* callback on success
// fail:         onAuthorizeFail,     // *optional* callback on fail/error

fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: sessionStore,
}));

mongo.connect(process.env.DATABASE, { useNewUrlParser: true }, (err, client) => {
    if(err) console.log('Database error: ' + err);
    var db = client.db('test');
    auth(app, db);
    routes(app, db);
      
    http.listen(process.env.PORT || 3000);
  
    var currentUsers = 0;

    //start socket.io code 
  
    io.on('connection', socket => {
       ++currentUsers;
      // io.emit('user count', currentUsers);
      console.log('A user has connected');
      console.log('user ' + socket.request.user.name + ' connected');
      io.emit('user', {name: socket.request.user.name, currentUsers, connected: true});
      
      socket.on('chat message', (message) => {
        io.emit('chat message', {name: socket.request.user.name, message: message});
        console.log(message);
      }); 
      
      socket.on('disconnect', () => {
        --currentUsers;
        // io.emit('user count', currentUsers);
        io.emit('user', {name: socket.request.user.name, currentUsers, connected: false});
        console.log('The user has dissconnected');
      });
      
    });
  
    // socket.on('disconnect', () => { 
    //   /*anything you want to do on disconnect*/ 
    //   console.log("The user has disconnected");
    // });

    // io.on('disconnect', socket => {
    //   --currentUsers;
    //   // io.emit('user count', currentUsers);
    //   io.emit('user', currentUsers);
    //   console.log('The user has dissconnected');
    // });

    //end socket.io code

});
