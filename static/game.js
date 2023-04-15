import { Player } from "./Player.js"
import { Gun } from "./Gun.js"
import Lobby from "./Lobby.js"


var poisongun;
var input; //mouse position for sprites
var circle;

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
  }

  init(data) {
    this.playerName = data.playerName
    this.gunSelection = data.gunSelection
    this.carStats = data.carStats
    console.log(this.carStats)
  }

  //image preloads for car and gun
  preload() {
    this.load.image('car', 'static/assets/car.png')

    this.load.image('poisongun', 'static/assets/posiongun.png')
    this.load.image('circle', 'static/assets/circle.png')

    this.load.image('lasergun', 'static/assets/gun.png')
    this.load.image('machinegun', 'static/assets/gun.png')//from machince gun
    this.load.image('gun', 'static/assets/gun.png')
    this.load.image('bullet', 'static/assets/Bullet.png') 

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/tilemap_new.json', 32, 32)

  }


  create() {
    const map = this.make.tilemap({ key: 'tilemap' })

    const tileset = map.addTilesetImage('roads2w', 'tiles')

    map.createLayer('Layer_1', tileset, 0, 0)

    var self = this

    this.socket = io()
    
    console.log(this.playerName)

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateOptions', {playerName: self.playerName, gunSelection: self.gunSelection})

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
          otherPlayer.gun.destroy()
          otherPlayer.destroy()
          otherPlayer.label.destroy()
          otherPlayer.healthDisplay.destroy()

          if (otherPlayer.poisonCircle)
            otherPlayer.poisonCircle.destroy()

          if (otherPlayer.graphics)
            otherPlayer.graphics.destroy()
        }
      })
    })

    //update car positions when other clients move their cars
    this.socket.on('playerMoved', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update position of other cars
          Player.updateOtherPlayerMovement(self, playerInfo, otherPlayer);
        }
        //console.log(`Compare: ${playerInfo.playerId}, ${otherPlayer.playerId}`)
      })
    })

    this.socket.on('reportHit', function (playerInfo) {
      console.log(playerInfo)
      if (self.socket.id === playerInfo.playerId) {
        if (self.car) {
          Player.updateHealth(self.car, playerInfo.health)
        }
      } else {
          self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
               Player.updateOtherHealth(playerInfo, otherPlayer)
            }
          })
        }
      })

    //multiplayer logic for shooting guns (show bullet on all clients)
    this.socket.on('gunFired', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          
          //Determine WHICH gun is being fired and then excecute corrseponding logic:
          if (playerInfo.gunSelection == 'lasergun') {
            console.log("gunColor")
            otherPlayer.laserColor = 0x0303fc
            setTimeout(() => {
              otherPlayer.laserColor = 0xaa00aa
            }, 2000)
          }

          if (playerInfo.gunSelection == 'machinegun') {
            let bullet = self.bullets.get(0, 0)
            if (bullet) {
              bullet = self.matter.add.gameObject(bullet)

              //triggers collision code but doesn't actually collide
              //basically isTrigger from Unity
              bullet.setRectangle(20,20);
              bullet.body.label = "shotBullet"; //shotBullet is bullet shot by another player. this avoids bullet deleting itself when hitting other car 
              bullet.body.shooterIdentifier = otherPlayer.playerId; //used to turn off bullet despawning when colliding with car that shot bullet
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
        }
      })
    })

    //helps destroy bullet sprite
    function getRootBody(body) {
      while (body.parent !== body) body = body.parent;
      return body;
    }
    // Create bullet group for machine gun
    this.bullets = this.add.group({
      defaultKey: 'bullet',
      maxSize: 300
    });

    //collision detection for machine gun
    this.matter.world.on('collisionstart', function (event, bodyA, bodyB) {
      if ((bodyA.label != 'player' && bodyA.label != 'poisonArea') && (bodyB.label == 'shootingBullet')) {
        if (bodyA.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyA.gameObject, 1)
        }

        const rootBodyB = getRootBody(bodyB);
        rootBodyB.gameObject.destroy();
      }
      if ((bodyA.label == 'shootingBullet') && (bodyB.label != 'player' && bodyB.label != 'poisonArea')) {
        if (bodyB.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyB.gameObject, 1)
        }

        const rootBodyA = getRootBody(bodyA)
        rootBodyA.gameObject.destroy();
      }

      if ((bodyA.label != 'poisonArea') && (bodyB.label == 'shotBullet')) {
        //prevent despawn out of car shooting bullet
        if (!(bodyA.label == 'otherPlayer' && bodyB.shooterIdentifier === bodyA.gameObject.playerId)) {
          const rootBodyB = getRootBody(bodyB)
          rootBodyB.gameObject.destroy()
        } 
      }

      if ((bodyA.label == 'shotBullet' && bodyB.label != 'poisonArea')) {
        //prevent despawn out of car shooting bullet
        if (!(bodyB.label == 'otherPlayer' && bodyA.shooterIdentifier === bodyB.gameObject.playerId)) {
          const rootBodyA = getRootBody(bodyA)
          rootBodyA.gameObject.destroy()
        } 
      }

      if (bodyA.label == "otherPlayer" && bodyB.label == "poisonArea") {
        console.log(bodyA.gameObject)
        Player.inflictDamage(self, self.socket, bodyA.gameObject, 1)
      }

      if (bodyB.label == "otherPlayer" && bodyA.label == "poisonArea") {
        console.log('damage')
        console.log(bodyB.gameObject)

        Player.inflictDamage(self, self.socket, bodyB.gameObject, 1)
      }
      
     });
  }


  update(time, delta) {


    //Make sure car has been instantiated correctly
    if (this.car) {

      
      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
      
      if (this.gunSelection == 'lasergun') {
        Gun.laserGun(this, this.gun, this.car, this.input, this.socket, time)
      }

      if (this.gunSelection == 'machinegun') {
        Gun.machineGun(this, this.gun, this.car, this.input, this.bullets, this.socket, time)
      }

      if (this.gunSelection === 'poisongun') {
        Gun.poisongun(this, this.gun, this.poisonCircle, this.car, this.input, this.socket, time)
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
