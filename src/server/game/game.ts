import { Player } from "./player"
import * as lws from "ws"

var games: Game[] = []

export class Game {
    public id: string
    public players: Player[] = []
    public owner_id: string

    constructor(owner_id: string) {
        this.id = generateGameId()
        this.owner_id = owner_id
        games.push(this)
    }

    public addPlayer(name: string, id: string, ws: lws) {
        this.players.push(new Player(name, id, ws, this))
    }

    public removePlayer(id: string) {
        var player: Player = this.players.splice(this.players.findIndex(e => e.id == id), 1)[0]
        if(player.loves_id) {
            var loves = this.getPlayer(player.loves_id)!
            loves.loves_id = ""
            loves.inLove = false
        }
        if(player.undersleeper_id) this.getPlayer(player.undersleeper_id)!.sleeping_by = ""
        if(player.sleeping_by) this.getPlayer(player.sleeping_by)!.undersleeper_id = ""
        this.owner_id = this.players[0].id
    }

    public getPlayer(id: string): Player | undefined {
        return this.players.find(p => p.id == id)
    }

    public shufflePlayers() {
        this.players.sort(() => Math.random() - 0.5)
    }

    public delete(): void {
        games.splice(games.findIndex(e => e === this), 1)
    }
}

function generateGameId() {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    var result = ""
    for(var i = 0; i < 20; i++) {
        var item = possible[Math.floor(Math.random() * possible.length)];
        result += item
    }
    return result
}

export function getGame(id: string): Game | undefined {
    return games.find(e => e.id == id)
}
