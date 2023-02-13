export default class Lobby extends Phaser.Scene {
    constructor() {
        super('Lobby')
    }

    preload() {
        this.load.html('form', 'static/assets/input-form.html');
        this.load.image('car', 'static/assets/car.png');
    }

    create() {
        var element = this.add.dom(640, 360).createFromCache('form');
        var switchScene = false

        element.addListener('click')

    

        element.on('click', function (event) {

            if (event.target.name === 'connect') {
                //find textbox so that we can get it's value later
                var textInput = element.getChildByName('name')

                //remove click event since we are done with it
                element.removeListener('click');

                var enteredName = textInput.value
                
                this.scene.start('gameScene', {playerName: enteredName})
            }
        }, this)
    }

}