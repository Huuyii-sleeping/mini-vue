# emit的实现

作用：

找到对应的函数进行调用，并且可以进行参数的传递

对于组件实例来说需要增加这个emit实例来进行操作

```ts
export function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit : () => {}
    }
    component.emit = emit.bind(null,component) as any
    return component
}
```

在setup的时候传递过去

```ts
function setupStatefulComponent(instance) {
    // 调用setup 拿到返回值
    const Component = instance.type
    instance.proxy = new Proxy({ _: instance }, PubilcInstanceProxyHandlers)
    const { setup } = Component
    if (setup) {
        // function object          设置只读属性
        const setupResult = setup(shallowReadonly(instance.props),{
            emit:instance.emit,
        })
        handleSetupResult(instance, setupResult)
    }
}
```

我们设置单独的文件单独的设置emit文件

emit就是找到对应的函数，进行调用

```ts
import { camelize, toHandlerKey } from "../shared"
// 这里注意设置参数的传递
export function emit(instance, event,...args) {
    console.log('emit', event)

    // instance.ptops -> event
    const { props } = instance

    // TPP开发技巧
    // 先写一个特定的行为 -> 重构成新的通用的行为
    // add
    // add-foo -> addFoo

    const handlerName = toHandlerKey(camelize(event))
    const handler = props[handlerName]
    handler && handler(...args)
}
```

