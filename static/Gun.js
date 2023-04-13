//Globals for MACHINEGUN:
var lastFired = 0;




//Globals for LASERGUN
var pointer; //variable for mouse's location
var line1;
var graphics;
var laserLength; //length of the Laser
var laserX; //X coordinate for the end of the laser
var laserY; //Y coordinate for the end of the laser
var input; //mouse position for sprites
var point;
var graphics
var Slope;
var CheckY;
var CheckB;

export const Gun = {

    addGun(self, gunChoice) {
        console.log(gunChoice)

        if (gunChoice === 'lasergun') {
            //adds gun sprite-image
            self.gun = self.add.sprite(400, 300, 'lasergun');
            self.gun.setDepth(1);
        }
        if (gunChoice === 'machinegun') {
            self.gun = self.add.sprite(400, 300, 'machinegun');
            self.gun.setDepth(1);
        }
    },

    laserGun(self, gun, car, input) {
        //sets rotation of laser gun
        let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.x, input.y);
        gun.setRotation(angle);


        if (line1)
            graphics.destroy(line1);//deletes the line, so that they don't build up
        pointer = input.activePointer; //sets pointer to user's mouse
        laserLength = Math.sqrt((pointer.worldY - car.y) ** 2 + (pointer.worldX - car.x) ** 2);
        laserY = laserLength * (pointer.worldY - car.y);
        laserX = laserLength * (pointer.worldX - car.x);
        line1 = new Phaser.Geom.Line(car.x, car.y, laserX, laserY);
        graphics = self.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
        graphics.strokeLineShape(line1); //draws the line
        gun.x = car.x;
        gun.y = car.y;
        car.gunrotation = gun.rotation;

        Slope = ((pointer.worldY - car.y) / (pointer.worldX - car.x));
        CheckB = car.y - (Slope * car.x)
        //CheckY = ((Slope * point.x) + CheckB);

        // // Collision detection
        // const collisionThreshold = 25;
        // if (Math.abs(CheckY - point.y) < collisionThreshold) {
        //     console.log("Collision detected");
        // }


        // if (CheckY < point.y) {
        //     console.log("Laser above dot")
        // }

        // if (CheckY > point.y) {
        //     console.log("Laser below dot")
        // }
    },

    machineGun(self, gun, car, input, bullets, socket, time) {
        //sets rotation of gun
    let angle=Phaser.Math.Angle.Between(gun.x, gun.y, input.x, input.y);
    gun.setRotation(angle);

    //Make sure car has been instantiated correctly
    if (car) {

      gun.x = car.x;
      gun.y = car.y;
      car.gunrotation = gun.rotation;

    }
    
    // Shooting
    if (self.input.activePointer.isDown && time > lastFired) {
      let bullet = bullets.get(car.x, car.y)
      if (bullet) {
        bullet = self.matter.add.gameObject(bullet)

        //triggers collision code but doesn't actually collide
        //basically isTrigger from Unity
        bullet.setRectangle(20,20);
        bullet.body.label = "shootingBullet";
        bullet.setSensor(true);
        bullet.setRotation(angle);
        bullet.setDepth(-1);
        bullet.setActive(true);
        bullet.setVisible(true);
        //console.log(bullet);
        bullet.thrust(.03);
        lastFired = time + 200;

        socket.emit('gunFiring')
      }
    }
    }
}