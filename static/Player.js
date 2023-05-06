
import { Gun, cooldown } from "./Gun.js"


var speed = 0.0;
var accel = 0.2;
var maxspeed = 10.0;
var handling = 2
var driftHandling = 3
var oversteer = 4

var decay = 0.05;
var oldTime = new Date().getTime();

var maxHealth = 10

var isDriftStart = true
var labelOffsetX = -20
var labelOffsetY = -40
var connectedposition
var start = true


//Object stores functions which are called in game.js

export const Player = {

    //function to set stat variables based on selected car
    setStats(carStats) {
        console.log(carStats)
        maxspeed = carStats.maxspeed;
        accel = carStats.accel;
        handling = carStats.handling;
        driftHandling = carStats.driftHandling;
        oversteer = carStats.oversteer;
        decay = carStats.decay;
        maxHealth = carStats.maxHealth;
        speed = 0;
        isDriftStart = true;
    },

    //create car model based on car selection
    createCar(self, playerInfo, carSelection) {
        let car;

        if (carSelection === 'allRounder') {
            car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(60, 40)
                .setRotation(playerInfo.rotation)
            car.setTint(0x9a4ce3);
        } else if (carSelection === 'fast') {
            car = self.matter.add.image(playerInfo.x, playerInfo.y, 'ferrari')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(70, 37)
                .setRotation(playerInfo.rotation)
        } else if (carSelection === 'accelerator') {
            car = self.matter.add.image(playerInfo.x, playerInfo.y, 'scifi')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(56, 40)
                .setRotation(playerInfo.rotation)
        } else if (carSelection === 'nimble') {
            car = self.matter.add.image(playerInfo.x, playerInfo.y, 'monsterTruck')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(50, 50)
                .setRotation(playerInfo.rotation)
        } else if (carSelection === 'tank') {
            car = self.matter.add.image(playerInfo.x, playerInfo.y, 'tank')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(90, 46)
                .setRotation(playerInfo.rotation)
        }

        return car
    },

    //function to instantiate car of current player now also takes in the connected value so we know where you are in the lineup
    addPlayer(self, playerInfo, connected, socket) {

        this.setStats(self.carStats)

        console.log(playerInfo)

        self.car = this.createCar(self, playerInfo, self.carStats.carSelection)

        self.car.health = maxHealth;

        self.car.disabled = false;

        self.car.body.label = "player"; //player's car's collsion box label;

        self.label = self.add.text(playerInfo.x, playerInfo.y, self.playerName); //text on the car
        self.car.healthDisplay = self.add.text(playerInfo.x, playerInfo.y, ["Health: ", self.car.health]);
        self.car.cooldownDisplay = self.add.text(playerInfo.x, playerInfo.y, ["Cooldown: ", cooldown]);
        self.car.cooldownDisplay.visible = false;


        self.car.explosion = self.add.sprite(playerInfo.x, playerInfo.y, 'explosion');
        self.car.explosion.visible = false;
        self.car.explosion.setDepth(2)


        self.cameras.main.setBounds(0, 0, 7680, 8640);
        self.cameras.main.startFollow(self.car, true);
        self.cameras.main.setZoom(1);


        //gives us permantent access to which position in the lineup you are? i dont remember 100%
        connectedposition = connected

        // //moves the car to their starting position
        // self.car.setY(1200)
        // self.car.setX(750)
        // self.car.setRotation(Math.PI / 2)

        switch (connectedposition) {
            case 0:
                self.car.setY(1200)
                self.car.setX(750)
                self.car.setRotation(Math.PI / 2)
                break;
            case 1:
                self.car.setY(1200)
                self.car.setX(875)
                self.car.setRotation(Math.PI / 2)
                break;
            case 2:
                self.car.setY(1125)
                self.car.setX(750)
                self.car.setRotation(Math.PI / 2)
                break;
            case 3:
                self.car.setY(1125)
                self.car.setX(875)
                self.car.setRotation(Math.PI / 2)
                break;
            case 4:
                self.car.setY(1050)
                self.car.setX(750)
                self.car.setRotation(Math.PI / 2)
                break;
            case 5:
                self.car.setY(1050)
                self.car.setX(875)
                self.car.setRotation(Math.PI / 2)
                break;
            case 6:
                self.car.setY(975)
                self.car.setX(750)
                self.car.setRotation(Math.PI / 2)
                break;
            case 7:
                self.car.setY(975)
                self.car.setX(875)
                self.car.setRotation(Math.PI / 2)
                break;
            default:
                self.car.setY(1200)
                self.car.setX(500)
                self.car.setRotation(Math.PI / 2)
        }

        Gun.addGun(self, self.gunSelection)

        //updates position on each of other clients
        socket.emit('playerMovement', { x: self.car.x, y: self.car.y, rotation: self.car.rotation })
        //updates your label for everything
        self.label.setPosition(self.car.x, self.car.y)

        //car.setY(car.y + (speed * Math.sin(car.angle * Math.PI / 180) * (delta / 10)))
        //label.y = car.y - labelOffsetY;
    },

    //function to instantiate cars of other players
    addOtherPlayers(self, playerInfo) {

        console.log(playerInfo)

        // const otherPlayer = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
        //     .setOrigin(0.5, 0.5)
        //     .setDisplaySize(50, 50)
        //     .setRotation(playerInfo.rotation)

        const otherPlayer = this.createCar(self, playerInfo, playerInfo.carSelection)

        Gun.addOtherGun(self, otherPlayer, playerInfo.gunSelection)

        otherPlayer.disabled = false

        otherPlayer.playerId = playerInfo.playerId
        otherPlayer.body.label = "otherPlayer";

        otherPlayer.health = playerInfo.health
        otherPlayer.healthDisplay = self.add.text(playerInfo.x, playerInfo.y, ["Health: ", playerInfo.health]);

        otherPlayer.explosion = self.add.sprite(playerInfo.x, playerInfo.y, 'explosion');
        otherPlayer.explosion.visible = false;
        otherPlayer.explosion.setDepth(2)

        otherPlayer.label = self.add.text(playerInfo.x, playerInfo.y, playerInfo.playerName)

        //add this car to array storing other players in game.js
        self.otherPlayers.add(otherPlayer)
    },


    //function to handle input and logic for moving the car this client controls. modify this function to modify driving behavior
    //all changes to movement variables (speed, accel, angle) are scaled by delta factor, which yields frame independent movement
    drive(car, label, cursors, delta, socket, wasd) {

        if (!car.disabled) {

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

        car.cooldownDisplay.x = car.x + 500
        car.cooldownDisplay.y = car.y - 300

        car.explosion.x = car.x
        car.explosion.y = car.y

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
                this.driftAngle = (this.driftAngle - driftHandling * (delta / 10)) % 360;
            }

            //console.log((this.driftAngle - car.angle) * 0.05)


            //console.log(speed)
            car.setX(car.x + (speed * (Math.cos(this.driftAngle * Math.PI / 180))) * (delta / 10))
            car.setY(car.y + (speed * (Math.sin(this.driftAngle * Math.PI / 180))) * (delta / 10))

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
            car.setX(car.x + (speed * Math.cos(car.angle * Math.PI / 180) * (delta / 10)))
            car.setY(car.y + (speed * Math.sin(car.angle * Math.PI / 180) * (delta / 10)))
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
        otherPlayer.explosion.x = playerInfo.x
        otherPlayer.explosion.y = playerInfo.y


        if (otherPlayer.poisonCircle)
            otherPlayer.poisonCircle.setPosition(playerInfo.x, playerInfo.y)

        if (otherPlayer.laserActive) {
            if (otherPlayer.laserLine)
                otherPlayer.graphics.destroy(otherPlayer.laserLine)

            otherPlayer.graphics = self.add.graphics({ lineStyle: { width: 4, color: 0xff0000 } });
            otherPlayer.laserLine = new Phaser.Geom.Line(300, 300, 300, 300)
            Phaser.Geom.Line.SetToAngle(otherPlayer.laserLine, playerInfo.x, playerInfo.y, playerInfo.gunrotation, 3000)
            otherPlayer.graphics.strokeLineShape(otherPlayer.laserLine); //draws the line
        } else if (otherPlayer.laserLine) {
            otherPlayer.graphics.destroy(otherPlayer.laserLine)
        }
        //let angle=Phaser.Math.Angle.Between(gun.x,gun.y,input.x,input.y);
        //self.gun.setRotation(angle);

    },


    inflictDamage(self, socket, otherPlayer, damage) {
        //console.log(otherPlayer)
        if (self.gunSelection == "poisongun") {
            //console.log(self.poisonCircle.visible, self.damageLockout)

            if (self.poisonCircle.visible == true && self.damageLockout == false) {
                console.log("inflictDamage")
                socket.emit('hitOpponent', { playerId: otherPlayer.playerId, damage: damage });

                //after dealing damage, prevent further until lockout ends
                //setTimeout to allow for all players hit to get a chance to call inflictDamage()
                setTimeout(() => { self.damageLockout = true }, 0.1)

                //reset lockout so another tick of damage can be applied
                setTimeout(() => {
                    self.damageLockout = false
                }, 1000)
            }
        }
        else if (!otherPlayer.disabled) {
            console.log("inflictDamage")
            socket.emit('hitOpponent', { playerId: otherPlayer.playerId, damage: damage });
        }
    },

    disable(car) {
        speed = 0.0;
        car.disabled = true;
        car.explosion.visible = true
        car.explosion.play('explode');

        console.log(car.explosion)


        setTimeout(() => {
            car.disabled = false;
            car.explosion.visible = false;
        }, 5000)

    },


    updateHealth(car, health, socket) {
        console.log('updateHealth')
        car.health = health;
        car.healthDisplay.setText(['Health: ', String(health)])

        if (car.health <= 0 && !car.disabled) {
            this.disable(car);
            setTimeout(() => {
                socket.emit('resetHealth', maxHealth)
            }, 5000)
        }
    },


    updateOtherHealth(playerInfo, otherPlayer) {
        console.log(playerInfo, otherPlayer)
        otherPlayer.health = playerInfo.health;
        otherPlayer.healthDisplay.setText(['Health: ', String(otherPlayer.health)])

        if (otherPlayer.health <= 0 && !otherPlayer.disabled) {
            this.disable(otherPlayer)
        }
    },


    setSpeed(newSpeed) {
        speed = newSpeed
    },
}
