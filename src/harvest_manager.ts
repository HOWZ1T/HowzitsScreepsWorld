const randi = require('./utils').randi

// extend creep memory with harvester memory specific fields
interface HarvesterMemory extends CreepMemory {
    state: creepState
    role: string
    lastRenewalAttempt: number
}

// possible states for the harvester
enum creepState {
    HARVESTING,
    TRANSFERRING,
    RENEW
}

/**
 * Manages the harvesting of a source by a number of harvesters.
 */
module.exports.HarvestManager = class HarvestManager {
    controller: StructureController
    target: Source
    spawner: StructureSpawn
    base_name: string = "H2RV3ST3R-"
    base_body = [WORK, CARRY, CARRY, MOVE, MOVE]  // cost (in order) 100 | 50 | 50 | 50 | 50 = 300
    base_memory: HarvesterMemory = {
        state: creepState.HARVESTING,
        role: 'harvester',
        lastRenewalAttempt: -1
    }
    targetHarvesters: number

    public constructor(controller: StructureController, target: Source, spawner: StructureSpawn, targetHarvesters: number = 2) {
        this.controller = controller
        this.target = target
        this.spawner = spawner
        this.targetHarvesters = targetHarvesters
    }

    /**
     * Generates a random name for a creep in the format of H2RV3ST3R-A1B2-C3D4
     * @private
     */
    private generate_name() {
        let name = this.base_name

        for (let i= 2; i < 4; i++) {
            name += String.fromCharCode(65 + Math.floor(Math.random() * 26))
            name += randi(0, 9).toString()

            if (i % 2 == 0) name += '-'
        }

        return name
    }

    /**
     * Spawns a new harvester creep.
     * @private
     */
    private spawn() {
        // generate an available name
        let name: string
        do {
            name = this.generate_name()
        } while (Game.creeps[name] !== undefined)

        this.spawner.spawnCreep(this.base_body, name, {memory: this.base_memory})
    }

    /**
     * Returns a list of all creeps with the role of 'harvester'.
     * @protected
     */
    protected getHarvesters(): Creep[] {
        const creeps: Creep[] = []
        for (const name in Game.creeps) {
            const creep = Game.creeps[name]
            const mem = creep.memory as HarvesterMemory
            if (mem.role == 'harvester') creeps.push(creep)
        }
        return creeps
    }

    /**
     * AI Sub-routine for harvesting energy from the source.
     * @param creep
     * @param target
     * @private
     */
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

    /**
     * AI Sub-routine for moving energy to the spawner or the controller.
     * @param creep
     * @param target
     * @private
     */
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

    /**
     * AI Sub-routine for renewing the creep.
     * Note: this is considered an interrupted state as it is not part of the normal flow of state
     *
     * @param creep
     * @param target
     * @private
     */
    private renew(creep: Creep, target: StructureSpawn) {
        const ticksToLive = creep.ticksToLive
        const mem = creep.memory as HarvesterMemory

        if (ticksToLive === undefined) return

        if (creep.pos.isNearTo(target.pos)) {
            const res = target.renewCreep(creep)
            switch (res) {
                case ERR_FULL:
                    console.log(`[HARVEST MANAGER] Creep ${creep.name} Renewed`)
                    mem.state = creepState.TRANSFERRING
                    mem.lastRenewalAttempt = Game.time
                    break

                case ERR_NOT_ENOUGH_ENERGY:
                    console.log(`[HARVEST MANAGER] Creep ${creep.name} Renewing Failed: Not Enough Energy`)
                    mem.state = creepState.TRANSFERRING
                    mem.lastRenewalAttempt = Game.time
                    break

                case ERR_BUSY:
                    console.log(`[HARVEST MANAGER] Creep ${creep.name} (WAITING) Renewing Failed: Spawner Busy`)
                    break

                default:
                    console.log(`[HARVEST MANAGER] Creep ${creep.name} Renewing Failed: Unknown Error`)
                    mem.state = creepState.TRANSFERRING
                    mem.lastRenewalAttempt = Game.time
                    break
            }
            return
        }

        creep.moveTo(target.pos)
    }

    /**
     * Runs the appropriate AI sub-routine based on the current state of the creep.
     * Additionally, it handles triggering the renewal state if the creep is about to die.
     *
     * @param creep
     * @param target
     * @param controller
     * @protected
     */
    protected run_creep(creep: Creep, target: Source, controller: StructureController) {
        const mem = creep.memory as HarvesterMemory

        // check if we should renew the creep
        // this is an interrupted state as it is not part of the normal flow of state
        // neat display of short circuit logic to avoid comparing an undefined value
        //
        // TODO: add ability to restore to previous state after renewal
        if (creep.ticksToLive !== undefined && creep.ticksToLive < 150) {
            // check time since last renewal attempt
            const delta = Game.time - (mem.lastRenewalAttempt == -1 ? 15 : mem.lastRenewalAttempt)

            // if we've waited long enough, try to renew again
            if (delta > 15) {
                console.log(`[HARVEST MANAGER] Creep ${creep.name} [Interrupt] State Changed To Renewing`)
                mem.state = creepState.RENEW
            }
        }

        let state = mem.state
        if (state === undefined) state = creepState.HARVESTING

        // run the appropriate AI sub-routine based on the current state
        switch(state) {
            // harvests energy from the source
            case creepState.HARVESTING:
                this.harvest(creep, target)
                break

            // moves energy to the spawner or the controller
            case creepState.TRANSFERRING:
                // if the spawner is full, transfer to the controller
                this.transfer(creep, this.spawner.store.getUsedCapacity(RESOURCE_ENERGY) < 300 ? this.spawner : controller)
                break

            // attempts to renew the creep if the interrupted renewal state has been entered
            case creepState.RENEW:
                this.renew(creep, this.spawner)
                break
        }
    }

    public run() {
        console.log(`[HARVEST MANAGER] START ${Game.time}`)

        // fetch up to date game objects
        // TODO dynamically find sources
        this.spawner = Game.spawns[this.spawner.name]
        this.target = Game.getObjectById(this.target.id) as Source
        this.controller = Game.getObjectById(this.controller.id) as StructureController

        // maintain population
        const harvesters = this.getHarvesters()
        if (harvesters.length < this.targetHarvesters && this.spawner.spawning === null && this.spawner) {
            console.log(`[HARVEST MANAGER] SPAWNING (${harvesters.length} / ${this.targetHarvesters})`)
            this.spawn()
        }

        // run AI routines
        console.log(`[HARVEST MANAGER] MANAGING CREEPS`)
        harvesters.map((creep: Creep) => this.run_creep(creep, this.target, this.controller))

        console.log(`[HARVEST MANAGER] END ${Game.time}`)
    }
}