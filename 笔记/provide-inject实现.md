# provide-inject实现

简单的实现

实现两个函数 provide + inject

首先我们直接可以在创建组件实例对象的时候携带provides，到时候便于直接进行搜索，后面我们可以直接进行调用

```ts
export function createComponentInstance(vnode,parent) {
    const component = {
        ...
        provides : parent ? parent.provides : {},
        parent,
    }
    component.emit = emit.bind(null, component) as any
    return component
}
```

provide自动的进行初始化我们直观印象就是拿到父组件对应的值进行操作

当我们进行组件实例创建的时候能够设置parent的值

后面就是设置provide + inject

实现这两个组件实例的时候我们需要拿到对应的组件的实例对象中的provides操作

provide就是重点实现组件的的父组件原型链的查找

```ts
export function provide(key, value) {
    // 存储数据
    // key value
    const currentInstance: any = getCurrentInstance()
    if (currentInstance) {
        let { provides } = currentInstance
        const parentProvides = currentInstance.parent.provides
        // 性能优化判断 避免重复的初始化provides对象
        // 一开始我们是直接调用的继承父组件的provide 所以我们这里进行判断
        // 通过原型链创建自己继承的新对象
        if (provides === parentProvides) {
            // 创建一个对象，并将原型（_proto_）指向父组件的provides
            // 实现原型链额继承 查找的时候能够沿着原型链进行查找
            provides = currentInstance.provides = Object.create(parentProvides)
        }
        provides[key] = value
    }
}
```

inject就是实现查找的结果 以及在没有查找到的情况下，如何处理默认值

```ts
export function inject(key,defaultValue) {
    const currentInstance: any = getCurrentInstance()
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides
        if (key in parentProvides) {
            return parentProvides[key]
        }else if(defaultValue){
            if(typeof defaultValue === 'function'){
                return defaultValue()
            }else if(defaultValue === 'string'){
                return defaultValue
            }
        }
    }
}
```

实际的应用

```ts
import { h, provide, inject } from "../../lib/guide-mini-vue.esm.js"

// parent
const Provider = {
    name: 'Provider',
    setup() {
        provide('foo', 'fooVal')
        provide('bar', 'barVal')
    },
    render() {
        // children 必须是数组
        return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
    }
}

const ProviderTwo = {
    name: 'ProviderTwo',
    setup() {
        provide('foo','fooTwoVal')
        const foo = inject('foo')
        return {
            foo
        }
    },
    render() {
        // children 必须是数组
        return h('div', {}, [h('p', {}, `ProviderTwo foo:${this.foo}`), h(Consumer)])
    }
}

// children
const Consumer = {
    name: 'Consumer',
    setup() {
        const foo = inject('foo')
        const bar = inject('bar')
        // 支持默认值的功能
        const baz = inject('baz',() => 'bazDefault')

        return {
            foo, bar,baz
        }
    },
    render() {
        return h('div', {}, `Consumer:-${this.foo}-${this.bar}-${this.baz}`)
    }
}


export const App = {
    name: 'App',
    render() {
        return h('div', {}, [h('p', {}, 'apiInject'), h(Provider)])
    },
    setup() {
        return {}
    }
}
```

