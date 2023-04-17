export var musicVolume = 0.1;
export var effectsVolume = 0.1;


export default class Lobby extends Phaser.Scene {
    constructor() {
        super('Lobby')
    }

    preload() {
        this.load.html('form', 'static/assets/input-form.html');
        this.load.audio('menuTheme', 'static/assets/menuTheme.mp3');
    }

    create() {

        //car choices (array of stats, each car is one entry)
        //order of entries matches index used to select car choice in click event
        var carChoices = [
            //All Rounder
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 1.5,
                driftHandling: 2.5,
                oversteer: 3.5,
                decay: 0.05,
                maxHealth: 15,
                carSelection: 'allRounder'
            },
            //High Top Speed
            {
                maxspeed: 13.0,
                accel: 0.2,
                handling: 1,
                driftHandling: 2,
                oversteer: 3,
                decay: 0.05,
                maxHealth: 8,
                carSelection: 'fast'
            },
            //High Acceleration
            {
                maxspeed: 8.0,
                accel: 0.5,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10,
                carSelection: 'accelerator'
            },
            //High Handling
            {
                maxspeed: 9.0,
                accel: 0.2,
                handling: 3,
                driftHandling: 4,
                oversteer: 5,
                decay: 0.05,
                maxHealth: 10,
                carSelection: 'nimble'
            },
            //High Health
            {
                maxspeed: 7.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 2.5,
                oversteer: 3.5,
                decay: 0.05,
                maxHealth: 20,
                carSelection: 'tank'
            },
        ]

        var menuSong = this.sound.add('menuTheme');

        menuSong.loop = true;
        menuSong.play();
        menuSong.setVolume(musicVolume);

        var carChoice = carChoices.at(0)
        var gunChoice = "lasergun"

        //reference html form
        var element = this.add.dom(640, 325).createFromCache('form');


        element.addListener('click')

        //switch to next scene with entered player name once submit is clicked
        element.on('click', function (event) {
            console.log(event.target.parentElement);

            //new Car was picked
            if (event.target.parentElement.id == 'car-choice') {
                //set car stats, determine which car from id of element clicked 
                carChoice = carChoices.at(Number(event.target.id))

                //reset color of previous elements
                for (let i = 0; i < event.target.parentElement.children.length; i++) {
                    event.target.parentElement.children[i].style.backgroundColor = "rgba(255, 255, 255, 0)"
                }

                //change color of this element to signal selection to user
                event.target.style.backgroundColor = "rgb(223, 55, 55)"
            }

            if (event.target.parentElement.id == 'gun-choice') {
                gunChoice = event.target.id

                //reset color of previous elements
                for (let i = 0; i < event.target.parentElement.children.length; i++) {
                    event.target.parentElement.children[i].style.backgroundColor = "rgba(255, 255, 255, 0)"
                }

                //change color of this element to signal selection to user
                event.target.style.backgroundColor = "rgb(223, 55, 55)"
            }

            if (event.target.id === 'connect') {
                //find textbox so that we can get it's value later
                var textInput = element.getChildByID('name')

                //remove click event since we are done with it
                element.removeListener('click');

                var enteredName = textInput.value

                menuSong.setVolume(0)
                this.scene.start('gameScene', { playerName: enteredName, carStats: carChoice, gunSelection: gunChoice })
            }

            if (event.target.id === 'credit') {
                

                //remove click event since we are done with it
                element.removeListener('click');

                
                menuSong.setVolume(0)
                this.scene.start('CreditScene',)
            }


        }, this)
    }

}