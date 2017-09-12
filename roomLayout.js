let initilizeEveryTurn = false;

let _ = require('lodash.min');
let boundingCircle = require('boundingCircle');
let controllerThingamajig = require('controller');
let energySources = require('energySources');
let defenses = require('roomDefenses');
const profiler = require('screeps-profiler');

// determines - location of defenses. location of creep work spots. pathing between work spots. location of structures.
function roomLayout(roomName) {

    confirmRoomMemoryInitialized(roomName);
    // todo - only valid for owned room

    // layer 1 - Defenses - preliminary wall locations. to be refined later when exit roads are determined.
    let thisRoomsDefenses = defenses.planDefenses(roomName);
    defenses.drawDefenses(thisRoomsDefenses, roomName);

    // layer 1.5 preliminary pathing - saves a costmatrix with a gravity well & burn in of prelim paths between points of interest
    let prelim = preliminaryPathing(roomName);
    drawPoiCircle(roomName, prelim.poiCircle);
    let controllerArray = prelim.controllerArray;
    let sourceArray = prelim.sourceArray;


    // layer 2 - source to controller. Work spots, energy distribution, roads.

    function collectEnergySpots(controllerLayout){
        return  _.flatMap(controllerLayout.sourceControllerReferences, scr =>[scr.collectEnergySpot, scr.energyDistributionSpot]);
    }

    function collectPermanentWorkPositions(controllerLayout){
        return _.flatMap(controllerLayout.sourceControllerReferences, scr =>[scr.harvestSpot, scr.upgradeSpot]);
    }

    function getControllerPaths(controllerLayout){
        return _.map(controllerLayout.sourceControllerReferences, scr => scr.path);
    }

    function drawControllerPathsAndAddToRoadPositions(controllerPaths){
        let roadPositions = [];
        for (let i in controllerPaths) {
            let path = _.slice(controllerPaths[i].path, 1, controllerPaths[i].path.length - 1);
            new RoomVisual(roomName).poly(_.map(path, p =>[p.x, p.y]));
            roadPositions = roadPositions.concat(path);
        }
        return roadPositions;
    }

    let controllerLayout = getControllerLayout(roomName, controllerArray, sourceArray);
    let energySpots = collectEnergySpots(controllerLayout);
    let permanentWorkPositions = collectPermanentWorkPositions(controllerLayout);
    let controllerPaths = getControllerPaths(controllerLayout);
    let roadPositions = drawControllerPathsAndAddToRoadPositions(controllerPaths);



    // layer 3 -  spawn location, source to spawn, road, extension locations

    function findPreferredSpawnLocation(){
        /* logic taken from first crack at 2 source room
        //spawn goes on path between sources

        Memory.testSourceArray = sourceArray; //debugging - remove later

        // determine which source is closer to the controller
        let fartherSource = sourceArray[0];
        if (closerSource === sourceArray[0]) { fartherSource = sourceArray[1]; }

        Memory.testCloserSource = closerSource; //debugging - remove later
        Memory.testFartherSource = fartherSource; //debugging - remove later

        sourcesPaths = [getPathBetween(closerSource.pos, fartherSource.pos,1)]; // range 1
        preferredSpawnLocation = sourcesPaths[0].path[1];
        let takenByEnergySpot = (_.intersectionWith([preferredSpawnLocation], energySpots),_.isEqual).length > 0;
        if (takenByEnergySpot) {
            let surroundingSpots = getAdjacentPositions(preferredSpawnLocation);
            preferredSpawnLocation = _.find(surroundingSpots, s => closerSource.pos.getRangeTo(s) === 2);
        }
        */

        return Game.spawns[Object.keys(Game.spawns)[0]].pos;
    }

    function drawPreferredSpawnLocation(preferredSpawnLocation) {
        new RoomVisual(roomName).circle(preferredSpawnLocation.x, preferredSpawnLocation.y, {
            radius: .75,
            opacity: .25,
            stroke: '#000000',
            fill: '#ffff00'
        });
    }

    function getAndDrawSourcesPaths(sourceArray,roadPositions){
        let sourcesPaths = []
        for ( let index in sourceArray ){
            let source = sourceArray[index];
            let sourceToSpawnPath = getPathBetween(source.pos, preferredSpawnLocation,1);
            sourcesPaths.push(sourceToSpawnPath);
            let path = _.slice(sourceToSpawnPath, 1, sourceToSpawnPath.length - 1);
            roadPositions = roadPositions.concat(path);
            new RoomVisual(roomName).poly(_.map(path, p =>[p.x, p.y]));
        }
        return sourcesPaths;
    }

    function planExtensionLocations(sourcesPaths){
        let extensionArray = [];
        for (let index in sourcesPaths[0].path) {
            if (index === 0 || index === sourcesPaths[0].path.length - 1) { continue; }
            let road = sourcesPaths[0].path[index];
            let nextToRoad = getAdjacentPositions(road);
            extensionArray = extensionArray.concat(nextToRoad);
        }
        extensionArray = _.uniqWith(extensionArray, _.isEqual);
        _.pullAllWith(extensionArray, roadPositions.concat(structurePositions, permanentWorkPositions), _.isEqual);
        _.remove(extensionArray, isWall);

        return extensionArray;

    }

    function drawExtensions(extensionArray){
        for (let index in extensionArray) {
            let extensionSpot = extensionArray[index];
            let fillColor = '#ff0000';
            if (index < 5) {
                fillColor = '#223344'
            } else if (index < 10) {
                fillColor = '#006644'
            } else if (index < 20) {
                fillColor = '#000088'
            } else if (index < 30) {
                fillColor = '#444400'
            }
            new RoomVisual(roomName).circle(extensionSpot.x, extensionSpot.y, { radius: .35, opacity: .25, stroke: '#000000', fill: fillColor })
        }
    }


    let preferredSpawnLocation = findPreferredSpawnLocation() ;
    drawPreferredSpawnLocation(preferredSpawnLocation);
    let structurePositions = [];
    structurePositions.push(preferredSpawnLocation);

    let sourcesPaths = getAndDrawSourcesPaths(sourceArray,roadPositions);

    if (sourceArray.length < 2) {

    }
    else if (sourceArray.length === 2) {

        let extensionArray = planExtensionLocations(sourcesPaths);

        drawExtensions(extensionArray);


    }
    else {
        //spawn goes on shortest path to the next closest source
    }

}

