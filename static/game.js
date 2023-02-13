import {Player} from "./Player.js"


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
  scene: {
    preload: preload,
    create: create,
    update: update
  }
}

var game = new Phaser.Game(config)


function preload() {
 

  this.load.image('base_tiles', 'assets/TestTrack.png')
  this.load.tilemapTiledJSON('tilemap','assets/TestTrack.json')
  


  this.load.image('car', 'static/assets/car.png')
}

function create() {


    const map = this.make.tilemap({key: 'tilemap', tileWidth: 64, tileHeight: 64})

    const tileset = map.addTilesetImage('Track','base_tiles')

    map.createStaticLayer('Tile_layer_1', tileset)




  var self = this
  this.socket = io()

  //define current scene
  var self = this

  //array to store other players
  this.otherPlayers = this.add.group()

  //input system for player control (CursorKeys is arrow keys)
  this.cursors = this.input.keyboard.createCursorKeys()

  //check list of players connected and identify us from other players
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        //call to Player object to create car controlled by this client
        Player.addPlayer(self, players[id])
      } else {
        //call to Player object to create other player's cars
        Player.addOtherPlayers(self, players[id])
      }
    })
  })

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



function update(time, delta) {

  //Make sure car has been instantiated correctly
  if (this.car) {

    //Drive according to logic in player object
    //function takes: car object, label object, input system, time delta, and socket object
    //objects passed in are all defined in create()
    Player.drive(this.car, this.label, this.cursors, delta, this.socket)
  }
}


