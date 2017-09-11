
function collectEnergy(creep, harvestJob) {
    //Memory.Test = harvestJob;
    //console.log(creep,creep.pos.roomName + ',' + harvestJob.pos.roomName + ' is creep and harvestjob pos.roomName');
    if (creep.pos.roomName != harvestJob.pos.roomName) {
        var targetSpot = new RoomPosition(harvestJob.pos.x, harvestJob.pos.y, harvestJob.pos.roomName);
        creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
    } else {
        //console.log
        var targetSpot = new RoomPosition(harvestJob.pos.x, harvestJob.pos.y, harvestJob.pos.roomName);
        creep.harvest(Game.getObjectById(harvestJob.sourceId));
        creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
    }
}

function creepAssignedJob(creep, jobType) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var matchingJob = _.find(creep.memory.assignment, a => a.job == jobType)
        return matchingJob != null;
    }
    return false;
}
//todo improve logic
function dumpEnergy(creep, harvestJob) {

    if (hasFreighters(harvestJob)) {
        // console.log(creep + " needs to dump energy");
        var creepsInRoom = creep.room.find(FIND_MY_CREEPS);
        //Memory.test1 = creepsInRoom;
        var creepsNearby = _.filter(creepsInRoom, c => creep.pos.isNearTo(c));
        //Memory.test2 = creepsNearby;
        var nearbyFrieghters = _.filter(creepsNearby, c => creepAssignedJob(c, "freightSource"));
        //Memory.test3 = nearbyFrieghters;
        var targets = nearbyFrieghters; // 
        if (targets.length > 0) {
            if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            }
        } else {

            Memory.testHarvestJob = harvestJob; // remove later
            let collectSpot = new RoomPosition(harvestJob.collectPos.x, harvestJob.collectPos.y, harvestJob.collectPos.roomName);

            console.log("debug text - this code has been reached - collectSpot", creep);
            creep.moveTo(collectSpot, { visualizePathStyle: { stroke: '#ffffff' } });
        }

    } else {
        var targets = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION ||
                        structure.structureType == STRUCTURE_SPAWN ||
                        structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
            }
        });
        if (targets.length > 0) {
            if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
    }

    //// console.log(creep + " needs to dump energy");
    //var creepsInRoom = creep.room.find(FIND_MY_CREEPS);
    ////Memory.test1 = creepsInRoom;
    //var creepsNearby = _.filter(creepsInRoom, c => creep.pos.isNearTo(c));
    ////Memory.test2 = creepsNearby;
    //var nearbyFrieghters = _.filter(creepsNearby, c => creepAssignedJob(c, "freightSource"));
    ////Memory.test3 = nearbyFrieghters;
    //var targets = nearbyFrieghters; // 

    ////console.log(creep + " needs to dump energy");
    //if (targets.length == 0) {

    //    var targets = creep.room.find(FIND_STRUCTURES, {
    //        filter: (structure) => {
    //            return (structure.structureType == STRUCTURE_EXTENSION ||
    //                    structure.structureType == STRUCTURE_SPAWN ||
    //                    structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
    //        }
    //    });
    //}
    //if (targets.length > 0) {
    //    if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
    //        creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
    //    }
    //}
}

function hasFreighters(harvestJob) {

    let result = Memory.sources[harvestJob.sourceId].reservedCarryParts > 0;
    return result;
}


var roleHarvester = {
    /** @param {Creep} creep **/
    run: function (creep) {

        if (creep.memory.assignment != null && creep.memory.assignment != {}) {
            var harvestJob = _.find(creep.memory.assignment, a => a.job == "harvestSource")
            if (creep.carry.energy < creep.carryCapacity) {
                collectEnergy(creep, harvestJob);
            }
            else {
                dumpEnergy(creep, harvestJob);
            }
        }
    }
}

module.exports = roleHarvester;