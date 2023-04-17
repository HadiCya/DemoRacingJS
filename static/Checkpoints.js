let lastCheckpointPassed = 0;
let lapNumber = 0;

const checkpointsPerLap = 28;
const lapsPerRace = 1;

var graphics
var line
var threshold
var collisionThreshold


export const Checkpoints = {
    initializeMap(self) {
        //reset globals
        lastCheckpointPassed = 0;
        lapNumber = 0;

        //Create map from tileset
        self.map = self.make.tilemap({ key: 'tilemap' });
        self.roadTileset = self.map.addTilesetImage('track_tilemap_demo', 'roadTiles');
        self.barrierTileset = self.map.addTilesetImage('tirewall', 'tirewallImage');
        self.checkpointTileset = self.map.addTilesetImage('checkpoints', 'checkpointTiles');


        //defines layers
        self.roadLayer = self.map.createLayer('Road', self.roadTileset, 0, 0);
        self.checkpointLayer = self.map.createLayer('Checkpoints', self.checkpointTileset, 0, 0);
        self.barrierLayer = self.map.createLayer('Barrier', self.barrierTileset, 0, 0); //vertical offset of 25 to make it align idk

        //initialize barrier (tirewall)
        self.barrierLayer.setCollisionByProperty({ Barrier: true });
        self.matter.world.convertTilemapLayer(self.barrierLayer);
        self.barrierLayer.forEachTile((tile) => {
            if (tile.properties.Barrier == true) {
                tile.physics.matterBody.body.label = "barrier"
            }
        })

        //create checkpoints
        self.checkpointLayer.setCollisionByProperty({ Checkpoint: true });
        self.matter.world.convertTilemapLayer(self.checkpointLayer);

        //console.log(self.checkpointLayer)
        self.checkpointLayer.forEachTile((tile) => {
            if (tile.properties.Checkpoint == true) {
                tile.physics.matterBody.body.isSensor = true;
                tile.physics.matterBody.body.label = "checkpoint"
                tile.physics.matterBody.body.checkpointNumber = tile.properties.CheckpointNumber;
            }
        })

        graphics = self.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });

        //Lap Line, set position of the lap line here
        //Line parameters: (x1, y1, x2, y2)
        line = new Phaser.Geom.Line(1150, 650, 1150, 975);

        //draws the line
        graphics.strokeLineShape(line);

        //calculates the length of the line
        threshold = Math.sqrt(((Math.abs(line.y1 - line.y2)) * (Math.abs(line.y1 - line.y2))) + ((Math.abs(line.x1 - line.x2)) * (Math.abs(line.x1 - line.x2))))
        collisionThreshold = threshold / 2 + 25;
    },

    incrementCheckpoint(self, car, checkpointNumber) {
        if (lastCheckpointPassed + 1 == checkpointNumber) {
            lastCheckpointPassed = checkpointNumber
            console.log(`Current Checkpoint: ${lastCheckpointPassed}`)
        }

    },

    detectLap(car, socket) {
        const collisionThreshold = threshold / 2 + 25; // 25 for half the car length, and threshold is calculated on creation, its the length of the line 
        // checks if the car is withith the threshold from the center of the line
        if ((Math.abs((car.y) - ((line.y1 + line.y2) / 2)) < collisionThreshold) && (Math.abs((car.x) - ((line.x1 + line.x2) / 2)) < collisionThreshold)) {
            if (lastCheckpointPassed == checkpointsPerLap) {
                lastCheckpointPassed = 0;
                lapNumber += 1;
                console.log(`Current Lap: ${lapNumber}`);
            }

            if (lapNumber > lapsPerRace) {
                this.declareFinished(socket)
            }
        }
    },

    declareFinished(socket) {
        socket.emit('declareWinner')
    }
}