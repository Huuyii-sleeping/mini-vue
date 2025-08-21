import { shallowReadonly } from "../reactivity/reactive"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { publicInstanceProxyHandler } from "./componentPublicInstance"

export function createComponentInstance(vnode: any) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { }
    }
    component.emit = emit.bind(null, component) as any
    return component
}

export function setupComponent(instance: any) {
    initProps(instance, instance.vnode.props)
    // initSlots()

    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandler)
    const { setup } = Component
    if (setup) {
        // function | object
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        })
        handlerSetupResult(instance, setupResult)
    }
}

function handlerSetupResult(instance: any, setupResult: any) {
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult
    }

    finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
    const Component = instance.type
    instance.render = Component.render
}