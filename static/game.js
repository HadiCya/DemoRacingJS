import { Player } from "./Player.js"
import { Gun } from "./Gun.js"
import Lobby from "./Lobby.js"

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
    this.load.image('lasergun', 'static/assets/gun.png')
    this.load.image('machinegun', 'static/assets/gun.png')//from machince gun
    this.load.image('gun', 'static/assets/gun.png')
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

    this.socket = io()
    
    console.log(this.playerName)

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateOptions', {playerName: self.playerName, gunSelection: self.gunSelection})

    // //adds gun sprite-image
    // gun=this.add.sprite(400,300,'gun'); 
    // gun.setDepth(1);

    Gun.addGun(self, this.gunSelection)

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

    //multiplayer logic for shooting guns (show bullet on all clients)
    this.socket.on('gunFired', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          
          //Determine WHICH gun is being fired and then excecute corrseponding logic:


          if (playerInfo.gunSelection == 'lasergun') {

          }

          if (playerInfo.gunSelection == 'machinegun') {
            let bullet = self.bullets.get(0, 0)
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


    //Make sure car has been instantiated correctly
    if (this.car) {
      
      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
      
      if (this.gunSelection == 'lasergun') {
        Gun.laserGun(this, this.gun, this.car, this.input)
      }

      if (this.gunSelection == 'machinegun') {
        Gun.machineGun(this, this.gun, this.car, this.input, this.bullets, this.socket, time)
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
