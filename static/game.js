import {
  Player
} from "./Player.js"
import Lobby from "./Lobby.js"

var pointer; //variable for mouse's location
var gun; //laser gun
var input; //mouse position for sprites
var targetX;
var targetY;

// Rocket Launcher Vars
// gun is Rocket Launcher
var rocket; // rocket that gets fired
var launched = false;
var launchedtime = 0; // the moment in time the rocket is launched
export var cooldown = 5000; //how long the rocket has to cooldown
var rocketDirection;

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
    this.load.image('gun', 'static/assets/rocketLauncher.png')
    this.load.image('rocket', 'static/assets/rocket_trans.png')
    this.load.spritesheet('rocketAnimation', 'static/assets/rocket_animation.png', {
      frameWidth: 17,
      frameHeight: 80
    });
  }

  create() {

    //connect to server
    this.socket = io()

    //define current scene
    var self = this

    //for mouse position
    input = this.input;

    console.log(this.playerName)

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

    this.matter.world.on('collisionstart', function (event, bodyA, bodyB) {
      if ((bodyA.label != 'player') && (bodyB.label == 'shootingRocket')) {
        console.log(bodyB);
        rocket.gameObject.destroy();
      }
      if ((bodyA.label == 'shootingRocket') && (bodyB.label != 'player')) {
        console.log(bodyA);
        rocket.destroy();
      }
    })

    //rocket animation
    this.anims.create({
      key: 'animateRocket',
      frames: this.anims.generateFrameNumbers('rocketAnimation', {
        start: 0,
        end: 8
      }),
      frameRate: 30,
      repeat: 5, // might effect how long its will be on screen, but not sure exaclty
      yoyo: true, //optional
      hideOnComplete: true
    });
  }

  update(time, delta) {
    //sets rotation of gun
    let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.x, input.y);
    gun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (this.car) {
      pointer = this.input.activePointer; //sets pointer to user's mouse
      gun.x = this.car.x;
      gun.y = this.car.y;
      this.car.gunrotation = gun.rotation;

      this.car.cooldownDisplay.setText(['Cooldown: ', String( Math.trunc(cooldown + (launchedtime - time))/1000 )]);

      if(cooldown + (launchedtime - time) < 0){
        this.car.cooldownDisplay.visible = false;
      }

      // checks if mouse has been clicked and the rocket is not already launched
      // checks for if the cooldown period has finished or if at the very beginging of the game
      // creates and launches the rocket
      if (this.input.activePointer.isDown && launched == false && (cooldown <= time - launchedtime || (time <= cooldown && launchedtime == 0))) {
        rocket = this.add.sprite(400, 300, 'rocketAnimation');
        rocket.setDepth(2); //puts above cars
        rocket.play('animateRocket'); // starts animation
        rocket.x = this.car.x; // sets starting x
        rocket.y = this.car.y; // sets starting y
        rocket = this.matter.add.gameObject(rocket);
        rocket.setSensor(true);
        rocket.label = 'firingRocket';

        launchedtime = time;
        launched = true;
        this.car.cooldownDisplay.visible = true;
        //testing stationary rocket animation
        // let rock = this.add.sprite(400, 300, 'rocketAnimation');
        // rock.setDepth(2);
        // rock.play('animateRocket'); // starts animation
      }

      if (launched == true) {
        rocket.play('animateRocket');
        targetX = pointer.worldX; //for opponent just replace pointer.worldX with oppponent.x
        targetY = pointer.worldY; //for opponent just replace pointer.worldY with oppponent.y

        //sets the angle the rocket needs inorder to face target
        rocketDirection = Phaser.Math.Angle.Between(rocket.x, rocket.y, input.x, input.y);
        rocket.setRotation(rocketDirection + Math.PI / 2);

        rocket.x = (time - launchedtime) * (pointer.worldX - rocket.x) / 4000 + rocket.x; //divided by 1000 to get seconds from miliseconds
        rocket.y = (time - launchedtime) * (pointer.worldY - rocket.y) / 4000 + rocket.y;

        var targetBuffer = 5; // checks if the rocket is within a 5px radius of the target
        if (targetX - targetBuffer <= rocket.x && rocket.x <= targetX + targetBuffer && targetY - targetBuffer <= rocket.y && rocket.y <= targetY + targetBuffer) {
          launched = false;
          rocket.destroy();
        }
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