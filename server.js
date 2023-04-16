const express = require('express')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')

const app = express()
var server = http.Server(app)

const interval = 15;


var io = socketIO(server, {
  pingTimeout: 60000,
})

app.set('port', 3000)
app.use('/static', express.static(__dirname + '/static'))

app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'))
})

server.listen(3000, function () {
  console.log('Starting server on port 3000')
})

var players = {}
var connected = 0
var amountplayers = 0
positionarray = [false, false, false, false, false, false, false, false]//the starting position array
var position = 9

io.on('connection', function (socket) {
  console.log('player [' + socket.id + '] connected')


  connected++
  //goes through and finds the first empty position
  for (let i = 0; i < 8; i++) {
    if (!positionarray[i]) {
      position = i
      positionarray[i] = true
      break
    }
    else { position = 8 }
  }
  amountplayers++

  //console.log(amountplayers)
  players[socket.id] = {
    rotation: 0,
    x: 30,
    y: 30,
    gunrotation: 0,
    gunSelection: 'machinegun',
    health: 10,
    playerId: socket.id,
    playerName: socket.id,
    color: getRandomColor(),
    numberconnected: position

  }

  socket.join(socket.id);

  //give new client list of players already in game
  socket.emit('currentPlayers', players)

  //only adds new player to other clients once the connecting client's options (playerName and gunSelection) have been updated correctly
  socket.on('updateOptions', function (options) {
    //store new playerName
    players[socket.id].playerName = options.playerName
    players[socket.id].gunSelection = options.gunSelection

    //tell clients already connected that a new player has joined
    socket.broadcast.emit('newPlayer', players[socket.id])
  })

  socket.on('disconnect', function () {
    console.log('player [' + socket.id + '] disconnected')
    var spot = (players[socket.id].numberconnected)//which position disconnected
    delete players[socket.id]
    //this emptys the position in the array
    io.emit('playerDisconnected', socket.id)
    positionarray[spot] = false
    amountplayers--
  })

  socket.on('hitOpponent', function (hitInfo) {
    players[hitInfo.playerId].health -= hitInfo.damage
    io.emit('reportHit', players[hitInfo.playerId])
  })
  
  socket.on('gunFiring', function() {
    socket.broadcast.emit('gunFired', players[socket.id])
  })


})

// Sets the interval for which we want to synchronize the game state 
// for each player
setInterval(syncGameState, interval);

// Gets a random color for the car when it connects
function getRandomColor() {
  return '0x' + Math.floor(Math.random() * 16777215).toString(16)
}

// This function synchronizes the status of each player with the server
//
// It first sends the target client an object containing the other players 
// in the server
//
// The server then expects a response from the player in the form of its 
// position and rotation
function syncGameState() {
  otherPlayers = {}

  // Access each player's id in the players object and ping them for an update
  Object.keys(players).forEach(function (id) {

    // This is the current player to be pinged (target player)
    let player = players[id];

    // Adds all the players to the otherPlayers object 
    // and then deletes target player
    let otherPlayers = Object.assign({}, players);
    delete otherPlayers[id];

    // This funciton call sends the data to the player and handles the value returned
    io.to(id).timeout(500).emit('get-update', { otherPlayers }, function (err, response) {
      if (err) {
        // If the ping returns an error, display an error notification to the console
        console.log(`Error: No response from player ${player.playerName}`);
      } else {
        // The response data is sent back as an array with 1 element
        // We need to unpack the response from the client in order to get the 
        // data from the client
        let movementData = response[0];

        // From here we individually assign the values for the 
        // x, y, and rotation for the player we just pinged
        players[id].x = movementData.x;
        players[id].y = movementData.y;
        players[id].rotation = movementData.rotation;
      }
    })
  })
}
