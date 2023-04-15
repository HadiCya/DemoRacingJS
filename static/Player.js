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
var connectedposition
var start = true
var maxHealth = 10

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

    //function to instantiate car of current player now also takes in the connected value so we know where you are in the lineup
    addPlayer(self, playerInfo, connected, socket) {

        this.setStats(self.carStats)

        //self.car = matter.add.existing(new Car(this, playerInfo))
        self.car = self.matter.add.image(playerInfo.x, playerInfo.y, 'car')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(50, 50)

        self.car.body.label = "player"
        self.label = self.add.text(playerInfo.x, playerInfo.y, self.playerName); //label displays name user enters in lobby

        //self.car.setCollideWorldBounds(true)
        self.car.setTint(playerInfo.color);
        //self.car.setDrag(1000)

        self.cameras.main.setBounds(0, 0, 7680, 8640);
        self.cameras.main.startFollow(self.car, true);
        self.cameras.main.setZoom(1);

        
        //gives us permantent access to which position in the lineup you are? i dont remember 100%
        connectedposition = connected
        
        //moves the car to their starting position
        self.car.setY(75*connectedposition + 100)
        
        //updates position on each of other clients
        socket.emit('playerMovement', {x: self.car.x, y: self.car.y, rotation: self.car.rotation})
        //updates your label for everything
        self.label.setPosition(self.car.x, self.car.y)
        
        
        //car.setY(car.y + (speed * Math.sin(car.angle * Math.PI / 180) * (delta / 10)))
        //label.y = car.y - labelOffsetY;
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

// changes the starting position of the car to just be down a bit, it has an added buffer because the cars will collide with anything
//in the intial spawn location so we need that to be empty, we could change this to a switch statement with specific locations 
//down the road if we want designated locations for where each car starts
        // if(start){
        //     car.setY(75*connectedposition +100)
        //     //console.log(connectedposition)
        // start = false
        // }

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
    updateOtherPlayerMovement(playerInfo, otherPlayer) {
        otherPlayer.setRotation(playerInfo.rotation)
        otherPlayer.setPosition(playerInfo.x, playerInfo.y)
        otherPlayer.label.setPosition(playerInfo.x - labelOffsetX, playerInfo.y - labelOffsetY)
    },

    //called once per frame in game.js update loop
    updateHealth(car, socket) {
        if (car.oldHealth && (car.health !== car.oldHealth)) {
            socket.emit('healthChange', car.health);
        }
        car.oldHealth = car.health;
    },

    updateOtherPlayerHealth(playerInfo, otherPlayer) {
        otherPlayer.health = playerInfo.health;
    },
    

    //decrement health of car by damage amount
    //will automatically be communicated over server
    takeDamage(car, damage) {
        car.health -= damage;
    },


}
