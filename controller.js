var initializeEveryTurn = false;

var spawning = require('spawning')

function confirmControllerInitialized(controller) {
    //console.log('confirming controller '+controller.id+' is initialized')
    if (Memory.controllers == null || Memory.controllers[controller.id] == null || initializeEveryTurn) {
        initializePermanentAttributes(controller);
        resetReservedSpawner(controller)
        resetReservedCreeps(controller);
    }
}

//initialize permanent attributes
//TODO
function initializePermanentAttributes(controller) {
    if (Memory.controllers == null) { Memory.controllers = {}; }
    if (Memory.controllers[controller.id] == null) { Memory.controllers[controller.id] = {}; }
    //Memory.Test = controller;
    var ct = Memory.controllers[controller.id];
    //id
    //console.log('trying to save id in memory ' + controller.id)
    ct.id = controller.id;
    //pos
    ct.pos = controller.pos;
    //positions of surrounding clear terrain
    ct.clearSpots = clearTerrainAround(controller);
    //number of terrain spaces availible
    ct.maxSpots = ct.clearSpots.length
    //TODO - move this to variable and sensibly calculate it.
    ct.workPartsNeeded = 20;
}

//todo expand terrain to range 3
function clearTerrainAround(controller) {
    // count the clear spaces among the spots directly around the controller's location
    //Memory.Test = controller.pos;
    var terrainSurroundingController = controller.room.lookForAtArea(LOOK_TERRAIN, controller.pos.y - 3, controller.pos.x - 3, controller.pos.y + 3, controller.pos.x + 3, true);
    var clearTerrainSurroundingController = _.filter(terrainSurroundingController, function (p) { return p.terrain != 'wall' });
    var clearPostionsSurroundingController = [];
    for (var index in clearTerrainSurroundingController) {
        clearTerrainSpot = clearTerrainSurroundingController[index];
        var position = {
            x: clearTerrainSpot.x,
            y: clearTerrainSpot.y,
            roomName: controller.pos.roomName,
        }
        clearPostionsSurroundingController.push(position);
    }

    return clearPostionsSurroundingController;
}

//reset variable attributes

//TODO - get spawn name dynamically
function resetReservedSpawner(controller) {
    var ct = Memory.controllers[controller.id];
    var spawnName = findClosestSpawnerTo(ct);
    // reserved spawner
    ct.spawn = spawnName;
    // distance to reserved spawner
    ct.distToSpawn = controller.pos.getRangeTo(Game.spawns[spawnName]);
}

function findClosestSpawnerTo(target) {

    var spawnName = Object.keys(Game.spawns)[0];

    return spawnName;
}

//TODO triggered on screep status change
function resetReservedCreeps(controller) {
    var ct = Memory.controllers[controller.id];
    ct.reservedUpgraders = {};
    // reserved work parts
    ct.reservedWorkParts = 0;
}

function ticksToLive(creep) {
    if (creep.spawning) {
        return CREEP_LIFE_TIME + CREEP_SPAWN_TIME * creep.body.length;
    } else {
        return creep.ticksToLive;
    }
}



//reference objects,assignments and removals
//upgraders
function upgraderControllerReference(creep, controller) {

    referenceData = {};
    //jobIdentifier
    referenceData["job"] = "upgradeController";
    //creepName
    referenceData["creep"] = creep.name;
    //creepWorkParts
    var creepWorkPartsArray = _.filter(creep.body, bp => bp.type == WORK)
    var creepWorkParts = creepWorkPartsArray.length;
    referenceData["creepWorkParts"] = creepWorkParts;
    //expectedExpiration
    //console.log(Game.time, creep.ticksToLive, "Game.time + creep.ticksToLive");
    referenceData["creepExpires"] = Game.time + ticksToLive(creep);
    //controllerid
    var c = Memory.controllers[controller.id];
    referenceData["controllerId"] = controller.id;
    //clearspot index
    var targetSpotIndex = pickUpgraderClearSpotIndexForCreep(c, creep);
    referenceData["controllerClearSpotIndex"] = targetSpotIndex;
    //clearspot pos
    var targetSpot = c.clearSpots[targetSpotIndex];
    referenceData["pos"] = targetSpot;

    return referenceData;
}



function assignUpgrader(controller, creep) {
    console.log('assigning ' + creep.name + ' as upgrader for controller ' + controller.id);
    var ct = Memory.controllers[controller.id];
    var ucr = upgraderControllerReference(creep, controller);
    ct.reservedUpgraders[creep.name] = ucr;
    if (creep.memory.assignment == null) { creep.memory.assignment = {}; }
    creep.memory.assignment[ct.id] = ucr;
    updateReservedWorkParts(ct);
}

