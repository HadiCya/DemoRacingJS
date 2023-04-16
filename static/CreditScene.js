export default class CreditScene extends Phaser.Scene {
    constructor() {
        super('CreditScene')
    }

    preload() {
        this.load.html('form2', 'static/assets/creditscene-form.html');
        this.load.image('car', 'static/assets/car.png');
        this.load.audio('Theme', 'static/assets/credit-theme.wav');
    }

    create() {

        let soundSample = this.sound.add('Theme')
        soundSample.play();
        console.log(soundSample.loop)
        soundSample.loop = true
        console.log(soundSample.loop)

        //car choices (array of stats, each car is one entry)
        //order of entries matches index used to select car choice in click event
        var carChoices = [
            //All Rounder
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10
            },
            //High Top Speed
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10
            },
            //High Acceleration
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10
            },
            //High Handling
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10
            },
            //High Health
            {
                maxspeed: 10.0,
                accel: 0.2,
                handling: 2,
                driftHandling: 3,
                oversteer: 4,
                decay: 0.05,
                maxHealth: 10
            },
        ] 

        var carChoice = carChoices.at(0)

        //reference html form
        var element = this.add.dom(640, 325).createFromCache('form2');
        

        element.addListener('click')

        //switch to next scene with entered player name once submit is clicked
        element.on('click', function (event) {
            console.log(event.target.parentElement);

            //new Car was picked
            if (event.target.id === 'back') {
                //find textbox so that we can get it's value later
                var textInput = element.getChildByID('name')

                //remove click event since we are done with it
                element.removeListener('click');

                var enteredName = textInput.value
                
                soundSample.stop();
                
                this.scene.start('Lobby', {playerName: enteredName, carStats: carChoice})
            }

            if (event.target.id === 'connect') {
                //find textbox so that we can get it's value later
                var textInput = element.getChildByID('name')

                //remove click event since we are done with it
                element.removeListener('click');

                var enteredName = textInput.value
                
                this.scene.start('Lobby', {playerName: enteredName, carStats: carChoice})
            }
        }, this)
    }

}