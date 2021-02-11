import { Role, RoleName, roles } from "../../role"
import * as lws from "ws"
import { WSPacket } from "../../wspacket"

interface Player {
    name: string,
    role?: Role,
    inLove?: boolean,
    ws: lws,
    id: string,
    major: boolean,
    dead: boolean
}

export class Game {
    public players: Player[] = []
    public night: boolean = true
    public roles: {role: Role, amount:number}[] = []

    public currentRoleIndex = -1
    public currentRole:Role = roles[0].role

    constructor(public id: string, public owner:string) {}

    private sendPlayerUpdate() {
        var packet: WSPacket = {
            name: "player-update",
            data: {},
            id: 189
        }
        this.players.forEach(player => {
            player.ws.send(JSON.stringify(packet))
        })
    }

    private nextRole() {
        if (this.currentRoleIndex == roles.length - 1) this.currentRoleIndex = 0
        else this.currentRoleIndex++
        this.currentRole = roles[this.currentRoleIndex].role
        var found = false
        for(var r of this.roles) {
            if(r.role.name == this.currentRole.name && r.amount != 0) found = true
        }
        if(!found) this.nextRole()
    }

    private nextMove() {
        if(this.currentRole.name == RoleName.WERWOLF) {
            this.roleTurn(this.currentRole)
            this.roleTurn(roles.find(e => e.name == RoleName.GIRL)!.role)
            this.currentRoleIndex++
        } else if (this.currentRole.name == RoleName.VILLAGER) {
            this.setDay()
            this.sendPlayerUpdate()
            this.currentRoleIndex = 0
        } else {
            this.roleTurn(this.currentRole)
        }
    }

    public moveDone() {
        this.roleUnturn()
        this.nextRole()
        this.nextMove()
    }

    private roleTurn(role: Role) {
        var packet: WSPacket = {
            name: "turn",
            id: 126,
            data: {}
        }
        this.players.forEach(player => {
            if(player.role!.name != role.name) return
            player.ws.send(JSON.stringify(packet))
        })
    }

    private roleUnturn() {
        var packet: WSPacket = {
            name: "unturn",
            id: 126,
            data: {}
        }
        if(this.currentRole.name == RoleName.VILLAGER) packet.name = "game-night"
        this.players.forEach(player => {
            player.ws.send(JSON.stringify(packet))
        })
    }

    public start() {
        this.setRoles()
        this.transmitRoles()
        this.setNight()
        setTimeout(() => this.moveDone(), 1000)
    }

    private setNight() {
        this.night = true
        var packet: WSPacket = {
            name: "game-night",
            id: 11,
            data: {}
        }
        this.players.forEach(player => {
            player.ws.send(JSON.stringify(packet))
        });
    }

    private setDay() {
        this.night = false
        var packet: WSPacket = {
            name: "game-day",
            id: 11,
            data: {}
        }
        this.players.forEach(player => {
            player.ws.send(JSON.stringify(packet))
        });
    }

    private transmitRoles() {
        this.players.forEach(player => {
            var packet: WSPacket = {
                name: "role-reveal",
                id: 10,
                data: {
                    "role": player.role
                }
            }
            console.log(player.role)
            player.ws.send(JSON.stringify(packet))
        });
    }

    private setRoles() {
        this.players = this.shufflePlayers()
        
        var i = 0
        for(var role of this.roles) {
            for(var next = 0; next < role.amount; next++) {
                this.players[i].role = role.role
                i++
            }
        }
    }

    private shufflePlayers() {
        var j, x, i;
        for (i = this.players.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = this.players[i];
            this.players[i] = this.players[j];
            this.players[j] = x;
        }
        return this.players;
    }

    public getLink(): string {
        return createGameLink(this.id)
    }

    public getPlayer(id:string): Player {
        return this.players[this.players.findIndex(e => e.id == id)]
    }
}

var games: {id: string, game: Game}[] = []

export function getGame(id: string) {
    var index = games.findIndex(e => e.id == id)
    if(index == -1) return undefined
    return games[index].game
}

export function createGame(owner:string): Game {
    var id = createId()
    var game: Game = new Game(id, owner)
    games.push({id, game})
    return game
}

export function deleteGame(gameid:string) {
    games.splice(games.findIndex(e => e.id == gameid), 1)
}

export function addPlayer(gameid: string, name:string, ws:lws, id:string): boolean {
    var game = getGame(gameid)
    if(game == undefined) return false
    var player: Player = {
        name: name,
        ws: ws,
        id: id,
        major: false,
        dead: false
    }
    game.players.push(player)
    return true
}

export function removePlayer(gameid:string, ws:lws) {
    var game = getGame(gameid)
    if(game == undefined) return false
    game.players.splice(game.players.findIndex(e => e.ws == ws), 1)
    return true
}

function createGameLink(id: string): string {
    return window.location.host + "?game=" + id
}

function createId() {
    return Math.random().toString(36).substr(2, 9);
}
