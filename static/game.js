import { Player } from "./Player.js"
import Lobby from "./Lobby.js"

var poisongun;
var input; //mouse position for sprites
var circle;
var circleActive = false;
var circleCooldown = false;


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
    this.load.image('poisongun', 'static/assets/posiongun.png')
    this.load.image('circle', 'static/assets/circle.png')
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
    poisongun = this.add.sprite(400, 300, 'poisongun');
    poisongun.setDepth(1);



    circle = this.matter.add.image(400, 300, 'circle');
      circle.setScale(9);
      circle.setBody({
        type: 'circle',
        radius: 100
    });
    circle.visible = false;
    circle.setSensor(true);
    circle.body.label = "poisonArea";

    let isCircleActive = false;
    let isCooldownActive = false;
    let cooldownTimer = null;

    function activateCircle() {
        console.log('activate');
        circle.visible = true;
        isCircleActive = true;
        setTimeout(endActiveTime, 5000); // 5 seconds active
    }

    function endActiveTime() {
        console.log('end active time');
        circle.visible = false;
        circle.setSensor(true);
        isCircleActive = false;
        isCooldownActive = true;
        cooldownTimer = setTimeout(endCooldown, 10000); // 10 seconds cooldown
    }

    function endCooldown() {
        console.log('end cooldown');
        isCooldownActive = false;
    }

    this.input.on('pointerdown', function (pointer) {
        if (!isCircleActive && !isCooldownActive) {
            activateCircle();
        } else if (isCircleActive) {
            // do nothing
        } else if (isCooldownActive) {
            // do nothing
        }
    });


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

      //console.log(bodyA, bodyB);

      if (bodyA.label == "player" && bodyB.label == "poisonArea") {
        console.log(bodyA.gameObject)
        Player.takeDamage(bodyA.gameObject, 1)
      }
      
      if (bodyB.label == "player" && bodyA.label == "poisonArea") {
        console.log('damage')
        Player.takeDamage(bodyB.gameObject, 1)
      }

     });

  }

   onLeftClickDown() {
    // Start the circle activation timer
    game.time.events.add(5000, activateCircle, this);
}

onLeftClickUp() {
    // If circle is still activating, cancel the activation timer
    if (game.time.events.pendingActivation == 1) {
        game.time.events.remove(activateCircle, this);
    }
}

 activateCircle() {
    circleActive = true;
    circleCooldown = true;
    // Start the circle cooldown timer
    game.time.events.add(10000, resetCircle, this);
}

 resetCircle() {
    circleActive = false;
    circleCooldown = false;
}



  update(time, delta) {

    //sets rotation of laser gun
    let angle = Phaser.Math.Angle.Between(poisongun.x, poisongun.y, input.x, input.y);
    poisongun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (this.car) {

      poisongun.x = this.car.x;
      poisongun.y = this.car.y;
      circle.x = this.car.x;
      circle.y = this.car.y;

      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()
      Player.drive(this.car, this.label, this.cursors, delta, this.socket)

      //damage example:
      //Player.takeDamage(this.car, 1);

      //Check health every frame (do not delete)
      Player.updateHealth(this.car, this.socket);
      //console.log(this.car.health);

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
