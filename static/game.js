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
        width: 1280,
        height: 720
      },
      debug: true,
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
}

var game = new Phaser.Game(config)

var speed = 0.0;
var accel = 0.2;
var maxspeed = 10.0;
var decay = 0.05;
var oldTime = new Date().getTime();
var active = true

var labelOffsetX = -20
var labelOffsetY = -40

function preload() {
  this.load.image('car', 'static/assets/car.png')
}

var newvectors = new Vector3();

function create() {
  var self = this
  this.socket = io()
  this.otherPlayers = this.add.group()

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id])
      } else {
        addOtherPlayers(self, players[id])
      }
    })
  })

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo)
  })

  this.socket.on('playerDisconnected', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy()
      }
    })
  })

  this.cursors = this.input.keyboard.createCursorKeys()

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation)
        otherPlayer.setPosition(playerInfo.x, playerInfo.y)
        otherPlayer.label.setPosition(playerInfo.x - labelOffsetX, playerInfo.y - labelOffsetY)
    }

    })
  })
}



function addPlayer(self, playerInfo) {
  self.car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
  .setOrigin(0.5, 0.5)
  .setDisplaySize(50, 50)

  self.label = self.add.text(playerInfo.x, playerInfo.y, playerInfo.playerId);

  //self.car.setCollideWorldBounds(true)
  self.car.setTint(playerInfo.color)
  //self.car.setDrag(1000)
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50)
    .setRotation(playerInfo.rotation)

  otherPlayer.playerId = playerInfo.playerId
  otherPlayer.label = self.add.text(playerInfo.x, playerInfo.y, playerInfo.playerId)
  otherPlayer.setTint(playerInfo.color)
  self.otherPlayers.add(otherPlayer)
}

function update(time, delta) {
  // if (this.car) {
  //   if (this.cursors.left.isDown && (this.cursors.up.isDown || this.cursors.down.isDown)) {
  //     this.car.setAngularVelocity(-100)
  //   } else if (this.cursors.right.isDown && (this.cursors.up.isDown || this.cursors.down.isDown)) {
  //     this.car.setAngularVelocity(100)
  //   } else {
  //     this.car.setAngularVelocity(0)
  //   }
  //var temp = add.group();
  //   const velX = Math.cos((this.car.angle - 360) * 0.01745)
  //   const velY = Math.sin((this.car.angle - 360) * 0.01745)
  //   if (this.cursors.up.isDown) {
  //     this.car.setVelocityX(200 * velX)
  //     this.car.setVelocityY(200 * velY)
  //   } else if (this.cursors.down.isDown) {
  //     this.car.setVelocityX(-100 * velX)
  //     this.car.setVelocityY(-100 * velY)
  //   } else {
  //     //this.car.setAcceleration(0)
  //   }

  //   var x = this.car.x
  //   var y = this.car.y
  //   var r = this.car.rotation
  //   if (this.car.oldPosition && (x !== this.car.oldPosition.x || y !== this.car.oldPosition.y || r !== this.car.oldPosition.rotation)) {
  //     this.socket.emit('playerMovement', { x: this.car.x, y: this.car.y, rotation: this.car.rotation })
  //   }

  //   this.car.oldPosition = {
  //     x: this.car.x,
  //     y: this.car.y,
  //     rotation: this.car.rotation
  //   }
  // }
  console.log(delta)

  if (this.car) {

    /*
      all changes to movement variables (speed, accel, angle) 
      are scaled by delta factor which yields frame independent movement
    */

    //accelerate car if below max speed
    if (speed < maxspeed) {
      if (this.cursors.up.isDown) {
        speed = speed + (accel * (delta / 10))
      }
    }

    else {
      //car is at max speed
      speed = maxspeed
    }


    //reverse car if below max speed (in reverse)
    if (speed > -maxspeed) {
      if (this.cursors.down.isDown) {
        speed = speed - (accel * (delta / 10))
      }
    }

    else {
      //car is at max speed in reverse
      speed = -maxspeed
    }


    //turn car left or right
    if (this.cursors.right.isDown) {
      this.car.angle += 3.0 * (delta / 10);
    }
    if (this.cursors.left.isDown) {
      this.car.angle -= 3.0 * (delta / 10);
    }

    //move car based on new speed and rotation 
    //delta factor makes movement frame rate independent
    this.car.setX(this.car.x + (speed * Math.cos(this.car.rotation) * (delta / 10)))
    this.car.setY(this.car.y + (speed * Math.sin(this.car.rotation) * (delta / 10)))

    this.car.setAngularVelocity(0);

    var x = this.car.x
    var y = this.car.y
    var r = this.car.rotation
    
    //update position of label. offset from car to position correctly 
      this.label.x = x - labelOffsetX;
      this.label.y = y - labelOffsetY;
    
    if (this.car.oldPosition && (x !== this.car.oldPosition.x || y !== this.car.oldPosition.y || r !== this.car.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.car.x, y: this.car.y, rotation: this.car.rotation })
    }

    this.car.oldPosition = {
      x: this.car.x,
      y: this.car.y,
      rotation: this.car.rotation
    }

  }
}


