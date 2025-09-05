# shapeFlags实现

使用位运算执行的效率更高

能够使得给组件|元素打上标签实现更加方便快捷的操作

```ts
// 使用位运算能够更加高效的进行对比
export const enum shapeFlags {
    ELEMENT = 1 , // 0001
    STATEFUL_COMPONENT = 1 << 1, // 0010
    TEXT_CHILDREN = 1 << 2,
    ARRAY_CHILDREN = 1 << 3,
}
```

判断标签 shapeFlag

```ts
import { shapeFlags } from "../shared/shapeFlags"

export function createVnode(type, props?, children?) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type)
    }

    debugger
    if (typeof children === 'string') {
        vnode.shapeFlag = vnode.shapeFlag | shapeFlags.TEXT_CHILDREN
    } else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | shapeFlags.ARRAY_CHILDREN
    }
    return vnode
}

function getShapeFlag(type) {
    return typeof type === 'string' ? shapeFlags.ELEMENT : shapeFlags.STATEFUL_COMPONENT
}
```

