import { Player } from "./Player.js"
import { Gun } from "./Gun.js"
import Lobby, { musicVolume, effectsVolume } from "./Lobby.js"
import { Checkpoints } from "./Checkpoints.js"
import CreditScene from "./CreditScene.js"


var gameSong


var graphics
var line
var line2
var threshold
var threshold2
var istrue = true
var startspawn = 0

var raceActive
var gameEnd = false //ends game once winner is determined

class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
    this.moveCam = false
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
    this.load.image('ferrari', 'static/assets/ferrari.png')
    this.load.image('scifi', 'static/assets/sci-fi-car.png')
    this.load.image('monsterTruck', 'static/assets/monster-truck.png')
    this.load.image('tank', 'static/assets/tank.png')

    this.load.spritesheet('poisongun', 'static/assets/poisongun.png', {
      frameWidth: 30,
      frameHeight: 54,
      endframe: 9
    });
    this.load.image('circle', 'static/assets/circle.png')

    this.load.image('lasergun', 'static/assets/ray_gun.png')
    this.load.image('machinegun', 'static/assets/machine_gun.png')//from machince gun
    this.load.image('rocketgun', 'static/assets/rocketLauncher.png')
    this.load.image('rocket', 'static/assets/rocket_trans.png')
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

    this.load.spritesheet('rocketAnimation', 'static/assets/rocket_animation.png', {
      frameWidth: 17,
      frameHeight: 80
    });

    this.load.spritesheet('explosion', 'static/assets/explosion-sheet.png', {
      frameWidth: 64,
      frameHeight: 64,
    })

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.image('roadTiles', 'static/assets/track_tilemap_demo.png')
    this.load.image('checkpointTiles', 'static/assets/checkpoint-reference.png')
    this.load.image('tirewallImage', 'static/assets/tirewall.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/checkpointTest.json', 32, 32)

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
        Player.setSpeed(0)
        this.car.setX(this.car.x - (20 * Math.cos(this.car.rotation)));
        this.car.setY(this.car.y - (20 * Math.sin(this.car.rotation)));
      }
      if ((bodyB.label === 'player') && (bodyA.label === 'barrier')) {
        Player.setSpeed(0)
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
    gameSong.setVolume(0);

    gameEnd = false
    raceActive = false

    //sends the enetered player name of this client to server so that it can be stored in array
    self.socket.emit('updateOptions', { playerName: self.playerName, gunSelection: self.gunSelection, carSelection: self.carStats.carSelection, health: self.carStats.maxHealth })

    //array to store other players
    this.otherPlayers = this.add.group()

    //input system for player control (CursorKeys is arrow keys)
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys('W,S,A,D,SHIFT,P')

    this.socket.on('raceStatus', function (isRaceActive) {
      raceActive = isRaceActive

      if (isRaceActive) {
        gameSong.setVolume(musicVolume)
      }
    })

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

    this.anims.create({
      key: 'explode',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 12 }),
      frameRate: 10,
      repeat: -1
    })

    //rocket animation
    this.anims.create({
      key: 'animateRocket',
      frames: this.anims.generateFrameNumbers('rocketAnimation', {start: 0, end: 8}),
      frameRate: 30,
      repeat: 5, // might effect how long its will be on screen, but not sure exaclty
      yoyo: true, //optional
      //hideOnComplete: true
    });


    this.socket.on('reportHit', function (playerInfo) {
      //console.log(playerInfo)
      if (self.socket.id === playerInfo.playerId) {
        if (self.car) {
          Player.updateHealth(self.car, playerInfo.health, self.socket)
        }
      } else {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
          if (playerInfo.playerId === otherPlayer.playerId) {
            Player.updateOtherHealth(playerInfo, otherPlayer)
          }
        })
      }
    })

    //start the race (trigger countdown and allow player to move)
    this.socket.on('raceStarted', function () {
      gameSong.setVolume(musicVolume)

      let countdown = self.add.text(self.car.x - 350, self.car.y - 100, 'Race Starting', { fontSize: 48 })

      //TODO: rewrite using time and delta in update
      countdown.setText(3)

      setTimeout(() => {
        countdown.setText(2)

        setTimeout(() => {
          countdown.setText(1)

          setTimeout(() => {
            countdown.setText('Go!')
            raceActive = true

            setTimeout(() => {
              countdown.destroy()
            }, 3000)
          }, 1000)
        }, 1000)
      }, 1000)

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
              bullet.setDepth(1);
              bullet.setActive(true);
              bullet.setVisible(true);
              //console.log(bullet);
              bullet.thrust(.04);
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

          if (playerInfo.gunSelection == 'rocketgun') {
            otherPlayer.gun.rocket = self.add.sprite(otherPlayer.x, otherPlayer.y, 'rocketAnimation');
            otherPlayer.gun.rocket.setDepth(2); //puts above cars
            otherPlayer.gun.rocket.play('animateRocket'); // starts animation
            console.log(otherPlayer.gun.rocket)
          }
        }
      })
    })

    this.socket.on('rocketMoved', function(movementInfo) {
      self.otherPlayers.getChildren().forEach((otherPlayer) => {
        if (otherPlayer.playerId == movementInfo.otherPlayerId && otherPlayer.gun.rocket) {
          otherPlayer.gun.rocket.x = movementInfo.x;
          otherPlayer.gun.rocket.y = movementInfo.y;
          otherPlayer.gun.rocket.rotation = movementInfo.rotation + Math.PI / 2
        }
      })
    })

    this.socket.on('rocketExpired', function(playerId) {

      self.otherPlayers.getChildren().forEach((otherPlayer) => {
        if ((otherPlayer.playerId == playerId) && otherPlayer.gun.rocket) {
          console.log(otherPlayer.gun.rocket)
          //TODO: actually delete the rocket
          otherPlayer.gun.rocket.visible = false
          otherPlayer.gun.rocket.active = false
          otherPlayer.gun.rocket = null
        }
      })
    })


    this.socket.on('winnerDeclared', function (playerName) {
      if (gameEnd == false) {
        gameSong.setVolume(0);
        console.log(self.car.position)

        self.winnerText = self.add.text(self.car.x, self.car.y, `${playerName} has won the race!`, { fontSize: 48 })
        console.log(self.winnerText)

        gameEnd = true

        setTimeout(() => {
          self.winnerText.destroy();
          self.socket.disconnect();
          self.scene.start('Lobby');
        }, 5000)
      }
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
      if ((bodyA.label != 'player' && bodyA.label != 'poisonArea' && bodyA.label != 'checkpoint') && (bodyB.label == 'shootingBullet')) {
        if (bodyA.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyA.gameObject, 1)
        }

        const rootBodyB = getRootBody(bodyB);
        rootBodyB.gameObject.destroy();
      }
      if ((bodyA.label == 'shootingBullet') && (bodyB.label != 'player' && bodyB.label != 'poisonArea' && bodyB.label != 'checkpoint')) {
        if (bodyB.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyB.gameObject, 1)
        }

        const rootBodyA = getRootBody(bodyA)
        rootBodyA.gameObject.destroy();
      }

      if ((bodyA.label != 'poisonArea' && bodyA.label != 'checkpoint') && (bodyB.label == 'shotBullet')) {
        //prevent despawn out of car shooting bullet
        if (!(bodyA.label == 'otherPlayer' && bodyB.shooterIdentifier === bodyA.gameObject.playerId)) {
          const rootBodyB = getRootBody(bodyB)
          rootBodyB.gameObject.destroy()
        }
      }

      if ((bodyA.label == 'shotBullet' && bodyB.label != 'poisonArea' && bodyB.label != 'checkpoint')) {
        //prevent despawn out of car shooting bullet
        if (!(bodyB.label == 'otherPlayer' && bodyA.shooterIdentifier === bodyB.gameObject.playerId)) {
          const rootBodyA = getRootBody(bodyA)
          rootBodyA.gameObject.destroy()
        }
      }

      if ((bodyA.label != 'player' && bodyA.label != 'poisonArea' && bodyA.label != 'checkpoint') && (bodyB.label == 'firingRocket')) {
        if (bodyA.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyA.gameObject, 5);
        }
       
        console.log(bodyB);

        self.socket.emit('rocketExpiring')

        const rootBodyB = getRootBody(bodyB)
        rootBodyB.gameObject.destroy()
        
      }

      if ((bodyA.label == 'firingRocket') && (bodyB.label != 'player' && bodyB.label != 'poisonArea' && bodyB.label != 'checkpoint')) {
        if (bodyB.label == 'otherPlayer') {
          Player.inflictDamage(self, self.socket, bodyB.gameObject, 5);
        }

        self.socket.emit('rocketExpiring')

        const rootBodyA = getRootBody(bodyA)
        rootBodyA.gameObject.destroy();
       
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

    if (this.winnerText && this.car && this.car.body) {
      this.winnerText.x = this.car.x - 350
      this.winnerText.y = this.car.y - 100
    }

        // //sets rotation of gun
    // let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.x, input.y);
    // gun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (this.car && this.car.body) {

      //force game to begin with less than 8 players if P is pressed
      if ((this.wasd.P.isDown || this.otherPlayers.getChildren().length >= 7) && raceActive == false) {
        this.socket.emit('startRace')
      }

      //check if car has passed lap line
      Checkpoints.detectLap(this.car, this.socket);


      this.input.activePointer.updateWorldPoint(cam)

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      if (raceActive) {
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

        if (this.gunSelection === 'rocketgun') {
          Gun.rocketGun(this, this.gun, this.car, this.input, this.socket, time);
        }

      }
    
    }
  
  }

}







var config = { //Keep this at the bottom of the file
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 1280,
  height: 720,
  transparent: true, // makes background the color set in index.html instead of black
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
      debug: false,
    }
  },
  dom: {
    createContainer: true
  },
  scene: [Lobby, CreditScene, gameScene]
}

var game = new Phaser.Game(config) //Keep this at the bottom of the file