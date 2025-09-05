# Text实现

实现直接渲染文本

我们在vnode设置这种文件的类型然后再patch的时候进行特殊的处理

```ts
function patch(vnode, container) {
    // TODO 判断vnode是不是element ？区分element和component？
    // component -> obj element -> string

    //  使用shapesFlags 进行判断 
    const { type, shapeFlag } = vnode

    // Fragment -> 只渲染children 
    switch (type) {
        case Fragment:
            processFragment(vnode, container)
            break
        case Text:
            processText(vnode, container)
            break
        default:
            if (shapeFlag & shapeFlags.ELEMENT) {
                processElement(vnode, container)
                // STATEFUL_COMPONENT
            } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
                processComponent(vnode, container)
            }
            break
    }
}
```

后续的渲染直接使用原生dom操作渲染到container就行

```ts
function processText(vnode, container) {
    const { children } = vnode
    const textNode = (vnode.el = document.createTextNode(children))
    container.append(textNode)
}
```

