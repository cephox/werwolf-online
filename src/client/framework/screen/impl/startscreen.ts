import { Packet } from "../../../../packet"
import { RoleName } from "../../../../role"
import { Game } from "../../../game/game"
import { State } from "../../../state"
import { createButton } from "../../button"
import { addBreak } from "../../framework"
import { createImage } from "../../image"
import { createInputField } from "../../input"
import { Message, Urgency } from "../../message"
import { displayRolePopup } from "../../popup"
import { createHeader, createText } from "../../text"
import { get_game_id } from "../../urlutils"
import { nextScreen, Screen } from "../screen"
import { generateWaitRoomScreen } from "./waitroom"

export function generateStartScreen(): Screen {
    var div = document.createElement("div")

    div.appendChild(createHeader("h1", "Werwölfe"))
    var name = createInputField("Name", "", async () => {
        if(get_game_id()) await joinGameButton()
        else await createGameButton()
    }, "name-field", [])
    setTimeout(() => name.focus(), 100)
    div.appendChild(name)

    addBreak(div)
    if(get_game_id()) div.appendChild(createButton("Spiel beitreten", async () => await joinGameButton(), "btn-inline"))
    div.appendChild(createButton("Spiel erstellen", async () => await createGameButton(), "btn-inline"))

    div.appendChild(createRoleList())

    var copyright = document.createElement("div")
    copyright.id = "copyright"
    copyright.textContent = "Code by Paul Stier, Images by Siri Bürkle"
    div.appendChild(copyright)

    return {
        element: div
    }
}

function createRoleList(): HTMLDivElement {
    var div = document.createElement("div")
    div.classList.add("roles")
    
    div.appendChild(createHeader("h3", "Folgende Rollen sind verfügbar:"))
    div.appendChild(createText("Klicke auf eine Rolle, um mehr über sie zu erfahren.", "role-description-text"))

    for(var r in RoleName) {
        var role = document.createElement("div")
        role.classList.add("role-div")
        role.id = "role-div-" + r

        role.onclick = (ev) => {
            var id = (<HTMLDivElement>ev.target).id.split("-")[2]
            if(id == undefined) return
            //@ts-expect-error
            displayRolePopup(id)
        }

        role.appendChild(createImage("/static/assets/characters/" + r.toLowerCase() + ".png", "role-img"))

        var name = document.createElement("div")
        name.classList.add("role-name")
        //@ts-expect-error
        name.textContent = RoleName[r]
        role.appendChild(name)

        div.appendChild(role)
    }

    return div
}

function checkUsername(): string | undefined {
    var name = (<HTMLInputElement>document.getElementById("name-field")).value
    if(name) {
        if(/^[A-z0-9 ]*$/.test(name.trim())) return name.trim().replace(/\s\s+/g, ' ')
        else new Message("Dein Name darf nur A-z, 0-9 und Leerzeichen enthalten!", 5000, Urgency.ERROR).display()
    } else {
        new Message("Du musst deinen Namen angeben!", 5000, Urgency.ERROR).display()
    }

    return undefined
}

async function joinGameButton() {
    var v = checkUsername()
    if(!v) return
    joinGame(v, get_game_id()!)
}

async function createGameButton() {
    var v = checkUsername()
    if(!v) return
    await createGame(v)
}


async function createGame(name: string) {
    var id: string = (await State.ws.sendAndRecvPacket(new Packet("create-game"))).data
    new Message("Du hast das Spiel ID \"" + id + "\" erstellt").display()
    await joinGame(name, id, true)
}

async function joinGame(name: string, game_id: string, self_created: boolean = false) {
    var result: string = (await State.ws.sendAndRecvPacket(new Packet("join-game", {name: name, game_id: game_id}))).data
    if(result == "success") {
        new Message("Du bist dem Spiel \"" + game_id + "\" beigetreten").display()
        State.game = new Game(game_id)
        State.game.self_is_owner = self_created
        nextScreen(await generateWaitRoomScreen())
    } else {
        new Message(result, 5000, Urgency.ERROR).display()
    }
}
