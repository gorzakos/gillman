const profiler = require('screeps-profiler');

function theNeedful() {

    var spawnName = Object.keys(Game.spawns)[0];
    let spawn = Game.spawns[spawnName]; //todo make loop for each spawn.
    processSpawnQueue(spawn);

}
function processSpawnQueue(spawn){
    spawnHighestPriorityRequest(spawn);
    drawWhatIsSpawning(spawn);
}

//todo - assign text
function drawWhatIsSpawning(spawn){
    if (spawn.spawning) {
        let spawningCreep = spawn.spawning.name;
        let spawningText = spawningCreep;
        spawn.room.visual.text(
            spawningText,
            spawn.pos.x + 1,
            spawn.pos.y,
            { align: 'left', opacity: 0.8 });

    }
}

//todo
function spawnHighestPriorityRequest(spawn){
    
    if (spawn.spawning){
        return spawn.spawning
    }else {
        let highestPriorityRequest = getHighestPriorityRequest(spawn);
        return spawnCreepFromQueue(highestPriorityRequest);
    }
}

function spawnQueueReference(spawnName, requestorId, requestType, flavor, bodyPartQuantities) {

    let referenceData = {};
    referenceData.requestTime = Game.time;
    referenceData.spawnName = spawnName;
    referenceData.requestorId = requestorId;
    referenceData.requestorType = '';
    referenceData.requestType = requestType;
    referenceData.flavor = flavor;
    referenceData.bodyPartQuantities = bodyPartQuantities;
    
    return referenceData;
}
//todo
function getHighestPriorityRequest(spawn){
    // if income is minimal, prioritize adding to spawn energy rate
    let highestPriorityRequest = {};
    if (getSpawnIncome(spawn) < 15){
        // determine bottleneck
        let sources = getSourcesSortedNearToFar(spawn);
        for (let id in sources){
            rememberedSource = sources[id];
            let harvestRate = rememberedSource.reservedWorkParts * HARVEST_POWER;
            let shipToSpawnDistance = rememberedSource.distToSpawn -2; // harvester spot & spawn spot
            // no carrier needed means flat 50 from harvester. if carriers are needed, a 2 way trip defines capacity.
            let shipToSpawnRate = shipToSpawnDistance > 0 ? rememberedSource.reservedCarryParts * CARRY_CAPACITY / ( 2 * shipToSpawnDistance ) : 50;

            //if there is insufficient shipping for existing harvesting, that takes priority.
            if (shipToSpawnRate < harvestRate){
                console.log('should be spawning frieghter for source ',rememberedSource.id);
                //todo get shipping spawn request for this source
                // highestPriorityRequest = ;
                break;
            }else{ // there is enought shipping to get all harvest to spawn
                //if this is already producing and shipping max, we this isn't one that can be improved.
                let fullyDepleting = rememberedSource.reservedWorkParts >= rememberedSource.workPartsNeeded;
                let noFreeSpots = rememberedSource.maxSpots == rememberedSource.reservedHarvesters.length; 
                let maxxedHarvest = fullyDepleting || noFreeSpots;
                if (maxxedHarvest){
                    continue;
                }else{
                    console.log('should be spawning harvester for source ',rememberedSource.id);
                    //todo get harvest spawn request for this source
                    // highestPriorityRequest = ;
                    break;

                }
            }
        }


    }else{// if income isn't minimal, prioritize adding to controller energy rate
        // determine bottleneck 
        //estimate energy rate availible to controller
    }
}
//todo 
function getSourcesSortedNearToFar(spawn){
    let sortedSources = _.sortBy(Memory.sources, [getDistanceFromSourceToSpawn]);
    return sortedSources;

}

function getDistanceFromSourceToSpawn(s){
    
    console.log('getDistanceFromSourceToSpawn - s = ',s);
    console.log('getDistanceFromSourceToSpawn = ',s.distToSpawn < 0 ? s.distToSpawn : 1000); // remove later
    return s.distToSpawn < 0 ? s.distToSpawn : 1000
}

//todo
// estimate energy rate availible to spawn
function getSpawnIncome(spawn){
    return 1; // change this to actually get spawn income
}

//todo
function spawnCreepFromQueue(queueRequest){
}

function spawnRequestedDroneToScale(spawn, requestedWork, requestedCarry, requestedMove,flavor){
    let work, carry, move;
    let divisor = 0;
    let canAfford = false;
    do{
        divisor++;
        work = Math.ceil(requestedWork / divisor);
        carry = Math.ceil(requestedCarry / divisor);
        move = Math.ceil(requestedMove / divisor);
        canAfford = spawnCanAfford(spawn, work, carry, move);
    } while (!canAfford);
    
    return constructWorker(spawn, work, carry, move, flavor);
}

function spawnCanAfford(spawn,requestedWork,requestedCarry,requestedMove){
    let workCost = requestedWork * BODYPART_COST['work'] ;
    let carryCost = requestedCarry * BODYPART_COST['carry'] ;
    let moveCost = requestedMove * BODYPART_COST['move'] ;
    return (workCost+carryCost+moveCost) <= spawn.room.energyCapacityAvailable;
}


function spawnSourceFreighter(spawn, requestedCarry, requestedMove) {
    return spawnRequestedDroneToScale(spawn, 0, requestedCarry, requestedMove, '🚚 freighter')
}

function spawnControllerUpgrader(spawn, requestedWork, requestedMove) {
    return spawnRequestedDroneToScale(spawn, requestedWork, 1, requestedMove,'✨ upgrader')
}

