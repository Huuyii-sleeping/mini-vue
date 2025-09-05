# nextTick的实现

```ts
const p = Promise.resolve()
// 获取更新之后的组件的实例
export function nextTick(fn) {
    return fn ? p.then(fn) : p
}
```

本质就是Promise、

作用是将回调函数延迟到下一个DOM更新周期之后执行，

数据变化不会立即进行更新，而是异步批量更新

1. 在DOM更新之后执行回调
2. 解决了数据变化之后立即操作DOM的问题

