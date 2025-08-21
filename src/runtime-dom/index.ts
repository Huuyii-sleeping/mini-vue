import { createRender } from '../runtime-core'

function createElement(type) {
    return document.createElement(type)
}

function patchProps(el, key, val) {
    const isOn = (key: string) => {
        return /^on[A-Z]/.test(key)
    }
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, val)
    } else {
        el.setAttribute(key, val)
    }
}

function insert(el, container) {
    container.append(el)
}

const render: any = createRender({
    createElement,
    patchProps,
    insert,
})

export function createApp(...args) {
    return render.createApp(...args)
}

export * from '../runtime-core'
