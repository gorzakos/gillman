var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var rolefreighter = require('role.freighter');

function theNeedful() {

    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        if ( creepAssignedJob(creep, 'harvestSource')) {
            roleHarvester.run(creep);
        }
        if (creepAssignedJob(creep, 'freightSource')) {
            //console.log('frieght job triggered');
            rolefreighter.run(creep);
        }
        if (creepAssignedJob(creep, 'upgradeController')) {

            //console.log('Upgrade job triggered by ' + creep);
            roleUpgrader.run(creep);
        }
        if (creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
    }
}

function creepAssignedJob(creep, jobType) {
    if (creep.memory.assignment != null && creep.memory.assignment != {}) {
        var matchingJob = _.find(creep.memory.assignment, a => a.job == jobType);
        //console.log('checking if ' + creep + ' has ' + jobType + ' job:' + (matchingJob != null));
        return matchingJob != null;
    }
    return false;
}
module.exports = { run: theNeedful };
;