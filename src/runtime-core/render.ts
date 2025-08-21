import { isObject } from "../shared"
import { shapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"

export function render(vnode: any, container: any) {
    // patch
    patch(vnode, container)
}

function patch(vnode: any, container: any) {
    const { shapeFlag } = vnode
    if (shapeFlag & shapeFlags.ELEMENT) {
        processElement(vnode, container)
    } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
    }
}

function processElement(vnode, container) {
    mountElement(vnode, container)
}

function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type))
    const { children, shapeFlag } = vnode
    if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el)
    }
    const { props } = vnode
    for (const key in props) {
        const val = props[key]
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
    container.append(el)
}

function mountChildren(vnode, container) {
    vnode.children.forEach((v) => {
        patch(v, container)
    })
}

function processComponent(vnode: any, container: any) {
    mountComponent(vnode, container)
}

function mountComponent(initalVnode: any, container: any) {
    const instance = createComponentInstance(initalVnode)

    setupComponent(instance)
    setupRenderEffect(instance, initalVnode, container)
}

function setupRenderEffect(instance: any, initalVnode, container: any) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    //  vnode tree
    patch(subTree, container)
    initalVnode.el = subTree.el
}