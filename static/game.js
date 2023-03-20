import {Player} from "./Player.js"
import Lobby from "./Lobby.js"

class gameScene extends Phaser.Scene {

  constructor() {
    super('gameScene')
  }

  init(data) {
    this.playerName = data.playerName
  }

  preload() {
 

    this.load.image('mapimage', 'static/assets/NewTestTrack.png')
    this.load.tilemapTiledJSON('tilemap','static/assets/map1.json', 32, 32)
  


    this.load.image('car', 'static/assets/car.png')
  }

  create() {
   
  //this.add.image(0,0,'base_tiles')

    const map = this.make.tilemap({key: 'tilemap'})

    const tileset = map.addTilesetImage('roads2W','mapimage')

    map.createLayer('Layer_1', tileset, 0, 0)

    this.add.image(0,0 ,'mapimage')

    var self = this
    this.socket = io()
    
    console.log(this.playerName)

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateName', self.playerName)

    //array to store other players
    this.otherPlayers = this.add.group()

    //input system for player control (CursorKeys is arrow keys)
    this.cursors = this.input.keyboard.createCursorKeys()

    //check list of players connected and identify us from other players
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === self.socket.id) {
          //call to Player object to create car controlled by this client
          players[id].playerName = self.playerName
          Player.addPlayer(self, players[id])
        } else {
          //call to Player object to create other player's cars
            Player.addOtherPlayers(self, players[id])
        }
      })
    })

    //render new player that has connected after this client
    this.socket.on('newPlayer', function (playerInfo) {
      Player.addOtherPlayers(self, playerInfo)
    })

    //delete objects for other players when they disconnect
    this.socket.on('playerDisconnected', function (playerId) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy()
          otherPlayer.label.destroy()
        }
      })
    })

    //update car positions when other clients move their cars
    this.socket.on('playerMoved', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update position of other cars
          Player.updateOtherPlayerMovement(playerInfo, otherPlayer)
        }
      })
    })

  }


  update(time, delta) {

    //Make sure car has been instantiated correctly
    if (this.car) {

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket)
    }
  }

}



var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 1280,
  height: 720,
  physics: {
    default: "matter",
    matter: {
      gravity: {
        y: 0
      },
      setBounds: {
        width: 1280,
        height: 720
      },
      debug: true,
    }
  },
  dom: {
    createContainer: true
  },
  scene: [Lobby, gameScene]
}

var game = new Phaser.Game(config)