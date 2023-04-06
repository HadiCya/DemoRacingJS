let lastCheckpointPassed = 0;
let lapNumber = 0;

const checkpointsPerLap = 4;
const lapsPerRace = 3;


export const Checkpoints = {
    initializeMap(self) {
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
    },

    incrementCheckpoint(self, car, checkpointNumber) {
        if (lastCheckpointPassed + 1 == checkpointNumber) {
            lastCheckpointPassed = checkpointNumber
        }

    },

    declareWon() {

    }
}