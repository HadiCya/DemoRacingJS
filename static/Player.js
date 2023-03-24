var speed = 0.0;
var accel = 0.2;
var maxspeed = 10.0;
var handling = 2
var driftHandling = 3
var oversteer = 4

var decay = 0.05;
var oldTime = new Date().getTime();
var active = true
var isDriftStart = true
var labelOffsetX = -20
var labelOffsetY = -40


//Object stores functions which are called in game.js

export const Player = {

    //function to instantiate car of current player
    addPlayer(self, playerInfo) {

        //self.car = matter.add.existing(new Car(this, playerInfo))
        self.car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(50, 50)

        self.label = self.add.text(playerInfo.x, playerInfo.y, self.playerName);

        //self.car.setCollideWorldBounds(true)
        self.car.setTint(playerInfo.color)
        //self.car.setDrag(1000)

    },

    updateCarMovementWithDrift(car, cursors, wasd, delta) {

        if (wasd.SHIFT.isDown && (cursors.right.isDown || wasd.D.isDown || cursors.left.isDown || wasd.A.isDown)) {
            
            //get the direction youre facing when you start drifting
            if (isDriftStart) {
                //console.log(car.rotation)

                this.driftAngle = car.angle;
    
                isDriftStart = false
            }


            //console.log(this.driftAngle)

            //turn car left or right
            
            if (cursors.right.isDown || wasd.D.isDown) {
                car.angle += oversteer * (delta / 10)
                this.driftAngle = (this.driftAngle + driftHandling * (delta / 10)) % 360;
            }

            if (cursors.left.isDown || wasd.A.isDown) {
                car.angle -= oversteer * (delta / 10)
                this.driftAngle = (this.driftAngle - driftHandling  * (delta / 10)) % 360;
            }
        
            //console.log((this.driftAngle - car.angle) * 0.05)
            
           
            console.log(speed)
            car.setX(car.x + (speed * (Math.cos(this.driftAngle*Math.PI/180)))  * (delta / 10))
            car.setY(car.y + (speed * (Math.sin(this.driftAngle*Math.PI/180))) * (delta / 10))
             
        }
        else {
            isDriftStart = true

            //turn car left or right
            if (cursors.right.isDown || wasd.D.isDown) {
                car.angle += handling * (delta / 10);
            }
            if (cursors.left.isDown || wasd.A.isDown) {
                car.angle -= handling * (delta / 10);
            }

            //console.log(car.angle + 180)
            console.log(speed)
            car.setX(car.x + (speed * Math.cos(car.angle*Math.PI/180) * (delta / 10)))
            car.setY(car.y + (speed * Math.sin(car.angle*Math.PI/180) * (delta / 10)))
            // console.log(speed)
        }



    },

    //function to instantiate cars of other players
    addOtherPlayers(self, playerInfo) {
        const otherPlayer = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(50, 50)
            .setRotation(playerInfo.rotation)

        otherPlayer.playerId = playerInfo.playerId
        otherPlayer.label = self.add.text(playerInfo.x, playerInfo.y, playerInfo.playerName)
        otherPlayer.setTint(playerInfo.color)

        //add this car to array storing other players in game.js
        self.otherPlayers.add(otherPlayer)
    },


    //function to handle input and logic for moving the car this client controls. modify this function to modify driving behavior
    //all changes to movement variables (speed, accel, angle) are scaled by delta factor, which yields frame independent movement
    drive(car, label, cursors, delta, socket, wasd) {


        //accelerate car if below max speed
        if (speed < maxspeed) {
            if (cursors.up.isDown || wasd.W.isDown) {
                speed = speed + (accel * (delta / 10))
            }
        }


        else {
            //car is at max speed
            speed = maxspeed
        }


        //reverse car if below max speed (in reverse)
        if (speed > -maxspeed) {
            if (cursors.down.isDown || wasd.S.isDown) {
                speed = speed - (accel * (delta / 10))
            }
        }

        else {
            //car is at max speed in reverse
            speed = -maxspeed
        }

        if (speed > 0) {
            speed = speed - decay * (delta / 10)
        } 
        else {
            speed = speed + decay * (delta / 10)
        }


        //move car based on new speed and rotation 
        //delta factor makes movement frame rate independent
        //car.setX(car.x + (speed * Math.cos(car.rotation) * (delta / 10)))
        //car.setY(car.y + (speed * Math.sin(car.rotation) * (delta / 10)))
        
        this.updateCarMovementWithDrift(car, cursors, wasd, delta)

        car.setAngularVelocity(0);

        //update position of label. offset from car to position correctly 
        label.x = car.x - labelOffsetX;
        label.y = car.y - labelOffsetY;

        var x = car.x
        var y = car.y
        var r = car.rotation

        if (car.oldPosition && (x !== car.oldPosition.x || y !== car.oldPosition.y || r !== car.oldPosition.rotation)) {
            socket.emit('playerMovement', { x: car.x, y: car.y, rotation: car.rotation })
            //console.log("moving")
        }

        car.oldPosition = {
            x: car.x,
            y: car.y,
            rotation: car.rotation
        }

    },

    //update positions of other players. function is in Player object since labelOffset variables are here
    updateOtherPlayerMovement(playerInfo, otherPlayer) {
        otherPlayer.setRotation(playerInfo.rotation)
        otherPlayer.setPosition(playerInfo.x, playerInfo.y)
        otherPlayer.label.setPosition(playerInfo.x - labelOffsetX, playerInfo.y - labelOffsetY)
    },




}
