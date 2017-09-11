function collectEnergy(creep) {
    //console.log(creep+' is collecting energy')


    var job = _.find(creep.memory.assignment, a => a.job == "freightSource");
    //Memory.Test = job.collectPos;
    var target = new RoomPosition(job.collectPos.x, job.collectPos.y, job.collectPos.roomName);
    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
}

function fillRandomBuilding(creep) {


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
            return true;
        }
    }
    
}

function creepAssignedJob(creep, jobType) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var matchingJob = _.find(creep.memory.assignment, a => a.job == jobType)
        return matchingJob != null;
    }
    return false;
}

function feedUpgrader(creep) {
    // console.log(creep + " needs to dump energy");
    var creepsInRoom = creep.room.find(FIND_MY_CREEPS);
    var creepsNearby = _.filter(creepsInRoom, c => creep.pos.isNearTo(c));
    var nearbyUpgraders = _.filter(creepsNearby, c => creepAssignedJob(c, "upgradeController"));
    var targets = nearbyUpgraders; // 

    //todo - lowest energy target
    if (targets.length > 0) {
        // var lowestEnergyCarried = Math.min(_.map(targets, c => c.carry.energy));
        var energyCarried = _.map(targets, c => c.carry.energy);
        var lowestEnergyCarried = Math.min(...energyCarried);
        var neediestUpgrader = _.find(targets, c => c.carry.energy == lowestEnergyCarried);
        //console.log('neediest Upgrader near '+creep+' is  ' + neediestUpgrader +' and has '+lowestEnergyCarried+ ' energy');
        creep.transfer(neediestUpgrader, RESOURCE_ENERGY)
        return true;
    }
    return false;
}

function distributeEnergy(creep) {
    //console.log(creep + ' is distributing energy')

    if (fillRandomBuilding(creep)) { return }
    feedUpgrader(creep)
    var job = _.find(creep.memory.assignment, a => a.job == "freightSource");
    var target = new RoomPosition(job.distributePos.x, job.distributePos.y, job.distributePos.roomName);
    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
}

var roleHarvester = {

    /** @param {Creep} creep **/
    run: function (creep) {

        //console.log('creep.memory.distributing == null: ' + (creep.memory.distributing == null));
        if (creep.memory.distributing == null) {
            if (creep.carry.energy == 0) { creep.memory.distributing = false; } else { creep.memory.distributing = true; }
        }

        if (creep.memory.distributing && creep.carry.energy == 0) {
            creep.memory.distributing = false;
            creep.say('🔄 collect');
        }
        if (!creep.memory.distributing && creep.carry.energy == creep.carryCapacity) {
            creep.memory.distributing = true;
            creep.say('⚡ spend');
        }

        if (creep.memory.distributing) { distributeEnergy(creep) } else { collectEnergy(creep) }

    }
};

module.exports = roleHarvester;