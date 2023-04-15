import {Gun} from "./Gun.js"

var speed = 0.0;
var accel = 0.2;
var maxspeed = 10.0;
var handling = 2
var driftHandling = 3
var oversteer = 4

var decay = 0.05;
var oldTime = new Date().getTime();
var active = true

var maxHealth = 10

var isDriftStart = true
var labelOffsetX = -20
var labelOffsetY = -40


//Object stores functions which are called in game.js

export const Player = {

    //function to set stat variables based on selected car
    setStats(carStats) {
        maxspeed = carStats.maxspeed,
        accel = carStats.accel,
        handling = carStats.handling,
        driftHandling = carStats.driftHandling,
        oversteer = carStats.oversteer,
        decay = carStats.decay
        maxHealth = carStats.maxHealth
    },

    //function to instantiate car of current player
    addPlayer(self, playerInfo) {

        this.setStats(self.carStats)

        //self.car = matter.add.existing(new Car(this, playerInfo))
        self.car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(50, 50)

        self.car.health = maxHealth;


        self.car.body.label = "player"; //player's car's collsion box label;

        self.label = self.add.text(playerInfo.x, playerInfo.y, self.playerName); //text on the car
        self.car.healthDisplay = self.add.text(playerInfo.x, playerInfo.y, ["Health: " , playerInfo.health]); 

        Gun.addGun(self, self.gunSelection)


        //self.car.setCollideWorldBounds(true)
        self.car.setTint(playerInfo.color)
        //self.car.setDrag(1000)

    },


    //function to instantiate cars of other players
    addOtherPlayers(self, playerInfo) {
        const otherPlayer = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(50, 50)
            .setRotation(playerInfo.rotation)

        Gun.addOtherGun(self, otherPlayer, playerInfo.gunSelection)
       

        otherPlayer.playerId = playerInfo.playerId
        otherPlayer.body.label = "otherPlayer";

        otherPlayer.health = playerInfo.health
        otherPlayer.healthDisplay = self.add.text(playerInfo.x, playerInfo.y, ["Health: " , playerInfo.health]);


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

        car.healthDisplay.x = car.x - labelOffsetX;
        car.healthDisplay.y = car.y - labelOffsetY + 30;

        var x = car.x
        var y = car.y
        var r = car.rotation
        var gr = car.gunrotation

        if (car.oldPosition && (x !== car.oldPosition.x || y !== car.oldPosition.y || r !== car.oldPosition.rotation || gr !== car.oldPosition.gunrotation)) {
            socket.emit('playerMovement', { x: car.x, y: car.y, rotation: car.rotation, gunrotation: car.gunrotation })
            //console.log("moving")
        }

        car.oldPosition = {
            x: car.x,
            y: car.y,
            rotation: car.rotation,
            gunrotation: car.gunrotation
        }

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
            //console.log(speed)
            car.setX(car.x + (speed * Math.cos(car.angle*Math.PI/180) * (delta / 10)))
            car.setY(car.y + (speed * Math.sin(car.angle*Math.PI/180) * (delta / 10)))
            // console.log(speed)
        }



    },

    //update positions of other players. function is in Player object since labelOffset variables are here
    updateOtherPlayerMovement(self, playerInfo, otherPlayer) {
        otherPlayer.setRotation(playerInfo.rotation)
        otherPlayer.setPosition(playerInfo.x, playerInfo.y)
        otherPlayer.label.setPosition(playerInfo.x - labelOffsetX, playerInfo.y - labelOffsetY)
        otherPlayer.healthDisplay.setPosition(playerInfo.x - labelOffsetX, playerInfo.y - labelOffsetY + 30)
        otherPlayer.gun.setPosition(playerInfo.x, playerInfo.y)
        otherPlayer.gun.setRotation(playerInfo.gunrotation)
        

        if(otherPlayer.poisonCircle)
            otherPlayer.poisonCircle.setPosition(playerInfo.x, playerInfo.y)

        if(otherPlayer.laserActive) {
            if (otherPlayer.laserLine)
                otherPlayer.graphics.destroy(otherPlayer.laserLine)

            otherPlayer.graphics = self.add.graphics({ lineStyle: { width: 4, color: 0xff0000 } });
            otherPlayer.laserLine = new Phaser.Geom.Line(300, 300, 300, 300)
            Phaser.Geom.Line.SetToAngle(otherPlayer.laserLine, playerInfo.x, playerInfo.y, playerInfo.gunrotation, 3000)
            otherPlayer.graphics.strokeLineShape(otherPlayer.laserLine); //draws the line
        } else if (otherPlayer.laserLine){
            otherPlayer.graphics.destroy(otherPlayer.laserLine)
        }
        //let angle=Phaser.Math.Angle.Between(gun.x,gun.y,input.x,input.y);
        //self.gun.setRotation(angle);

    },


    inflictDamage(self, socket, otherPlayer, damage) {
        if (self.gunSelection == "poisongun" ) {
            console.log(self.poisonCircle.visible, self.damageLockout)

            if (self.poisonCircle.visible == true && self.damageLockout == false) {
                console.log("inflictDamage")
                socket.emit('hitOpponent', { playerId: otherPlayer.playerId, damage: damage });

                //after dealing damage, prevent further until lockout ends
                //setTimeout to allow for all players hit to get a chance to call inflictDamage()
                setTimeout(() => {self.damageLockout = true}, 0.1)

                //reset lockout so another tick of damage can be applied
                setTimeout(() => {
                    self.damageLockout = false
                }, 1000)
            }
        } 
        else {
            console.log("inflictDamage")
            socket.emit('hitOpponent', { playerId: otherPlayer.playerId, damage: damage });
        }
    },

    updateHealth(car, health) {
        console.log('updateHealth')
        car.health = health;
        car.healthDisplay.setText(['Health: ', String(health)])
    },
    
       // takeDamage(car, damage) {
    //     console.log(`takeDamage()`)
    //     if (!car.damageCooldown) {
    //         car.damageCooldown = true;
    //         car.health -= damage;
    //         console.log(car);
    //         setTimeout(() => {
    //             car.damageCooldown = false;
    //             console.log('Damage is recharged.');
    //         }, 10000);
    //     } else {
    //         console.log('Damage is on cooldown.');
    //     }
    //   }

    updateOtherHealth(playerInfo, otherPlayer) {
        console.log(playerInfo, otherPlayer)
        otherPlayer.health = playerInfo.health;
        otherPlayer.healthDisplay.setText(['Health: ', String(otherPlayer.health)])
    }
}
