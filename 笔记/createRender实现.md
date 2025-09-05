# createRender自定义渲染器实现

允许开发的时候脱离DOM环境，将Vue组件渲染到任意的特定的平台（小程序，Canvas，Native等）

实现跨平台的渲染

性能优化

解释渲染逻辑

createRender的实现主要是我们将不同的渲染封装成不同的函数

我们在进行DOM的渲染的时候，我们就设置特定的createElement，patchProp，insert方法进行调用

使用参数的形式进行操作 不使用固定的值进行操作

现在我们将render放到了渲染器的当中，所以我们还需要对函数方法进行重构操作

```ts
export function  createRender(options) {

    const {
        createElement,
        patchProp,
        insert,
    } = options
	// 想要调用里面的render函数
    return {
        // createAppAPI是我们在外界进行定义的操作，我们这个操作需要使用render函数，我们就把这个函数传递到这里面，直接进行操作，最后直接返回结果就行
        createApp : createAppAPI(render)
    }
}
```

将原来render的操作封装到这个函数的里面

外界需要使用render的函数 用来创建createApp

```ts
import { createVnode } from "./vnode"

export function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {

                // 转换成虚拟节点
                // 后续的操作 基于虚拟节点处理
                const vnode = createVnode(rootComponent)
                render(vnode, rootContainer)
            }
        }
    }
}

```



我们想要渲染到其他组件的时候，我们可以使用自定义的options进行渲染（自己写方法设置渲染的形式）

后续直接进行调用

```ts
    const {
        createElement : hostCreateElement,
        patchProp : hostPatchProp,
        insert : hostInsert,
    } = options
```

eg : 当我们想要渲染到canves上面

```ts
// main.ts

import { createRender } from '../../lib/guide-mini-vue.esm.js'
import { App } from './App.js'

const game = new PIXI.Application({
    width: 500,
    height: 500,
})

document.body.append(game.view)

// ！！！！重点就是自己写创建元素 处理props append的过程

const render = createRender({
    createElement(type) {
        // 元素的创建
        if(type === 'rect'){
            const rect = new PIXI.Graphics()
            rect.beginFill(0xff0000)
            rect.drawRect(0,0,100,100)
            rect.endFill()
            return rect
        }
    },
    // 设置传递的值
    patchProp(el, key, val) {
        el[key] = val
    },
    insert(el, parent) {
        // 就是append操作
        parent.addChild(el)
    }
})
// 正确的进行mount
render.createApp(App).mount(game.stage)

```

进行值的设定

```ts
// App.js
import { h } from "../../lib/guide-mini-vue.esm.js"

export const App = {
    setup() {
        return {
            x: 100,
            y: 100,
        }
    },
    render() {
        return h('rect', { x: this.x, y: this.y })
    }
}
```

