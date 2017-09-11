var initializeEveryTurn = false;
var spawning = require('spawning')
const profiler = require('screeps-profiler');

function confirmSourceInitialized(source) {
    //console.log('confirming source '+source.id+' is initialized')
    if (Memory.sources == null || Memory.sources[source.id] == null || initializeEveryTurn) {
        initializePermanentAttributes(source);
        resetEnergyCapacity(source);
        resetReservedSpawner(source);
        resetReservedController(source);
        resetCarryNeeded(source);
        resetThreatStatus(source);
        resetReservedCreeps(source);
    }
}

//initialize permanent attributes

function initializePermanentAttributes(source) {
    if (Memory.sources == null) { Memory.sources = {}; }
    if (Memory.sources[source.id] == null) { Memory.sources[source.id] = {}; }
    var s = Memory.sources[source.id];
    //id
    //console.log('trying to save id in memory ' + source.id)
    s.id = source.id;
    //pos
    s.pos = source.pos;
    //positions of surrounding clear terrain
    s.clearSpots = clearTerrainAround(source);
    //number of terrain spaces availible
    s.maxSpots = s.clearSpots.length
}

function clearTerrainAround(source) {
    // count the clear spaces among the spots directly around the source's location
    var terrainSurroundingSource = source.room.lookForAtArea(LOOK_TERRAIN, source.pos.y - 1, source.pos.x - 1, source.pos.y + 1, source.pos.x + 1, true);
    var clearTerrainSurroundingSource = _.filter(terrainSurroundingSource, function (p) { return p.terrain != 'wall' });
    var clearPostionsSurroundingSource = [];
    for (var index in clearTerrainSurroundingSource) {
        clearTerrainSpot = clearTerrainSurroundingSource[index];
        var position = {
            x: clearTerrainSpot.x,
            y: clearTerrainSpot.y,
            roomName: source.room.name,
        }
        clearPostionsSurroundingSource.push(position);
    }

    return clearPostionsSurroundingSource;
}

//reset variable attributes

//TODO - triggered on room claim status change
function resetEnergyCapacity(source) {
    var s = Memory.sources[source.id];
    //energy
    s.energyCapacity = source.energyCapacity;
    //work parts needed
    s.workPartsNeeded = Math.ceil((source.energyCapacity / ENERGY_REGEN_TIME) / HARVEST_POWER);
}

//TODO - triggered on global spawner status change
//TODO - dynamic assignment of spawn
function resetReservedSpawner(source) {
    var s = Memory.sources[source.id];
    var spawnName = findClosestSpawnerTo(s);
    // reserved spawner
    s.spawn = spawnName;
    // distance to reserved spawner
    s.distToSpawn = s.pos.getRangeTo(Game.spawns[spawnName]);
}

function findClosestSpawnerTo(target) {

    var spawnName = Object.keys(Game.spawns)[0];

    return spawnName;
}

//TODO - triggered on owned room controller status change
//TODO - use path distance
function resetReservedController(source) {
    let s = Memory.sources[source.id];
    // reserved controller
    let controllerID = getMyClosestController(source);
    s.controller = controllerID;
    // distance to reserved controller
    s.distToController = Game.getObjectById(controllerID).pos.getRangeTo(s.pos);
}
//TODO use closest owned controller instead of source's room controller
function getMyClosestController(source) {
    let s = Memory.sources[source.id];
    let sourceRoomName = s.pos.roomName;
    let controllerId = Memory.rooms[sourceRoomName].controller;
    return controllerId;
}

//TODO - triggered on energy Capacity change and reserved controller change
function resetCarryNeeded(source) {
    var s = Memory.sources[source.id];
    if (s.energyCapacity == null) { resetEnergyCapacity(source);}
    if (s.distToController == null) { resetReservedController(source); }
    var energyRate = (source.energyCapacity / ENERGY_REGEN_TIME);
    var ticksPerCarry = CARRY_CAPACITY / energyRate;
    s.carryPartsNeeded = 2 * s.distToController / ticksPerCarry;
}

