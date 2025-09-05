# readonly的实现

和 reacive类似

也是返回的是proxy

就是不会进行依赖的收集和触发

并且不能进行set的设置 进行设置就会报错

```ts
export function readonly(raw) {
    return createActiveObject(raw,readonlyHandlers)
}

// 对重复的代码进行封装
function createActiveObject(raw:any,baseHandlers){
    return new Proxy(raw,baseHandlers)
}

```

```ts
export const readonlyHandlers = {
    get : readonlyGet,
    set(target,key,value){
        console.warn(`key : ${key} set failure target is readonly`,target)
        return true
    }
}
```

