# computed

设置一个类进行区分

```ts
class ComputedRefImpl {
    private _getter: any
    private _dirty: boolean = true
    private _value: any
    private _effect: any

    constructor(getter) {
        this._getter = getter
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) this._dirty = true
        })
        // 不要每次都执行原函数
        // 使用schdulers进行处理 getter不会执行多次
    }
    get value() {
        // get调用之后需要锁定 
        // 当依赖的响应式的对象发生改变
        // effect
        if (this._dirty) {
            this._dirty = false // 只调用一次
            this._value = this._effect.run()
        }
        return this._value
    }
}

export function computed(getter) {
    return new ComputedRefImpl(getter)
}
```

实现的点 ： 

- 懒加载
- 值的重复调用不会重复的执行getter
- 使用原来的对响应式的作用