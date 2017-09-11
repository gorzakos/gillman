let rooms = require('rooms');
let tower = require('tower');
let spawning = require('spawning');
let creeps = require('creeps');
let _ = require('lodash');
let roomLayout = require('roomLayout');


// profiler - Your main.js will will need to be configured like so.

// Any modules that you use that modify the game's prototypes should be require'd
// before you require the profiler.
const profiler = require('screeps-profiler');

// This line monkey patches the global prototypes.
profiler.enable();
module.exports.loop = function() {

    profiler.wrap(function () {
        // Main.js logic should go here.

        //memoryWipe();
        PathFinder.use(true);

        //Garbage Collection
        for (let name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        }

        // initialization
        for (let roomName in Game.rooms) { roomLayout.run(roomName) }

        rooms.tasks();
        //tower ( from tutorial)
        tower.run();

        //spawning ( from tutorial)
        spawning.run();

        //creeps ( from tutorial
        creeps.run();

    });

    Game.profiler.stream(1);

};


function memoryWipe() {
    console.log("wiping Memory");
    for (let i in Memory) {
        delete Memory[i];
    }

}