//TODO - triggered on external threat status change.
function resetThreatStatus(source) {
    var s = Memory.sources[source.id];
    // threats list 
    s.threats = findThreatsNear(source);
    // threat flag
    s.threatened = (s.threats.length > 0) ; 
}

//TODO list of threats, empty if none.
//TODO triggered intellegently somehow
function findThreatsNear(source){
    return {}
}

//TODO triggered on screep status change
function resetReservedCreeps(source) {
    //if (source == null) { console.log('source is null'); }
    //if (source.id == null) {initializePermanentAttributes(source);}
    var s = Memory.sources[source.id];
    // reserved harvester screeps
    s.reservedHarvesters = {};
    // reserved work parts
    s.reservedWorkParts = 0;
    // reserved carry screeps
    s.reservedFreighters = {};
    // reserved carry parts
    s.reservedCarryParts = 0;
}

function ticksToLive(creep) {
    if (creep.spawning) {
        return CREEP_LIFE_TIME + CREEP_SPAWN_TIME * creep.body.length;
    } else {
        return creep.ticksToLive;
    }
}


// references, assignments and removals.
function harvestSourceReference(creep, source) {

    referenceData = {};
    //jobIdentifier
    referenceData["job"] = "harvestSource";
    //creepName
    referenceData["creep"] = creep.name;
    //creepWorkParts
    var creepWorkPartsArray = _.filter(creep.body, bp => bp.type == WORK)
    var creepWorkParts = creepWorkPartsArray.length;
    referenceData["creepWorkParts"] = creepWorkParts;
    //expectedExpiration
    //console.log(Game.time, creep.ticksToLive, "Game.time + creep.ticksToLive");
    referenceData["creepExpires"] = Game.time + ticksToLive(creep);
    //sourceid
    var s = Memory.sources[source.id];
    referenceData["sourceId"] = source.id;
    //clearspot index
    var targetSpotIndex = pickHarvestingClearSpotIndexForCreep(s, creep);
    referenceData["sourceClearSpotIndex"] = targetSpotIndex;
    //clearspot pos
    var targetSpot = source.clearSpots[targetSpotIndex];
    referenceData["pos"] = targetSpot;
    //dump spot
    referenceData["collectPos"] = s.controllerReference.collectEnergySpot;

    return referenceData;
}

function assignHarvester(source, creep) {
    console.log('assigning ' + creep.name + ' as harvester for source ' + source.id);
    var s = Memory.sources[source.id];
    var hsr = harvestSourceReference(creep, source);
    s.reservedHarvesters[creep.name] = hsr;
    if (creep.memory.assignment == null){creep.memory.assignment = {};}
    creep.memory.assignment[s.id] = hsr;
    updateReservedWorkParts(s);
}

function removeHarvester(source, creepName) {
    var s = Memory.sources[source.id];
    if (s.reservedHarvesters[creepName]) { delete s.reservedHarvesters[creepName]; }
    if (Memory.creeps[creepName] && Memory.creeps[creepName].assignment && Memory.creeps[creepName].assignment[source.id]) {
        delete Memory.creeps[creepName].assignment[source.id];
    }
    updateReservedWorkParts(s);
}

function updateReservedWorkParts(s) {
    s.reservedWorkParts = _.reduce(s.reservedHarvesters, function (sum, h) { return sum + h['creepWorkParts']; }, 0);
};

//TODO pick closest unreserved spot
function pickHarvestingClearSpotIndexForCreep(source, creep) {
    //console.log('picking clear spot for ' + creep.name + ' as harvester for source ' + source.id);
    var clearSpots = _.range(source.maxSpots);
    var takenSpots = [];
    //if any harvesters are assigned, an array of thier spotIndexes is saved to takenSpots
    if (!(source.reservedHarvesters == {})) {takenSpots = _.map(source.reservedHarvesters, rh => rh.sourceClearSpotIndex);}
    //produces an array where the clearSpots have the takenSpots removed
    var availibleSpots = _.without(clearSpots, ...takenSpots);
    
    return availibleSpots[0];
}

