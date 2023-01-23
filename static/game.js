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
                    debug: true
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

function preload() {
  this.load.image('car', 'static/assets/car.png')
}

function create() {
  var self = this
  this.socket = io()
  this.otherPlayers = this.add.group() //fix

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
        
        //GET CURRENT POSITION AND ROTATION, AND LERP TOWARDS NEW ONE
      var timeDifference = new Date().getTime() - oldTime;
      // Percentage of time passed since update was received (I use 100ms gaps)
      var interPercent = (timeDifference) / 100;
      // Need to lerp between values provided in latest update and older one
      // var p = (new Vector3(playerInfo.x, playerInfo.y)).subtract(new Vector3(otherPlayer.position));

      // p = p.timesScalar(interPercent);

      // New position is the older lerped toward newer position where lerp 
      //percentage is the time passed 
      otherPlayer.position = lerp(new Vector3(playerInfo.x, playerInfo.y), new Vector3(otherPlayer.position));

      // Now update rotation in a smooth manner
      var rotationDifference = (playerInfo.rotation - otherPlayer.rotation);
      if (rotationDifference && rotationDifference != 0) {
          otherPlayer.rotation = (otherPlayer.rotation + (rotationDifference * interPercent));
      }
      oldTime = playerInfo.time;
      console.log(oldTime);
        // otherPlayer.setRotation(playerInfo.rotation)
        // otherPlayer.setPosition(playerInfo.x, playerInfo.y)
      }
    })
  })
}

function addPlayer(self, playerInfo) {
  self.car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(50, 50)

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
  otherPlayer.setTint(playerInfo.color)
  self.otherPlayers.add(otherPlayer)
}

function update() {
  // if (this.car) {
  //   if (this.cursors.left.isDown && (this.cursors.up.isDown || this.cursors.down.isDown)) {
  //     this.car.setAngularVelocity(-100)
  //   } else if (this.cursors.right.isDown && (this.cursors.up.isDown || this.cursors.down.isDown)) {
  //     this.car.setAngularVelocity(100)
  //   } else {
  //     this.car.setAngularVelocity(0)
  //   }

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
  if (this.car) {
    //accelerate car if below max speed
    if (speed < maxspeed) {
        if (this.cursors.up.isDown) {
            speed = speed + accel
        }
    }
    /*
    else {
        //car is at max speed
        speed = maxspeed
    }
    */
  
    //reverse car if below max speed (in reverse)
    if (speed > -maxspeed) {
        if (this.cursors.down.isDown) {
            speed = speed - accel
        }
    }
    /*
    else {
        //car is at max speed in reverse
        speed = -maxspeed
    }
    */
    
    //turn car left or right
    if (this.cursors.right.isDown) {
        this.car.angle += 3.0;
    }
    if (this.cursors.left.isDown) {
        this.car.angle -= 3.0;
    }
    this.car.setVelocity(speed * Math.cos(this.car.rotation), speed * Math.sin(this.car.rotation));
    this.car.setAngularVelocity(0);
  
      var x = this.car.x
      var y = this.car.y
      var r = this.car.rotation
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


