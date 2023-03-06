import {Player} from "./Player.js"
import Lobby from "./Lobby.js"

var pointer; //variable for mouse's location
var line1;
var graphics;
var laserLength; //length of the Laser
var laserX; //X coordinate for the end of the laser
var laserY; //Y coordinate for the end of the laser
var gun;  //laser gun
var input; //mouse position for sprites

class gameScene extends Phaser.Scene {

  constructor() {
    super('gameScene')
  }

  init(data) {
    this.playerName = data.playerName
  }

 //image preloads for car and gun
  preload() {
    this.load.image('car', 'static/assets/car.png')
    this.load.image('gun', 'static/assets/gun.png') 
  }

  create() {

    //connect to server
    this.socket = io()

    //define current scene
    var self = this

    //for mouse position
    input=this.input;

    console.log(this.playerName)

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateName', self.playerName)

    //adds gun sprite-image
    gun=this.add.sprite(400,300,'gun'); 
    gun.setDepth(1);
    
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

    //sets rotation of laser gun
    let angle=Phaser.Math.Angle.Between(gun.x,gun.y,input.x,input.y);
    gun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (this.car) {

      if (line1)
        graphics.destroy(line1);//deletes the line, so that they don't build up
      pointer = this.input.activePointer; //sets pointer to user's mouse
      laserLength = Math.sqrt((pointer.worldY - this.car.y)**2 + (pointer.worldX - this.car.x)**2);
      laserY = laserLength * (pointer.worldY - this.car.y);
      laserX = laserLength * (pointer.worldX - this.car.x);
      line1 = new Phaser.Geom.Line(this.car.x, this.car.y, laserX, laserY);
      graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
      graphics.strokeLineShape(line1); //draws the line
      gun.x = this.car.x;
      gun.y = this.car.y;
      

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket)
    }
  }

}

var config = { //Keep this at the bottom of the file
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

var game = new Phaser.Game(config) //Keep this at the bottom of the file
