# 嵌套逻辑实现

在返回get 操作 返回res的时候进行判断,如果res是object

根据isredonly进行判断

使用什么再次进行包裹

```ts
        // 嵌套的逻辑的实现
        // 判断res是不是obj 直接再次包裹就行
        if(isObject(res)){
            return isReadonly?readonly(res) : reactive(res)
        }

```