function removeUpgrader(controller, creepName) {
    var ct = Memory.controllers[controller.id];
    if (ct.reservedUpgraders[creepName]) { delete ct.reservedUpgraders[creepName]; }
    if (Memory.creeps[creepName] && Memory.creeps[creepName].assignment && Memory.creeps[creepName].assignment[controller.id]) {
        delete Memory.creeps[creepName].assignment[controller.id];
    }
    updateReservedWorkParts(ct);
}

function updateReservedWorkParts(ct) {
    ct.reservedWorkParts = _.reduce(ct.reservedUpgraders, function (sum, u) { return sum + u['creepWorkParts']; }, 0);
};

//TODO pick closest unreserved spot
function pickUpgraderClearSpotIndexForCreep(controller, creep) {
    //console.log('picking clear spot for ' + creep.name + ' as upgrader for controller ' + controller.id);
    var clearSpots = _.range(controller.maxSpots);
    var takenSpots = [];
    //if any upgraders are assigned, an array of thier spotIndexes is saved to takenSpots
    if (!(controller.reservedUpgraders == {})) { takenSpots = _.map(controller.reservedUpgraders, rh => rh.controllerClearSpotIndex); }
    //produces an array where the clearSpots have the takenSpots removed
    var availibleSpots = _.without(clearSpots, ...takenSpots);

    return availibleSpots[0];
}

function unassignedSpots(rememberedController) {
    //console.log('controller ' + rememberedController + ' has ' + (rememberedController.maxSpots - Object.keys(rememberedController.reservedUpgraders).length) + ' spots availible');
    return Object.keys(rememberedController.reservedUpgraders).length < rememberedController.maxSpots;
}
function workNeeded(rememberedController) { return rememberedController.reservedWorkParts < rememberedController.workPartsNeeded; }
function upgradersNeeded(rememberedController) {
    let result = unassignedSpots(rememberedController) && workNeeded(rememberedController);
    return result;
}

function assignUpgradersFromExistingCreeps(rememberedController) {
    //console.log("assignUpgradersFromExistingCreeps called for " + rememberedController.id);
    function isUnassignedWorker(c) {
        //console.log("checking if " + c.name + " isUnassignedWorker");
        var unassigned = (c.memory.assignment == null || c.memory.assignment == {}) && _.filter(c.body, bp => bp.type == WORK).length > 0
        //console.log("checking if " + c.name + " isUnassignedWorker: " + unassigned);
        return unassigned;
    }
    var unassignedCreeps = _.filter(Game.creeps, c => isUnassignedWorker(c));
    for (var creep in unassignedCreeps) {
        //console.log('evaluating ' + unassignedCreeps[creep].name + ' as upgrader for controller ' + rememberedController.id);
        assignUpgrader(rememberedController, unassignedCreeps[creep]);
        if (!upgradersNeeded(rememberedController)) { break; }
    }
}

//TODO - optimize parts
function spawnUpgrader(rememberedController) {
    var spawn = Game.spawns[rememberedController.spawn];
    //console.log(spawn)
    return spawning.spawnControllerUpgrader(spawn, 9, 3);
}

function validateUpgraders(rememberedController) {
    for (var upgraderName in rememberedController.reservedUpgraders) {
        if (!Game.creeps[upgraderName]) {
            console.log('Clearing non-existing creep :' + upgraderName + ' from controller:' + rememberedController.reservedUpgraders[upgraderName]);
            removeUpgrader(rememberedController, upgraderName);
        } else if (rememberedController.reservedUpgraders[upgraderName].creep == null) {
            assignUpgrader(rememberedController, Game.creeps[upgraderName]);
        }
    }
}



// routine jobs
function taskOutController(rememberedController) {
    //console.log('tasking out controller '+rememberedController)
    //console.log('tasking out controller ' + rememberedController);
    if (initializeEveryTurn) { resetReservedCreeps(rememberedController); }

    //validate existing tasks
    validateUpgraders(rememberedController);
    //console.log('upgradersNeeded' + (upgradersNeeded(rememberedController)));
    //first try to assign from existing pool
    if (upgradersNeeded(rememberedController)) { assignUpgradersFromExistingCreeps(rememberedController); }


    //check again then try to spawn the needed upgraders
    if (upgradersNeeded(rememberedController)) {
        newCreep = spawnUpgrader(rememberedController);
        if (!(newCreep < 0)) {
            console.log('trying to assign ' + newCreep + ' as a upgrader')
            Memory.creeps[newCreep] = {};
            Memory.creeps[newCreep].assignment = {};
            Memory.creeps[newCreep].assignment[rememberedController.id] = {};
            rememberedController.reservedUpgraders[newCreep] = {};
            //assignUpgrader(rememberedController, newCreep);
        }
    }
}


//sattellite rooms
//s




module.exports = {
    confirmControllerInitialized: confirmControllerInitialized,
    taskOutController: taskOutController,
};