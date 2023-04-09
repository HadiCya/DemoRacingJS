const express = require('express')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')

const app = express()
var server = http.Server(app)
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
positionarray = [false, false, false, false, false, false, false, false]//the starting position array
var position = 9
io.on('connection', function (socket) {
  console.log('player [' + socket.id + '] connected')

  
connected++
//goes through and finds the first empty position
for (let i = 0; i < 8; i++) {
  if(!positionarray[i]){
    position = i 
    positionarray[i] = true
    break
  }
}
console.log(position)
  players[socket.id] = {
    rotation: 0,
    x: 30,
    y: 30,
    playerId: socket.id,
    playerName: socket.id,
    color: getRandomColor(),
    numberconnected: position
    
  }

  //give new client list of players already in game
  socket.emit('currentPlayers', players)

  //new client has updated their playerName
  socket.on('updateName', function (playerName) {
    //store new playerName
    players[socket.id].playerName = playerName

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
    
  })

  socket.on('playerMovement', function (movementData) {

    players[socket.id].x = movementData.x
    players[socket.id].y = movementData.y
    players[socket.id].rotation = movementData.rotation

    socket.broadcast.emit('playerMoved', players[socket.id])
  })

  socket.on('healthChange', function (health) {
    players[socket.id].health = health;

    socket.broadcast.emit('healthChanged', players[socket.id]);
  })
})

function getRandomColor() {
  return '0x' + Math.floor(Math.random() * 16777215).toString(16)
}
