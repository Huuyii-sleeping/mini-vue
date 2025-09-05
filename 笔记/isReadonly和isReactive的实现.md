# isReactive

注意先写单元测试 进行测试

```ts
export function isReactive(value){
    return !!value[ReactiveFlags.IS_RAECTIVE]
}
// ！！ 直接转换成bool值的类型
// 在get中进行测试
// get 中有readonly的参数 
// 普通的数据 不会调用get 就直接转换bool值
function createGetter(isReadonly = false) {
    return function get(target, key) {
        
        if(key === ReactiveFlags.IS_RAECTIVE){
            return !isReadonly
        }else if(key === ReactiveFlags.IS_READONLY){
            return isReadonly
        }

        const res = Reflect.get(target, key)
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}
```

# isReadonly

和上面的实现类似

就是将上面的函数稍微更改一下就行