function spawnSourceHarvester(spawn, requestedWork, requestedMove) {
    return spawnRequestedDroneToScale(spawn, requestedWork, 1, requestedMove, '⛏️ harvester ')
}

function constructWorker(spawn, work, carry, move, flavor) {
    spawn.room.visual.text(
            flavor,
            spawn.pos.x + 1,
            spawn.pos.y,
            { align: 'left', opacity: 0.8 });
    let body = [];
    for (let i = 0; i < move; i++) { body.push(MOVE); }
    for (let i = 0; i < carry; i++) { body.push(CARRY); }
    for (let i = 0; i < work; i++) { body.push(WORK); }
    let newCreep = spawn.createCreep(body);
    if (!(newCreep < 0)) { console.log('spawning ', flavor, ' ', newCreep); }
    //console.log('Spawning new worker: ' + newName);
    return newCreep;
}

let names1 = ["Jackson", "Aiden", "Liam", "Lucas", "Noah", "Mason", "Jayden", "Ethan", "Jacob", "Jack", "Caden", "Logan", "Benjamin", "Michael", "Caleb", "Ryan", "Alexander", "Elijah", "James", "William", "Oliver", "Connor", "Matthew", "Daniel", "Luke", "Brayden", "Jayce", "Henry", "Carter", "Dylan", "Gabriel", "Joshua", "Nicholas", "Isaac", "Owen", "Nathan", "Grayson", "Eli", "Landon", "Andrew", "Max", "Samuel", "Gavin", "Wyatt", "Christian", "Hunter", "Cameron", "Evan", "Charlie", "David", "Sebastian", "Joseph", "Dominic", "Anthony", "Colton", "John", "Tyler", "Zachary", "Thomas", "Julian", "Levi", "Adam", "Isaiah", "Alex", "Aaron", "Parker", "Cooper", "Miles", "Chase", "Muhammad", "Christopher", "Blake", "Austin", "Jordan", "Leo", "Jonathan", "Adrian", "Colin", "Hudson", "Ian", "Xavier", "Camden", "Tristan", "Carson", "Jason", "Nolan", "Riley", "Lincoln", "Brody", "Bentley", "Nathaniel", "Josiah", "Declan", "Jake", "Asher", "Jeremiah", "Cole", "Mateo", "Micah", "Elliot"]
let names2 = ["Sophia", "Emma", "Olivia", "Isabella", "Mia", "Ava", "Lily", "Zoe", "Emily", "Chloe", "Layla", "Madison", "Madelyn", "Abigail", "Aubrey", "Charlotte", "Amelia", "Ella", "Kaylee", "Avery", "Aaliyah", "Hailey", "Hannah", "Addison", "Riley", "Harper", "Aria", "Arianna", "Mackenzie", "Lila", "Evelyn", "Adalyn", "Grace", "Brooklyn", "Ellie", "Anna", "Kaitlyn", "Isabelle", "Sophie", "Scarlett", "Natalie", "Leah", "Sarah", "Nora", "Mila", "Elizabeth", "Lillian", "Kylie", "Audrey", "Lucy", "Maya", "Annabelle", "Makayla", "Gabriella", "Elena", "Victoria", "Claire", "Savannah", "Peyton", "Maria", "Alaina", "Kennedy", "Stella", "Liliana", "Allison", "Samantha", "Keira", "Alyssa", "Reagan", "Molly", "Alexandra", "Violet", "Charlie", "Julia", "Sadie", "Ruby", "Eva", "Alice", "Eliana", "Taylor", "Callie", "Penelope", "Camilla", "Bailey", "Kaelyn", "Alexis", "Kayla", "Katherine", "Sydney", "Lauren", "Jasmine", "London", "Bella", "Adeline", "Caroline", "Vivian", "Juliana", "Gianna", "Skyler", "Jordyn"]
function getRandomName(prefix, suffix) {
    let name, isNameTaken, tries = 0;
    do {
        let nameArray = Math.random() > .5 ? names1 : names2;
        name = nameArray[Math.floor(Math.random() * nameArray.length)];

        if (tries > 3) {
            name += nameArray[Math.floor(Math.random() * nameArray.length)];
        }

        tries++;
        isNameTaken = Game.creeps[name] !== undefined;
    } while (isNameTaken);

    return prefix + name + suffix;
}

function requestSpawnSourceHarvester(spawnName, requestorId, bodyPartQuantities) {

    let requestType = 'sourceHarvester'; let flavor = '⛏️ harvester ';
    return requestSpawnCreep(spawnName, requestorId, requestType, flavor, bodyPartQuantities);
}
//todo
// stores request for spawn and returns to requestor a spawnRequestReference
function requestSpawnCreep(spawnName, requestorId, requestType, flavor, bodyPartQuantities) {
    if (!Memory.spawnQueue) { Memory.spawnQueue = {}; }
    let sqr = spawnQueueReference(spawnName, requestorId, requestType, flavor, bodyPartQuantities);
    
    if (!Memory.spawnQueue[requestorId]) { Memory.spawnQueue[requestorId] = {}; }
    Memory.spawnQueue[requestorId][requestType] = sqr;

    return sqr;

}

function removeSpawnCreepRequest(sqr) {

}

module.exports = {
    run: profiler.registerFN(theNeedful),
    spawnSourceHarvester: profiler.registerFN(spawnSourceHarvester),
    spawnSourceFreighter: profiler.registerFN(spawnSourceFreighter),
    spawnControllerUpgrader: profiler.registerFN(spawnControllerUpgrader),
    requestSpawnCreep: profiler.registerFN(requestSpawnCreep),
    requestSpawnSourceHarvester: profiler.registerFN(requestSpawnSourceHarvester),
};