function isWall(p) {
    //console.log('Game.map.getTerrainAt(p)',p, Game.map.getTerrainAt(p));
    return Game.map.getTerrainAt(p) === 'wall';
}

function preliminaryPathing(roomName) {

    let status = Memory.rooms[roomName].layout.status.prelimPathing;
    let prelimPathing = Memory.rooms[roomName].layout.prelimPathing;

    if ( status.completeSet === "completed"){
        console.log("reusing saved prelim work for ", roomName)
        return prelimPathing;
    }

    console.log("remaining cpu starting prelim", Game.cpu.tickLimit - Game.cpu.getUsed() );
    status.completeSet = "starting" ;
    if ( !status.sourceArray )
    {
        status.sourceArray = "starting";
    }
    if ( status.sourceArray !== "completed" ){
        prelimPathing.sourceArray  = Game.rooms[roomName].find(FIND_SOURCES);
        status.sourceArray = "completed" ;
    }else{
        console.log("reusing saved prelim sourceArray for ", roomName)
    }

    console.log("remaining cpu after finding sources", Game.cpu.tickLimit - Game.cpu.getUsed() );
    if ( !status.controllerArray )
    {
        status.controllerArray = "starting";
    }
    if ( status.controllerArray !== "completed" ){
        prelimPathing.controllerArray  = [Game.rooms[roomName].controller];
        status.controllerArray = "completed" ;
    }else{
        console.log("reusing saved prelim controller for ", roomName)
    }
    console.log("remaining cpu after finding controller", Game.cpu.tickLimit - Game.cpu.getUsed() );

    let resourceArray = [];

    if ( !status.poiArray )
    {
        status.poiArray = "starting";
    }
    if ( status.poiArray !== "completed" ){
        let poiArray = _.map(
            prelimPathing.sourceArray.concat(
                resourceArray,
                prelimPathing.controllerArray
            ), i => i.pos);
        // the array is given different orders on different turns. this sorta stabilizes the results
        prelimPathing.poiArray  = poiArray.sort(function (a, b) { return a.x - b.x + a.y - b.y });
        status.poiArray = "completed" ;
    }else{
        console.log("reusing saved prelim poiArray for ", roomName)
    }
    console.log("remaining cpu after sorting points of interest", Game.cpu.tickLimit - Game.cpu.getUsed() );


    if ( !status.poiCircle )
    {
        status.poiCircle = "starting";
    }
    if ( status.poiCircle !== "completed" ){
        prelimPathing.poiCircle  = boundingCircle.makeCircle( prelimPathing.poiArray );
        status.poiCircle = "completed" ;
    }else{
        console.log("reusing saved prelim poiCircle for ", roomName)
    }
    console.log("remaining cpu after getting bounding circle", Game.cpu.tickLimit - Game.cpu.getUsed() );

    let costs = {};
    if ( !status.costMatrix )
    {
        status.costMatrix = "starting";
    }
    if ( status.costMatrix !== "completed" ){
        console.log("attempting to save a new costMatrix for ", roomName);
        //cost matrix with a gravity well in the middle of the bounding circle
        costs = preferCenterOfPoI(
            roomName,
            prelimPathing.poiCircle,
            prelimPathing.sourceArray,
            resourceArray,
            prelimPathing.controllerArray
        );
        prelimPathing.costMatrix  = costs.serialize();
        status.costMatrix = "completed" ;
    }else{
        console.log("reusing saved prelim costMatrix for ", roomName)
    }

    console.log("remaining cpu after saving poi costMatrix", Game.cpu.tickLimit - Game.cpu.getUsed() );

    if ( !status.pathArray || !status.pathArray.completeSet )
    {
        console.log("making prelim status container for ", roomName);
        status.pathArray = {};
        status.pathArray.completeSet = "starting";
    }
    if ( status.pathArray.completeSet !== "completed" ){

        function definePathsBetweenPoi(poiArray) {
            let firstPos = poiArray[0];
            let remainingPoi = poiArray.slice(1);
            let myPaths = [];
            for ( let index in remainingPoi) {
                myPaths.push({
                        status: "defined",
                        startPos: firstPos,
                        goalPos: remainingPoi[index],
                    }
                )
            }
            if (poiArray.length === 1) {
                return myPaths;
            }
            let remainingPaths = definePathsBetweenPoi(remainingPoi);
            return myPaths.concat(remainingPaths);
        }

        if ( status.pathArray.completeSet !== "defined" || currentPath.status !== "completed" ){
            prelimPathing.pathArray = definePathsBetweenPoi( prelimPathing.poiArray );
            status.pathArray.completeSet = "defined" ;
        }else{
            console.log("reusing saved prelim pathArray definition for ", roomName);
        }


        for ( let index in prelimPathing.pathArray) {
            let currentPath = prelimPathing.pathArray[index];
            if (currentPath.status !== "completed" || currentPath.status !== "generated") {
                console.log("attempting to do prelim.pathArray[", index, "]");
                Object.assign(currentPath, getPathBetween(currentPath.startPos, currentPath.goalPos, 1));//range 1
                currentPath.status = "generated";
            }else{
                console.log("reusing saved prelim path for ", roomName, " path number " , index );
            }
        }
        status.pathArray.completeSet = "completed" ;
    }

    console.log("remaining cpu after generating paths", Game.cpu.tickLimit - Game.cpu.getUsed() );

    if ( !status.pathBurnIn )
    {
        status.pathBurnIn = "starting";
    }
    if ( status.pathBurnIn !== "completed" ) {

        if ( costs === {} ) {
            costs = PathFinder.CostMatrix.CostMatrix.deserialize(prelimPathing.costMatrix);
        }
        // adjust to kinda burn in paths.


        for ( let index in prelimPathing.pathArray) {
            let currentPath = prelimPathing.pathArray[index];
            if (currentPath.status !== "completed" ) {
                console.log("attempting to burn in prelim.pathArray[", index, "]");
                costs = adjustCostMatrixToPreferPath(costs, currentPath.path);
                currentPath.status = "completed";
            }else{
                console.log("reusing burned in prelim path for ", roomName, " path number " , index );
            }
        }

        /*let poiArray = prelimPathing.poiArray ;
        for (let i in poiArray) {
            for (let j in poiArray) {
                let pos1 = poiArray[i];
                let pos2 = poiArray[j];
                if (pos1 === pos2) {
                    continue;
                }
                let currentPath = getPathBetween(pos1, pos2, 1);//range 1
                costs = adjustCostMatrixToPreferPath(costs, currentPath.path);
            }
        }*/

        console.log("debug text - this code has been reached - prelimBurnInComplete", roomName);
        status.pathBurnIn = "completed";
    }

    status.completeSet = "completed";
    return prelimPathing;
}

