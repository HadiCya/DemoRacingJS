import { Player } from "./Player.js"
import Lobby from "./Lobby.js"
import { Checkpoints } from "./Checkpoints.js"

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
    this.moveCam = false
  }

  init(data) {
    this.playerName = data.playerName
  }

  preload() {

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.image('roadTiles', 'static/assets/track_tilemap_demo.png')
    this.load.image('checkpointTiles', 'static/assets/checkpoint-reference.png')
    this.load.image('tirewallImage', 'static/assets/tirewall.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/checkpointTest.json', 32, 32)
    this.load.image('car', 'static/assets/car.png')
  }


  create() {

    //this.add.image(0,0,'base_tiles')

    //const map = this.make.tilemap({ key: 'tilemap' })

    //const tileset = map.addTilesetImage('roads2W', 'tiles')

    //var layer = map.createLayer('Layer_1', tileset, 0, 0)

    //this.add.image(20, 20, 'tirewallImage')

    var self = this
    this.socket = io()

    console.log(this.playerName)

    // layer.setCollisionByProperty({ checkpoint: true })

    // this.matter.world.convertTilemapLayer(layer)

    // layer.forEachTile((tile) => {
    //   if (tile.properties.checkpoint == true) {
    //     console.log(tile)
    //     tile.physics.matterBody.body.isSensor = true;
    //   }
    // })

    Checkpoints.initializeMap(self);

    this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
      //detect player passing checkpoint
      if ((bodyA.label === 'player' && bodyB.label === 'checkpoint')) {
        Checkpoints.incrementCheckpoint(self, this.car, bodyB.checkpointNumber);
      }

      if ((bodyB.label === 'player') && (bodyA.label === 'checkpoint')) {
        Checkpoints.incrementCheckpoint(self, this.car, bodyA.checkpointNumber);
      }

      //if car hits barrier, bounce car back. prevents car from getting stuck in barrier
      if ((bodyA.label === 'player') && (bodyB.label === 'barrier')) {
        this.car.setX(this.car.x - (20 * Math.cos(this.car.rotation)));
        this.car.setY(this.car.y - (20 * Math.sin(this.car.rotation)));
      }
      if ((bodyB.label === 'player') && (bodyA.label === 'barrier')) {
        this.car.setX(this.car.x - (20 * Math.cos(this.car.rotation)));
        this.car.setY(this.car.y - (20 * Math.sin(this.car.rotation)));
      }


    })

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateName', self.playerName);

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

    //dynamic camera 
    //TODO: add wasd to scroll

    const cam = this.cameras.main;

    if (this.moveCam) {
      if (this.cursors.left.isDown) {
        cam.scrollX -= 4
      }
      else if (this.cursors.right.isDown) {
        cam.scrollX += 4
      }
      if (this.cursors.up.isDown) {
        cam.scrollY -= 4
      }
      else if (this.cursors.down.isDown) {
        cam.scrollY += 4
      }
    }


    //Make sure car has been instantiated correctly
    if (this.car) {

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket)
    }

  }

  //checkpoint


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
        width: 7680,
        height: 4320
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