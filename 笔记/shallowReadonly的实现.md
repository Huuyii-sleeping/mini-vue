# shallowReadonly

使用第二个参数进行设置，来判断是否能够进行shallow

当是true的时候就直接

返回值就行，不需要对内部的进行操作

```ts
function createGetter(isReadonly = false,shallow = false) {
    return function get(target, key) {
        
        if(key === ReactiveFlags.IS_RAECTIVE){
            return !isReadonly
        }else if(key === ReactiveFlags.IS_READONLY){
            return isReadonly
        }

        const res = Reflect.get(target, key)

        if(shallow){
            return res
        }

        // 嵌套的逻辑的实现
        // 判断res是不是obj 直接再次包裹就行
        if(isObject(res)){
            return isReadonly?readonly(res) : reactive(res)
        }

        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}
```

