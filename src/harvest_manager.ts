const randi = require('./utils').randi

interface HarvesterMemory extends CreepMemory {
    state: creepState
    role: string
}

enum creepState {
    HARVESTING,
    TRANSFERRING,
}

module.exports.HarvestManager = class HarvestManager {
    controller: StructureController
    target: Source
    spawner: StructureSpawn
    base_name: string = "H2RV3ST3R-"
    base_body = [WORK, CARRY, MOVE, MOVE]
    base_memory: HarvesterMemory = {
        state: creepState.HARVESTING,
        role: 'harvester'
    }
    targetHarvesters: number

    public constructor(controller: StructureController, target: Source, spawner: StructureSpawn, targetHarvesters: number = 2) {
        this.controller = controller
        this.target = target
        this.spawner = spawner
        this.targetHarvesters = targetHarvesters
    }

    private generate_name() {
        let name = this.base_name

        for (let i = 0; i < 4; i++) {
            name += String.fromCharCode(65 + Math.floor(Math.random() * 26))
            name += randi(0, 9).toString()

            if (i % 2 == 0) name += '-'
        }

        return name
    }

    private spawn() {
        // generate an available name
        let name: string
        do {
            name = this.generate_name()
        } while (Game.creeps[name] !== undefined)

        this.spawner.spawnCreep(this.base_body, name, {memory: this.base_memory})
    }

    protected getHarvesters(): Creep[] {
        const creeps: Creep[] = []
        for (const name in Game.creeps) {
            const creep = Game.creeps[name]
            const mem = creep.memory as HarvesterMemory
            if (mem.role == 'harvester') creeps.push(creep)
        }
        return creeps
    }

    private harvest(creep: Creep, target: Source) {
        const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY)
        const mem = creep.memory as HarvesterMemory
        if (freeCap <= 0) {
            mem.state = creepState.TRANSFERRING
            return
        }

        if (creep.pos.isNearTo(target.pos)) {
            creep.harvest(target)
            return
        }

        creep.moveTo(target.pos)
    }

    private transfer(creep: Creep, target: StructureController | StructureSpawn) {
        const freeCap = creep.store.getFreeCapacity(RESOURCE_ENERGY)
        const fullCap = creep.store.getCapacity(RESOURCE_ENERGY)

        const mem = creep.memory as HarvesterMemory
        if (freeCap == fullCap) {
            mem.state = creepState.HARVESTING
            return
        }

        if (creep.pos.isNearTo(target.pos) && freeCap < fullCap) {
            creep.transfer(target, RESOURCE_ENERGY)
            return
        }

        creep.moveTo(target.pos)
    }

    protected run_creep(creep: Creep, target: Source, controller: StructureController) {
        const mem = creep.memory as HarvesterMemory
        let state = mem.state
        if (state === undefined) state = creepState.HARVESTING

        switch(state) {
            case creepState.HARVESTING:
                this.harvest(creep, target)
                break

            case creepState.TRANSFERRING:
                // if the spawner is full, transfer to the controller
                this.transfer(creep, this.spawner.store.getUsedCapacity(RESOURCE_ENERGY) < 300 ? this.spawner : controller)
                break
        }
    }

    public run() {
        console.log(`[HARVEST MANAGER] START ${Game.time}`)
        // maintain population
        const harvesters = this.getHarvesters()
        if (harvesters.length < this.targetHarvesters && this.spawner.spawning === null) {
            console.log(`[HARVEST MANAGER] SPAWNING (${harvesters.length} / ${this.targetHarvesters})`)
            this.spawn()
        }

        // run AI routines
        console.log(`[HARVEST MANAGER] MANAGING CREEPS`)
        harvesters.map((creep: Creep) => this.run_creep(creep, this.target, this.controller))

        console.log(`[HARVEST MANAGER] END ${Game.time}`)
    }
}