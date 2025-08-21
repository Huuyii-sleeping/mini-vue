import { createVnode } from "./vnode"

export function createAppAPI(render) {
    return function createApp(rootComponent: any) {
        return {
            mount(rootContainer: any) {
                // all -> vnode -> operate
                const vnode = createVnode(rootComponent)
                render(vnode, rootContainer)
            }
        }
    }
}



