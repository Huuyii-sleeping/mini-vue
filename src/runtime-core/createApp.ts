import { render } from "./render"
import { createVnode } from "./vnode"

export function createApp(rootComponent: any) {
    return {
        mount(rootContainer: any) {
            // all -> vnode -> operate
            const vnode = createVnode(rootComponent)
            render(vnode,rootContainer)
        }
    }
}

