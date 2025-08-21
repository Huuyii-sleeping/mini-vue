export function createComponentInstance(vnode: any) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    }

    return component
}

export function setupComponent(instance: any) {
    // initProps()
    // initSlots()

    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
    const Component = instance.type
    instance.proxy = new Proxy({}, {
        get(target, key) {
            const { setupState } = instance
            if (key in setupState) {
                return setupState[key]
            }
        }
    })
    const { setup } = Component
    if (setup) {
        // function | object
        const setupResult = setup()
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