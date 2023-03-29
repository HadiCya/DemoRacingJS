import {Player} from "./Player.js"
import Lobby from "./Lobby.js"

var graphics
var line
var line2
var threshold
var threshold2
class gameScene extends Phaser.Scene {


  constructor() {
    super('gameScene')
  }

  init(data) {
    this.playerName = data.playerName
    this.carStats = data.carStats
    console.log(this.carStats)
  }

  preload() {

    this.load.image('tiles', 'static/assets/roads2w.png')
    this.load.tilemapTiledJSON('tilemap', 'static/assets/tilemap_new.json', 32, 32)
    this.load.image('car', 'static/assets/car.png')
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
    self.socket.emit('updateName', self.playerName)

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
          Player.updateOtherPlayerMovement(playerInfo, otherPlayer)
        }
      })
    })

    this.socket.on('healthChanged', function (playerInfo) {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          //call to Player object to update health of other car
          Player.updateOtherPlayerHealth(playerInfo, otherPlayer);
        }
        //console.log(`Compare: ${playerInfo}, ${otherPlayer.playerId}`)
      })
    })




//the width and colors of the line?
     graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
//the lines dimensions, x1, y1, x2, and y2
     line = new Phaser.Geom.Line(300, 300, 400, 300);

//makes the line
    graphics.strokeLineShape(line);
    

//calculates the length of the line
    threshold =Math.sqrt(((Math.abs(line.y1 - line.y2)) * (Math.abs(line.y1 - line.y2))) + ((Math.abs(line.x1 - line.x2)) * (Math.abs(line.x1 - line.x2))))

  

    //the lines dimensions, x1, y1, x2, and y2
         line2 = new Phaser.Geom.Line(100, 200, 300, 400);
    
    //makes the line
        graphics.strokeLineShape(line2);
        
        threshold2 =Math.sqrt(((Math.abs(line2.y1 - line2.y2)) * (Math.abs(line2.y1 - line2.y2))) + ((Math.abs(line2.x1 - line2.x2)) * (Math.abs(line2.x1 - line2.x2))))

      
  

  }

  


  update(time, delta) {

    
 
    //Make sure car has been instantiated correctly
    if (this.car) {
      //Drive according to logic in player object
      //function takes: car object, label object, input system, time delta, and socket object
      //objects passed in are all defined in create()


      const collisionThreshold = threshold/2 + 25; // 25 for half the car length, and threshold is calculated on creation, its the length of the line 
      const collisionThreshold2 = threshold2/2 + 25;
// checks if the car is withith the threshold from the center of the line
        if ((Math.abs((this.car.y)-((line.y1 + line.y2) / 2))<collisionThreshold) && (Math.abs((this.car.x)-((line.x1 + line.x2) / 2))<collisionThreshold)) {
        console.log("Collision detected");
      }


      if ((Math.abs((this.car.y)-((line2.y1 + line2.y2) / 2))<collisionThreshold2) && (Math.abs((this.car.x)-((line2.x1 + line2.x2) / 2))<collisionThreshold2)) {
        console.log("Collision detected");
      }


      
      Player.drive(this.car, this.label, this.cursors, delta, this.socket, this.wasd)
    }
    
  }

  

}



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
  dom: {
    createContainer: true
  },
  scene: [Lobby, gameScene]
}

var game = new Phaser.Game(config)