# reactive的实现

返回一个proxy对象

```ts
import { mutableHandlers, readonlyHandlers } from "./baseHandler"

// 注意及时的整理代码
export function reactive(raw) {
    return createActiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
    return createActiveObject(raw,readonlyHandlers)
}

// 对重复的代码进行封装
function createActiveObject(raw:any,baseHandlers){
    return new Proxy(raw,baseHandlers)
}

```

```ts
import { track, trigger } from "./effect"

const get = createGetter() //优化：只在初始化的时候擦你会调用一次
const set = createSetter()
const readonlyGet = createGetter(true)

function createGetter(isReadonly = false) {
    return function get(target, key) {
        const res = Reflect.get(target, key)
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}

function createSetter(isReadonly = false) {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value)
        trigger(target, key)
        return res
    }
}

export const mutableHandlers = {
    get : get,
    set : set
}

export const readonlyHandlers = {
    get : readonlyGet,
    set(target,key,value){
        return true
    }
}
```

