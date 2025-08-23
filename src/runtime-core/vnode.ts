import { shapeFlags } from "../shared/shapeFlags"

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export function createVnode(type: any, props?: any, children?: any) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        key :props &&  props.key,
        component : null,
    }

    if (typeof children === 'string') {
        vnode.shapeFlag = vnode.shapeFlag | shapeFlags.TEXT_CHILDREN
    } else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | shapeFlags.ARRAY_CHILDREN
    }

    if (vnode.shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= shapeFlags.SLOT_CHILDREN
        }
    }
    return vnode
}

function getShapeFlag(type) {
    return typeof type === 'string' ? shapeFlags.ELEMENT : shapeFlags.STATEFUL_COMPONENT
}

export function createTextVnode(text: string) {
    return createVnode(Text,{},text)
}