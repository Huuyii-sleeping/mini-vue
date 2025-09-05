# slots实现

## 具名插槽的实现

1. 获取渲染的元素
2. 获取到渲染的位置

## 作用域插槽

能够进行数据的传递

## 实现

当我们使用作用域插槽的时候，我们可以将slot设置成对象的方法，设置对应的key的值，调用的时候swssssssssssssssssszz可以根据key的值进行调用

当我们使用具名插槽的时候，我们就直接使用数据进行存放表示就行

当我们想要使用插槽的时候，我们可以先设置组件的$solts方法，这样能够拿到对应的数据

在组件初始化的时候，我们可以初始化插槽`initSlots`

```ts
import { shapeFlags } from "../shared/shapeFlags"

// 将children转化成数组
export function initSlots(instance, children) {
    // chilren -> object
    const { vnode } = instance
    if (vnode.shapeFlag & shapeFlags.SLOT_CHILDREN) {
        normalizeObjectSlots(children, instance.slots)

    }
}

function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key]
        // slot
        slots[key] = (props) => normalizeSlotValue(value(props))
        // 记得要转换成数组的类型
    }
}

function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value]
}
```

在我们进行组件的渲染的时候

还可以对props赋值，组件的数据中就可以拿到对应的值

```ts
import { createVnode } from "../vnode";

export function renderSlots(slots, name,props) {

    const slot = slots[name]
    if (slot) {
        if (typeof slot === 'function') {
            return createVnode('div', {}, slot(props))
        }
    }
}
```

