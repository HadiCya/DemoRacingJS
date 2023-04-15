var menuSong;

export default class Lobby extends Phaser.Scene {

    constructor() {
        super('Lobby')
    }

    preload() {
        this.load.html('form', 'static/assets/input-form.html');
        this.load.image('car', 'static/assets/car.png');
        this.load.audio('menuTheme', 'static/assets/menuTheme.mp3');
    }

    create() {
        //reference html form
        menuSong = this.sound.add('menuTheme');
        menuSong.loop = true;
        menuSong.play();

        var element = this.add.dom(640, 360).createFromCache('form');

        element.addListener('click')

        //switch to next scene with entered player name once submit is clicked
        element.on('click', function (event) {

            if (event.target.name === 'connect') {
                //find textbox so that we can get it's value later
                var textInput = element.getChildByName('name')

                //remove click event since we are done with it
                element.removeListener('click');

                var enteredName = textInput.value
                
                this.scene.start('gameScene', {playerName: enteredName})
                menuSong.stop();
            }
        }, this)
    }

}