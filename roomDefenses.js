const profiler = require('screeps-profiler');


function planDefenses(roomName) {

    console.log("request to plan defenses for ", roomName);

    if ( Memory.rooms[roomName].layout.defenses && Memory.rooms[roomName].layout.status.defensesPlanned )
    {
        console.log("reusing defenses for ", roomName , "that have been saved ");
        return Memory.rooms[roomName].layout.defenses
    }
    console.log("planning defenses for ", roomName);
    //describe exits
    let edges = collectEdgePositions(roomName);
    let exits = collectExits(edges);

    let walls = planWallsFor(exits);

    Memory.rooms[roomName].layout.defenses = {
        exits: exits,
        walls: walls,
    };

    Memory.rooms[roomName].layout.status.defensesPlanned = true; //change to true when done

    return Memory.rooms[roomName].layout.defenses;
}

function collectEdgePositions(roomName){
    let edges = [];
    // topEdge
    for (let x = 0; x < 50; x++) {
        edges.push(new RoomPosition(x, 0, roomName));
    }
    // leftEdge
    for (let y = 0; y < 50; y++) {
        edges.push(new RoomPosition(0, y, roomName));
    }
    // bottomEdge
    for (let x = 0; x < 50; x++) {
        edges.push(new RoomPosition(x, 49, roomName));
    }
    // rightEdge
    for (let y = 0; y < 50; y++) {
        edges.push(new RoomPosition(49, y, roomName));
    }
    return edges;
}

function collectExits(edges){
    let exits = [];
    let exit = [];
    let lastWasWall = true;
    for (let i = 0 ; i < edges.length; i++) {
        let currentSpot = edges[i];
        if (!isWall(currentSpot)) {
            exit.push(currentSpot);
            lastWasWall = false;
        } else {
            if (!lastWasWall) {
                exits.push(exit);
                exit = [];
            }
            lastWasWall = true;
        }
    }
    return exits;
}

function isWall(p) {
    //console.log('Game.map.getTerrainAt(p)',p, Game.map.getTerrainAt(p));
    return Game.map.getTerrainAt(p) === 'wall';
}

function planWallsFor(exits){
    let walls = [];
    for (let i in exits) {
        let exit = exits[i];

        let wall = planWallForExit(exit);
        walls.push(wall);
    }
    return walls;
}

//todo use isWall validate wallStructure is needed either before adding or by trimming after
let MINIMUM_DISTANCE_FROM_EXIT = 2; // source http://docs.screeps.com/defense.html
let ROOM_SIZE = 50;

function planWallForExit(exit) {

    // direction array goes
    let direction = { x: exit[1].x - exit[0].x, y: exit[1].y - exit[0].y, };
    // get offset required from exit.
    let delta = {};
    if (exit[0].x === 0 ) { delta = { x: MINIMUM_DISTANCE_FROM_EXIT, y: 0 }; }
    if (exit[0].x === ROOM_SIZE - 1 ) { delta = { x: -1 * MINIMUM_DISTANCE_FROM_EXIT, y: 0 }; }
    if (exit[0].y === 0 ) { delta = { x: 0, y: MINIMUM_DISTANCE_FROM_EXIT }; }
    if (exit[0].y === ROOM_SIZE - 1 ) { delta = { x: 0, y: -1 * MINIMUM_DISTANCE_FROM_EXIT }; }

    // wall the length of the exit, offset
    let wall = _.map(exit, function (p) {
        return new RoomPosition(
            p.x + delta.x,
            p.y + delta.y,
            p.roomName
        );
    });

    // attach corner at beginning of array
    // extend the wall backwards 2 squares
    for (let d = 0; d < MINIMUM_DISTANCE_FROM_EXIT; d++) {
        let p = wall[0];
        let p0 = new RoomPosition(
            -1 * direction.x + p.x,
            -1 * direction.y + p.y,
            p.roomName
        );

        wall.unshift(p0);
    }
    // add one wall between the room edge and the offset start
    let p = wall[0];
    let p0 = new RoomPosition(
        -1 * delta.x / MINIMUM_DISTANCE_FROM_EXIT + p.x,
        -1 * delta.y / MINIMUM_DISTANCE_FROM_EXIT + p.y,
        p.roomName
    );

    wall.unshift(p0);

    // attach corner at end of array
    // extend the wall 2 squares
    for (let d = 0; d < MINIMUM_DISTANCE_FROM_EXIT; d++) {
        let p = wall[wall.length - 1];
        let p0 = new RoomPosition(
            1 * direction.x + p.x,
            1 * direction.y + p.y,
            p.roomName
        );

        wall.push(p0);
    }
    // add one wall between the room edge and the offset end
    p = wall[wall.length - 1];
    p0 = new RoomPosition(
        -1 * delta.x / MINIMUM_DISTANCE_FROM_EXIT + p.x,
        -1 * delta.y / MINIMUM_DISTANCE_FROM_EXIT + p.y,
        p.roomName
    );

    wall.push(p0);




    return wall;

}

function drawDefenses(defenses, roomName){

    for (let i in defenses.exits) {
        let exit = defenses.exits[i];
        new RoomVisual(roomName).poly(exit);
    }

    for (let i in defenses.walls) {
        let wall = defenses.walls[i];
        new RoomVisual(roomName).poly(wall, { stroke: '#330000', strokeWidth: 0.5 });
    }

}

module.exports = {
    planDefenses: profiler.registerFN(planDefenses),
    drawDefenses: profiler.registerFN(drawDefenses),
};