function unassignedSpots(rememberedSource) {
    //console.log('source ' + rememberedSource + ' has ' + (rememberedSource.maxSpots - Object.keys(rememberedSource.reservedHarvesters).length) + ' spots availible');
    return Object.keys(rememberedSource.reservedHarvesters).length < rememberedSource.maxSpots;
}
function workNeeded(rememberedSource) { return rememberedSource.reservedWorkParts < rememberedSource.workPartsNeeded; }
function harvestersNeeded(rememberedSource) { return unassignedSpots(rememberedSource) && workNeeded(rememberedSource); }

function assignHarvestersFromExistingCreeps(rememberedSource) {
    //console.log("assignHarvestersFromExistingCreeps called for " + rememberedSource.id);
    function isUnassignedWorker(c) {
        //console.log("checking if " + c.name + " isUnassignedWorker");
        var unassigned = (c.memory.assignment == null || c.memory.assignment == {}) && _.filter(c.body, bp => bp.type == WORK).length > 0
        //console.log("checking if " + c.name + " isUnassignedWorker: " + unassigned);
        return unassigned;
    }
    var unassignedCreeps = _.filter(Game.creeps, c => isUnassignedWorker(c));
    for (var creep in unassignedCreeps) {
        //console.log('evaluating ' + unassignedCreeps[creep].name + ' as harvester for source ' + rememberedSource.id);
        assignHarvester(rememberedSource, unassignedCreeps[creep]);
        if (!harvestersNeeded(rememberedSource)) { break; }
    }
}

//TODO - optimize parts
function spawnHarvester(rememberedSource) {

    let spawnName = rememberedSource.spawn;
    let bodyPartQuantities = { work: 6, carry: 1, move: 3 };
    spawning.requestSpawnSourceHarvester(spawnName, rememberedSource.id, bodyPartQuantities)


    var spawn = Game.spawns[rememberedSource.spawn];
    //console.log(spawn)
    return spawning.spawnSourceHarvester(spawn, 6, 3);
}

function validateHarvesters(rememberedSource) {
    for (var harvesterName in rememberedSource.reservedHarvesters) {
        if (!Game.creeps[harvesterName]) {
            console.log('Clearing non-existing creep :' + harvesterName + ' from source:' + rememberedSource.reservedHarvesters[harvesterName]);
            removeHarvester(rememberedSource, harvesterName);
        } else if (rememberedSource.reservedHarvesters[harvesterName].creep == null) {
            assignHarvester(rememberedSource, Game.creeps[harvesterName]);
        }
    }
}

function freightSourceReference(creep, source) {

    referenceData = {};
    //jobIdentifier
    referenceData["job"] = "freightSource";
    //creepName
    referenceData["creep"] = creep.name;
    //creepCarryParts
    var creepCarryPartsArray = _.filter(creep.body, bp => bp.type == CARRY)
    var creepCarryParts = creepCarryPartsArray.length;
    referenceData["creepCarryParts"] = creepCarryParts;
    //expectedExpiration
    //console.log(Game.time, creep.ticksToLive, "Game.time + creep.ticksToLive");
    referenceData["creepExpires"] = Game.time + ticksToLive(creep);
    //sourceid
    var s = Memory.sources[source.id];
    referenceData["sourceId"] = source.id;
    //controllerId
    referenceData["controllerId"] = s.controller;
    //collect spot
    referenceData["collectPos"] = s.controllerReference.collectEnergySpot;
    //distribute spot
    referenceData["distributePos"] = s.controllerReference.energyDistributionSpot;
    
    return referenceData;
}

