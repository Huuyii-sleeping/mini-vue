# isProxy的实现

```ts
// 判断obj是否是由reactive | readonly创建的
export function isProxy(val){
    return isReactive(val) || isReadonly(val)
}
```

