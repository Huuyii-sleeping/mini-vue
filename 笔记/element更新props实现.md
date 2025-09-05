# element更新props实现

当我我们的数据使用ref发生变化的时候，我们可以考虑使用依赖收集和触发依赖进行操作 使用effect收集render生成树的操作

当响应式的数据发生变化的时候，自动调用effect这个方法实现，更新之后的subTree的实现，

我们在传入值的时候我们可以传入原组件进判断对比element的更新，我们可以在组件实例对象上面随意设置特殊的值来表示我们进行到哪一步了，这个方法好用

这个就能用来初始化还是更新对应的值

！！！h中想要使用的函数操作记得将props写入第二个参数，不然会undefined 记得参数的传递

```ts
effect(() => {
            if (!instance.isMounted) {
                const { proxy } = instance
                // 虚拟节点树
                const subTree = (instance.subTree = instance.render.call(proxy))
                console.log(subTree)
                // vnode tree
                // vnode -> patch
                // component -> vnode : element -> mountElement
                patch(null, subTree, container, instance)
                // 获取处理之后的结果
                initialVnode.el = subTree.el
                instance.isMounted = true
            } else {
                const { proxy } = instance
                const subTree = instance.render.call(proxy)
                const preSubTree = instance.subTree
                instance.subTree = subTree
                patch(preSubTree, subTree, container, instance)
            }

        })
```

effec调用之后我们就是对element进行对比改变值

effect值的变化主要是三种

1. 原来的值现在不一样了
2. 原来存在的值存在 但是是null|undefined
3. 这个属性在新的里面没有了 直接删除了

2，3就是删除操作 1就是替换操作

```ts
    function patchElement(n1, n2, container) {
        // props进行对比更新
        const oldProps = n1.props || {}
        const newProps = n2.props || {}
        const el = (n2.el = n1.el)
        patchProps(el, oldProps, newProps)

    }
    // 对比更新操作
    function patchProps(el, oldProps, newProps) {
        if (oldProps === newProps) return
        for (const key in newProps) {
            const prevProp = oldProps[key]
            const nextProp = newProps[key]
            if (prevProp !== nextProp) {
                hostPatchProp(el, key, prevProp, nextProp)
            }
        }
        if (Object.keys(oldProps).length !== 0) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps, null)
                }
            }
        }
    }
```

在上述的情况中我们可以在patchProp中进行判断

```ts
function patchProp(el, key,prevVal,nextval) {
    const isOn = (key) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
        // 注册点击事件 具体 -> 通用
        // on+Event
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, nextval)
    } else {
        if(nextval === undefined||nextval === null){
            el.removeAttribute(key)
        }else{
           el.setAttribute(key, nextval) 
        }
    }
}
```

使用特殊的表示进行判断