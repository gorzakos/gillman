let initilizeEveryTurn = false;

let sources = require('energySources');
let controllerThingamajig = require('controller');
const profiler = require('screeps-profiler');

//static


//energy sources

function tasks() {
    for (let roomName in Memory.rooms) {
        taskOutRoom(roomName);
    }
}

function taskOutRoom(roomName) {
    //console.log('tasking out room ' + roomName);
    r = Memory.rooms[roomName];
    let rememberedSources = r.sources;
    if (r.controller != null) { controllerThingamajig.taskOutController(Memory.controllers[r.controller]) }
    for (let index in rememberedSources) {
        let sourceId = rememberedSources[index];
        let s = Memory.sources[sourceId];
        //console.log('getting ready to task out ' + sourceId);
        sources.taskOutSource(s);
    }
}


module.exports = {
    tasks:tasks,
};