const HarvestManager = require('./harvest_manager').HarvestManager

interface CreepMemory {
    [name: string]: any
}

const base = Game.spawns["P3PS1"]
const controller = base.room.controller as StructureController
const source = Game.getObjectById("5bbca9f39099fc012e6306d7" as Id<Source>) as Source

const harvester = new HarvestManager(controller, source, base, 4)

module.exports.loop = () => {
    console.log(`[LOOP START] ${Game.time}`)
    harvester.run()
}