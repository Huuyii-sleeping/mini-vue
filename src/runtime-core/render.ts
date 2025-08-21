import { shapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode"

export function render(vnode: any, container: any, parentComponent) {
    // patch
    patch(vnode, container, parentComponent)
}

function patch(vnode: any, container: any, parentComponent) {
    const { type, shapeFlag } = vnode
    switch (type) {
        case Fragment:
            processFragment(vnode, container,parentComponent)
            break
        case Text:
            processText(vnode, container)
        default:
            if (shapeFlag & shapeFlags.ELEMENT) {
                processElement(vnode, container,parentComponent)
            } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
                processComponent(vnode, container, parentComponent)
            }
            break
    }
}


function processText(vnode, container) {
    const { children } = vnode
    const textNode = (vnode.el = document.createTextNode(children))
    container.append(textNode)
}

function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent)
}
function processElement(vnode, container,parentComponent) {
    mountElement(vnode, container,parentComponent)
}

function mountElement(vnode, container,parentComponent) {
    const el = (vnode.el = document.createElement(vnode.type))
    const { children, shapeFlag } = vnode
    if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el,parentComponent)
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

function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
        patch(v, container, parentComponent)
    })
}

function processComponent(vnode: any, container: any, parentComponent) {
    mountComponent(vnode, container, parentComponent)
}

function mountComponent(initalVnode: any, container: any, parentComponent: any) {
    const instance = createComponentInstance(initalVnode, parentComponent)

    setupComponent(instance)
    setupRenderEffect(instance, initalVnode, container)
}

function setupRenderEffect(instance: any, initalVnode, container: any) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    //  vnode tree
    patch(subTree, container,instance)
    initalVnode.el = subTree.el
}