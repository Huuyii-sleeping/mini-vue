# getCurrentInstance实现

在setup当中进行调用，能够拿到组件的实例对象

在调用setup的时候进行调用，在设置一个变量，在setup的时候，拿到对应的组件实例对象，调用这个函数的时候，直接返回这个参数就行，

！！注意：setup就是我们定义组件的时候自己进行定义的函数方法，我们调用setup的时候才会执行setup中的方法

```ts
let currentInstance = null
export function getCurrentInstance() {
    return currentInstance
}

// 能够查看什么时候赋值操作
// 设置中间层的概念 便于调试发现错误
export function setCurrentInstance(instance) {
    currentInstance = instance
}
```

在setup的时候进行返回

```ts
function setupStatefulComponent(instance) {
    // 调用setup 拿到返回值
    const Component = instance.type
    instance.proxy = new Proxy({ _: instance }, PubilcInstanceProxyHandlers)
    const { setup } = Component
    if (setup) {
        setCurrentInstance(instance)
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        })
        currentInstance = null
        handleSetupResult(instance, setupResult)
    }
}

```

