import { Player } from "./Player.js"
import Lobby, { musicVolume, effectsVolume } from "./Lobby.js"

//Globals for MACHINEGUN:
var lastFired_mg = 0;

//Globals for POISONGUN:
var isCircleActive
var isCooldownActive

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
var collisionThreshold = 40;
export const cooldown = 5000; // in milliseconds
const duration = 500; // in milliseconds
var laserOnCooldown;
var laserColor = 0xff0000;
var lastFired_laser = 0;
var damageCooldown_laser = 0;

export const Gun = {

    addGun(self, gunChoice) {
        console.log(gunChoice)

        if (gunChoice === 'lasergun') {
            //adds gun sprite-image
            self.gun = self.add.sprite(self.car.x, self.car.y, 'lasergun');
            self.gun.setDepth(1);
        }

        if (gunChoice === 'machinegun') {
            self.gun = self.add.sprite(self.car.x, self.car.y, 'machinegun');
            self.gun.setDepth(1);
            //adds gun animation
            self.gun.muzzle = self.add.sprite(self.car.x, self.car.y, 'bulletAnimation');
            self.gun.muzzle.setDepth(2);
        }

        if (gunChoice === 'poisongun') {
            // //adds gun sprite-image
            self.gun = self.add.sprite(self.car.x, self.car.y, 'poisongun');
            self.gun.setDepth(1);

            self.poisonCircle = self.matter.add.image(self.car.x, self.car.y, 'circle')
            self.poisonCircle.setScale(9);
            self.poisonCircle.setBody({
                type: 'circle',
                radius: 100
            });


            self.poisonCircle.setSensor(true)
            self.poisonCircle.visible = false
            self.damageLockout = false
            self.poisonCircle.body.label = "poisonArea"
        }
    },

    addOtherGun(self, otherPlayer, gunChoice) {
        console.log(gunChoice)

        if (gunChoice === 'lasergun') {
            //adds gun sprite-image
            otherPlayer.gun = self.add.sprite(otherPlayer.x, otherPlayer.y, 'lasergun');
            otherPlayer.gun.setDepth(1);

            otherPlayer.laserLine = new Phaser.Geom.Line(otherPlayer.x, otherPlayer.y, 400, 300);
            otherPlayer.laserActive = false
            otherPlayer.laserDuration = duration
            otherPlayer.graphics = self.add.graphics({ lineStyle: { width: 4, color: laserColor } });
            // otherPlayer.graphics.strokeLineShape(otherPlayer.laserLine); //draws the line

        }

        if (gunChoice === 'machinegun') {
            otherPlayer.gun = self.add.sprite(otherPlayer.x, otherPlayer.y, 'machinegun');
            otherPlayer.gun.setDepth(1);
        }

        if (gunChoice === 'poisongun') {
            //  //adds gun sprite-image
            otherPlayer.gun = self.add.sprite(otherPlayer.x, otherPlayer.y, 'poisongun')
                .setDepth(1)

            otherPlayer.poisonCircle = self.add.sprite(otherPlayer.x, otherPlayer.y, 'circle')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(50, 50)

            otherPlayer.poisonCircle.setScale(9);
            otherPlayer.poisonCircle.visible = false;

            //otherPlayer.poisonCircle.body.label = "poisonArea"


        }
    },

    laserGun(self, gun, car, input, socket, time) {
        //sets rotation of laser gun
        let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.activePointer.worldX, input.activePointer.worldY);
        gun.setRotation(angle);

        gun.x = car.x;
        gun.y = car.y;
        car.gunrotation = gun.rotation;

        pointer = input.activePointer; //sets pointer to user's mouse

        car.cooldownDisplay.setText(['Cooldown: ', String((Math.trunc(cooldown + (lastFired_laser - time - 500))) / 1000)]);

        if (!laserOnCooldown) {
            if (line1)
                graphics.destroy(line1);//deletes the line, so that they don't build up

            laserLength = Math.sqrt((pointer.worldY - car.y) ** 2 + (pointer.worldX - car.x) ** 2);
            laserY = laserLength * (pointer.worldY - car.y);
            laserX = laserLength * (pointer.worldX - car.x);
            line1 = new Phaser.Geom.Line(car.x, car.y, laserX, laserY);
            graphics = self.add.graphics({ lineStyle: { width: 4, color: laserColor } });


            if (self.input.activePointer.isDown && !this.laserOnCooldown && line1) {
                if (!graphics)
                    graphics = this.add.graphics({ lineStyle: { width: 4, color: 0xff0000 } })

                graphics.strokeLineShape(line1);

                car.cooldownDisplay.visible = true;

                // Play laser sound
                self.laser.play();
                self.laser.setVolume(effectsVolume);

                socket.emit('gunFiring')

                self.time.delayedCall(duration, () => {
                    graphics.clear();
                });

                //set how long laser will be displayed for
                lastFired_laser = time + duration

                // Set laser on cooldown
                laserOnCooldown = true;
                self.time.delayedCall(cooldown, () => {
                    laserOnCooldown = false;
                    car.cooldownDisplay.visible = false;
                });
            } else {
                if (graphics)
                    graphics.clear();
            }
        }

        //display laser until duration ends
        if (time < lastFired_laser) {
            laserLength = Math.sqrt((pointer.worldY - car.y) ** 2 + (pointer.worldX - car.x) ** 2);
            laserY = laserLength * (pointer.worldY - car.y);
            laserX = laserLength * (pointer.worldX - car.x);
            line1.setTo(car.x, car.y, laserX, laserY);
            graphics.clear();
            graphics.strokeLineShape(line1);

            let Slope = ((pointer.worldY - car.y) / (pointer.worldX - car.x));

            let CheckB = car.y - (Slope * car.x)

            if (Math.abs(Slope) > 10) {
                Slope = 'undef'
            }


            if (time > damageCooldown_laser) {
                self.otherPlayers.getChildren().forEach((otherPlayer) => {
                    if (Slope === 'undef') {
                        if (Math.abs(otherPlayer.x - car.x) < collisionThreshold) {
                            Player.inflictDamage(self, socket, otherPlayer, 1)
                        }
                    }
                    else if (Math.abs(((Slope * otherPlayer.x) + CheckB) - otherPlayer.y) < collisionThreshold) {
                        Player.inflictDamage(self, socket, otherPlayer, 1)
                    }
                })
                damageCooldown_laser = time + 100
            }

        }

        let othersHit = []

    },


    machineGun(self, gun, car, input, bullets, socket, time) {
        //sets rotation of gun
        let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.activePointer.worldX, input.activePointer.worldY);
        gun.setRotation(angle);
        gun.muzzle.setRotation(angle);

        //Make sure car has been instantiated correctly
        if (car) {
            gun.x = car.x;
            gun.y = car.y;
            car.gunrotation = gun.rotation;


            self.gun.muzzle.x = car.x;
            self.gun.muzzle.y = car.y;
        }

        // Shooting
        if (self.input.activePointer.isDown && time > lastFired_mg) {
            let bullet = bullets.get(car.x, car.y)
            if (bullet) {
                bullet = self.matter.add.gameObject(bullet)

                //triggers collision code but doesn't actually collide
                //basically isTrigger from Unity
                bullet.setRectangle(20, 20);
                bullet.body.label = "shootingBullet";
                bullet.body.shooterIdentifier = socket.id; //used to turn off bullet despawning when colliding with car that shot bullet
                bullet.setSensor(true);
                bullet.setRotation(angle);
                bullet.setDepth(1);
                bullet.setActive(true);
                bullet.setVisible(true);
                //console.log(bullet);
                bullet.thrust(.03);

                self.bulletSound.play();
                self.bulletSound.setVolume(effectsVolume);
                self.gun.muzzle.play('animateBullet');

                lastFired_mg = time + 200;

                socket.emit('gunFiring');
            }
        }
    },

    poisongun(self, gun, poisonCircle, car, input, socket, time) {
        let angle = Phaser.Math.Angle.Between(gun.x, gun.y, input.activePointer.worldX, input.activePointer.worldY);
        gun.setRotation(angle + Math.PI / 2);

        //TODO: car.gunrotation

        car.cooldownDisplay.setText(['Cooldown: ', String((Math.trunc(10000 + (lastFired_laser - time))) / 1000)]);

        if (car) {
            gun.x = car.x;
            gun.y = car.y;
            poisonCircle.x = car.x;
            poisonCircle.y = car.y;
        }

        if (isCooldownActive && (10000 + (lastFired_laser - time)) < 0) {
            car.cooldownDisplay.visible = false;
        }
        //trigger poison area on click
        if (self.input.activePointer.isDown) {

            if (!isCooldownActive) {
                self.gun.stop();
                self.gun.play('poisongunActive');
                self.stem.play();
                self.stem.setVolume(effectsVolume);

                lastFired_laser = time;
                poisonCircle.visible = true;
                car.cooldownDisplay.visible = true;
                isCooldownActive = true;
                socket.emit('gunFiring')

                //turn circle off after 5 seconds
                setTimeout(() => {
                    poisonCircle.visible = false;
                    self.stem.stop();
                    self.gun.stop();
                    self.gun.play('poisongun');
                    //end cooldown after 10 seconds
                    setTimeout(() => {
                        isCooldownActive = false
                        car.cooldownDisplay.visible = false;
                    }, 5000);
                }, 5000); // 5 seconds active
            }
        }
    },


}

