import { Player } from "./Player.js"
import { Gun } from "./Gun.js"
import Lobby from "./Lobby.js"

var pointer; //variable for mouse's location
var line1;
var graphics;
var gun;  //laser gun
var input; //mouse position for sprites
var point;
var Slope;
var CheckY;
var CheckB;
var bullets;
var lastFired = 0;

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
  }

  init(data) {
    this.playerName = data.playerName
    this.gunChoice = "lasergun"
  }

  //image preloads for car and gun
  preload() {
    this.load.image('car', 'static/assets/car.png')
    this.load.image('lasergun', 'static/assets/gun.png')
    this.load.image('gun', 'static/assets/gun.png')//from machince gun
    this.load.image('bullet', 'static/assets/Bullet.png') 

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/tilemap_new.json', 32, 32)
  }


  create() {
   
    //this.add.image(0,0,'base_tiles')

    const map = this.make.tilemap({ key: 'tilemap' })

    const tileset = map.addTilesetImage('roads2w', 'tiles')

    map.createLayer('Layer_1', tileset, 0, 0)

    //this.add.image(0, 0, 'tiles')

    var self = this

    //for mouse position
    input = this.input;

    this.socket = io()
    
    console.log(this.playerName)

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateName', self.playerName)

    Gun.addGun(self, self.gunChoice)
    //adds gun sprite-image
    gun=this.add.sprite(400,300,'gun'); 
    gun.setDepth(1);

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
          otherPlayer.destroy()
          otherPlayer.label.destroy()
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

    this.socket.on('gunFired', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        console.log(otherPlayer)
        if (playerInfo.playerId === otherPlayer.playerId) {
          let bullet = bullets.get(0, 0)
          if (bullet) {
            bullet = self.matter.add.gameObject(bullet)

            //triggers collision code but doesn't actually collide
            //basically isTrigger from Unity
            bullet.setRectangle(20,20);
            bullet.body.label = "shotBullet"; //shotBullet is bullet shot by another player. this avoids bullet deleting itself when hitting other car 
            bullet.setSensor(true);
            bullet.setRotation(otherPlayer.gun.rotation);
            bullet.setDepth(-1);
            bullet.setActive(true);
            bullet.setVisible(true);
            //console.log(bullet);
            bullet.thrust(.03);
            
            bullet.x = otherPlayer.x 
            bullet.y = otherPlayer.y
            console.log(otherPlayer.x, otherPlayer.y)
            console.log(playerInfo.playerId)
          }
        }
      })
    })

    //helps destroy bullet sprite
    function getRootBody(body) {
      while (body.parent !== body) body = body.parent;
      return body;
    }
    // Create bullet group for machine gun
    bullets = this.add.group({
      defaultKey: 'bullet',
      maxSize: 1000
    });
    //collision detection for machine gun
    this.matter.world.on('collisionstart', function (event, bodyA, bodyB) {
      if ((bodyA.label != 'player') && (bodyB.label == 'shootingBullet')) {
        console.log(bodyB);
        const rootBodyB = getRootBody(bodyB);
        rootBodyB.gameObject.destroy();
      }
      if ((bodyA.label == 'shootingBullet') && (bodyB.label != 'player')) {
        console.log(bodyA)
        const rootBodyA = getRootBody(bodyA)
        rootBodyA.gameObject.destroy();
      }

      if ((bodyA.label != 'otherPlayer') && (bodyB.label == 'shotBullet')) {
        console.log(bodyA)
        const rootBodyB = getRootBody(bodyB)
        rootBodyB.gameObject.destroy();
      }

      if ((bodyA.label == 'shotBullet' && (bodyB.label != 'otherPlayer'))) {
        const rootBodyA = getRootBody(bodyA)
        rootBodyA.gameObject.destroy();
      }
      
     });
     
  }


  update(time, delta) {

    //sets rotation of gun
    let angle=Phaser.Math.Angle.Between(gun.x,gun.y,input.x,input.y);
    gun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (this.car) {

      
      pointer = this.input.activePointer; //sets pointer to user's mouse
      gun.x = this.car.x;
      gun.y = this.car.y;
      this.car.gunrotation = gun.rotation;
      
      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
      Gun.calculate(this, this.gun, this.car, this.input)

      //damage example:
      //Player.takeDamage(this.car, 1);

      //Check health every frame (do not delete)
      Player.updateHealth(this.car, this.socket);

    }
    
    // Shooting
    if (this.input.activePointer.isDown && time > lastFired) {
      let bullet = bullets.get(this.car.x, this.car.y)
      if (bullet) {
        bullet = this.matter.add.gameObject(bullet)

        //triggers collision code but doesn't actually collide
        //basically isTrigger from Unity
        bullet.setRectangle(20,20);
        bullet.body.label = "shootingBullet";
        bullet.setSensor(true);
        bullet.setRotation(angle);
        bullet.setDepth(-1);
        bullet.setActive(true);
        bullet.setVisible(true);
        //console.log(bullet);
        bullet.thrust(.03);
        lastFired = time + 200;

        this.socket.emit('gunFiring')
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
