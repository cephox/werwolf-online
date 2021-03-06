import { devInit } from "./dev"
import { disableContextMenu, setGlobalBackground } from "./framework/framework"
import { generateStartScreen } from "./framework/screen/impl/startscreen"
import { nextScreen } from "./framework/screen/screen"
import { loadRoleInfoTexts, loadRolePopupTexts, State } from "./state"
import { WebsocketClient } from "./websocket"

async function init() {
    await loadRolePopupTexts()
    await loadRoleInfoTexts()

    await initWebsocket()
    devInit()
    disableContextMenu()
    setGlobalBackground("day")
    nextScreen(generateStartScreen())
}

async function initWebsocket() {
    var ws = new WebsocketClient((window.location.protocol == "http:" ? "ws://" : "wss://") + window.location.hostname + ":5354")
    await ws.start()
    State.ws = ws
}

window.onload = init
