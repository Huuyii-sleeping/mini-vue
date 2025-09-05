# ref

ref的实现

定义一个类

用来继承数据

和reactive实现差不多

就是key的值不是对象

```ts
class RefImpl {
    private _value: any
    private _rawValue : any
    public dep
    public _v_isRef = true
    constructor(value) {
        this._rawValue = value
        this._value = convert(value)
        // value -> obj -> reactive
        
        this.dep = new Set()
    }
    get value() { // 有依赖才去收集依赖
        trackRefValue(this)
        return this._value
    }
    set value(newValue) {
        if (hasChange(newValue,this._rawValue)) {
            this._rawValue = newValue
            this._value = convert(newValue)
            triggerEffects(this.dep)
        }
 
    }
}
```

# isRef unRef

根据类的属性 `_v_isRef`进行判断

```ts
export function isRef(ref){
    return !!ref._v_isRef // 根据自身的性质进行判断就行
}

export function unRef(ref){
    return isRef(ref) ? ref.value : ref
}
```

# proxyRef

对数据进行包裹并进行赋值

新赋值的对象，不需要使用.value就能拿到对应的值

setup 里面的值 放到 template就是这个原理

返回新的proxy 设置set get

```ts
export function proxyRefs(objectWithRef){
    return new Proxy(objectWithRef,{
        get(target,key){
            return unRef(Reflect.get(target,key))
        },
        set(target,key,value){
            if(isRef(target[key]) && !isRef(value)){
                return target[key].value = value
            }else{
                return Reflect.set(target,key,value)
            }
        }
    })
}
```

