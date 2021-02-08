import * as lws from "ws"
import { v4 } from "uuid"
import { WSPacket } from "../wspacket"
import { dev_events } from "./dev"
import { addPlayer, createGame, deleteGame, Game, getGame, removePlayer } from "./game/game"


interface FnRes {
    ok?: any,
    error?: {
        title: string,
        data?: any
    }
}

var ws_connections: { id: string, ws: lws, name?: string, game?: Game }[] = []

export function wsBroadcast(name: string, data: any) {
    ws_connections.forEach(w => {
        var res = { name, data }
        console.log(res);
        w.ws.send(JSON.stringify(res))
    })
}

export function wsServerConnect(ws: lws) {
    var id = v4()
    const devpackethandler = (data: any) => {
        ws.send(JSON.stringify({
            data, id: "dev",
            name: "dev-packet"
        }))
    }
    var ready = false
    dev_events.on("packet", devpackethandler)
    ws.onclose = () => {
        dev_events.off("packet", devpackethandler)
        if(ws_connections[ws_connections.findIndex(e => e.id == id)] != undefined) {
            var game: Game | undefined = ws_connections[ws_connections.findIndex(e => e.id == id)].game
            if(game != undefined) {
                wsPacketHandler["quit-game"]({id: game.id}, ws, id)
                if(game.players.length == 0) {
                    deleteGame(game.id)
                }
            }
        }
        ws_connections.splice(ws_connections.findIndex(e => e.id == id), 1)
    }
    const onafteropen = () => {
        console.log("Somebody connected!!!")
        ws_connections.push({ id, ws })
    }
    ws.onmessage = async (ev) => {
        if (!ready) {
            onafteropen()
            ready = true
        }
        var j: WSPacket = JSON.parse(ev.data.toString())
        console.log(j);
        var res: WSPacket = {
            data: {},
            id: j.id,
            name: j.name
        }

        if (wsPacketHandler.hasOwnProperty(j.name)) {
            var fnres: FnRes = await wsPacketHandler[j.name](j.data, ws, id)
            if (fnres.error) {
                res.name = "error"
                res.data = fnres.error
            } else {
                res.data = fnres.ok
            }
        } else {
            res.name = "error"
            res.data = "Packet unknown: " + j.name
        }
        console.log(res);
        ws.send(JSON.stringify(res))
    }
}

function get_ws(id:string) {
    return ws_connections[ws_connections.findIndex(e => e.id == id)]
}

const wsPacketHandler: {[key:string]: (data:any, ws: lws, wsid: string) => Promise<FnRes>} = {
    "set-name": async (data, ws, wsid) => {
        for (var i in ws_connections) {
            if (ws_connections[i].id == wsid) {
                ws_connections[i].name = data["name"];
                return {ok: "ok"}
            }
          }
        return {error: {title: "User not found", data: "User not found"}}
    },
    "get-name": async (data, ws, wsid) => {
        for (var i in ws_connections) {
            if (ws_connections[i].id == wsid) {
                if (ws_connections[i].name) return {ok: ws_connections[i].name}
                return {error: {title: "No name", data: "no Name"}}
            }
          }
        return {error: {title: "User not found", data: "User not found"}}
    },
    "create-game": async (data, ws, wsid) => {
        return {ok: createGame(wsid).id}
    },
    "join-game": async (data, ws, wsid) => {
        var success = addPlayer(data["id"], get_ws(wsid).name!, get_ws(wsid).ws, wsid)
        if(!success) return {error: {title: "Game is inexistent", data: "No Game like this"}}
        ws_connections[ws_connections.findIndex(e => e.id == wsid)].game = getGame(data["id"])
        getGame(data["id"])?.players.forEach((player) => {
            if(player.ws == ws) return
            var packet: WSPacket = {name: "joined", data: {name: get_ws(wsid).name!}, id: 0}
            player.ws.send(JSON.stringify(packet))
        })
        return {ok: success}
    },
    "quit-game": async (data, ws, wsid) => {
        var success = removePlayer(data["id"], get_ws(wsid).ws)
        if(!success) return {error: {title: "No such game"}}

        var game = getGame(data["id"])!
        if(game.players.length != 0) {
            game.owner = ws_connections[ws_connections.findIndex(e => e.ws == game.players[0].ws)].id
            game.players.forEach((player) => {
                var packet: WSPacket = {name: "quitted", data: {}, id: 0}
                player.ws.send(JSON.stringify(packet))
            })
        }
        return {ok: success}
    },
    "get-players": async (data, ws, wsid) => {
        var players = getGame(data["id"])?.players!
        var names:string[] = []
        players.forEach(p => {
            var name = p.name
            if (p.ws == ws) name += " (Du)"
            names.push(name)
        })
        return {ok: names}
    },
    "is-mod": async(data, ws, wsid) => {
        return {ok: getGame(data["id"])?.owner == wsid}
    }
}