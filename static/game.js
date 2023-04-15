import { Player } from "./Player.js"
import Lobby from "./Lobby.js"
import { Checkpoints } from "./Checkpoints.js"

var graphics
var line
var line2
var threshold
var threshold2
var istrue = true
var startspawn = 0

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
    this.moveCam = false
  }

  init(data) {
    this.playerName = data.playerName
    this.carStats = data.carStats
    //console.log(this.carStats)
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


    var self = this
    this.socket = io()

    

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
    this.wasd = this.input.keyboard.addKeys('W,S,A,D,SHIFT')
    
    //check list of players connected and identify us from other players
    this.socket.on('currentPlayers', function (players) {
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === self.socket.id) {
          //call to Player object to create car controlled by this client
          players[id].playerName = self.playerName
          //added in the position you are in lineup to this also added in socket to emit to update everyone else
          Player.addPlayer(self, players[id], players[id].numberconnected, self.socket)
          console.log(players[id].numberconnected)

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

    this.socket.on('healthChanged', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update health of other car
          Player.updateOtherPlayerHealth(playerInfo, otherPlayer);
        }
        //console.log(`Compare: ${playerInfo}, ${otherPlayer.playerId}`)
      })
    })


  }




  update(time, delta) {

    

   
    //dynamic camera 
    //TODO: add wasd to scroll

    const cam = this.cameras.main;

    if (this.moveCam) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        cam.scrollX -= 4
      }
      else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        cam.scrollX += 4
      }
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        cam.scrollY -= 4
      }
      else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        cam.scrollY += 4
      }
    }


    //Make sure car has been instantiated correctly
    if (this.car) {

      //check if car has passed lap line
      Checkpoints.detectLap(this.car);

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
  
      //prevent movement until all 8 players join
      if(this.otherPlayers.getChildren().length >= 7){
        Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
      }
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
        width: 7680,
        height: 7680
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