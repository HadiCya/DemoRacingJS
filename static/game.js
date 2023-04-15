import { Player } from "./Player.js"
import Lobby from "./Lobby.js"


var pointer; //variable for mouse's location
var line1;
var graphics;
var laserLength; //length of the Laser
var laserX; //X coordinate for the end of the laser
var laserY; //Y coordinate for the end of the laser
var gun;  //laser gun
var input; //mouse position for sprites
var point;
var graphics
var Slope;
var CheckY;
var CheckB;
var lKey;
var laser;

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
    this.load.audio('laser', 'static/assets/laser.mp3');
  }

  create() {

    //connect to server
    this.socket = io()

    //define current scene
    var self = this

    //for mouse position
    input = this.input;

    //add laser sound
    laser = this.sound.add('laser');

    // create a key to toggle the laser sprite
    lKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateName', self.playerName)

    //adds gun sprite-image
    gun = this.add.sprite(400, 300, 'gun');
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
      Player.addOtherPlayers(self, playerInfo);
    })

    //delete objects for other players when they disconnect
    this.socket.on('playerDisconnected', function (playerId) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
          otherPlayer.label.destroy();
          otherPlayer.gun.destroy();
        }
      })
    })

    //update car positions when other clients move their cars
    this.socket.on('playerMoved', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update position of other cars
          Player.updateOtherPlayerMovement(playerInfo, otherPlayer);
        }
        //console.log(`Compare: ${playerInfo.playerId}, ${otherPlayer.playerId}`)
      })
    })

    this.socket.on('healthChanged', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update health of other car
          Player.updateOtherPlayerHealth(playerInfo, otherPlayer);
        }
        console.log(`Compare: ${playerInfo}, ${otherPlayer.playerId}`)
      })
    })
  


    graphics = this.add.graphics({ fillStyle: { color: 0x2266aa } });

    point = new Phaser.Geom.Point(300, 575);
    graphics.fillPointShape(point, 10);

  }



  update(time, delta) {
    //sets rotation of laser gun
    let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.x, input.y);
    gun.setRotation(angle);
  
    //Make sure car has been instantiated correctly
    if (this.car) {
  
      // Set cooldown and duration values
      const cooldown = 5000; // in milliseconds
      const duration = 500; // in milliseconds
  
      if (!this.laserOnCooldown) {
        if (line1)
          graphics.destroy(line1); //deletes the line, so that they don't build up
        pointer = this.input.activePointer; //sets pointer to user's mouse
        laserLength = Math.sqrt((pointer.worldY - this.car.y) ** 2 + (pointer.worldX - this.car.x) ** 2);
        laserY = laserLength * (pointer.worldY - this.car.y);
        laserX = laserLength * (pointer.worldX - this.car.x);
        line1 = new Phaser.Geom.Line(this.car.x, this.car.y, laserX, laserY);
        graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xff0000 } });
  
        if (lKey.isDown && !this.laserOnCooldown && line1) {
          if (!graphics)
            graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xff0000 } });
          graphics.strokeLineShape(line1);
  
          // Move laser line every frame while it's active and the key is pressed
          this.time.addEvent({
            delay: 10, // in milliseconds
            loop: true,
            callback: () => {
              if (lKey.isDown && !this.laserOnCooldown) {
                pointer = this.input.activePointer;
                laserLength = Math.sqrt((pointer.worldY - this.car.y) ** 2 + (pointer.worldX - this.car.x) ** 2);
                laserY = laserLength * (pointer.worldY - this.car.y);
                laserX = laserLength * (pointer.worldX - this.car.x);
                line1.setTo(this.car.x, this.car.y, laserX, laserY);
                graphics.clear();
                graphics.strokeLineShape(line1);
              }
            }
          });
  
          // Play laser sound
          laser.play();
  
          // Turn off the laser after duration
          this.time.delayedCall(duration, () => {
            graphics.clear();
          });
  
          // Set laser on cooldown
          this.laserOnCooldown = true;
          this.time.delayedCall(cooldown, () => {
            this.laserOnCooldown = false;
          });
        } else {
          if (graphics)
            graphics.clear();
        }
  
        gun.x = this.car.x;
        gun.y = this.car.y;
        this.car.gunrotation = gun.rotation;
  
        Slope = ((pointer.worldY - this.car.y) / (pointer.worldX - this.car.x));
        CheckB = this.car.y - (Slope * this.car.x)
        CheckY = ((Slope * point.x) + CheckB);
  
        // Collision detection
        const collisionThreshold = 25;
        if (this.laserOnCooldown && lKey.isDown && Math.abs(CheckY - point.y) < collisionThreshold) {
          console.log("Collision detected");
        }
  
      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket)
  
      //damage example:
      //Player.takeDamage(this.car, 1);
  
      //Check health every frame (do not delete)
      Player.updateHealth(this.car, this.socket);
  
    }
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
