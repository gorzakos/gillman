
function upgradeController(creep) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var upgradeJob = _.find(creep.memory.assignment, a => a.job == "upgradeController")
        //Memory.Test = harvestJob;
        //console.log(creep,creep.pos.roomName + ',' + harvestJob.pos.roomName + ' is creep and harvestjob pos.roomName');
        if (creep.pos.roomName != upgradeJob.pos.roomName) {
            var targetSpot = new RoomPosition(upgradeJob.pos.x, upgradeJob.pos.y, upgradeJob.pos.roomName);
            creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
        } else {
            //console.log
            var targetSpot = new RoomPosition(upgradeJob.pos.x, upgradeJob.pos.y, upgradeJob.pos.roomName);
            creep.upgradeController(Game.getObjectById(upgradeJob.controllerId));
            if (atTargetSpot(creep, upgradeJob)) {
                shareTheWealth(creep, upgradeJob);
            } else {
                creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
}



function atTargetSpot(creep, upgradeJob) {
    let result = _.isEqual(JSON.parse(JSON.stringify(creep.pos)), upgradeJob.pos)
    if (!result){creep.say("Going")}
    return result;
}

function shareTheWealth(creep) {
    // console.log(creep + " needs to dump energy");
    var creepsInRoom = creep.room.find(FIND_MY_CREEPS);
    var creepsNearby = _.filter(creepsInRoom, c => creep.pos.isNearTo(c));
    var nearbyUpgraders = _.filter(creepsNearby, c => creepAssignedJob(c, "upgradeController"));
    var targets = nearbyUpgraders;



    //todo - lowest energy target
    if (targets.length > 0) {
        // var lowestEnergyCarried = Math.min(_.map(targets, c => c.carry.energy));
        var energyCarried = _.map(targets, c => c.carry.energy);
        var lowestEnergyCarried = Math.min(...energyCarried);
        var neediestUpgrader = _.find(targets, c => c.carry.energy == lowestEnergyCarried);
        //console.log('neediest Upgrader near '+creep+' is  ' + neediestUpgrader +' and has '+lowestEnergyCarried+ ' energy');
        creep.transfer(neediestUpgrader, RESOURCE_ENERGY, creep.carry.energy * 2 /3)
        return true;
    }
    return false;
}

function creepAssignedJob(creep, jobType) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var matchingJob = _.find(creep.memory.assignment, a => a.job == jobType)
        return matchingJob != null;
    }
    return false;
}

function creepAssignedJob(creep, jobType) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var matchingJob = _.find(creep.memory.assignment, a => a.job == jobType)
        return matchingJob != null;
    }
    return false;
}


var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function (creep) {

        upgradeController(creep);
        //if (creep.memory.upgrading == null) {
        //    if (creep.carry.energy == 0) { creep.memory.upgrading = false; } else { creep.memory.upgrading = true; }
        //}

        //if(creep.memory.upgrading && creep.carry.energy == 0) {
        //    creep.memory.upgrading = false;
        //    creep.say('🔄 harvest');
	    //}
	    //if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
	    //    creep.memory.upgrading = true;
	    //    creep.say('⚡ upgrade');
	    //}

	    //if(creep.memory.upgrading) {
        //    if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        //        creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
        //    }
        //}
	    //else {
	    //    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
	    //        var harvestJob = _.find(creep.memory.assignment, a => a.job == "harvestSource");
	    //        if (harvestJob != null) {
	    //            if (creep.pos.roomName != harvestJob.pos.room) {
	    //                var targetSpot = new RoomPosition(harvestJob.pos.x, harvestJob.pos.y, harvestJob.pos.room);
	    //                creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
	    //            } else {
	    //                //console.log
	    //                var targetSpot = new RoomPosition(harvestJob.pos.x, harvestJob.pos.y, harvestJob.pos.room);
	    //                creep.harvest(Game.getObjectById(harvestJob.sourceId));
	    //                creep.moveTo(targetSpot, { visualizePathStyle: { stroke: '#ffaa00' } });
	    //            }
	    //        }
	    //    } else {
	    //        var sources = creep.room.find(FIND_SOURCES);
	    //        if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
	    //            creep.moveTo(sources[0], { visualizePathStyle: { stroke: '#ffaa00' } });
	    //        }
	    //        creep.say('🔄 old way');
	    //    }
        //}
	}
};

module.exports = roleUpgrader;