function assignFreighter(source, creep) {

    //console.log('assigning ' + creep.name + ' as harvester for source ' + source.id);
    var s = Memory.sources[source.id];
    var fsr = freightSourceReference(creep, source);
    s.reservedFreighters[creep.name] = fsr;
    if (creep.memory.assignment == null) { creep.memory.assignment = {}; }
    creep.memory.assignment[s.id] = fsr;
    updateReservedCarryParts(s);
}

function removeFreighter(source, creepName) {
    var s = Memory.sources[source.id];
    if (s.reservedFreighters[creepName]) { delete s.reservedFreighters[creepName]; }
    if (Memory.creeps[creepName] && Memory.creeps[creepName].assignment && Memory.creeps[creepName].assignment[source.id]) {
        delete Memory.creeps[creepName].assignment[source.id];
    }
    updateReservedCarryParts(s);
}

function updateReservedCarryParts(s) {
    s.reservedCarryParts = _.reduce(s.reservedFreighters, function (sum, h) { return sum + h['creepCarryParts']; }, 0)
}
function carryNeeded(rememberedSource) { return rememberedSource.carryPartsNeeded - rememberedSource.reservedCarryParts; }
function freightersNeeded(rememberedSource) { return carryNeeded(rememberedSource) > 0; }


function assignFreightersFromExistingCreeps(rememberedSource) {
    function isUnassignedCarrier(c) {
        var unassigned = (c.memory.assignment == null || c.memory.assignment == {}) && _.filter(c.body, bp => bp.type == CARRY).length > 0
        return unassigned;
    }
    var unassignedCreeps = _.filter(Game.creeps, c => isUnassignedCarrier(c));
    for (var creep in unassignedCreeps) {
        assignFreighter(rememberedSource, unassignedCreeps[creep]);
        if (!freightersNeeded(rememberedSource)) { break; }
    }
}
//TODO - optimize parts
function spawnFreighter(rememberedSource) {
    var spawn = Game.spawns[rememberedSource.spawn];
    //console.log(spawn)
    spawning.spawnSourceFreighter(spawn, 6, 6);
}

function validateCarriers(rememberedSource) {
    for (var freighterName in rememberedSource.reservedFreighters) {
        if (!Game.creeps[freighterName]) {
            console.log('Clearing non-existing creep :' + freighterName + ' from source:' + rememberedSource.reservedHarvesters[freighterName]);
            removeFreighter(rememberedSource, freighterName);
        }
    }
}


// routine jobs
function taskOutSource(rememberedSource) {
    //console.log('tasking out source ' + rememberedSource);
    if (initializeEveryTurn) { resetReservedCreeps(rememberedSource); }

    //validate existing tasks
    validateHarvesters(rememberedSource);
    validateCarriers(rememberedSource);

    //first try to assign from existing pool
    if (harvestersNeeded(rememberedSource)) { assignHarvestersFromExistingCreeps(rememberedSource); }
    //first try to assign from existing pool
    if (freightersNeeded(rememberedSource)) { assignFreightersFromExistingCreeps(rememberedSource); }


    //check again then try to spawn the needed harvesters
    if (harvestersNeeded(rememberedSource)) {
        newCreep = spawnHarvester(rememberedSource);
        if (!(newCreep < 0)) {
            console.log('trying to assign ' + newCreep + ' as a harvester')
            Memory.creeps[newCreep] = {};
            Memory.creeps[newCreep].assignment = {};
            Memory.creeps[newCreep].assignment[rememberedSource.id] = {};
            rememberedSource.reservedHarvesters[newCreep] = {};
            //assignHarvester(rememberedSource, newCreep);
        }
    }
    //check again then try to spawn the needed Freighters
    else if (freightersNeeded(rememberedSource)) {
        newCreep = spawnFreighter(rememberedSource);
        if (newCreep) {
            console.log('spawning freighter ' + newcreep);
            assignFreighter(rememberedSource, newCreep);
        }
    }
}

module.exports = {
    confirmSourceInitialized: confirmSourceInitialized,
    assignHarvester: assignHarvester,
    removeHarvester: removeHarvester,
    taskOutSource: taskOutSource,
};