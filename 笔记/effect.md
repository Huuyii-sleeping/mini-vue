# Effect的实现

主要是就是依赖的收集 依赖的触发

```ts
// 创建一个类用来表示函数对象 具有对应的函数方法
class ReactiveEffect {
    private _fn: any;
    deps = []
    active = true
    onStop?: () => void

    constructor(fn, public scheduler?) {
        this._fn = fn
    }
    run() {
        activeEffect = this
        return this._fn()
    }
    stop() {
        // 避免频繁的调用
        if (this.active) { // 对于每一个effect只需要进行一次情况清空
            cleanupEffect(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }
    }
}
```

实现effect的基础功能

```ts
export function effect(fn, options: any = {}) {

    const _effect = new ReactiveEffect(fn, options.scheduler)
    // extend 将集合进行收集
    extend(_effect, options)

    _effect.run()
    const runner: any = _effect.run.bind(_effect)
    runner.effect = _effect

    return runner // 具有返回值
}
```

实现track功能 依赖的跟踪

```ts
const targetMap = new Map()
export function track(target, key) {
    // 构建容器 收集依赖
    //  set target -> key -> dep
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set()
        depsMap.set(key, dep)
    }

    if(!activeEffect)return 
    dep.add(activeEffect)
    // 进行反向收集 用来实现stop操作
    activeEffect.deps.push(dep)
}
```

trigger依赖的触发

```ts
export function trigger(target, key) {
    const depsMap = targetMap.get(target)
    const dep = depsMap.get(key)

    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}
```

stop的实现

```ts
export function stop(runner) {
    runner.effect.stop()
}
```

优化

注意 我们使用自身++的时候会触发set get操作所以我们需要在使用使用一个变量进行判断，是否应该进行收集依赖

```ts
run() {

        // 会收集依赖 对shouleTrack进行区分
        if (!this.active) { //前提是已经stop才这样进行操作
            return this._fn()
        }
        activeEffect = this
        shouldTrace = true

        const result = this._fn()
        shouldTrace = false
        return result
    }    
stop() {
        // 避免频繁的调用
        if (this.active) { // 对于每一个effect只需要进行一次情况清空
            cleanupEffect(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }
    }
```

```ts
export function track(target, key) {
    // 构建容器 收集依赖
    //  set target -> key -> dep
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set()
        depsMap.set(key, dep)
    }

    if (!activeEffect) return
    if (!shouldTrace) return
    dep.add(activeEffect)
    // 进行反向收集 用来实现stop操作
    activeEffect.deps.push(dep)
}
```

既然已经stop就不需要进行依赖收集了，直接delete就行
