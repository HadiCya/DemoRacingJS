import { Player } from "./Player.js"
import { Checkpoints } from "./Checkpoints.js"
import { Gun } from "./Gun.js"
import Lobby, { musicVolume, effectsVolume } from "./Lobby.js"

var graphics
var line
var line2
var threshold
var threshold2
var istrue = true
var startspawn = 0

var poisongun;
var input; //mouse position for sprites
var circle;
var gameSong

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
    this.moveCam = false
  }

  init(data) {
    this.playerName = data.playerName
    this.gunSelection = data.gunSelection
    this.carStats = data.carStats
    //console.log(this.carStats)
  }

  //image preloads for car and gun
  preload() {
    this.load.image('car', 'static/assets/car.png')

    this.load.spritesheet('poisongun', 'static/assets/poisongun.png', {
      frameWidth: 30,
      frameHeight: 54,
      endframe: 9
    });
    this.load.image('circle', 'static/assets/circle.png')

    this.load.image('lasergun', 'static/assets/gun.png')
    this.load.image('machinegun', 'static/assets/machine_gun.png')//from machince gun
    this.load.image('gun', 'static/assets/gun.png')
    this.load.image('bullet', 'static/assets/machine_gun_bullet.png')

    this.load.audio('bang', 'static/assets/bang.wav')
    this.load.audio('laser', 'static/assets/laser.mp3');
    this.load.audio('stem', ['static/assets/Caustic_stem.mp3']);
    this.load.audio('gameTheme', 'static/assets/Issa.is.a.pizza.mp3')
    this.load.spritesheet('bulletAnimation', 'static/assets/machine_gun_animation.png', {
      frameWidth: 82,
      frameHeight: 34
    });

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.image('roadTiles', 'static/assets/track_tilemap_demo.png')
    this.load.image('checkpointTiles', 'static/assets/checkpoint-reference.png')
    this.load.image('tirewallImage', 'static/assets/tirewall.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/checkpointTest.json', 32, 32)
  }



  create() {
    const map = this.make.tilemap({ key: 'tilemap' })

    const tileset = map.addTilesetImage('roads2w', 'tiles')

    map.createLayer('Layer_1', tileset, 0, 0)

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
        Player.SetSpeed(0)
        this.car.setX(this.car.x - (20 * Math.cos(this.car.rotation)));
        this.car.setY(this.car.y - (20 * Math.sin(this.car.rotation)));
      }
      if ((bodyB.label === 'player') && (bodyA.label === 'barrier')) {
        Player.SetSpeed(0)
        this.car.setX(this.car.x - (20 * Math.cos(this.car.rotation)));
        this.car.setY(this.car.y - (20 * Math.sin(this.car.rotation)));
      }


    })

    this.bulletSound = this.sound.add('bang');
    //add laser sound
    this.laser = this.sound.add('laser');
    this.stem = this.sound.add('stem');

    gameSong = this.sound.add('gameTheme');
    gameSong.loop = true;
    gameSong.play();
    gameSong.setVolume(musicVolume);

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateOptions', { playerName: self.playerName, gunSelection: self.gunSelection })

    //array to store other players
    this.otherPlayers = this.add.group()
    console.log("this: ");
    console.log(this);

    console.log("other players: ");
    console.log(this.otherPlayers);

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

    // This function handles the client-side response from the server's 
    // syncGameState() funciton call
    // 
    // The function updates the position of each other player
    // and then sends back the client player's own position that 
    // the client has calculated
    this.socket.on('get-update', function (playerRecvObj, callback) {
      // newOPs stores the result of unpacking the data recieved from the server
      let newOPs = playerRecvObj.otherPlayers;

      // Check through each player in the otherPlayers stored locally
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (newOPs[otherPlayer.playerId]) { // if a player matching that id exists, then
          console.log(newOPs.length)
          // Update the position based on the new data 
          // the client received from the server
          Player.updateOtherPlayerMovement(newOPs[otherPlayer.playerId], otherPlayer);
        }
        //console.log(`Compare: ${playerInfo.playerId}, ${otherPlayer.playerId}`)
      })
      // Send the posiiton data for the client's player object
      // This is very similar to a return but for sockets
      callback({ x: self.car.x, y: self.car.y, rotation: self.car.rotation });
    })

    //bullet animation
    this.anims.create({
      key: 'animateBullet',
      frames: this.anims.generateFrameNumbers('bulletAnimation', {
        start: 0,
        end: 5
      }),
      frameRate: 30,
      repeat: 0
    });

    this.anims.create({
      key: 'poisongunActive',
      frames: this.anims.generateFrameNumbers('poisongun', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'poisongun',
      frames: this.anims.generateFrameNumbers('poisongun', { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1
    });

    this.socket.on('reportHit', function (playerInfo) {
      //console.log(playerInfo)
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
            otherPlayer.laserActive = true

            setTimeout(() => {
              otherPlayer.laserActive = false
            }, otherPlayer.laserDuration)
          }

          if (playerInfo.gunSelection == 'machinegun') {
            let bullet = self.bullets.get(0, 0)
            if (bullet) {
              bullet = self.matter.add.gameObject(bullet)

              //triggers collision code but doesn't actually collide
              //basically isTrigger from Unity
              bullet.setRectangle(20, 20);
              bullet.body.label = "shotBullet"; //shotBullet is bullet shot by another player. this avoids bullet deleting itself when hitting other car 
              bullet.body.shooterIdentifier = otherPlayer.playerId; //used to turn off bullet despawning when colliding with car that shot bullet
              bullet.setSensor(true);
              bullet.setRotation(otherPlayer.gun.rotation);
              bullet.setDepth(-1);
              bullet.setActive(true);
              bullet.setVisible(true);
              //console.log(bullet);
              bullet.thrust(.03);
              self.bulletSound.play();

              bullet.x = otherPlayer.x
              bullet.y = otherPlayer.y
              console.log(otherPlayer.x, otherPlayer.y)
            }
          }

          if (playerInfo.gunSelection == 'poisongun') {
            otherPlayer.poisonCircle.visible = true;

            //turn circle off after 5 seconds
            setTimeout(() => { otherPlayer.poisonCircle.visible = false }, 5000);
          }
        }
        //console.log(`Compare: ${playerInfo}, ${otherPlayer.playerId}`)
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


    });

    //listeners for guns which are objects that are active continiously
    this.matter.world.on('collisionactive', function (event) {
      event.pairs.forEach((pair) => {
        if (pair.bodyA.label == "otherPlayer" && pair.bodyB.label == "poisonArea") {
          Player.inflictDamage(self, self.socket, pair.bodyA.gameObject, 1)
        }

        if (pair.bodyB.label == "otherPlayer" && pair.bodyA.label == "poisonArea") {

          Player.inflictDamage(self, self.socket, pair.bodyB.gameObject, 1)
        }
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
      if (this.otherPlayers.getChildren().length >= 0) {
        Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
      }

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
  transparent: true,
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

var game = new Phaser.Game(config) //Keep this at the bottom of the file