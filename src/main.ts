let spawn1 = Game.spawns.Spawn1

/**
 * Returns a mapping of creeps based on rooms and roles.
 */
function catalogCreeps() {
  let roleCounts: {[role: string]: number} = {};
  let roomTotals: {[room: string]: number} = {};
  let creeps: {[room: string]: {[role: string]: Creep[]}} = {}

  for (let i in Game.creeps) {
    let creep = Game.creeps[i]
    let room = creep.room.name

    if (!(room in creeps)) {
      creeps[room] = {}
    }

    if (!(room in roomTotals)) {
      roomTotals[room] = 0
    }
    roomTotals[room]++

    let creepRole = creep.memory.role
    if (!(creepRole in creeps[room])) {
      creeps[room][creepRole] = []
    }

    if (!(creepRole in roleCounts)) {
      roleCounts[creepRole] = 0
    }
    roleCounts[creepRole]++

    creeps[room][creepRole].push(creep)
  }

  let total = 0;
  for (let role in roleCounts) {
    total += roleCounts[role];
  }

  return {
    creeps: creeps,
    roleCounts: roleCounts,
    total: total
  }
}

module.exports.loop = () => {
  let catalog = catalogCreeps();
  let creeps = catalog.creeps;
  let roleCounts = catalog.creeps;
  let totalCreeps = catalog.total;

  console.log(`found ${totalCreeps} creeps`)
  for (let role in roleCounts) {
    console.log(`role: ${roleCounts[role]}`)
  }
}