function drawPoiCircle(roomName, poiCircle) {
    new RoomVisual(roomName).circle(poiCircle.x, poiCircle.y, {
        radius: poiCircle.r,
        opacity: 1,
        stroke: '#33aaff',
        fill: null
    });
}

function getAdjacentPositions(pos) {
    let deltas = [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    return _.map(deltas, d => new RoomPosition(pos.x + d.x, pos.y + d.y, pos.roomName));
}

function SourceControllerReference() {
    this.sourceId = '';
    this.controllerId = '';
    this.path = {};
    this.harvestSpot = {};
    this.collectEnergySpot = {};
    this.energyDistributionSpot = {};
    this.upgradeSpot = {};
}

SourceControllerReference.prototype.assignToSource = function (source) {
    Memory.sources[source.id].controllerReference = this;
    // maybe this section is to move harvestSpot to the first clearspot?
    let harvestSpot = JSON.parse(JSON.stringify(this.harvestSpot)); // isEquals doesn't work without this for some reason.
    Memory.sources[source.id].clearSpots = _.differenceWith(Memory.sources[source.id].clearSpots, [harvestSpot], _.isEqual);
    Memory.sources[source.id].clearSpots.unshift(harvestSpot);
};

function getControllerLayout(roomName, controllerArray, sourceArray) {
    if (controllerArray.length < 1) { return null; }
    let controller = controllerArray[0]; // we've been promised there will only ever be 0 or 1 controller in a room.

    if (!Memory.rooms[roomName].layout.status.controllerLayoutPlanned) { //change to true when done
        let sourceControllerReferences = [];
        for (let i in sourceArray) {
            let source = sourceArray[i];
            let scr = new SourceControllerReference;
            scr.sourceId = source.id;
            scr.controllerId = controller.id;
            scr.path = getPathBetween(source.pos, controller.pos, 3); // distance 3 from controller
            let poi = pointsOfInterestOnPath(scr.path);
            scr.harvestSpot = poi.harvestSpot;
            scr.collectEnergySpot = poi.collectEnergySpot;
            scr.energyDistributionSpot = poi.energyDistributionSpot;
            scr.upgradeSpot = poi.upgradeSpot;
            sourceControllerReferences.push(scr);

            scr.assignToSource(source);
        }
        Memory.rooms[roomName].layout.sourceControllerReferences = sourceControllerReferences;
        Memory.rooms[roomName].layout.status.controllerLayoutPlanned = true;
    }
    
    let controllerLayout = {
        controller: controller,
        sourceControllerReferences: Memory.rooms[roomName].layout.sourceControllerReferences,
    };
    return controllerLayout;
}

// takes source to controller @ range 3 path, returns the primary harvest, upgrade and energy drop & distribute locations
function pointsOfInterestOnPath(controllerPath){ 
        let harvestSpot;
        let upgradeSpot;
        let energyDistributionSpot;
        let collectEnergySpot;

        harvestSpot = controllerPath.path[0];
        
        if (controllerPath.path.length > 3) { // must be at least 4 apart to need different spots for upgrading, collecting/distributing, and harvesting
            upgradeSpot = _.nth(controllerPath.path, -1);
            energyDistributionSpot = _.nth(controllerPath.path, -2);                
            collectEnergySpot = controllerPath.path[1];
        } else if (controllerPath.path.length === 3) {
            upgradeSpot = controllerPath.path[2];
            energyDistributionSpot = controllerPath.path[1];         
            collectEnergySpot = controllerPath.path[1];
        } else if (controllerPath.path.length === 2) {
            upgradeSpot = controllerPath.path[1];
        }
        return {
            harvestSpot:harvestSpot,
            upgradeSpot:upgradeSpot,
            energyDistributionSpot:energyDistributionSpot,
            collectEnergySpot:collectEnergySpot,
        }
    }
function drawControllerLayout(controllerLayout) {

    for (let i in controllerLayout.sourceControllerReferences) {
        let scr = controllerLayout.sourceControllerReferences[i];

        let path = _.slice(scr.path, 1, scr.path.length - 1);
        new RoomVisual(roomName).poly(_.map(path, p =>[p.x, p.y]));

        new RoomVisual(scr.harvestSpot.roomName).circle(scr.harvestSpot.x, scr.harvestSpot.y, { radius: .45, opacity: .25, stroke: '#ff0000', fill: '#00ff00' });
        if ( scr.upgradeSpot ) {
            new RoomVisual(scr.upgradeSpot.roomName).circle(scr.upgradeSpot.x, scr.upgradeSpot.y, { radius: .45, opacity: .25, stroke: '#ff0000', fill: '#ffff00' });
        }
        if ( scr.energyDistributionSpot ) {
            new RoomVisual(scr.energyDistributionSpot.roomName).circle(scr.energyDistributionSpot.x, scr.energyDistributionSpot.y, { radius: .45, opacity: .25, stroke: '#00ff00', fill: '#00ff00' })
        }
        if ( scr.collectEnergySpot) {
            new RoomVisual(scr.collectEnergySpot.roomName).circle(scr.collectEnergySpot.x, scr.collectEnergySpot.y, { radius: .45, opacity: .25, stroke: '#00ff00', fill: '#ffff00' });
        }
    }
}

function getShortestPath(a) { return _.reduce(a, getShorterPath, { path: { length: 2000 } }) }
function getShorterPath(m, p) {
    if (m.path.length < p.path.length) {
        return m;
    } else {
        return p;
    }
}
/*
function adjustCostMatrix(roomName, path) {
    let costs = PathFinder.CostMatrix.deserialize(Memory.rooms[roomName].layoutCostMatrix);
    for (let i in path) {
        let pos = path[i];
        let x = pos.x; let y = pos.y;
        let currentCost = costs.get(x, y);
        let totalcost = currentCost - 5;
        costs.set(x, y, totalcost);

    }
    Memory.rooms[roomName].layoutCostMatrix = costs.serialize();
}
*/
function adjustCostMatrixToPreferPath(costs, path) {
    for (let i in path) {
        let pos = path[i];
        let x = pos.x; let y = pos.y;
        let currentCost = costs.get(x, y);
        let totalcost = currentCost - 10;
        costs.set(x, y, totalcost);

    }
    return costs;
}

function preferCenterOfPoI(roomName, boundingCircle,sourceArray,resourceArray,controllerArray) {

    let room = Game.rooms[roomName];
    // In this example `room` will always exist, but since PathFinder 
    // supports searches which span multiple rooms you should be careful!
    if (!room) { console.log(roomName + ' doesn\'t exist'); return; }

    let costs = new PathFinder.CostMatrix;

    let ct = new RoomPosition(boundingCircle.x, boundingCircle.y, roomName); // bounding circle centerv
    function getDistance(pos1, pos2) { return Math.sqrt((pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y)) }
    for (let x = 0; x < 50 ; x++) {
        for (let y = 0; y < 50 ; y++) {
            // individual position
            if (x === 0 || x === 49 || y === 0 || y === 49) { costs.set(x, y, 255); continue; }// set borders to unwalkable
            let currentSpot = new RoomPosition(x, y, roomName);
            let terrain = Game.map.getTerrainAt(currentSpot);
            if (terrain === 'wall') {
                costs.set(x, y, 255);
                //prefer not to path next to walls by applying treatments to spots next to them.
                let nextToThisWall = getAdjacentPositions(currentSpot);
                for (let index in nextToThisWall) {
                    let spotNextToWall = nextToThisWall[index];
                    costs.set(spotNextToWall.x, spotNextToWall.y, costs.get(spotNextToWall.x, spotNextToWall.y) + 3);
                }
                continue;
            }
            let terrainCost;
            if (terrain === 'swamp') { terrainCost = 2; }
            if (terrain === 'plain') { terrainCost = 0; }
            //distance from center of bounding circle
            //let ctCost = getDistance(ct, currentSpot);
            let ctCost = ct.getRangeTo(currentSpot);
            let currentCost = costs.get(x, y); //needed to capture the cost of previous treatments
            let totalcost = 30 + currentCost + ctCost + terrainCost; //+ s1Cost + s2Cost
            costs.set(x, y, totalcost);
        }

    }
    //todo - apply this as a treatment instead of testing every square (<2500) against multiple targets (50)
    // prefer not to path through worker spots
    let workerSpots = collectWorkerSpots(sourceArray,resourceArray,controllerArray);
    costs = discouragePathingThroughWorkerSpots(workerSpots,costs);
    /*let workerSpot = 0;
    if (
        _.some(sourceArray,s => s.pos.isNearTo(currentSpot)) ||
        _.some(resourceArray,r => r.pos.isNearTo(currentSpot)) ||
        _.some(controllerArray,r => r.pos.inRangeTo(currentSpot,3))
    ) {
        workerSpot = 100;
    }*/
    function collectWorkerSpots(sourceArray,resourceArray,controllerArray){
        let spotsNearSources = getSpotsWithinRangeOfTargets(1,sourceArray);
        let spotsNearResources = getSpotsWithinRangeOfTargets(1,resourceArray);
        let spotsNearController = getSpotsWithinRangeOfTargets(3,controllerArray);

        return [
            ...spotsNearSources,
            ...spotsNearResources,
            ...spotsNearController
        ]

    }
    function getSpotsWithinRangeOfTargets(range,arrayOfTargets){
        let spots = [];
        for (index in arrayOfTargets){
            let target = arrayOfTargets[index];
            let closeSpots = getSpotsWithinRangeOfTarget(range,target);
            spots = spots.concat(closeSpots)
        }
        return spots;
    }
    function getSpotsWithinRangeOfTarget(range,target){
        let center = target.pos;
        let leftEdge = Math.max( [center.x - range , 0 ] );
        let topEdge = Math.max( [center.y - range , 0 ] );
        let rightEdge = Math.min( [center.x + range , 49 ] );
        let bottomEdge = Math.min( [center.y + range , 49 ] );

        spots = [];
        for ( let y = topEdge; y <= bottomEdge; y++ ){
            for ( let x = leftEdge; x <= rightEdge; x++ ) {
                spots.push({
                    x: x,
                    y: y,
                    roomName: center.roomName,
                });
            }
        }

        return spots;
    }
    function discouragePathingThroughWorkerSpots(workerSpots,costs){
        for ( let index in workerSpots){

            let workerSpot = workerSpots[index];
            costs = discouragePathingThroughWorkerSpot(workerSpot,costs);

        }
        return costs;
    }

    function discouragePathingThroughWorkerSpot(workerSpot,costs){
        const WORKING_SPOT_PATH_PENALTY = 100;
        let currentCost = costs.get(x, y);
        costs.set( workerSpot.x, workerSpot.y, currentCost + WORKING_SPOT_PATH_PENALTY )
        return costs;
    }

    return costs;
}

function getCostMatrix(roomName) {
    if ( Memory.rooms[roomName].layout.prelimPathing.costMatrix ) {
        let costs = PathFinder.CostMatrix.deserialize(Memory.rooms[roomName].layout.prelimPathing.costMatrix);
        return costs;
    }
}



function confirmRoomMemoryInitialized(roomName) {
    console.log('confirming room '+roomName+' is initialized');
    if ( !Memory.rooms ) {
        console.log('Memory.rooms is null');
        initializeRoomMemory(roomName);
        return;
    }
    if ( !Memory.rooms[roomName] ) {
        console.log('Memory.rooms['+roomName+'] is null');
        initializeRoomMemory(roomName);
        return;
    }


    if ( !Memory.rooms[roomName].layout ) {
        console.log('Memory.rooms['+roomName+'].layout is null');
        initializeRoomMemory(roomName);
        return;
    }
    if ( !Memory.rooms[roomName].layout.status ) {
        console.log('Memory.rooms['+roomName+'].layout.status is null');
        initializeRoomMemory(roomName);
        return;
    }
    if ( !Memory.rooms[roomName].layout.status.prelimPathing ) {
        console.log('Memory.rooms['+roomName+'].layout.status.prelimPathing is null');
        initializeRoomMemory(roomName);
        return;
    }

    if ( initilizeEveryTurn ) {// for testing initializes every turn
        console.log('Memory.rooms[' + roomName + '] is initializing due to initializeEveryTurn being true');
        initializeRoomMemory(roomName);
        return;
    }

    console.log('Memory.rooms['+roomName+'] is not null');
}

//todo - initialize room memory values
function initializeRoomMemory(roomName) {
    console.log('initializing room - ', roomName);
    if ( !Memory.rooms ) { Memory.rooms = {} }
    Memory.rooms[roomName] = {};
    if ( !Memory.rooms[roomName].layout ) { Memory.rooms[roomName].layout = {}; }
    if ( !Memory.rooms[roomName].layout.status ) { Memory.rooms[roomName].layout.status = {}; }
    if ( !Memory.rooms[roomName].layout.status.prelimPathing )
    {
        Memory.rooms[roomName].layout.status.prelimPathing = {} ;
    }
    if ( !Memory.rooms[roomName].layout.prelimPathing )
    {
        Memory.rooms[roomName].layout.prelimPathing = {} ;
    }
    let room = Game.rooms[roomName];


    //console.log('room.controller ' + room.controller)
    Memory.rooms[roomName].controller = null;
    if ( room.controller ) {
        Memory.rooms[roomName].controller = room.controller.id;
        controllerThingamajig.confirmControllerInitialized(room.controller);
    }

    let roomSources = room.find(FIND_SOURCES);
    //let firstSource = room.find(FIND_SOURCES);
    Memory.rooms[roomName].sources = [];

    for (let index in roomSources) {
        let s = roomSources[index];
        Memory.rooms[roomName].sources.push(s.id);
        energySources.confirmSourceInitialized(s);
    }
}

function getPathBetween(pos1, pos2, r) {
    let goals = { pos: pos2, range: r };
    return PathFinder.search(pos1, goals, { roomCallback: getCostMatrix, });
}

module.exports = {
    confirmRoomMemoryInitialized: profiler.registerFN(confirmRoomMemoryInitialized),
    run: profiler.registerFN(roomLayout),
};
