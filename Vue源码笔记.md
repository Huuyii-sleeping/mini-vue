# Vue3源码学习

![整体流程](https://chichengl.github.io/static/image/138114565-3e0eecbb-7fd0-4203-bf36-5e5fd8003ce0.6a0933ef.png)

![img](https://chichengl.github.io/static/image/138115157-1f4fb8a2-7e60-412d-96de-12e68eb0288c.1b0994cf.png)

![img](https://chichengl.github.io/static/image/138114969-9139e4af-b2df-41b2-a5d9-069d8b41903c.a1ba51bb.png)

1. 基础概念的掌握
   - 首先，熟悉TS语言，了解接口，泛型，装饰器等的特性
   - 学习ES6的相关的API
2. 响应式系统
   - 学习实现相关响应式系统的API
   - 探究响应式系统的实现
3. 组件生命周期与渲染
   - 阅读`@vue/reactivity`模块开始阅读，阅读`ref`,`reavtive`,`readonly`,`sdhallowRef`,`shallowReactive`,`toRefs`等的核心功能，理解创建和响应式对象的跟踪
   - 探究响应式依赖收集和更新的实现细节`effect`,`track`,`trigger`,`computed`等
   - 研究虚拟DOM的创建，Diff算法，DOM更新等相关逻辑
4. 渲染器适配
   - 阅读`@vue/runtime-dom | @vue/runtime-sfc`模块，了解Vue是如何和DOM进行交互，包括，组件的挂载，更新DOM，处理事件，插槽等内容
   - 对比不同的平台（web，weex，native）的渲染实现差异
5. 高级特性
   - 阅读`@vue/shared`模块，理解Vue提供的一些工具函数和通用逻辑
   - 分析`@vue/composition-api或 @vue/runtime-dom`中的`provide`,`inject`,`watch`等高级API实现
   - 深入研究Vue Router，Vuex等官方库和Vue3框架集成的实现细节
6. 编译器相关
   - 探究Vue单文件组件（SFC）的编译过程，`@vue/compiler-core,@vue/complier-dom,@veu/compiler-sfc`了解模板编译成渲染函数的逻辑

------

# Reactive——响应式实现

## reactive

reactive是实现响应式的基础，可见其重要性

重要的点放在实现 reactive-响应式 track-依赖的收集 trigger-依赖的触发

首先创建Map类型的对象 进行各种类型reacitve的收集

```ts
export const reactiveMap = new WeakMap()
export const shallowReactiveMap = new WeakMap()
export const readonlyMap = new WeakMap()
export const shallowReadonlyMap = new Map()
```

- tips : 为什么使用`WeakMap`
  - 内存管理 —— 自动释内存
    -  `weakMap`的键是弱引用,当没有被其他代码进行引用的时候，会自动的释放内存
    - 避免内存的泄露
  - 响应式对象的生命周期的绑定
    - vue的响应式对象，通常和组件生命周期相关联，当组件卸载了，对应的响应式对象应该被销毁
    - 如果使用Map，即使组件卸载，响应式对象Map强引用，导致关联的依赖和计算属性，无法释放
  - 性能优化
    - 减少手动清理的负担
    - 适合缓存场景

最关键的是调用`createReactiveObject`

```ts
export function reactive(target){
	if(isReadonly(target)){
		return target
	}
    
    return createReactiveObject(
    	target,false,mutableHandlers,mutableCollectionHandlers,reactiveMap
    )
}
```

这个声明是用来创建响应式，并且不是浅观察

```ts
function createReactiveObject(
	target, //要进行代理的原始对象
	isReadonly, // 是否创建只读代理
	baseHandlers, // 普通对象的处理器
	collectionHandlers, // 集合类型的（Map/Set）处理器
	proxyMap // 存储自己进行创建的代理（WeakMap）
){
	if(!isObject(target)){ // 不是对象直接返回（只能代理对象）
		return target
	}
    // 防止重复的创建代理 如果已经是代理就不需要再次进行代理
	if(target[ReactiveFlags.Raw] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) return target
	// 检查已经存在的代理 存在直接发返回
	const existProxy = proxyMap.get(target)
    if(existProxy){
        return existProxy
    }
	// 检查目标的类型
	const targetType = getTargetType(target)
    if(targetType === TargetType.INVALID){
		return target
    }
	// 创建proxy代理 根据集合的类型选择处理器
	const proxy = new Proxy(target,targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers)
	// 缓存进行返回
	proxyMap.set(target,proxy)
	return proxy
}
```

从baseHandler的地方进行声明各种函数

```ts
import {
	mutableHandlers,
	readonlyHandlers,
	shallowReactiveHandlers
	shallowReadonlyHandlers,
} from './baseHandlers'
```

例如下面的 baseHandlers  就是设置对应的set和get参数 用来创建proxy使用

```ts
export const mutableHandlers = {
    get : get,
    set : set
}

export const readonlyHandlers = {
    get : readonlyGet,
    set(target,key,value){
        console.warn(`key : ${key} set failure target is readonly`,target)
        return true
    }
}

export const shallowReadonlyHandlers = extend({},readonlyHandlers,{
    get : shallowReadonlyGet
})
```

然后就是对是否相对于类型的函数的实现

```ts
export funciton isReactive(value){
	if(isReadonly(value)){
		return isReactive(value)[ReactiveFlags.RAW]
	}
	return !!(value && (value))[ReactiveFlags.IS_REACTIVE]
}
```

意思是，先看是否是只读对象，如果是，就查找原本对象是否是reactive类型，否则就是查找，是否存在value且满足value上面存在`_v_isReactive`

是在定义Target接口的时候进行定义的

```ts
export interface Target{
	[ReactiveFlags.SKIP]?: boolean;
  	[ReactiveFlags.IS_REACTIVE]?: boolean;
  	[ReactiveFlags.IS_READONLY]?: boolean;
  	[ReactiveFlags.IS_SHALLOW]?: boolean;
  	[ReactiveFlags.RAW]?: any;
}
```

ReactiveFlags.RAW是any的原因，因为包裹的可能是对象也可能是数组是一些基本数据

## baseHandler

在baseReactiveHander中，定义了get方法（每一个Handler都有自己的get方法）

get方法是杂乱的

最核心的就是数据的拦截 （track）

```
if(!isReadonly){
	track(target,TrackOpTypes.GET,key)
}
```

其余的，在mutableReactiveHandler，中进行定义，比如set方法

`toRaw`用来获取响应式对象的原始非代理对象

```ts
set(target,key,value,receiver){
    let oldValue = target[key]
    if(!this._shallow){
        // 检查旧值是否是只读属性
        const isOldValueReadonly = isReadonly(oldValue)

        // 如果新值不是浅响应式，并且不是只读的，则获取原始值
        if(!isShallow(value) && !isReadonly(value)){
            oldValue = toRaw(oldValue)
            value = toRaw(value)
        }

        // 处理ref的特殊情况
        if(!isArray(target) && isRef(oldValue) && !isRef(value)){
            if(isOldValueReadonly){
                return false 
            } else {
                oldValue.value = value // 进行从修改
                return true
            }
        }

        // 检查属性值是否存在
        const hadKey = isArray(target && isIntrgerKey(key)) ? Number(key)<target.length : hasOwn(target,key)
        }
    // 执行实际的属性设置
    const result = Reflect.set(target,key,value,receiver)

    // 触发依赖的更新
    if(target === toRaw(receiver)){
        if(!hadKey){
            trigger(target,TriggerOpTypes.ADD,key,value)
        }else if(hasChanged(value,oldValue)){
            trigger(target,TriggerOpTypes.SET,key,value,oldValue)
        }
    }

    return result
}
```

使用 trigger 方法，该属性的相关方法进行调用

track 是在 reactiveEffect 文件中进行声明的

## reactiveEffect

track 依赖的收集

```ts
export function track(target,type,key){
	if(shouldTrack && activeEffect){
		let depMap = tragetMap.get(target)
		if(!depMap){
			targetMap.set(target,(depMap = new Map))
		}
		let dep = depMap.get(key)
		if(!dep){
			// 获取或者创建依赖
			depMap.set(key,(dep = createDep() => depMap.delete(key)))
		}
        // 进行依赖的收集 
		trackEffect(activeEffect,dep,_DEV_,?{target,type,key})
	}
}
```

trackEffect作用

- 建立依赖关系
- 记录反向依赖 （清除依赖的时候可能会用到）
- 避免重复的收集

进行拦截，给每个target创建对应的'仓库'

作用：

1. 函数接收参数
   - `target` ： 响应式对象，可能是经过Vue3代理对象，具有响应式能力
   - `type` ： 操作类型，取值式 `TrackOpTypes`枚举通常由`get`属性
   - `key` : 访问的属性名
2. 首先判断全局变量，`shouldTrack`是否是真的，并且当前存在活跃的副作用函数`activeEffecr`，若满足条件，则开始依赖收集流程
3. 从全局 `targetMap`  中获`target`对应的依赖映射，如果没有进行创建，就为`target`创建一个新的Map实例并存入`targetMap`
4. 在`depsMap`中查找对应的`key` 的依赖（dep）,没有找到，就创建一个新的`Dep`实例，并提供一个回调，当不再被任何活副作用函数引用时，就可以进行移除
5. 调用`trackEffect`函数将当前的活跃的副作用函数（activeEffect）与已经创建或已存在的依赖项关系起来，这样当依赖项对应的属性发生变化时，就可以通过这个依赖项找到并触发所有相关副作用函数
6. 在开发环境下，还可以传入额外调试信息，以便更好追踪和理解依赖收集的过程

还有 `trigger` 触发依赖的函数 在`set`之后触发

```ts
export function trigger(
	target,type,key,newValue,oldValue,OldTarget
){
	const deps = []
	if(type === TriggerOpTypes.CLEAR){
		dep = [...depsMap.values()]
	}else if(key === 'length' && isArray(tareget)){
		depsMap.forEach((dep,key) => {
			if(key === 'length' || (!isSymbol(key) && key >= length)){
				deps.push(dep)
			}
		})
	}else{
        if(key !== void 0){
        deps.push(depsMap.get(key))
        }

        switch(type){
        	case TriggerOpTypes.ADD:
        		if(!isArrat(target)){
        			deps.push(depsMap.get(ITERTE_KEY))
        			if(isMap(target)){
        				deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
       				}
        		}
                break
                
            case TriggerOpTypes.SET:
                if(isMap(target)){
                    dep.push(depsMap.get(INRATE_KEY))
                }
                break;
        	}
		}
	pauseScheduling()
	for (const dep of deps) {
    if (dep) {
      triggerEffects(
        dep,
        DirtyLevels.Dirty,
        __DEV__
          ? {
              target,
              type,
              key,
              newValue,
              oldValue,
              oldTarget,
            }
          : void 0
      );
    }
  }
  resetScheduling();
}
```

函数的作用

1. 函数 `trigger` 接收五个参数
   - `target`： 响应式对象，可以是 `Array,Set,Map`或者其他对象
   - `type` ： 操作类型，根据`TriggerOpTypes`的类型进行操作，`ADD,DELETE...`,
   - `key` : 在操作特定属性时候传入键名
   - `newValue`： 新值，在属性进行设置的时候传入
   - `oldValue` : 旧值，在属性被改变的时候传入
   - `oldTarget` : 对于特定操作可能需要的老的目标对象引用
2. 函数首先会尝试从全局`targetMap`中获取当前的`target`对应的依赖的映射，如果没找到，直接返回
3. 根据不同的`type`操作，收集所有相关的依赖（Dep实例）到deps数组当中，例如：
   - 当`type`是`CLEAR`的时候，清除整个集合，触发所有对该目标的依赖
   - 当操涉及到数组长度的变化的时候，会处理相关索引的依赖
   - 对于Map，Se以及数据的增删改查操作，会触发迭代器的相关依赖
4. 使用`pauseScheduling`和`resetScheduling`暂停和恢复调度，以批更新所有依赖
5. 遍历收集到的所有依赖项，调用 `triggerEffect` 函数，触发依赖的函数副作用执行更新，同时传入一些用于调试的信息

这两个函数离不开 `triggerEffect`和`triggerEffects`函数也是存在effect当中的

## effect

```ts
export function trackEffect(
  effect: ReactiveEffect,
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  if (dep.get(effect) !== effect._trackId) {
    //验证副作用函数（effect）是否已经与当前的 Dep 关联，如果没有关联或关联的标识符（_trackId）不匹配，则将关联标识符设置到 Dep 中，并将 Dep 添加到副作用函数的依赖数组中。
    dep.set(effect, effect._trackId); // 建立正向连接
    const oldDep = effect.deps[effect._depsLength];// 建立的是反向连接
    if (oldDep !== dep) {
      if (oldDep) {
        cleanupDepEffect(oldDep, effect);
      }
      effect.deps[effect._depsLength++] = dep;
    } else {
      effect._depsLength++;
    }
    if (__DEV__) {
        // 调试钩子
      effect.onTrack?.(extend({ effect }, debuggerEventExtraInfo!));
    }
  }
}

const queueEffectSchedulers: EffectScheduler[] = [];

//触发依赖
export function triggerEffects(
  dep: Dep,
  dirtyLevel: DirtyLevels,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  pauseScheduling();
  for (const effect of dep.keys()) {
    if (
      effect._dirtyLevel < dirtyLevel && //遍历 Dep 中的所有副作用函数，检查它们的“脏”级别是否低于给定的 dirtyLevel，以及是否已正确关联到 Dep。
      dep.get(effect) === effect._trackId
    ) {
      const lastDirtyLevel = effect._dirtyLevel; //果满足条件，则更新副作用函数的“脏”级别，并检查是否需要安排重新执行（首次变脏的情况）。
      effect._dirtyLevel = dirtyLevel;
      if (lastDirtyLevel === DirtyLevels.NotDirty) {
        effect._shouldSchedule = true;
        if (__DEV__) {
          effect.onTrigger?.(extend({ effect }, debuggerEventExtraInfo));
        }
        effect.trigger(); //调用副作用函数的 trigger 方法，实际执行副作用函数，从而更新视图或其他相关状态。
      }
    }
  }
  scheduleEffects(dep); //调用 scheduleEffects 函数对符合条件的副作用函数进行调度。
  resetScheduling();
}
```

tips :  脏状态的设置

- 用来高效管理副作用函数的重新执行时机
  - 当响应式的数据发生变化时候，标记依赖他的副作用函数为'脏'
  - 这些副作用函数会在下一个周期进行调用
- 优点：
  - 性能优化
  - 更新优先级控制
  - 防止无限循环
- 这个状态的设置，我们也可以通过异步操作进行设置，就是较麻烦
  - 这个就涉及到任务的执行，宏任务和微任务的执行
  - 先执行微任务队列，再执行宏任务队列 （正常渲染 => 微任务 => 红任务）
  - 我们可以使用对应的方式放到宏任务当中

Vue2是通过dep和watcher进行收集和派发的

这里主要是靠`trackEffect`和`triggerEffects`进行收集和触发

`trackEffect`主要是负责收集吗，当一个副作用函数（如渲染组件函数或者计算属性getter）访问响应式对象的属性时候，vue3会通过`track`函数跟踪这个访问，`trackEffect`就是这个过程中被调用的

`track`工作原理：

1. 当访问响应式对象属性时候，Vue3通过`Reflect.get`等操作触发`track`函数
2. `track`函数调用`trackEffect`，将当前激活的副作用函数（保存在全局变量`activeEffect`中）与当前访问的属性进行关联，这个关联储存在响应式对象的依赖收集表当中，建立映射关系
3. 这样，当属性值发生变化的时候，Vue3就知道哪些函数需要重新执行

`trackEffect`负责建立并维护一个副作用函数（effect）和依赖收集(dep) 之间的关系

- 检查`effect`是否已经关联到`dep`，没有关联或者关联信息不一样，将其关联起来，并更新dep中的记录
- 若`effect`已经有其他的依赖项，则先清理与旧依赖的关系，然后将新`dep`添加到`effect.deps`数组
- 在开发环境中，如果`effect`定义了`onTrack`回调函数，调用这个回调，便于开发工具当中显示依赖追踪信息

`triggerEffects`主要负责触发依赖的更新，当响应式对象发生变化时候，Vue3会通过`trigger`触发依赖的更新

`trigger`工作原理：

1. 当响应式对象属性变化时候，Vue3通过`Reflect.set`等操作触发`trigger`函数
2. `trigger`函数会遍历所有和该属性关联的所有副作用函数，并将他们进行收集到一个数组当中
3. 调用`triggerEffects`函数，遍历收集到的这些信息，逐一触发执行，从而引发视图或者其他相关状态的更新

`triggerEffect`用于触发那些依赖于特定响应式数据集合的副作用函数

- 遍历`dep`相关联的所有`effect`判断脏的级别，决定是否执行
- 当`effect`第一次变脏的时候，会标记成待调度，并可能调用其钩子函数提供调用信息
- 最终调用`effect.trigger()`执行实际的副作用函数，就是完成视图更新或者其他相关的状态更新操作
- 调用`schedulEffects(dep)`对所有需要调度的副作用函数进行合理的异步调度的处理
- 调用`resetScheduling()`重置调度器的状态

Reactive对象,computed,watch,组件渲染，（会生成`ReactiveEffect`对象）

```ts
constructor(
	public fn : () => T
	public trigger : () => void
	public scheduler ?: EffectScheduler
	scope ?: EffectScope
){
	recordEffectScope(this,scope)
}
```

- 这个就是`ReactiveEffect`
- 第二个传入的就是`trigger`函数（computed）
- `trigger`是`noop(watch)`
- `trigger`是`noop(render)`
  - NOOP 空操作 不执行任何实际操作函数或指令

## ref

`ref`和`reactive`的区别 

- ref 能够存入引用类型和基本类型，reactive只能存入引用类型
- ref将传值进行包裹，将原始值放在value属性上。对value属性进行劫持

调用`ref`->`createRef`  进行判断，如果本身是ref直接返回，不是就进行创建新的`ref`对象`RefImpl`

```ts
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;

  public dep?: Dep = undefined;
  public readonly __v_isRef = true;

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = useDirectValue ? newVal : toReactive(newVal);
      triggerRefValue(this, DirtyLevels.Dirty, newVal);
    }
  }
}
```

ref 的 value 会调用 toReactive方法，如果对象调用reactive方法，否则就是原始值

```ts
export const toReactive = () => {
	isObject(value) ? reactive(value) : value
}
```

get进行拦截使用`trackRefValue`实际是调用`trackEffect`方法和reactive劫持的方法是差不多的

然后生成dep对象，进行监视数据（准确说是管理依赖关系的对象，类似桥梁，将数据更新和视图联系起来）使用它收集所有订阅了这个属性的观察者

1. 当一个响应式对象属性被访问的时候，Vue会调用track函数，此时如果存在活跃的副作用函数，则将这个副作用函数添加到该属性所对应的dep对象的依赖列表
2. 当该属性的值发生变化时候，会调用trigger函数，遍历并触发和该属性相关的所有Dep，对象中所有的副作用函数，通知他们重新运行，实现视图的自动更新

set拦截主要是`triggerEffect`进行拦截

triggerEffect 主要步骤：

1. 先调用`pauseScheduling`进行暂停调度器。
2. 遍历`dep`中的所有副作用函数（effect）
   - 检查当前副作用函数的脏级别是否小于传入的`dirtyLevel`，如果是并且`dep`中存储的`trackId`与此副作用函数当前的`_trackId`一致，那么继续执行。
   - 更新副作用函数的脏级别为传入的`dirtyLevel`。
   - 如果之前该副作用函数的脏级别为`DirtyLevels.NotDirty`（即还未执行过），将其标记为应该被调度，并在开发环境时调用`onTrigger`钩子函数（如果有），同时附加上调试信息。
   - 调用副作用函数的`trigger`方法，实际执行副作用逻辑（通常是重新渲染组件）。
3. 调用`scheduleEffects(dep)`对符合条件的副作用函数进行调度，决定何时执行这些函数。
4. 最后调用`resetScheduling`恢复调度器的工作。

```ts
export function triggerEffects(
  dep: Dep,
  dirtyLevel: DirtyLevels,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  pauseScheduling();
  for (const effect of dep.keys()) {
    if (
      effect._dirtyLevel < dirtyLevel &&
      dep.get(effect) === effect._trackId
    ) {
      const lastDirtyLevel = effect._dirtyLevel;
      effect._dirtyLevel = dirtyLevel;
      if (lastDirtyLevel === DirtyLevels.NotDirty) {
        effect._shouldSchedule = true;
        if (__DEV__) {
          effect.onTrigger?.(extend({ effect }, debuggerEventExtraInfo));
        }
        effect.trigger();
      }
    }
  }
  scheduleEffects(dep);
  resetScheduling();
}
```

但是reactive实现拦截的更多

reactive的set拦截在baseHandkers中的mutableReactiveHandler，里面进行了shallow和radonly的判断，然后比较新旧值，不同，才调用trigger方法

两者不同之处

`trigger`函数

- 定义 ： 负责处理响应式对象在数据发生变化时候具体的触发逻辑
- 功能 ： 当数据发生变化的时候，根据变化的类型，和具体的键值信息，从响应式对象的依赖映射表中收集所有相关的依赖
- 结果： 收集完毕之后，trigger函数会暂停调度器，然后逐个触发依赖，并通过`triggerEffects`函数执行对应的副作用函数

`triggerEffect`函数

- 定义：是副作用函数真正执行的地方
- 功能：接收dep对象和一个脏级别作为参数，dep对象包含一组关联的副作用函数，脏级别决定哪些副作用函数将会执行
- 结果：遍历副作用函数，会导致视图更新或者其他的行为

一个监听操作 一个执行操作

## computed

1. 创建内部结构

   - 在`computed.ts`内部，Vue3通过`computedRef`或者类似的工厂函数创建一个特殊的引用，这个引用具有追踪依赖的能力

   - 这个引用背后维护了一个`getter`和一个可选的`setter`函数，以及对应的依赖关系的追踪

   - ```ts
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
     ```

2. 依赖追踪

   - 当首次读取计算属性的时候，会执行getter函数，并使用响应式系统追踪在其内部访问的所有其他的响应式状态
   - 这些依赖会被记录在一个集合中，和当前的计算属性相关联

3. 缓存和懒计算

   - 计算属性的结果会被缓存，只有依赖项发生变化的时候，才会重新进行计算
   - 如果任何依赖状态发生改变，Vue3会通过响应式系统的`trigger`函数，找到依赖了改状态的所有计算属性，并通过`triggerEffects`触发更新

4. 更新视图

   - 当计算属性发生变化的时候，由于是响应式的，因此会自动触发他的视图更新或者其他订阅者

5. 访问计算属性

   - 在模板或者javascript中，我们可以直接访问普通ref一样访问计算属性，Vue3的响应式系统会自动进行处理

在使用计算属性时候，是将一个函数或者一个配置对象作为参数进行传入`computed`

调用`computed`这个函数

```ts
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined;

  private _value!: T;
  public readonly effect: ReactiveEffect<T>;

  public readonly __v_isRef = true;
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false;

  public _cacheable: boolean;

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => triggerRefValue(this, DirtyLevels.MaybeDirty),
      () => this.dep && scheduleEffects(this.dep)
    );
    this.effect.computed = this;
    this.effect.active = this._cacheable = !isSSR;
    this[ReactiveFlags.IS_READONLY] = isReadonly;
  }

  get value() {
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this);
    if (!self._cacheable || self.effect.dirty) {
      if (hasChanged(self._value, (self._value = self.effect.run()!))) {
        triggerRefValue(self, DirtyLevels.Dirty);
      }
    }
    trackRefValue(self);
    if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty) {
      triggerRefValue(self, DirtyLevels.MaybeDirty);
    }
    return self._value;
  }

  set value(newValue: T) {
    this._setter(newValue);
  }

  // #region polyfill _dirty for backward compatibility third party code for Vue <= 3.3.x
  get _dirty() {
    return this.effect.dirty;
  }

  set _dirty(v) {
    this.effect.dirty = v;
  }
  // #endregion
}

export function computed<T>(
  getter: ComputedGetter<T>,
  debugOptions?: DebuggerOptions
): ComputedRef<T>;
export function computed<T>(
  options: WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions
): WritableComputedRef<T>;
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: ComputedGetter<T>;
  let setter: ComputedSetter<T>;

  const onlyGetter = isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = __DEV__
      ? () => {
          console.warn("Write operation failed: computed value is readonly");
        }
      : NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  const cRef = new ComputedRefImpl(
    getter,
    setter,
    onlyGetter || !setter,
    isSSR
  );

  if (__DEV__ && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack;
    cRef.effect.onTrigger = debugOptions.onTrigger;
  }

  return cRef as any;
}
```

第一个重载就是包含一个getter函数：

当仅仅传入getter函数时候，表明只是一个只读属性，getter函数用来计算值，setter默认设置成一个空操作（NOOP），并在开发环境下打印警告信息。提示用户修改只读属性

第二个是包含options的函数

当传入一个选项对象时候，此对象应该包含`get`和`set`属性，分别对应计算属性的`getter`和`setter`函数，这样创建的是一个可进行读写的计算属性

传入之后，判断是否是函数还是对象，然后分别给`getter`和`setter`

然后根据这些创建一个`ComputedRefmpl`（类似对象，具有相关的属性）

```ts
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined; // 进行依赖的收集

  private _value!: T; // 缓存计算结果
  public readonly effect: ReactiveEffect<T>; // 响应式副作用

  public readonly __v_isRef = true; // 标识响应式场景
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false; 

  public _cacheable: boolean; // 是否缓存(ssr场景使用)

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
        // 创建响应式副作用
    this.effect = new ReactiveEffect(
      () => getter(this._value), // 执行getter
      () => triggerRefValue(this, DirtyLevels.MaybeDirty), // 依赖变化是的调度器
      () => this.dep && scheduleEffects(this.dep) // 对效果进行调度
    );
    this.effect.computed = this; // 关联计算属性
    this.effect.active = this._cacheable = !isSSR; // 激活状态
    this[ReactiveFlags.IS_READONLY] = isReadonly;
  }

  get value() {
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this);
      // 检查是否需要重新进行计算
    if (!self._cacheable || self.effect.dirty) {
      if (hasChanged(self._value, (self._value = self.effect.run()!))) {
        triggerRefValue(self, DirtyLevels.Dirty);
      }
    }
      // 追踪当前的依赖
    trackRefValue(self);
    if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty) {
      triggerRefValue(self, DirtyLevels.MaybeDirty);
    }
    return self._value;
  }

  set value(newValue: T) {
    this._setter(newValue);
  }

  // #region polyfill _dirty for backward compatibility third party code for Vue <= 3.3.x
    // 多级脏的检查 检查副作用的触发
  get _dirty() {
    return this.effect.dirty;
  }

  set _dirty(v) {
    this.effect.dirty = v;
  }
  // #endregion
}
```

这个对象会生成一个effect，作用是： 计算属性的依赖收集，更新调度，结果缓存，以及自定义副作用逻辑

1. 依赖收集：当计算属性`getter`函数调用的时候i，与之相连的`effect`会跟踪所有访问到的的响应式依赖，这就意味着会记录下哪些响应式状态（如`ref` `reactive`对象属性）被计算属性索依赖
2. 调度更新：当计算属性的依赖性发生变化时候，响应式系统会触发这些依赖的更新，对应的`effect`会检测到依赖的变化，进而重新执行`getter`函数以计算新的值，并根据新值更新相关联的视图或者计算属性的组件状态
3. 懒计算和缓存：通过`effect`，Vue3能够实现计算属性的懒计算和结果缓存机制，只有当计算属性的依赖发生变化的时候，才会重新执行`getter`函数并更新结果，否则会直接返回缓存的值，从而提高性能
   - 使用dirty进行标记（表明只有收集了依赖但是还没有调用）只有调用的时候才会实际调用依赖之类的
4. 自定义副作用和行为：开发者能够在创建`effect`时候传递自定义的副作用函数和其他的选项，允许更灵活的控制副作用函数的执行实际和行为c，比如在追踪时候附加额外的调试信息，或者在触发时执行额外的逻辑

`effect` 是 `Reactive`（也就是处理响应式副作用的类）

ReactiveEffect传入的东西，第一个是取值使用的函数，第二个是设置值调用的函数，第三个是调度器，第四个是作用域

管理副作用

1. 跟踪依赖
2. 触发更新
3. 调度控制

```ts
export class ReactiveEffect<T = any> {
  active = true; // 是否激活
  deps: Dep[] = []; // 存储所有依赖的Dep对象

  /**
   * Can be attached after creation
   * @internal
   */
  computed?: ComputedRefImpl<T>; // 关联的计算属性
  /**
   * @internal
   */
  allowRecurse?: boolean;

  onStop?: () => void;
  // dev only
  onTrack?: (event: DebuggerEvent) => void;
  // dev only
  onTrigger?: (event: DebuggerEvent) => void;

  /**
   * @internal
   */
  _dirtyLevel = DirtyLevels.Dirty; // 标记是否需要进行重新计算
  /**
   * @internal
   */
  _trackId = 0;
  /**
   * @internal
   */
  _runnings = 0;
  /**
   * @internal
   */
  _shouldSchedule = false;
  /**
   * @internal
   */
  _depsLength = 0;

  constructor(
    public fn: () => T, // 副作用函数
    public trigger: () => void, // 触发更新的回调
    public scheduler?: EffectScheduler, // 自定义调度逻辑
    scope?: EffectScope // 所属的作用域（批量管理）
  ) {
    recordEffectScope(this, scope);
  }

  public get dirty() {
      // 检查依赖属性是否需要进行更新
    if (this._dirtyLevel === DirtyLevels.MaybeDirty) {
      pauseTracking();
      for (let i = 0; i < this._depsLength; i++) {
        const dep = this.deps[i];
        if (dep.computed) {
          triggerComputed(dep.computed);  // 触发子计算属性更新
          if (this._dirtyLevel >= DirtyLevels.Dirty) {
            break;
          }
        }
      }
        // 最终决定是否标记成脏状态
      if (this._dirtyLevel < DirtyLevels.Dirty) {
        this._dirtyLevel = DirtyLevels.NotDirty;
      }
      resetTracking();
    }
    return this._dirtyLevel >= DirtyLevels.Dirty;
  }

  public set dirty(v) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty;
  }

    // 副作用函数的执行
  run() {
    this._dirtyLevel = DirtyLevels.NotDirty;
    if (!this.active) {
      return this.fn(); // 非激活状态直接返回
    }
    let lastShouldTrack = shouldTrack;
    let lastEffect = activeEffect;
    try {
      shouldTrack = true;
      activeEffect = this;
      this._runnings++;
      preCleanupEffect(this); // 清理旧的依赖
      return this.fn(); // 执行副作用函数
    } finally {
      postCleanupEffect(this); // 处理新的依赖
      this._runnings--;  
      activeEffect = lastEffect; // 恢复之前的effect
      shouldTrack = lastShouldTrack;
    }
  }

    // 停止响应的功能
  stop() {
    if (this.active) {
      preCleanupEffect(this);
      postCleanupEffect(this);
      this.onStop?.();
      this.active = false;
    }
  }
}
```

`public get dirty` 方法：

- 返回一个bool值 ，表示当前的`ReactiveEffect`是否是脏。，在脏的获取的过程中，如果当前“脏”的级别是`DirtyLevels.MaybeDirty`,就会进一步检查其依赖的计算属性，（`deps`数组中的`computed`对象）是否也脏，并递归的触发他们确定最终的脏的状态，最终返回当前`ReactiveEffect`是否需要重新执行

`public set dirty(v)`方法

- 设置`ReactiveEffect`的'脏'的状态，如果参数`v = true`，那就设置成需要重新执行(`DirtyLevels.Dirty`)否则设置成不需要重新进行调用（`DirtyLevels.NotDirty`）

其中还有run方法是在 computed取值调用的

- 当取value值触发`get value`方法
  - 首先，会检查当前计算属性实例（this）是否缓存以及与其相关联的副作用函数（effect）是否脏（需要重新进行计算）,如果需要重新进行计算，则执行副作用的函数`effect.run()`并更新`_value`
  - 使用`hasChanged`函数检查新计算的值和之前的是否不同，如果不同，则触发计算属性变更事件（`triggerRefValue`）并设置成脏（`DirtyLevels.Dirty`）
  - 之后，无论是否需要重新进行计算，都会调用`trackRefValue`来追踪计算属性的依赖，这是Vue3响应式系统依赖收集的关键步骤
  - 最后，如果副作用函数的脏级别至少是`MaybeDirty`，也会触发计算属性值的变更事件，但是设置成`MaybeDirty`级别
- 当更新值时候
  - 这是计算属性`value`属性的`setter`方法，对于可写计算属性（WritableComputed），当视图设置计算属性的值的时候会进行调用
  - 它通过调用预设的`_setter函数设置计算属性的值，`_setter`是在创建计算属性时候传入的`setter`函数
- 剩下的兼容低版本的

tips ： 这里涉及依赖的收集

- 对于普通的
  - reactive是通过reactiveEffect的文件下的track和trigger函数进行依赖的收集
  - track 调用了trackEffect方法，trigger调用triggerEffect方法
  - ref是采用trackRefValue调用了trackEffect方法，triggerRefValue调用了triggerEffect方法
- 但是对于计算属性
  - get value 内部调用的triggerRefValue-（读取的时候主动触发依赖的副作用） set调用_setter（也就是创建的时候传入的set函数 通常触发函数）
  - 这样进行设置时惰性求值，只有读取的时候才需要进行依赖的触发
- 设置中间层的设计更加便于调试

------

# runtime-core —— 组件的生命周期

这章不仅涉及组件的基础和生命周期，还涉及一些高级api的实现

## 组件基础和生命周期

主要实现l了Vue3组件核心功能，涵盖了组件的整个生命周期，确保组件能够在响应式数据变化时候正确的进行创建，更新和销毁，以此在此过程中调用相应的生命周期钩子函数

组件的处理

uid是组件的编号，每个组件的编号不同

创建组件实例

```ts
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
) {
  const type = vnode.type as ConcreteComponent;
  // inherit parent app context - or - if root, adopt from root vnode
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext;

  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null!, // to be immediately set
    next: null,
    subTree: null!, // will be set synchronously right after creation
    effect: null!,
    update: null!, // will be set synchronously right after creation
    scope: new EffectScope(true /* detached */),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null!,
    renderCache: [],

    // local resolved assets
    components: null,
    directives: null,

    // resolved props and emits options
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),

    // emit
    emit: null!, // to be set immediately
    emitted: null,

    // props default value
    propsDefaults: EMPTY_OBJ,

    // inheritAttrs
    inheritAttrs: type.inheritAttrs,

    // state
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,

    attrsProxy: null,
    slotsProxy: null,

    // suspense related
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,

    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null,
  };
  if (__DEV__) {
    instance.ctx = createDevRenderContext(instance);
  } else {
    instance.ctx = { _: instance };
  }
  instance.root = parent ? parent.root : instance;
  instance.emit = emit.bind(null, instance);

  // apply custom element special handling
  if (vnode.ce) {
    vnode.ce(instance);
  }

  return instance;
}
```

创建对应的组件

包含组件的各种信息（父组件 子组件 数据 插槽等）

定义组件之后，就是组件的初始化

调用`setupComponent`进行初始化

负责设置组件的响应式状态，propos，slots等

```ts
export function setupComponent(
  instance: ComponentInternalInstance, // 上面创建的组件实例
  isSSR = false // 是否是服务端渲染
) {
    // 进行服务端渲染的特殊的逻辑 ，避免客户端特有的操作
  isSSR && setInSSRSetupState(isSSR);

    // 解析vnode数据 虚拟节点
  const { props, children } = instance.vnode;
  const isStateful = isStatefulComponent(instance);
    // 进行props初始化
  initProps(instance, props, isStateful, isSSR);
    // 进行slots初始化
  initSlots(instance, children);

    // 状态化组件
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined;

  isSSR && setInSSRSetupState(false);
  return setupResult;
}
```

initProps：

1. 初始化props和attrs对象
   - 创建空的`props`和`attrs`对象，用来存储组件实例的props和非props属性（HTML attributes）
2. 设置attrs的元信息
   - 使用`def` 函数设置 `attrs`对象的元信息，表明是一个内部的Vue对象
3. 初始化props默认值
   - 设置`instance.propsDefaults`作为空对象，用来存储props的默认值
4. 填充props和attrs
   - 调用`setFullProps`函数，根据传递的props（rawProps）填充props和attrs丢对象
5. 确保声明的props存在
   - 遍历组件声明的props选项，若在某个声明的props未在props对象里面找到，就将他的值设置成undefined
6. 验证props
   - 在开发环境下，调用`validateProps`函数验证props的有效性，确保prosp吃的类型和格式符合预期
7. 根据组件类型设置props和attrs
   - 根据组件是否状态化组件（isStateful）
     - 如果是状态化组件并且不是服务端渲染（SSR），就props对象转换成浅响应式对象并进行赋值给组件实例的props属性
     - 如果是状态化组件并且是SSR，直接将props赋值给组件实例的props属性
     - 如果是非状态化组件（函数式组件）
       - 如果组件没有声明props，那么props和attrs指向的是同一个对象
       - 如果组件声明了props，那么填充后的props对象赋值给组件实例的props属性
8. 设置attrs
   - 无论组件类型是什么，都将组件填充之后attrs对象赋值给组件实例的attrs属性

initProps：

1. 判断是否存在slots：
   - 首先检查组件实例的vnode节点（虚拟节点）的形状标志（shapeFlag）是否包`shapeFlags.SLOTS_CHILDREN`,表示子组件接收插槽对的内容
2. 处理已经编译的模块
   - 如果存在已经编译的插槽（就是yupe属性已经存在），就提取插槽的类型，并将原始的（非代理的）插槽内容赋值给组件实例的`slots`属性，同时设置_作为插槽类型，但是设置成不可进行枚举
3. 标准化对象插槽
   - 如果插槽内容是对象形式的原始插槽，调用`normalizeObjeceSlots`函数，将原始插槽对象规范化，并且填充到slots属性当中
4. 处理默认的插槽和命名插槽
   - 如果不存在已经编译的插槽，或者插槽的内容不是对象形式，则给组件实例分配一个空的slots对象，如果children不是空的，调用`normalizeVNodeSlots`函数，将常规的VNode子节点（包括默认插槽和命名插槽）转换成适合内部使用的格式
5. 设置元信息
   - 最后，不管什么情况。都会在组件实例上`slots`属性上设置元信息，标记成内部对象

这里，`isStateful`是用来判断组件当前状态是否‘有状态’，就是是否拥有`setup`组件（即通过`opyions`进行创建的）

setupStatefulComponent函数

```ts
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions;

  if (__DEV__) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config);
    }
    if (Component.components) {
      const names = Object.keys(Component.components);
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config);
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives);
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i]);
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn(
        `"compilerOptions" is only supported when using a build of Vue that ` +
          `includes the runtime compiler. Since you are using a runtime-only ` +
          `build, the options should be passed via your build tool config instead.`
      );
    }
  }
  // 0. create render proxy property access cache
  instance.accessCache = Object.create(null);
  // 1. create public instance / render proxy
  // also mark it raw so it's never observed
  instance.proxy = markRaw(
    new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  );
  if (__DEV__) {
    exposePropsOnRenderContext(instance);
  }
  // 2. call setup()
  const { setup } = Component;
  if (setup) {
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null);

    const reset = setCurrentInstance(instance);
    pauseTracking();
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
    );
    resetTracking();
    reset();

    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
      if (isSSR) {
        // return the promise so server-renderer can wait on it
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR);
          })
          .catch((e) => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION);
          });
      } else if (__FEATURE_SUSPENSE__) {
        // async setup returned Promise.
        // bail here and wait for re-entry.
        instance.asyncDep = setupResult;
      } else if (__DEV__) {
        warn(
          `setup() returned a Promise, but the version of Vue you are using ` +
            `does not support it yet.`
        );
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR);
    }
  } else {
    finishComponentSetup(instance, isSSR);
  }
}
```

1. 获取组件的实例（ComponentOptions）并对开发环境下的组件名称，组件内的组件和指令名称进行验证，确保符合规范
2. 初始化组件实例`accessCache`属性，这是一个用来存储属性访问缓存的对象
3. 创建组件实例的代理（proxy）对象，这个对象公开了一些公共方法和属性，同时标记成`markRaw`，意味着不会有Vue的响应式追踪
4. 在开发的环境下，将prop暴露到渲染上下文以供IDE工具提示和调试
5. 获取组件的`setup`函数，如果有setup函数，执行以下步骤
   - 创建`setupContext`对象，用于`setup`函数访问props和emit等的上下文信息
   - 使用`setupCurrentInstance`设置当前的组件实例，并暂停依赖收集（pauseTracking）
   - 执行`setup`函数，捕获错误并传递 props 和 setupContext 作为参数
   - 重置依赖收集（trsetTracking）并还原组件实例（resetCurrentInstance）
6. 判断c`setup`函数返回值是否是promise
   - 如果是promise ，根据环境（SSR和是否支持Suspense）处理异步结果，如果是SSR，等待Promise解决后继续处理，如果是客户端渲染且支持Suspense，将Promise保存到asyncDep 属性当中，等待Suspense边界，否则抛出警告
7. 如果组件没有`setup`函数，就调用`finishComponentSetuo`函数完成组件的剩余初始化工作

```ts
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext["expose"] = (exposed) => {
    instance.exposed = exposed || {};
  };
  return {
    get attrs() {
      return getAttrsProxy(instance);
    },
    slots: instance.slots,
    emit: instance.emit,
    expose,
  };
}
```

创建上下文对象，包含了插槽，触发，还有向外暴露的对象，以及非props属性的代理对象

该函数就创建一个上下文对象（删除一部分东西）

```ts
export function finishComponentSetup(
  instance: ComponentInternalInstance,
  isSSR: boolean,
  skipOptions?: boolean
) {
  const Component = instance.type as ComponentOptions;

  // template / render function normalization
  // could be already set when returned from setup()
  if (!instance.render) {
    // only do on-the-fly compile if not in SSR - SSR on-the-fly compilation
    // is done by server-renderer
    if (!isSSR && compile && !Component.render) {
      const template =
        (__COMPAT__ &&
          instance.vnode.props &&
          instance.vnode.props["inline-template"]) ||
        Component.template ||
        resolveMergedOptions(instance).template;
      if (template) {
        if (__DEV__) {
          startMeasure(instance, `compile`);
        }
        const { isCustomElement, compilerOptions } = instance.appContext.config;
        const { delimiters, compilerOptions: componentCompilerOptions } =
          Component;
        const finalCompilerOptions: CompilerOptions = extend(
          extend(
            {
              isCustomElement,
              delimiters,
            },
            compilerOptions
          ),
          componentCompilerOptions
        );

        Component.render = compile(template, finalCompilerOptions);
        if (__DEV__) {
          endMeasure(instance, `compile`);
        }
      }
    }

    instance.render = (Component.render || NOOP) as InternalRenderFunction;

    // for runtime-compiled render functions using `with` blocks, the render
    // proxy used needs a different `has` handler which is more performant and
    // also only allows a whitelist of globals to fallthrough.
    if (installWithProxy) {
      installWithProxy(instance);
    }
  }

  // support for 2.x options
  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    const reset = setCurrentInstance(instance);
    pauseTracking();
    try {
      applyOptions(instance);
    } finally {
      resetTracking();
      reset();
    }
  }

  // warn missing template/render
  // the runtime compilation of template in SSR is done by server-render
}
```

组件props slots attrs等的初始化完成之后，就是进行模板的编译

模板编译需要看是否存在render函数

如果不存在

- 确保组件实例中的render是有效函数 

如果没有 函数会尝试从一下途径获取并编译模板：

- 组件实例`vnode` 属性中的`inline-template`属性
- 组件选项（ComponentOptions）中的`template`属性
- 组件全局合并选项中的`template`

编译发生在非SSR的情况下，因为在SSR环境下编译工作是由服务渲染器完成

编译会在合并全局和组件级别的编译选项，并在开发环境下记录编译的时间

```ts
export let currentInstance: ComponentInternalInstance | null = null;

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  const prev = currentInstance;
  internalSetCurrentInstance(instance);
  instance.scope.on // 控制响应式依赖收集状态
  return () => {
    instance.scope.off();
    internalSetCurrentInstance(prev);
  };
};
// 获取当前的组件实例
export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance || currentRenderingInstance;

type CompileFunction = (
  template: string | object,
  options?: CompilerOptions
) => InternalRenderFunction;
// 编译器相关变量
let compile: CompileFunction | undefined; // 存储运行时候的组件实例
let installWithProxy: (i: ComponentInternalInstance) => void; // 运行时编译的组件安装代理
export function registerRuntimeCompiler(_compile: any) {
  compile = _compile;
  installWithProxy = (i) => {
    if (i.render!._rc) {
      i.withProxy = new Proxy(
        i.ctx,
        RuntimeCompiledPublicInstanceProxyHandlers
      );
    }
  };
}
```

这是一堆辅助处理组件实例对的当前上下文和编译相关的

1. currentInstance
   - 定义全局变量 `currentInstance`， 作用于存储当前正在执行`setup`函数或者其他内部操作的组件实例，这个变量在Vue3的内部逻辑非常重要，因为他提供了在执行过程中的组件上下文信息
2. setCurrentInstance
   - 定义一个函数`setCurrentInstace`，用来设置当前组件实例，并返回一个清理函数，当进入一个组件的`setup`函数或者其他内部处理i时，调用这个函数将恢复实例设置为`curentInstance`。清理函数在离开当前组件上下文调用，恢复之前的`currentInstance`值，并解除组件实例的副作用监听
3. getCurrentInstance
   -  提供一个`getCurrentInstance`函数，返回当前的`componentInternalInstance | null` 在编写Composition API时候，可以通过这个函数获取当前组件实例，进而访问其属性，方法以及上下文信息
4. CompolierFunction：
   - 定义一个类型`ComplierFunction`，描述一个用来编译模板字符串或者对象是内部渲染函数的函数签名
5. complier 和 installWithProxy
   - `complier` 变量用于存储模板字符串编译函数，`installWithProxy`用来安装一个代理，在使用`with`快运行时编译渲染函数中能够更加高效的访问全局变量，初始都设置成undefined
6. registerRuntimeCompiler
   - 定义一个 `registerRuntimeComplier` 函数，接收一个编译函数`_complier`参数，并将其赋值给全局变量`complier`。同时，这个函数初始化了`installWithProxy`函数，用来在运行时候编译的组件实例安装代理。当组件实例的渲染函数已经经过运行时编译时候，这个函数为该组件实例创建一个代理，使得在模板渲染时能正确处理`with`块等特性

tips：给组件添加代理？

- 模板中的this能够自动的进行解析（如 `$attrs $slots`等属性）
- 响应式数据的依赖收集（触发 track/trigger，实现视图的更新） 
- 安全校验（防止误操作内部私有属性）

组件相关文件

## ComponentEmits.ts

触发自定义事件并通知父组件 子组件通过emit发送事件，父组件通过v-on监听

```ts
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  if (instance.isUnmounted) return; // 检查组件实例是否已经卸载
  const props = instance.vnode.props || EMPTY_OBJ; // 获取props对象

    // 处理v-model相关事件
  let args = rawArgs;
  const isModelListener = event.startsWith("update:"); // update开头。认为是更新事件

  // for v-model update:xxx events, apply modifiers on args
  const modelArg = isModelListener && event.slice(7);
  if (modelArg && modelArg in props) {
    const modifiersKey = `${
      modelArg === "modelValue" ? "model" : modelArg
    }Modifiers`; // 进行相应的转换
    const { number, trim } = props[modifiersKey] || EMPTY_OBJ;
    if (trim) {
      args = rawArgs.map((a) => (isString(a) ? a.trim() : a));
    }
    if (number) {
      args = rawArgs.map(looseToNumber);
    }
  }

    // 查找事件对应的处理器
  let handlerName;
  let handler =
    props[(handlerName = toHandlerKey(event))] ||
    // also try camelCase event handler (#2249)
    props[(handlerName = toHandlerKey(camelize(event)))];
  // for v-model update:xxx events, also trigger kebab-case equivalent
  // for props passed via kebab-case
  if (!handler && isModelListener) {
    handler = props[(handlerName = toHandlerKey(hyphenate(event)))];
  }

    // 调用事件处理器
  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    );
  }

  const onceHandler = props[handlerName + `Once`];
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {};
    } else if (instance.emitted[handlerName]) {
      return;
    }
    instance.emitted[handlerName] = true;
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      args
    );
  }

  if (__COMPAT__) {
    compatModelEmit(instance, event, args);
    return compatInstanceEmit(instance, event, args);
  }
}
```

1. 检查组件实例i是否已经成功的卸载（`isUnmmounted`），如果已经卸载就直接返回，不触发任何事件
2. 获取组件实例VNode（虚拟节点）上props对象
3. 处理`v-model`相关事件
   - 事件名是否以`update:`开头，若是，则认为这是一个`v-model`更新事件（如`update:modelValue`）
   - 对应的model属性（如`modelValue`）在props中查找是否由修饰符(如number和trim)，如果有就需要按需对传递的参数进行转换（数字转换或者去除空格）
4. 查找事件对应的处理器（handler）
   - 根据原始事件名和驼峰事件名(如 `change` 和 `onchange`)在props对象中查找事件处理器，
5. 调用事件处理器（handler）
   - 如果找到事件处理器，就使用`callWithAsyncErrorHandling`包装调用 用来处理可能发生错误，并提供错误处理的上下文
   - 如果事件处理器中有一次执行的脚本（onceHandler），则在首次进行触发调用，并将触发状态存储在组件实例里面的`emitted`对象当中，避免重复触发

emit是基于props里面的onXXX的函数进行匹配的

## ComponentProps

这里面主要是初始化props

```ts
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number, // result of bitwise flag comparison
  isSSR = false
) {
  const props: Data = {};
  const attrs: Data = {};
  def(attrs, InternalObjectKey, 1);

  instance.propsDefaults = Object.create(null);

  setFullProps(instance, rawProps, props, attrs);

  // ensure all declared prop keys are present
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined;
    }
  }

  // validation
  if (__DEV__) {
    validateProps(rawProps || {}, props, instance);
  }

  if (isStateful) {
    // stateful
    instance.props = isSSR ? props : shallowReactive(props);
  } else {
    if (!instance.type.props) {
      // functional w/ optional props, props === attrs
      instance.props = attrs;
    } else {
      // functional w/ declared props
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}
```

这里处理了`attrs`和`props`，并且初始化了props的默认值

然后调用了setFullProps 以 rawProps作为蓝本，填充props和attrs

ensure all declare prop key are present

根据isStateful 给props 进行赋值，如果i不是有状态的组件，且没有声明props就将props设置成attrs，因为此时两者相同

props 是父组件向子组件传递的消息

attrs 是所有传递给组件但是没有在props声明的HTML属性，也叫非props属性

## ComponentSlots.ts

```ts
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const type = (children as RawSlots)._;
    if (type) {
      // users can get the shallow readonly version of the slots object through `this.$slots`,
      // we should avoid the proxy object polluting the slots of the internal instance
      instance.slots = toRaw(children as InternalSlots);
      // make compiler marker non-enumerable
      def(children as InternalSlots, "_", type);
    } else {
      normalizeObjectSlots(
        children as RawSlots,
        (instance.slots = {}),
        instance
      );
    }
  } else {
    instance.slots = {};
    if (children) {
      normalizeVNodeSlots(instance, children);
    }
  }
  def(instance.slots, InternalObjectKey, 1);
};
```

作用

1. 检测插槽的类型：
   - 首先检查组件实例的vnode节点形状标志（shapeFlag）是否设置了`shapeFlags.SLOTS_CHILDREN`，这就意味着有子节点作为插槽内容
2. 处理已经编译的插槽
   - 如果存在已经编译的插槽（通过检查`children as RAWSlots`是否存在及其类型），则将原始插槽的内容转成非响应式对象赋值给组件实例`slots`属性，并且设置`_`是插槽类型，同时确保该属性对的不可枚举
3. 处理未编译插槽
   - 如果插槽未编译，或者类型不匹配，则调用`normalizeObjectSlots`函数将原始插槽内容规范化，并填充到组件实例的slots属性当中
     - 产生原理：
       - 当插槽的内容是动态的进行生成或通过javascript直接传递（如通过render手动创建子节点），此时插槽的内容未被vue的模板编译器处理，需要运行时动态规范化
4. 初始化默认插槽
   - 如果组件没有带`shapeFlags.SLOTS_CHILDREN`标识的插槽，初始化一个空的`slots`对象，然后调用`normalizeVnodeSlots`函数默认处理插槽内容

```ts
const normalizeObjectSlots = (
  rawSlots: RawSlots,
  slots: InternalSlots,
  instance: ComponentInternalInstance
) => {
  const ctx = rawSlots._ctx;
  for (const key in rawSlots) {
    if (isInternalKey(key)) continue;
    const value = rawSlots[key];
    if (isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx);
    } else if (value != null) {
      if (
        __DEV__ &&
        !(
          __COMPAT__ &&
          isCompatEnabled(DeprecationTypes.RENDER_FUNCTION, instance)
        )
      ) {
        warn(
          `Non-function value encountered for slot "${key}". ` +
            `Prefer function slots for better performance.`
        );
      }
      const normalized = normalizeSlotValue(value);
      slots[key] = () => normalized;
    }
  }
};
```

1. 获取原始插槽对象的上下文（ctx），这个上下文通常包括组件实例的相关信息，如组件的props，methods等
2. 遍历原始插槽对象的所有属性（这里指代各个插槽的名称）
3. 对于每个插槽名称（key），首先检查是否时内部保留的关键字（通过`isInternalKey`函数判断，如果时就跳过这次循环）
4. 如果插槽的值是一个函数，就需要调用`normalizeSlots`函数对其进行规范化处理，并将结果存入新的slots对象当中
5. 如果插槽值不是函数，值也不是null ，则在开发环境下进行性能提示（如果启用了兼容性检验，且当前不支持旧版渲染函数），提醒开发者最好使用函数形式的插槽获得更好的性能
6. 对于非函数的插槽值，调用`normallzeSlotValue`函数将其规范化成一个返回值恒定的函数，并将此函数存入新的`slots`对象当中

将原始插槽对象按照Vue的标准进行转化，以便组件内部能够正确的进行识别

```ts
const normalizeSlot = (
  key: string,
  rawSlot: Function,
  ctx: ComponentInternalInstance | null | undefined
): Slot => {
  if ((rawSlot as any)._n) {
    // already normalized - #5353
    return rawSlot as Slot;
  }
  const normalized = withCtx((...args: any[]) => {
    return normalizeSlotValue(rawSlot(...args));
  }, ctx) as Slot;
  // NOT a compiled slot
  (normalized as ContextualRenderFn)._c = false;
  return normalized;
};
const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChild)];
```

normalSlotValue是将值变成Vnode数组进行返回

normal._c = false 表示这个不是一个编译过的插槽函数，然后返回这个新的函数

ComponentPublicInstance.ts

```ts
export const publicPropertiesMap: PublicPropertiesMap =
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /*#__PURE__*/ extend(Object.create(null), {
    $: (i) => i,
    $el: (i) => i.vnode.el,
    $data: (i) => i.data,
    $props: (i) => (__DEV__ ? shallowReadonly(i.props) : i.props),
    $attrs: (i) => (__DEV__ ? shallowReadonly(i.attrs) : i.attrs),
    $slots: (i) => (__DEV__ ? shallowReadonly(i.slots) : i.slots),
    $refs: (i) => (__DEV__ ? shallowReadonly(i.refs) : i.refs),
    $parent: (i) => getPublicInstance(i.parent),
    $root: (i) => getPublicInstance(i.root),
    $emit: (i) => i.emit,
    $options: (i) =>
      __FEATURE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type,
    $forceUpdate: (i) =>
      i.f ||
      (i.f = () => {
        i.effect.dirty = true;
        queueJob(i.update);
      }),
    $nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy!)),
    $watch: (i) => (__FEATURE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP),
  } as PublicPropertiesMap);
```

定义组件实例的各种方法

```ts
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key: string) {
    const { ctx, setupState, data, props, accessCache, type, appContext } =
      instance

    // for internal formatters to know that this is a Vue instance


    // data / props / ctx
    // This getter gets called for every property access on the render context
    // during render and is a major hotspot. The most expensive part of this
    // is the multiple hasOwn() calls. It's much faster to do a simple property
    // access on a plain object, so we use an accessCache object (with null
    // prototype) to memoize what access type a key corresponds to.
    let normalizedProps
    if (key[0] !== '$') {
      const n = accessCache![key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.SETUP:
            return setupState[key]
          case AccessTypes.DATA:
            return data[key]
          case AccessTypes.CONTEXT:
            return ctx[key]
          case AccessTypes.PROPS:
            return props![key]
          // default: just fallthrough
        }
      } else if (hasSetupBinding(setupState, key)) {
        accessCache![key] = AccessTypes.SETUP
        return setupState[key]
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache![key] = AccessTypes.DATA
        return data[key]
      } else if (
        // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) &&
        hasOwn(normalizedProps, key)
      ) {
        accessCache![key] = AccessTypes.PROPS
        return props![key]
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache![key] = AccessTypes.CONTEXT
        return ctx[key]
      } else if (!__FEATURE_OPTIONS_API__ || shouldCacheAccess) {
        accessCache![key] = AccessTypes.OTHER
      }
    }

    const publicGetter = publicPropertiesMap[key]
    let cssModule, globalProperties
    // public $xxx properties
    if (publicGetter) {
      if (key === '$attrs') {
        track(instance, TrackOpTypes.GET, key)
        __DEV__ && markAttrsAccessed()
      } else if (__DEV__ && key === '$slots') {
        track(instance, TrackOpTypes.GET, key)
      }
      return publicGetter(instance)
    } else if (
      // css module (injected by vue-loader)
      (cssModule = type.__cssModules) &&
      (cssModule = cssModule[key])
    ) {
      return cssModule
    } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
      // user may set custom properties to `this` that start with `$`
      accessCache![key] = AccessTypes.CONTEXT
      return ctx[key]
    } else if (
      // global properties
      ((globalProperties = appContext.config.globalProperties),
      hasOwn(globalProperties, key))
    ) {
      if (__COMPAT__) {
        const desc = Object.getOwnPropertyDescriptor(globalProperties, key)!
        if (desc.get) {
          return desc.get.call(instance.proxy)
        } else {
          const val = globalProperties[key]
          return isFunction(val)
            ? Object.assign(val.bind(instance.proxy), val)
            : val
        }
      } else {
        return globalProperties[key]
      }
    } else if (
      __DEV__ &&
      currentRenderingInstance &&
      (!isString(key) ||
        // #1091 avoid internal isRef/isVNode checks on component instance leading
        // to infinite warning loop
        key.indexOf('__v') !== 0)
    ) {
      if (data !== EMPTY_OBJ && isReservedPrefix(key[0]) && hasOwn(data, key)) {
        warn(
          `Property ${JSON.stringify(
            key,
          )} must be accessed via $data because it starts with a reserved ` +
            `character ("$" or "_") and is not proxied on the render context.`,
        )
      } else if (instance === currentRenderingInstance) {
        warn(
          `Property ${JSON.stringify(key)} was accessed during render ` +
            `but is not defined on instance.`,
        )
      }
    }
  },

  set(
    { _: instance }: ComponentRenderContext,
    key: string,
    value: any,
  ): boolean {
    const { data, setupState, ctx } = instance
    if (hasSetupBinding(setupState, key)) {
      setupState[key] = value
      return true
    } else if (
      __DEV__ &&
      setupState.__isScriptSetup &&
      hasOwn(setupState, key)
    ) {
      warn(`Cannot mutate <script setup> binding "${key}" from Options API.`)
      return false
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (hasOwn(instance.props, key)) {
      __DEV__ && warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false
    }
    if (key[0] === '$' && key.slice(1) in instance) {
      __DEV__ &&
        warn(
          `Attempting to mutate public property "${key}". ` +
            `Properties starting with $ are reserved and readonly.`,
        )
      return false
    } else {
      if (__DEV__ && key in instance.appContext.config.globalProperties) {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          value,
        })
      } else {
        ctx[key] = value
      }
    }
    return true
  },


    return Reflect.defineProperty(target, key, descriptor)
  },
}
```

需要让用户可以直接在render函数内部直接使用this触发proxy

它用来创建Vue组件实例的公开代理对象，这个代理对象可以让开发者在模板或者setup函数之外访问组件实例的部分内部的状态（props data context setupState ...）

- get : 当访问代理对象属性时候进行调用，用来根据访问的键值返回对应的属性值。它首先尝试从不同的来源(setupState date props contexty globalProperties等)查找属性值，并利用环缓存(acessCache)提高查找的效率
- set ： 当尝试修改代理对象的属性值是调用，用来设置对应属性值的新值，同样会检查属性来源，并根据规则决定是否允许修改

## ComponentRenderUtils.ts

```ts
export function shouldUpdateComponent(
  prevVNode: VNode,
  nextVNode: VNode,
  optimized?: boolean
): boolean {
  const { props: prevProps, children: prevChildren, component } = prevVNode;
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
  const emits = component!.emitsOptions;

  // Parent component's render function was hot-updated. Since this may have
  // caused the child component's slots content to have changed, we need to
  // force the child to update as well.
  if (__DEV__ && (prevChildren || nextChildren) && isHmrUpdating) {
    return true;
  }

  // force child update for runtime directive or transition on component vnode.
  if (nextVNode.dirs || nextVNode.transition) {
    return true;
  }

  if (optimized && patchFlag >= 0) {
    if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
      // slot content that references values that might have changed,
      // e.g. in a v-for
      return true;
    }
    if (patchFlag & PatchFlags.FULL_PROPS) {
      if (!prevProps) {
        return !!nextProps;
      }
      // presence of this flag indicates props are always non-null
      return hasPropsChanged(prevProps, nextProps!, emits);
    } else if (patchFlag & PatchFlags.PROPS) {
      const dynamicProps = nextVNode.dynamicProps!;
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i];
        if (
          nextProps![key] !== prevProps![key] &&
          !isEmitListener(emits, key)
        ) {
          return true;
        }
      }
    }
  } else {
    // this path is only taken by manually written render functions
    // so presence of any children leads to a forced update
    if (prevChildren || nextChildren) {
      if (!nextChildren || !(nextChildren as any).$stable) {
        return true;
      }
    }
    if (prevProps === nextProps) {
      return false;
    }
    if (!prevProps) {
      return !!nextProps;
    }
    if (!nextProps) {
      return true;
    }
    return hasPropsChanged(prevProps, nextProps, emits);
  }

  return false;
}
function hasPropsChanged(
  prevProps: Data,
  nextProps: Data,
  emitsOptions: ComponentInternalInstance["emitsOptions"]
): boolean {
  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (
      nextProps[key] !== prevProps[key] &&
      !isEmitListener(emitsOptions, key)
    ) {
      return true;
    }
  }
  return false;
}
```

用来判断一个组件是否需要更新的逻辑

1. 父组件更新 ： 如果当前环境是开发环境并且父组件正在进行热更新，则强制子组件更新
2. 当前虚拟节点上有运行时指令或者过渡效果 ： 如果运行时指令或过渡效果，不考虑其他的因素，都需要更新组件
3. 优化后的patchFlag（补丁标记）：根据patchFlag判断是否需要进行更新，例如：如果标记表示动态插槽的内容发生变化，即使进行了优化也需要进行更新
4. 手动编写的render函数：对于手动编写的render函数，只要子节点变化或者props不同，就需要进行更新
5. 比较props的变化 ： 在非优化路径下，逐一对比props的变化，同时考虑组件的emitOptions(组件声明的emit事件),只有当props实际发生变化的时候，并且改变化的时prop不是emit事件监听器所关注的，才判断需要更新组件

`hasPropsChanged`对`props`更加细致的对比				

`shouldUpdateComponent`函数在Vue3的虚拟DOM diff过程中被调用，具体调用时机是组件数的更新阶段，当Vue确定更新视图的时候，他会遍历组件树并对每个组件生成新的虚拟节点（Vnode）。对于每一个旧的虚拟节点，和新的虚拟节点，对vue调用`shouldUpdateComponent`函数判断是否有必要对该组件进行更新

## Vnode

实现虚拟节点 : vnode

创建节点

```ts
export const createVNode = (
  __DEV__ ? createVNodeWithArgsTransform : _createVNode
) as typeof _createVNode;

function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (__DEV__ && !type) {
      warn(`Invalid vnode type when creating vnode: ${type}.`);
    }
    type = Comment;
  }

  if (isVNode(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    // #2078 make sure to merge refs during the clone instead of overwriting it
    const cloned = cloneVNode(type, props, true /* mergeRef: true */);
    if (children) {
      normalizeChildren(cloned, children);
    }
    if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
      if (cloned.shapeFlag & ShapeFlags.COMPONENT) {
        currentBlock[currentBlock.indexOf(type)] = cloned;
      } else {
        currentBlock.push(cloned);
      }
    }
    cloned.patchFlag |= PatchFlags.BAIL;
    return cloned;
  }

  // class component normalization.
  if (isClassComponent(type)) {
    type = type.__vccOpts;
  }

  // 2.x async/functional component compat
  if (__COMPAT__) {
    type = convertLegacyComponent(type, currentRenderingInstance);
  }

  // class & style normalization.
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props)!;
    let { class: klass, style } = props;
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass);
    }
    if (isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style);
      }
      props.style = normalizeStyle(style);
    }
  }

  // encode the vnode type information into a bitmap 
      // 进行重点分类 渲染时候需要使用
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
    ? ShapeFlags.TELEPORT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0;

  if (__DEV__ && shapeFlag & ShapeFlags.STATEFUL_COMPONENT && isProxy(type)) {
    type = toRaw(type);
    warn(
      `Vue received a Component that was made a reactive object. This can ` +
        `lead to unnecessary performance overhead and should be avoided by ` +
        `marking the component with \`markRaw\` or using \`shallowRef\` ` +
        `instead of \`ref\`.`,
      `\nComponent that was made reactive: `,
      type
    );
  }

  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}
```

这个函数主要是检验属性和类型是否合格

1. 如果传入的类型本身就是vnode 则进行克隆并进行合并相关的子节点
2. 处理类组件的相关配置
3. 对于类（class）和样式（style）属性，进行规范化的处理，确保他们可以正确的应用到DOM
4. 根据类型计算vnode的形状标识（shapeFlag）,这个决定了vnode代表的是普通元素，组件，suspense，teleport等不同类型的节点
5. 最后，通过调用`createBaseVnode`近一步创建vnode对象，并传递所有必要的参数

```ts
function createBaseVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
    ctx: currentRenderingInstance,
  } as VNode;

  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children);
    // normalize suspense children
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      (type as typeof SuspenseImpl).normalize(vnode);
    }
  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN;
  }

  // validate key
  if (__DEV__ && vnode.key !== vnode.key) {
    warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type);
  }

  // track vnode for block tree
  if (
    isBlockTreeEnabled > 0 &&
    // avoid a block node from tracking itself
    !isBlockNode &&
    // has current parent block
    currentBlock &&
    // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT) &&
    // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    vnode.patchFlag !== PatchFlags.NEED_HYDRATION
  ) {
    currentBlock.push(vnode);
  }

  if (__COMPAT__) {
    convertLegacyVModelProps(vnode);
    defineLegacyVNodeProperties(vnode);
  }

  return vnode;
}
```

最后返回的是一个vnode对象，以便生成的是ast语法树

1. 构造vnode对象的基本结构，设置各种属性，如类型（type），属性（props），子节点（children），patchFlag（用来优化更新过程的标记位），动态属性（dynamicProps），形状标识（shapeFlag 区分元素，组件，fragment等不同类型的节点），是否是块级节点（isBlockNode）等
2. 正常化children属性，如果需要的话，这一步会对子节点进行处理，确保i他们符合预期的格式，
3. 根据children的类型，设置vnode的形状标识（shapeFlag）以区别文本节点还是数组子节点
4. 验证key属性的有效性
5. 如果开启了 block tree 追踪，并且当前存在一个父 block 并且vnode需要进行patch更新（根据patchFlag和shapeFlag判断），则将当前的vnode加入到blick中

```ts
export const Text = Symbol.for("v-txt"); //全局注册symbol
export const Comment = Symbol.for("v-cmt");
export const Static = Symbol.for("v-stc");
export const Fragment = Symbol.for("v-fgt") as any as {
  __isFragment: true;
  new (): {
    $props: VNodeProps;
  };
};

export function createTextVNode(text: string = " ", flag: number = 0): VNode {
  return createVNode(Text, null, text, flag);
}
export function createStaticVNode(
  content: string,
  numberOfNodes: number
): VNode {
  // A static vnode can contain multiple stringified elements, and the number
  // of elements is necessary for hydration.
  const vnode = createVNode(Static, null, content);
  vnode.staticCount = numberOfNodes;
  return vnode;
}
export function createCommentVNode(
  text: string = "",
  // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock: boolean = false
): VNode {
  return asBlock
    ? (openBlock(), createBlock(Comment, null, text))
    : createVNode(Comment, null, text);
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === "boolean") {
    // empty placeholder
    return createVNode(Comment);
  } else if (isArray(child)) {
    // fragment
    return createVNode(
      Fragment,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    );
  } else if (typeof child === "object") {
    // already vnode, this should be the most common since compiled templates
    // always produce all-vnode children arrays
    return cloneIfMounted(child);
  } else {
    // strings and numbers
    return createVNode(Text, null, String(child));
  }
}
```

这里分别创建文本节点，静态节点，注释节点吗，还有标准化vnode，让 child 支持更多格式

## scheduler.ts

这一章的执行情况，主要是和异步任务有关

实现调度器 `nextTick`实现异步任务

声明 isFlushPenging.queue（任务队列）

```ts
let isFlushPending = false;
const queue: SchedulerJob[] = [];
const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>;
let activePostFlushCbs: SchedulerJob[] | null = null;
let currentFlushPromise: Promise<void> | null = null;
```

```ts
export function nextTick<T = void, R = void>(
  this: T,
  fn?: (this: T) => R
): Promise<Awaited<R>> {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
```

```ts
export function queueJob(job: SchedulerJob) {
  // the dedupe search uses the startIndex argument of Array.includes()
  // by default the search index includes the current job that is being run
  // so it cannot recursively trigger itself again.
  // if the job is a watch() callback, the search will start with a +1 index to
  // allow it recursively trigger itself - it is the user's responsibility to
  // ensure it doesn't end up in an infinite loop.
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    if (job.id == null) {
      queue.push(job);
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job);
    }
    queueFlush();
  }
}
```

queueJob常见触发时机：

1. 当响应式数据发生变化的时候，vue会调用`trigger函数，进而调用`queueJob将更新的视图的任务放入队列当中，等待微任务阶段执行
2. 用户在组件内部使用`watch`API监听数据的变化，对应的回调函数会被包装成一个任务并通过`queueJob`函数加入到任务队列
3. 用户调用`setTimeout` `promise.then`等异步api的时候，vue会把组件内部进行视图的更新的操作封装成任务并调用`queueJob`
4. 使用nextTick将更新操作加入到微任务队列当中，实现异步更新

总结下来 ：

-  queueJob在需要异步更新的地方被调度使用 
- 性能优化，将多个多次的组件更新合并到一次微任务中执行，减少DOM操作次数
- 避免重复的更新
- 执行时机控制 确保微任务完成 

tips ： 解析`isFlushPending`作用的机制

- 核心概念 ： 用来标记是否已经安排了一个刷新队列的微任务但是还没有执行，他的工作可以类比成餐厅的订单已经提交但是还没有出餐的状态
- 就是如果同一个事件循环中又有新任务的加入，会进行判断，确保不会重复的安排微任务
- 执行微任务会改变状态（‘已经出餐订单完成’），使得能够转变成能够安排任务的状态
- 设计的必要性
  - 防止微任务泛滥（可以先存进去但是不取出来使用）
  - 保证执行的顺序（确保同步变更被收集到队列后，一次性进行处理）
  - 性能优化 

queueFlush

```ts
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
```

如果同时触发两个组件的更新，这里会触发两次return，但是没有必要

1. 首先，函数检查两个状态变量`isFlushing`和`isFlushPenging`。`isFlushing`表示是否正在执行任务队列中的工作，`isFlushing`表示是否已经安排在下一个异步时机执行任务队列
2. 如果当前的既不在执行任务队列（`!isFlushing`）也没有安排在将来执行（`!isFlushingPenging`），那么就将`isFlushingPenging = true`，表示当前已经了任务队列执行
3. 然后调用`resolveedPromise.then(flushJobs)`。这里的`resolvePromise`是一个已经解决的promise对象，调用`then`方法在下一次微任务轮询执行`flushJobs`函数，这个函数负责从任务队列中取出并执行所有待处理的任务
4. 作用：检查当前是否已经已有异步更新在进行或已经安排进行，如果没有，就标记异步更新安排，并调用`resolvePromise.then(flushJobs)`，使得下一个微任务中执行`flushJobs`函数，开始处理队列中的任务
5. 关系 ： `queueJobs`在添加任务后通会调用`queueFlush`来触发任务的执行

```ts
export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb);
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}
```

作用：管理后置的刷新回调的关键函数

- 作用将需要在DOM更新之后的执行的回调函数（如update生命周期钩子）加入队列，并触发更新
- 和`queueJons`区别
  - `queueJobs`：处理组件更新等核心渲染任务（优先执行）
  - `queuePostFlushCb`：处理DOM更新之后的副作用回调函数（稍后执行）
- 可以防止后置的刷新钩子之类的
- 在`flushJobs`之后执行

1. 检查传入的回调函数`cb`是否是数组，如果不是数组，则将其视为单个回调函数处理
   - 如果`activePostFlushCbs`（当前活跃的post-flush回调队列）为空，或者`cb`不在活跃队列当中，（通过`includes`方法进行判断，考虑是否允许递归的触发以及当前索引`postFlushIndex`），则将`cb`推入`pendingPostFlushCbs`（等待执行的post-flush回调队列）中
   - 如果`cb`是一个数组，则认为它是由组件生命周期钩子组成的，这些钩子已经在主任队列当中去重，所以这里可以略过重复检查，直接将整个数组推入`pendingPostFlushCbs`
2. 不论是否添加了新的回调函数，都会才调用`queueFlush()`函数，这是因为，即使添加的是post-flush回调，也需要触发一次异步更新流程以确保所有同步任务完成之后再次执行这些回调

安排执行那些需要在DOM更新后执行回调函数

- 作用：将一个post-flush回调函数（schedulerJob）添加到post-flush回调队列当中，这些回调i会在DOM更新之后执行，通常用于处理DOM交互，资源清理等操作
- 关系 ：同样在添加回调后调用`queueFlush`来确保回调在合适的时机执行

```ts
function flushJobs(seen?: CountMap) {
  isFlushPending = false;
  isFlushing = true;
  if (__DEV__) {
    seen = seen || new Map();
  }

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child so its render effect will have smaller
  //    priority number)
  // 2. If a component is unmounted during a parent component's update,
  //    its update can be skipped.
  queue.sort(comparator);

  // conditional usage of checkRecursiveUpdate must be determined out of
  // try ... catch block since Rollup by default de-optimizes treeshaking
  // inside try-catch. This can leave all warning code unshaked. Although
  // they would get eventually shaken by a minifier like terser, some minifiers
  // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)
  const check = __DEV__
    ? (job: SchedulerJob) => checkRecursiveUpdates(seen!, job)
    : NOOP;

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job && job.active !== false) {
        if (__DEV__ && check(job)) {
          continue;
        }
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER);
      }
    }
  } finally {
    flushIndex = 0;
    queue.length = 0;

    flushPostFlushCbs(seen);

    isFlushing = false;
    currentFlushPromise = null;
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen);
    }
  }
}
```

1. 设置调度状态，首先根据`isFlushPending`设置成false，表示当前没有等待属性的内容，将`isFlushing`设置成true 表示已经开始执行刷新任务
2. 排序任务队列：根据任务的优先级对任务队列`queue`进行排序，确保父组件的更新优于子组件，这样保证组件树是从父到子的有序更新，并且在更新过程中如果某个子组件被卸载，就可以跳过其更新
3. 遍历任务队列：尝试执行队列中的每个任务。在开发环境中，会检查每个任务是否可能导致递归更新(`checkRecursiveUpdates`)，如果是，就跳过本次更新防止无限循环
4. 执行任务：调用`callWithErrorHandling`函数来执行每个有效的任务（active ！== false），并将可能出现的错误报告给全局错误处理程序
5. 清理状态：遍历完成之后，重置`flushIndex`是0，清空`queue`长度，执行所有post-flush回调函数`flushPostFlushCbs`
6. 结束调度：将`isFlushing`设置成false，清空当前的flush promise，并检查是否有剩余的post-flush回调任务或者新的任务队列，如果有，就继续调用`flushJobs`函数以执行剩余的任务，直到队列全部清空

这里先执行的`flushPostFlushcbs`然后执行`flushjobs`

- 作用：执行调度队列中的所有任务，首先对任务队列进行排序，然后依次调用每个任务，同时在开发环境下检查是否有递归更新的情况，避免无限循环。执行所有任务之后，还会处理post-flush回调队列
- 关系：由`queueFlush`安排在微任务阶段调用，是任务执行的具体逻辑所在

在`flushPostFlushCbs`中

```ts
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)].sort(
      (a, b) => getId(a) - getId(b)
    );
    pendingPostFlushCbs.length = 0;

    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }

    activePostFlushCbs = deduped;
    if (__DEV__) {
      seen = seen || new Map();
    }

    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (
        __DEV__ &&
        checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
      ) {
        continue;
      }
      activePostFlushCbs[postFlushIndex]();
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}
```

1. 首先检查是否存在待处理的post-flush回调（`pendingPostFlush.length`）若存在则进行下一步操作
2. 将待处理的回调数组去重，并按找回调的唯一标识（通过`getId`函数获取）进行排序
3. 清空原始的`pendingPostFlushCbs`队列
4. 判断是否有当前活跃的post-flush回调队列（`activePostFlushCbs`）。如果有，则将去重后的回调追加到活跃队列中，然后结束本次函数调用
5. 若当前无活跃的post-flus回调队列,则将去重后的回调设置成新的活跃队列
6. 在开发环境中，会创建一个新的`seen`映射表用来记录递归更新检查
7. 遍历新的活跃post-flush回调队列，执行每个回调，在开发环境下，会先检查回调是否会导致递归更新（`checkRecursiveUpdates`）如果会，就跳过本次执行
8. 执行完所有的回调，清空活跃的post-flush回调中的所有的微任务，和`flushJobs`类似，也会进行去重，排序等操作，并在执行每个回调检查是否有递归更新，然后执行回调函数
9. 关系：在`flushJobs`函数的末尾使用，确保在DOM更新之后并执行这些回调任务

五个函数之间的关系

`queueJob（开始执行）`和`queuePostFlushCb（结束执行）`负责将任务添加到相应的队列当中，`queueFlush`负责触发任务的执行，而`flushJobs`和`flushPostFlushCbs`则是分别处理异步任务队列和post-flush回调队列，（比如DOM元素的更新）

## Lifestyle

```ts
export const onMounted = createHook(LifecycleHooks.MOUNTED);
export const createHook =
  <T extends Function = () => any>(lifecycle: LifecycleHooks) =>
  (hook: T, target: ComponentInternalInstance | null = currentInstance) =>
    // post-create lifecycle registrations are noops during SSR (except for serverPrefetch)
    (!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) &&
    injectHook(lifecycle, (...args: unknown[]) => hook(...args), target);
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null = currentInstance,
  prepend: boolean = false
): Function | undefined {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    // cache the error handling wrapper for injected hooks so the same hook
    // can be properly deduped by the scheduler. "__weh" stands for "with error
    // handling".
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args: unknown[]) => {
        if (target.isUnmounted) {
          return;
        }
        // disable tracking inside all lifecycle hooks
        // since they can potentially be called inside effects.
        pauseTracking();
        // Set currentInstance during hook invocation.
        // This assumes the hook does not synchronously trigger other hooks, which
        // can only be false when the user does something really funky.
        const reset = setCurrentInstance(target);
        const res = callWithAsyncErrorHandling(hook, target, type, args);
        reset();
        resetTracking();
        return res;
      });
    if (prepend) {
      hooks.unshift(wrappedHook);
    } else {
      hooks.push(wrappedHook);
    }
    return wrappedHook;
  } else if (__DEV__) {
    const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ""));
    warn(
      `${apiName} is called when there is no active component instance to be ` +
        `associated with. ` +
        `Lifecycle injection APIs can only be used during execution of setup().` +
        (__FEATURE_SUSPENSE__
          ? ` If you are using async setup(), make sure to register lifecycle ` +
            `hooks before the first await statement.`
          : ``)
    );
  }
}
```

作用：

1. 生命周期钩子注册，允许开发者在组件中注册生命周期回调，（如组件的挂载，更新后等待逻辑）
2. 安全的执行环境为每个钩子函数提供
   - 响应式实例上下文管理
   - 响应式追踪暂停/恢复
   - 异步错误的捕捉
3. SSR兼容 自动跳过服务端渲染（SSR）中无用的客户端生命周期钩子（除了severPrefetch）

代码分析：

1. 外层的工厂函数

   ```ts
   export const onMounted = createHook(LifecycleHooks.MOUNTED);
   ```

   - 作用：创建具体的生命周期钩子的快捷方式（onMouted）
   - 参数：LifeStylecycleHooks.Mountedv表示钩子的类型（其他类型如 UPDATE ，UNMOUNTED）

2. 中间层的逻辑

   ```ts
   (hook: T, target = currentInstance) => {
     if (!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) {
       injectHook(lifecycle, (...args) => hook(...args), target);
     }
   }
   ```

   - SSR处理：在服务端渲染时，忽略客户端专属生命周期钩子
   - 参数：
     - hook：用户传递的回调函数
     - target：目标组件实例

3. 核心价值（injectHook）

   ```ts
   function injectHook(type, hook, target = currentInstance, prepend = false) {
     if (target) {
       // 1. 获取或初始化钩子队列
       const hooks = target[type] || (target[type] = []);
   
       // 2. 创建带错误处理的包装函数
       const wrappedHook = hook.__weh || (hook.__weh = (...args) => {
         if (target.isUnmounted) return;      // 跳过已卸载组件
         pauseTracking();                     // 暂停响应式追踪
         const reset = setCurrentInstance(target); // 设置当前实例
         const res = callWithAsyncErrorHandling(hook, target, type, args); // 执行用户钩子
         reset();                             // 恢复实例上下文
         resetTracking();                     // 恢复响应式追踪
         return res;
       });
   
       // 3. 将包装函数加入队列
       prepend ? hooks.unshift(wrappedHook) : hooks.push(wrappedHook);
       return wrappedHook;
     } else if (__DEV__) {
       // 开发环境警告：无活跃组件实例时提示
     }
   }
   ```

   关键设计点：

   1. 生命周队列存储 

      - 每个组件实例内部维护一个生命周期队列

        ```ts
        interface ComponentInternalInstance {
          [LifecycleHooks.MOUNTED]: Function[];
          [LifecycleHooks.UPDATED]: Function[];
          // ...
        }
        ```

      - 执行顺序：通过prepend参数控制插入的位置（默认追加到队尾）

   2. 包装函数：

      - 名称含义：”with Error Handing（带错误处理）“
      - 四大保护机制
        - 暂停检查：避免执行已经卸载组件的回调
        - 暂停响应式的追踪：防止钩子操作意外触发依赖收集
        - 实例上下文管理：确保`getCurrentInstance`能够获取正确的实例
        - 异步错误的捕获：通过`callWithAsyncErrorHandling`统一错误的处理

   3. 完整的工作流程：

      1. 调用`createHook(LifestyleHooks.MOUNTED)`创建`onMounted`函数
      2. 用户调用`onMounted(callback)`
         - 检查SSR环境（是SSR非`srverPrefetch`就跳过）
         - 调用`injectHook`将回调注入组件实例的mounted队列
      3. 组件挂载完毕后，Vue遍历执行队列中的所有包装函数

------

# 渲染相关

## render.ts

```ts
export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer<HostNode, HostElement>(options);
}
```

调用`createRender`函数

1. 初始化渲染器功能：
   - `createRender`函数接收一个包含一系列渲染器所需要基本操作对象作为参数，如创建元素，设置元素文本，更新属性等、
   - 根据提供的相关平台的API。Vue将会创建一个渲染器实例，该实例具有处理虚拟DOM和真实DOM之间转换的能力
2. 处理组件渲染：
   - 渲染器中的核心方法如`render`和`patch`负责解析和更新组件的Vnode树，将组件和元素的vnode转换成真实的DOM结构
   - `patch`方法比较新旧Vnode树的不同，最小化DOM操作（diff算法），只发生改变的部分进行更新，提高性能
3. 组件生命周期钩子调用：
   - 在创建和更新DOM的过程中，渲染器会适时的调用组件的生命周期钩子函数，如`onBeforeMounted`,`onMounted`,......

`createRenderer`*在runtime-dom中调用

```ts
export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setText: hostSetText,
    createText: hostCreateText,
  } = options;

  const render = (vnode, container) => {
    console.log("调用 patch");
    patch(null, vnode, container);
  };

  function patch(
    n1,
    n2,
    container = null,
    anchor = null,
    parentComponent = null
  ) {
    // 基于 n2 的类型来判断
    // 因为 n2 是新的 vnode
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      // 其中还有几个类型比如： static fragment comment
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        // 这里就基于 shapeFlag 来处理
        if (shapeFlag & ShapeFlags.ELEMENT) {
          console.log("处理 element");
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          console.log("处理 component");
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }

  function processFragment(n1: any, n2: any, container: any) {
    // 只需要渲染 children ，然后给添加到 container 内
    if (!n1) {
      // 初始化 Fragment 逻辑点
      console.log("初始化 Fragment 类型的节点");
      mountChildren(n2.children, container);
    }
  }

  function processText(n1, n2, container) {
    console.log("处理 Text 节点");
    if (n1 === null) {
      // n1 是 null 说明是 init 的阶段
      // 基于 createText 创建出 text 节点，然后使用 insert 添加到 el 内
      console.log("初始化 Text 类型的节点");
      hostInsert((n2.el = hostCreateText(n2.children as string)), container);
    } else {
      // update
      // 先对比一下 updated 之后的内容是否和之前的不一样
      // 在不一样的时候才需要 update text
      // 这里抽离出来的接口是 setText
      // 注意，这里一定要记得把 n1.el 赋值给 n2.el, 不然后续是找不到值的
      const el = (n2.el = n1.el!);
      if (n2.children !== n1.children) {
        console.log("更新 Text 类型的节点");
        hostSetText(el, n2.children as string);
      }
    }
  }

  function processElement(n1, n2, container, anchor, parentComponent) {
    if (!n1) {
      mountElement(n2, container, anchor);
    } else {
      // todo
      updateElement(n1, n2, container, anchor, parentComponent);
    }
  }

  function updateElement(n1, n2, container, anchor, parentComponent) {
    const oldProps = (n1 && n1.props) || {};
    const newProps = n2.props || {};
    // 应该更新 element
    console.log("应该更新 element");
    console.log("旧的 vnode", n1);
    console.log("新的 vnode", n2);

    // 需要把 el 挂载到新的 vnode
    const el = (n2.el = n1.el);

    // 对比 props
    patchProps(el, oldProps, newProps);

    // 对比 children
    patchChildren(n1, n2, el, anchor, parentComponent);
  }

  function patchProps(el, oldProps, newProps) {
    // 对比 props 有以下几种情况
    // 1. oldProps 有，newProps 也有，但是 val 值变更了
    // 举个栗子
    // 之前: oldProps.id = 1 ，更新后：newProps.id = 2

    // key 存在 oldProps 里 也存在 newProps 内
    // 以 newProps 作为基准
    for (const key in newProps) {
      const prevProp = oldProps[key];
      const nextProp = newProps[key];
      if (prevProp !== nextProp) {
        // 对比属性
        // 需要交给 host 来更新 key
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }

    // 2. oldProps 有，而 newProps 没有了
    // 之前： {id:1,tId:2}  更新后： {id:1}
    // 这种情况下我们就应该以 oldProps 作为基准，因为在 newProps 里面是没有的 tId 的
    // 还需要注意一点，如果这个 key 在 newProps 里面已经存在了，说明已经处理过了，就不要在处理了
    for (const key in oldProps) {
      const prevProp = oldProps[key];
      const nextProp = null;
      if (!(key in newProps)) {
        // 这里是以 oldProps 为基准来遍历，
        // 而且得到的值是 newProps 内没有的
        // 所以交给 host 更新的时候，把新的值设置为 null
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }
  }

  function patchChildren(n1, n2, container, anchor, parentComponent) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1;
    const { shapeFlag, children: c2 } = n2;

    // 如果 n2 的 children 是 text 类型的话
    // 就看看和之前的 n1 的 children 是不是一样的
    // 如果不一样的话直接重新设置一下 text 即可
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (c2 !== c1) {
        console.log("类型为 text_children, 当前需要更新");
        hostSetElementText(container, c2 as string);
      }
    } else {
      // 看看之前的是不是 text
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 先清空
        // 然后在把新的 children 给 mount 生成 element
        hostSetElementText(container, "");
        mountChildren(c2, container);
      } else {
        // array diff array
        // 如果之前是 array_children
        // 现在还是 array_children 的话
        // 那么我们就需要对比两个 children 啦
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1: any[],
    c2: any[],
    container,
    parentAnchor,
    parentComponent
  ) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    const isSameVNodeType = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key;
    };

    while (i <= e1 && i <= e2) {
      const prevChild = c1[i];
      const nextChild = c2[i];

      if (!isSameVNodeType(prevChild, nextChild)) {
        console.log("两个 child 不相等(从左往右比对)");
        console.log(`prevChild:${prevChild}`);
        console.log(`nextChild:${nextChild}`);
        break;
      }

      console.log("两个 child 相等，接下来对比这两个 child 节点(从左往右比对)");
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      i++;
    }

    while (i <= e1 && i <= e2) {
      // 从右向左取值
      const prevChild = c1[e1];
      const nextChild = c2[e2];

      if (!isSameVNodeType(prevChild, nextChild)) {
        console.log("两个 child 不相等(从右往左比对)");
        console.log(`prevChild:${prevChild}`);
        console.log(`nextChild:${nextChild}`);
        break;
      }
      console.log("两个 child 相等，接下来对比这两个 child 节点(从右往左比对)");
      patch(prevChild, nextChild, container, parentAnchor, parentComponent);
      e1--;
      e2--;
    }

    if (i > e1 && i <= e2) {
      // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
      // 也就是说新增了 vnode
      // 应该循环 c2
      // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
      // 要添加的位置是当前的位置(e2 开始)+1
      // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
      // 所以我们需要从 e2 + 1 取到锚点的位置
      const nextPos = e2 + 1;
      const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
      while (i <= e2) {
        console.log(`需要新创建一个 vnode: ${c2[i].key}`);
        patch(null, c2[i], container, anchor, parentComponent);
        i++;
      }
    } else if (i > e2 && i <= e1) {
      // 这种情况的话说明新节点的数量是小于旧节点的数量的
      // 那么我们就需要把多余的
      while (i <= e1) {
        console.log(`需要删除当前的 vnode: ${c1[i].key}`);
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 左右两边都比对完了，然后剩下的就是中间部位顺序变动的
      // 例如下面的情况
      // a,b,[c,d,e],f,g
      // a,b,[e,c,d],f,g

      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = new Map();
      let moved = false;
      let maxNewIndexSoFar = 0;
      // 先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
      // 时间复杂度是 O(1)
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 需要处理新节点的数量
      const toBePatched = e2 - s2 + 1;
      let patched = 0;
      // 初始化 从新的index映射为老的index
      // 创建数组的时候给定数组的长度，这个是性能最快的写法
      const newIndexToOldIndexMap = new Array(toBePatched);
      // 初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;

      // 遍历老节点
      // 1. 需要找出老节点有，而新节点没有的 -> 需要把这个节点删除掉
      // 2. 新老节点都有的，—> 需要 patch
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];

        // 优化点
        // 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }

        let newIndex;
        if (prevChild.key != null) {
          // 这里就可以通过key快速的查找了， 看看在新的里面这个节点存在不存在
          // 时间复杂度O(1)
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // 如果没key 的话，那么只能是遍历所有的新节点来确定当前节点存在不存在了
          // 时间复杂度O(n)
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        // 因为有可能 nextIndex 的值为0（0也是正常值）
        // 所以需要通过值是不是 undefined 或者 null 来判断
        if (newIndex === undefined) {
          // 当前节点的key 不存在于 newChildren 中，需要把当前节点给删除掉
          hostRemove(prevChild.el);
        } else {
          // 新老节点都存在
          console.log("新老节点都存在");
          // 把新节点的索引和老的节点的索引建立映射关系
          // i + 1 是因为 i 有可能是0 (0 的话会被认为新节点在老的节点中不存在)
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // 来确定中间的节点是不是需要移动
          // 新的 newIndex 如果一直是升序的话，那么就说明没有移动
          // 所以我们可以记录最后一个节点在新的里面的索引，然后看看是不是升序
          // 不是升序的话，我们就可以确定节点移动过了
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }

          patch(prevChild, c2[newIndex], container, null, parentComponent);
          patched++;
        }
      }

      // 利用最长递增子序列来优化移动逻辑
      // 因为元素是升序的话，那么这些元素就是不需要移动的
      // 而我们就可以通过最长递增子序列来获取到升序的列表
      // 在移动的时候我们去对比这个列表，如果对比上的话，就说明当前元素不需要移动
      // 通过 moved 来进行优化，如果没有移动过的话 那么就不需要执行算法
      // getSequence 返回的是 newIndexToOldIndexMap 的索引值
      // 所以后面我们可以直接遍历索引值来处理，也就是直接使用 toBePatched 即可
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;

      // 遍历新节点
      // 1. 需要找出老节点没有，而新节点有的 -> 需要把这个节点创建
      // 2. 最后需要移动一下位置，比如 [c,d,e] -> [e,c,d]

      // 这里倒循环是因为在 insert 的时候，需要保证锚点是处理完的节点（也就是已经确定位置了）
      // 因为 insert 逻辑是使用的 insertBefore()
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 确定当前要处理的节点索引
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        // 锚点等于当前节点索引+1
        // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;

        if (newIndexToOldIndexMap[i] === 0) {
          // 说明新节点在老的里面不存在
          // 需要创建
          patch(null, nextChild, container, anchor, parentComponent);
        } else if (moved) {
          // 需要移动
          // 1. j 已经没有了 说明剩下的都需要移动了
          // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            // 移动的话使用 insert 即可
            hostInsert(nextChild.el, container, anchor);
          } else {
            // 这里就是命中了  index 和 最长递增子序列的值
            // 所以可以移动指针了
            j--;
          }
        }
      }
    }
  }

  function mountElement(vnode, container, anchor) {
    const { shapeFlag, props } = vnode;
    // 1. 先创建 element
    // 基于可扩展的渲染 api
    const el = (vnode.el = hostCreateElement(vnode.type));

    // 支持单子组件和多子组件的创建
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 举个栗子
      // render(){
      //     return h("div",{},"test")
      // }
      // 这里 children 就是 test ，只需要渲染一下就完事了
      console.log(`处理文本:${vnode.children}`);
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 举个栗子
      // render(){
      // Hello 是个 component
      //     return h("div",{},[h("p"),h(Hello)])
      // }
      // 这里 children 就是个数组了，就需要依次调用 patch 递归来处理
      mountChildren(vnode.children, el);
    }

    // 处理 props
    if (props) {
      for (const key in props) {
        // todo
        // 需要过滤掉vue自身用的key
        // 比如生命周期相关的 key: beforeMount、mounted
        const nextVal = props[key];
        hostPatchProp(el, key, null, nextVal);
      }
    }

    // todo
    // 触发 beforeMount() 钩子
    console.log("vnodeHook  -> onVnodeBeforeMount");
    console.log("DirectiveHook  -> beforeMount");
    console.log("transition  -> beforeEnter");

    // 插入
    hostInsert(el, container, anchor);

    // todo
    // 触发 mounted() 钩子
    console.log("vnodeHook  -> onVnodeMounted");
    console.log("DirectiveHook  -> mounted");
    console.log("transition  -> enter");
  }

  function mountChildren(children, container) {
    children.forEach((VNodeChild) => {
      // todo
      // 这里应该需要处理一下 vnodeChild
      // 因为有可能不是 vnode 类型
      console.log("mountChildren:", VNodeChild);
      patch(null, VNodeChild, container);
    });
  }

  function processComponent(n1, n2, container, parentComponent) {
    // 如果 n1 没有值的话，那么就是 mount
    if (!n1) {
      // 初始化 component
      mountComponent(n2, container, parentComponent);
    } else {
      updateComponent(n1, n2, container);
    }
  }

  // 组件的更新
  function updateComponent(n1, n2, container) {
    console.log("更新组件", n1, n2);
    // 更新组件实例引用
    const instance = (n2.component = n1.component);
    // 先看看这个组件是否应该更新
    if (shouldUpdateComponent(n1, n2)) {
      console.log(`组件需要更新: ${instance}`);
      // 那么 next 就是新的 vnode 了（也就是 n2）
      instance.next = n2;
      // 这里的 update 是在 setupRenderEffect 里面初始化的，update 函数除了当内部的响应式对象发生改变的时候会调用
      // 还可以直接主动的调用(这是属于 effect 的特性)
      // 调用 update 再次更新调用 patch 逻辑
      // 在update 中调用的 next 就变成了 n2了
      // ps：可以详细的看看 update 中 next 的应用
      // TODO 需要在 update 中处理支持 next 的逻辑
      instance.update();
    } else {
      console.log(`组件不需要更新: ${instance}`);
      // 不需要更新的话，那么只需要覆盖下面的属性即可
      n2.component = n1.component;
      n2.el = n1.el;
      instance.vnode = n2;
    }
  }

  function mountComponent(initialVNode, container, parentComponent) {
    // 1. 先创建一个 component instance
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));
    console.log(`创建组件实例:${instance.type.name}`);
    // 2. 给 instance 加工加工
    setupComponent(instance);

    setupRenderEffect(instance, initialVNode, container);
  }

  function setupRenderEffect(instance, initialVNode, container) {
    // 调用 render
    // 应该传入 ctx 也就是 proxy
    // ctx 可以选择暴露给用户的 api
    // 源代码里面是调用的 renderComponentRoot 函数
    // 这里为了简化直接调用 render

    // obj.name  = "111"
    // obj.name = "2222"
    // 从哪里做一些事
    // 收集数据改变之后要做的事 (函数)
    // 依赖收集   effect 函数
    // 触发依赖
    function componentUpdateFn() {
      if (!instance.isMounted) {
        // 组件初始化的时候会执行这里
        // 为什么要在这里调用 render 函数呢
        // 是因为在 effect 内调用 render 才能触发依赖收集
        // 等到后面响应式的值变更后会再次触发这个函数
        console.log(`${instance.type.name}:调用 render,获取 subTree`);
        const proxyToUse = instance.proxy;
        // 可在 render 函数中通过 this 来使用 proxy
        const subTree = (instance.subTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse)
        ));
        console.log("subTree", subTree);

        // todo
        console.log(`${instance.type.name}:触发 beforeMount hook`);
        console.log(`${instance.type.name}:触发 onVnodeBeforeMount hook`);

        // 这里基于 subTree 再次调用 patch
        // 基于 render 返回的 vnode ，再次进行渲染
        // 这里我把这个行为隐喻成开箱
        // 一个组件就是一个箱子
        // 里面有可能是 element （也就是可以直接渲染的）
        // 也有可能还是 component
        // 这里就是递归的开箱
        // 而 subTree 就是当前的这个箱子（组件）装的东西
        // 箱子（组件）只是个概念，它实际是不需要渲染的
        // 要渲染的是箱子里面的 subTree
        patch(null, subTree, container, null, instance);
        // 把 root element 赋值给 组件的vnode.el ，为后续调用 $el 的时候获取值
        initialVNode.el = subTree.el;

        console.log(`${instance.type.name}:触发 mounted hook`);
        instance.isMounted = true;
      } else {
        // 响应式的值变更后会从这里执行逻辑
        // 主要就是拿到新的 vnode ，然后和之前的 vnode 进行对比
        console.log(`${instance.type.name}:调用更新逻辑`);
        // 拿到最新的 subTree
        const { next, vnode } = instance;

        // 如果有 next 的话， 说明需要更新组件的数据（props，slots 等）
        // 先更新组件的数据，然后更新完成后，在继续对比当前组件的子元素
        if (next) {
          // 问题是 next 和 vnode 的区别是什么
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }

        const proxyToUse = instance.proxy;
        const nextTree = normalizeVNode(
          instance.render.call(proxyToUse, proxyToUse)
        );
        // 替换之前的 subTree
        const prevTree = instance.subTree;
        instance.subTree = nextTree;

        // 触发 beforeUpdated hook
        console.log(`${instance.type.name}:触发 beforeUpdated hook`);
        console.log(`${instance.type.name}:触发 onVnodeBeforeUpdate hook`);

        // 用旧的 vnode 和新的 vnode 交给 patch 来处理
        patch(prevTree, nextTree, prevTree.el, null, instance);

        // 触发 updated hook
        console.log(`${instance.type.name}:触发 updated hook`);
        console.log(`${instance.type.name}:触发 onVnodeUpdated hook`);
      }
    }

    // 在 vue3.2 版本里面是使用的 new ReactiveEffect
    // 至于为什么不直接用 effect ，是因为需要一个 scope  参数来收集所有的 effect
    // 而 effect 这个函数是对外的 api ，是不可以轻易改变参数的，所以会使用  new ReactiveEffect
    // 因为 ReactiveEffect 是内部对象，加一个参数是无所谓的
    // 后面如果要实现 scope 的逻辑的时候 需要改过来
    // 现在就先算了
    instance.update = effect(componentUpdateFn, {
      scheduler: () => {
        // 把 effect 推到微任务的时候在执行
        // queueJob(effect);
        queueJob(instance.update);
      },
    });
  }

  function updateComponentPreRender(instance, nextVNode) {
    // 更新 nextVNode 的组件实例
    // 现在 instance.vnode 是组件实例更新前的
    // 所以之前的 props 就是基于 instance.vnode.props 来获取
    // 接着需要更新 vnode ，方便下一次更新的时候获取到正确的值
    nextVNode.component = instance;
    // TODO 后面更新 props 的时候需要对比
    // const prevProps = instance.vnode.props;
    instance.vnode = nextVNode;
    instance.next = null;

    const { props } = nextVNode;
    console.log("更新组件的 props", props);
    instance.props = props;
    console.log("更新组件的 slots");
    // TODO 更新组件的 slots
    // 需要重置 vnode
  }

  return {
    render,
    createApp: createAppAPI(render),
  };
}
```

baseCreateRender

1. 创建真实的DOM元素：根据传入的Vnode创建能够复用真实的DOM节点
2. 更新DOM：对比新旧vnode，执行必要DOM更新操作，包括增删改查
3. 挂载组件：当遇到组件类型的vnode，创建组件的实例，执行组件的`setup`钩子，渲染函数，并递归的处理子组件和子节点
4. 卸载组件：在组件销毁的时候，清除组件实例上的副作用（effects）移除DOM节点，释放资源
5. 跨平台支持：提供通用的接口系和抽象层，使得渲染器可以在不同平台上面使用，如客户端（browserrenderer）和服务端（sever renderer）

找到最长上升子序列算法的实现

```ts
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
```

1. 创建一个副本数组`p`，用来保存原数组中的每个元素对应的LIS中的前一个元素的索引
2. 创建一个结果索引`result`,用来存储构最长递增子序列的原始数组中的索引
3. 使用二分查找算法，在结果数组中定位新加入的元素的合适的位置，使得结果数组始终保持递增排序
4. 循环遍历数组arr。依次将每一个元素和当前的结果数组进行比较，找到对应的最大递增子序列的位置并记录到p中
5. 最后反转结果数组，使其成为从原数组中提取的最长子序列的索引集合

整个函数就是为了寻找最长上升子序列

## h.ts

h函数实际上是调用的`createVnode`函数

就是创建虚拟节点的过程 获得各种类型的信息

```ts
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      // props without children
      return createVNode(type, propsOrChildren);
    } else {
      // omit props
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
```

h函数支持多种形式

```ts
// type only
h("div");

// type + props
h("div", {});

// type + omit props + children
// Omit props does NOT support named slots
h("div", []); // array
h("div", "foo"); // text
h("div", h("br")); // vnode
h(Component, () => {}); // default slot

// type + props + children
h("div", {}, []); // array
h("div", {}, "foo"); // text
h("div", {}, h("br")); // vnode
h(Component, {}, () => {}); // default slot
h(Component, {}, {}); // named slots

// named slots without props requires explicit `null` to avoid ambiguity
h(Component, null, {});
```

因此有很多的重载

h函数接收三个参数：

1. `type`：代表的是创建的DO元素类型，它可以是HTML元素标签名（如‘button’），自定义元素标签名，或者组件构造函数。对于特殊类型的如`Fragment`,`Text`,'Comment','Teleport'，h函数也能正确的处理
2. `props`：一个对象，用来描述元素或者组件的属性，这里的`RawProps`包含了标准的`VnodeProps`包含了标准的`VnodeProps`以及其他的可能的原生的DOM事件处理器
3. `children`：子节点，可以是字符串，数字，bool（会转化成文本节点）Vnode对象，数组或者是一个返回vnode的函数（默认插槽）

`h`函数定义了函数类型中提供了多种重载版本，以确保在不同场景下都能获得正确的类型判断。例如：当传递一个HTML元素标签名时，他会根据第二个参数可以是属性对象加上子节点，也可以是仅是字节点。而对于组件类型，h函数会根据组件的类型和是否传入props进行进一步的类型细化

# API

## createApp

```ts
export function createAppAPI<HostElement>(
  render: RootRenderFunction<HostElement>,
  hydrate?: RootHydrateFunction
): CreateAppFunction<HostElement> {
  return function createApp(rootComponent, rootProps = null) {
    if (!isFunction(rootComponent)) {
      rootComponent = extend({}, rootComponent);
    }

    if (rootProps != null && !isObject(rootProps)) {
      __DEV__ && warn(`root props passed to app.mount() must be an object.`);
      rootProps = null;
    }

    const context = createAppContext();
    const installedPlugins = new WeakSet();

    let isMounted = false;

    const app: App = (context.app = {
      _uid: uid++,
      _component: rootComponent as ConcreteComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,

      version,

      get config() {
        return context.config;
      },

      set config(v) {
        if (__DEV__) {
          warn(
            `app.config cannot be replaced. Modify individual options instead.`
          );
        }
      },

      use(plugin: Plugin, ...options: any[]) {
        if (installedPlugins.has(plugin)) {
          __DEV__ && warn(`Plugin has already been applied to target app.`);
        } else if (plugin && isFunction(plugin.install)) {
          installedPlugins.add(plugin);
          plugin.install(app, ...options);
        } else if (isFunction(plugin)) {
          installedPlugins.add(plugin);
          plugin(app, ...options);
        } else if (__DEV__) {
          warn(
            `A plugin must either be a function or an object with an "install" ` +
              `function.`
          );
        }
        return app;
      },

      mixin(mixin: ComponentOptions) {
        if (__FEATURE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin);
          } else if (__DEV__) {
            warn(
              "Mixin has already been applied to target app" +
                (mixin.name ? `: ${mixin.name}` : "")
            );
          }
        } else if (__DEV__) {
          warn("Mixins are only available in builds supporting Options API");
        }
        return app;
      },

      component(name: string, component?: Component): any {
        if (__DEV__) {
          validateComponentName(name, context.config);
        }
        if (!component) {
          return context.components[name];
        }
        if (__DEV__ && context.components[name]) {
          warn(
            `Component "${name}" has already been registered in target app.`
          );
        }
        context.components[name] = component;
        return app;
      },

      directive(name: string, directive?: Directive) {
        if (__DEV__) {
          validateDirectiveName(name);
        }

        if (!directive) {
          return context.directives[name] as any;
        }
        if (__DEV__ && context.directives[name]) {
          warn(
            `Directive "${name}" has already been registered in target app.`
          );
        }
        context.directives[name] = directive;
        return app;
      },

      mount(
        rootContainer: HostElement,
        isHydrate?: boolean,
        namespace?: boolean | ElementNamespace
      ): any {
        if (!isMounted) {
          // #5571
          if (__DEV__ && (rootContainer as any).__vue_app__) {
            warn(
              `There is already an app instance mounted on the host container.\n` +
                ` If you want to mount another app on the same host container,` +
                ` you need to unmount the previous app by calling \`app.unmount()\` first.`
            );
          }
          const vnode = createVNode(rootComponent, rootProps);
          // store app context on the root VNode.
          // this will be set on the root instance on initial mount.
          vnode.appContext = context;

          if (namespace === true) {
            namespace = "svg";
          } else if (namespace === false) {
            namespace = undefined;
          }

          // HMR root reload
          if (__DEV__) {
            context.reload = () => {
              // casting to ElementNamespace because TS doesn't guarantee type narrowing
              // over function boundaries
              render(
                cloneVNode(vnode),
                rootContainer,
                namespace as ElementNamespace
              );
            };
          }

          if (isHydrate && hydrate) {
            hydrate(vnode as VNode<Node, Element>, rootContainer as any);
          } else {
            render(vnode, rootContainer, namespace);
          }
          isMounted = true;
          app._container = rootContainer;
          // for devtools and telemetry
          (rootContainer as any).__vue_app__ = app;

          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = vnode.component;
            devtoolsInitApp(app, version);
          }

          return getExposeProxy(vnode.component!) || vnode.component!.proxy;
        } else if (__DEV__) {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          );
        }
      },

      unmount() {
        if (isMounted) {
          render(null, app._container);
          if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
            app._instance = null;
            devtoolsUnmountApp(app);
          }
          delete app._container.__vue_app__;
        } else if (__DEV__) {
          warn(`Cannot unmount an app that is not mounted.`);
        }
      },

      provide(key, value) {
        if (__DEV__ && (key as string | symbol) in context.provides) {
          warn(
            `App already provides property with key "${String(key)}". ` +
              `It will be overwritten with the new value.`
          );
        }

        context.provides[key as string | symbol] = value;

        return app;
      },

      runWithContext(fn) {
        currentApp = app;
        try {
          return fn();
        } finally {
          currentApp = null;
        }
      },
    });

    if (__COMPAT__) {
      installAppCompatProperties(app, context, render);
    }

    return app;
  };
}
```

分析：

1. 函数签名：
   TypeScript

   ```ts
   export function createAppAPI<HostElement>(
     render: RootRenderFunction<HostElement>,
     hydrate?: RootHydrateFunction
   ): CreateAppFunction<HostElement>;
   ```

   这个函数接收另外两个参数：一个是渲染函数（RootRenderFunction），用于将虚拟DOM转换成真实DOM，另一个可选的hydrate函数，用来服务端渲染的hydration过程。函数返回一个创建应用的工厂函数，允许用户创建新的Vue应用实例并指定宿主元素的类型

2. 创建应用函数内部：

   ```ts
   return function createApp(rootComponent, rootProps = null) {...}
   ```

   定义了一个内部的闭包函数`createApp`接收两个参数，根组件（rootCompoent）和跟组件的初始属性（rootProps）这个函数负责创建并返回一个具有包含多个方法的应用实例

3. 应用实例对象app具有以下的关键方法和属性

   - `mount`：挂载应用到指定的DOM容器（HostElement），可以选择是否执行hydration，在这个过程中，会创建vnode（虚拟DOM节点），设置上下文环境，然后根据情况调用`render`函数或者`hydrate`函数进行实际的DOM操作。挂载成功之后，会设置一些实例的一些必要属性，比如：*opp_context* 和 *container* 等，并启动开发工具和HMR支持
   - `unmount`：卸载应用，清除已经挂载的DOM内容及其相关的状态
   - `use`：注册并应用插件到当前的应用实例
   - `mixin`：向应用添加全局混合选项
   - `component,directive`：注册全局组件和全局指令
   - `provide`：提供注入到后代组件的作用域变量
   - `runWithContent`：在特定引用上下文运行给定函数
   - 其他的一些辅助方法，如配置获取和验证，版本检查等

在mount的时候，基于根组件创建vnode，然后调用render，基于vnode进行渲染创建

createAppAPI在render.ts中使用

有关createApp流程

Vue3运行时调用从`createApp`开始，会依次触发以下的重要函数：

1. `createApp`:

   ```ts
   import { createApp } from "vue";
   const app = createApp(App);
   ```

   这个函数创建一个Vue实例对象，并且初始化应用的全局配置以及相关选项合并策略。同时，Vue3中的`setup`函数已经取代了Vue2中的部分生命周期钩子

2. `app.use`/`app.mixin`/`app.component`/`app.direct`：这些方法都是用于注册全局组件，混入，组件和自定义指令

3. `app.mount`：

   ```ts
   app.mount("#app");
   ```

   调用`mount`方法时，vue3会执行以下的步骤：

   - 创建根组件实例，此时会调用`setup`函数
   - 针对`setup`函数内部的响应式状态，通过`reactive`,`ref`,`computed`等API进行代理和观测
   - 触发组件树的挂载过程，这个阶段没有vue2的`beforeCreate`和`created`钩子，但是`setup`函数内可以使用`onBeforeMount`，`onMount`等新的生命周期钩子
   - Vue3的渲染函数（render）会被执行，基于渲染函数或者模板生成虚拟DOM并将其渲染到实际DOM当中

4. 组件更新的过程：状态变化时，Vue3会触发组件的`onBeforeUpdate`和`updateed`生命周期钩子，并通过其优化的响应式系统（如`proxy`和`effect`）来追踪并高效的更新视图

5. 销毁过程：当组件卸载时，Vue3会触发`onBeforeUnmount`和`onUnmounted`生命周期钩子，并清理相关的资源

## inject.ts

这个文件实现了provide和inject方法

```ts
import { isFunction } from "@vue/shared";
import { currentInstance } from "./component";
import { currentRenderingInstance } from "./componentRenderContext";
import { currentApp } from "./apiCreateApp";
import { warn } from "./warning";

export interface InjectionKey<T> extends Symbol {}

export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T
) {
  if (!currentInstance) {
    if (__DEV__) {
      warn(`provide() can only be used inside setup().`);
    }
  } else {
    let provides = currentInstance.provides;
    // by default an instance inherits its parent's provides object
    // but when it needs to provide values of its own, it creates its
    // own provides object using parent provides object as prototype.
    // this way in `inject` we can simply look up injections from direct
    // parent and let the prototype chain do the work.
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides;
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    // TS doesn't allow symbol as index type
    provides[key as string] = value;
  }
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T,
  treatDefaultAsFactory?: false
): T;
export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T | (() => T),
  treatDefaultAsFactory: true
): T;
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  // fallback to `currentRenderingInstance` so that this can be called in
  // a functional component
  const instance = currentInstance || currentRenderingInstance;

  // also support looking up from app-level provides w/ `app.runWithContext()`
  if (instance || currentApp) {
    // #2400
    // to support `app.use` plugins,
    // fallback to appContext's `provides` if the instance is at root
    const provides = instance
      ? instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides
      : currentApp!._context.provides;

    if (provides && (key as string | symbol) in provides) {
      // TS doesn't allow symbol as index type
      return provides[key as string];
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue;
    } else if (__DEV__) {
      warn(`injection "${String(key)}" not found.`);
    }
  } else if (__DEV__) {
    warn(`inject() can only be used inside setup() or functional components.`);
  }
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place (e.g. outside of
 * setup()). This is used by libraries that want to use `inject()` internally without triggering a warning to the end
 * user. One example is `useRoute()` in `vue-router`.
 */
export function hasInjectionContext(): boolean {
  return !!(currentInstance || currentRenderingInstance || currentApp);
}
```

provide：

- 如果当前存在组件实例，则获取当前实例的`provide`对象，`provides`对象用来存储当前组件向上提供的依赖
- 然后检查父级组件是否也提供了同样的`provide`对象，如果是，为了避免覆盖父级提供的依赖，创建新的`provide`对象，并以父级的`provide`对象为原型，这样子组件就可以通过原型链检查到祖先提供的依赖
- 最后，将提供的键值对存入当前的组件的`provide`对象中，这里由于TS不支持symbol作为索引类型，所以强制的将键值类型转换成`string`

相当于在当前实例对象的`provides`的对象上添加一个属性

inject：

- 函数内部长首先判断当前的组件实例或者应用实例， 如果有，他会沿着组件树向上进行寻找，提供的依赖项。查找范围包括组件自身的`provide`,父组件`provide`，甚至在根组件级别查找引用级别的`provides`
- 如果没有找到匹配的键值，函数会根据`treatDefaultAsFactory`的值和提供的默认值类型，选择返回默认值或者调用默认值工厂函数

tips：中间有个过程会进行判断当前组件是否直接引用父级组件的provides，如果是，就创建一个新的对象并继承父级provide（通过Object.create(parentProvides)），从而形成一条原型链

- 避免污染父级数据，不切修改子组件中的值会影响到父组件的provide
- 实现层级覆盖 ：允许子组件重新提供（re-provide）同名值
- 虽然切断了联系，但是原型链的继承还是存在的，（有控制的继承）

## watch.ts

核心 —— dowatch 作用：实现响应式观察者（watcher）功能

```ts
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, once, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {
  if (cb && once) {
    const _cb = cb;
    cb = (...args) => {
      _cb(...args);
      unwatch();
    };
  }

  // TODO remove in 3.5

  const warnInvalidSource = (s: unknown) => {
    warn(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` +
        `a reactive object, or an array of these types.`
    );
  };

  const instance = currentInstance;
  const reactiveGetter = (source: object) =>
    deep === true
      ? source // traverse will happen in wrapped getter below
      : // for deep: false, only traverse root-level properties
        traverse(source, deep === false ? 1 : undefined);

  let getter: () => any;
  let forceTrigger = false;
  let isMultiSource = false;

      // 根据source类型不同的生成不同的取值逻辑
  if (isRef(source)) {
    getter = () => source.value;
    forceTrigger = isShallow(source);
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source);
    forceTrigger = true;
  } else if (isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive(s) || isShallow(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return reactiveGetter(s);
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER);
        } else {
          __DEV__ && warnInvalidSource(s);
        }
      });
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = () =>
        callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER);
    } else {
      // no cb -> simple effect
      getter = () => {
        if (cleanup) {
          cleanup();
        }
        return callWithAsyncErrorHandling(
          source,
          instance,
          ErrorCodes.WATCH_CALLBACK,
          [onCleanup]
        );
      };
    }
  } else {
    getter = NOOP;
    __DEV__ && warnInvalidSource(source);
  }

  // 2.x array mutation watch compat
  if (__COMPAT__ && cb && !deep) {
    const baseGetter = getter;
    getter = () => {
      const val = baseGetter();
      if (
        isArray(val) &&
        checkCompatEnabled(DeprecationTypes.WATCH_ARRAY, instance)
      ) {
        traverse(val);
      }
      return val;
    };
  }

      // 深度监听
  if (cb && deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter()); // 递归的遍历对象
  }

  let cleanup: (() => void) | undefined;
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP);
      cleanup = effect.onStop = undefined;
    };
  };

  // in SSR there is no need to setup an actual effect, and it should be noop
  // unless it's eager or sync flush
  let ssrCleanup: (() => void)[] | undefined;
  if (__SSR__ && isInSSRComponentSetup) {
    // we will also not call the invalidate callback (+ runner is not set up)
    onCleanup = NOOP;
    if (!cb) {
      getter();
    } else if (immediate) {
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
        getter(),
        isMultiSource ? [] : undefined,
        onCleanup,
      ]);
    }
      // 根据调度器
    if (flush === "sync") {
      const ctx = useSSRContext()!;
      ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
    } else {
      return NOOP;
    }
  }

  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE;
  const job: SchedulerJob = () => {
    if (!effect.active || !effect.dirty) {
      return;
    }
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run();
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue)) ||
        (__COMPAT__ &&
          isArray(newValue) &&
          isCompatEnabled(DeprecationTypes.WATCH_ARRAY, instance))
      ) {
        // cleanup before running cb again
        if (cleanup) {
          cleanup();
        }
        callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
          newValue,
          // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE
            ? undefined
            : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
            ? []
            : oldValue,
          onCleanup,
        ]);
        oldValue = newValue;
      }
    } else {
      // watchEffect
      effect.run();
    }
  };

  // important: mark the job as a watcher callback so that scheduler knows
  // it is allowed to self-trigger (#1727)
  job.allowRecurse = !!cb;

      // 调度器
      // 根据flush选项创建不同的调度策略
  let scheduler: EffectScheduler; 
  if (flush === "sync") {
    scheduler = job as any; // the scheduler function gets called directly
  } else if (flush === "post") {
    scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
  } else {
    // default: 'pre'
    job.pre = true;
    if (instance) job.id = instance.uid;
    scheduler = () => queueJob(job);
  }

      // 创建响应式副作用 用于依赖的追踪+调度执行
  const effect = new ReactiveEffect(getter, NOOP, scheduler);

  const scope = getCurrentScope();
  const unwatch = () => {
    effect.stop();
    if (scope) {
      remove(scope.effects, effect);
    }
  };

  if (__DEV__) {
    effect.onTrack = onTrack;
    effect.onTrigger = onTrigger;
  }

  // initial run
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect.run();
    }
  } else if (flush === "post") {
    queuePostRenderEffect(
      effect.run.bind(effect),
      instance && instance.suspense
    );
  } else {
    effect.run();
  }

  if (__SSR__ && ssrCleanup) ssrCleanup.push(unwatch);
  return unwatch;
}
```

1. 函数接收五个参数：
   - `source`：观察的目标源，可以是getter函数，ref，reactive对象，effect函数，或者其他类型的数组
   - `cb`：变化执行的回调函数
   - `options`：包含`immdiate`，`deep`，`flush`，`once`，`onTreck`.....
2. 首先处理一次性监听的情况，就是设置了`once`选项，那么在回调后自动停止监听
3. 接着，根据`source`的不同，设置对应的`getter`函数，`getter`函数负责获取目标源的最新值，如果是深度监听（`deep=true`），`getter`会跟着嵌套对象进行遍历获取深层属性值
4. 初始化旧值`oldValue`，如果是多源数组，则初始化为长度相等的新数组，每个元素为`INITIAL_WATCHER_VALUE`
5. 定义`job`函数作为调度任务，当目标源发生变化的时候，函数会被执行，他会对比新旧值，如果满足变更条件（值改变 | 深度监听 | 首次执行）,则调用回调函数`cb`并更新旧值
6. 创建一个`ReactiveEffecet`实例，传入`getter`,`noop`函数和调度器函数,`ReactiveEffect`是Vue3内部实现响应式的核心类，他负责执行getter获取最新的值并调度更新
7. 对于不同的`flush`策略，设置不同的调度器函数，如同步，异步预渲染或后渲染
8. 在函数的末尾，根据`immdiate`和`flush`选项执行`job`函数，如果是立即执行，就会直接调用`job` ；否则，根据调度策略将其加入到合适的队列中等待执行
9. `dowatch`函数返回一个停止监听的函数（`unwatch`），用来在适当的时候定制对目标源的观察
10. 整个过程在SSR（服务端渲染）模式下会有特别的处理，避免在服务端执行不必要的副作用

```ts
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options);
}
```

这个函数的背后还是调用的`doWatch`

`watchEffect`的机制是他会收集在首次运行时候所有被访问过的响应式属性作为依赖，并在这些依赖发生变化的时候再次执行这个函数

`watch`不能直接监视一个基本类型（非响应式），当你试图直接监听一个基础类型的值时候，Vue并不能跟踪这个值的变化，因为基本类型的值在内存中是直接替换而不是修改的

------

# complier —— 编译相关

模板编译的相关流程

1. 解析模板
   - Vue使用的是一个解析器将模板字符串转换成抽象语法树（AST）结构，这个包括调用一系列分析函数，例如识别标签，属性，插槽，指令等
2. 转换AST=
   - 在得到初步的AST之后，编译器会遍历这个数并对其进行优化和转换。例如：
     - 处理动态的绑定，v-if/v-for这类指令
     - 分析作用域插槽和默认插槽
     - 解析过滤器，计算属性等
3. 生成代码
   - 转化后的AST将被使用生成Js代码，这就是上述的`generate`函数的主要工作，此函数接收经过处理的AST作为输入，并基于他生成渲染函数的源码
   - 在生成代码阶段，会调用类似`genNode`这样的递归函数去遍历AST并生成对应的Js表达式
4. 构建渲染函数
   - 最终生成的渲染函数会包含一个可以生成的虚拟DOM数的函数体，当组件实例化时，这个渲染函数会被调用，根据数据状态生成实际的视图
5. 编译选项和钩子
   - 整个过程允许用户通过编译选项影响编译过程，比如自定义指令，组件，过滤器的处理方式，或者在特定的阶段注入自定义逻辑（如`onContextCreated`钩子）

## 转化AST

### complier.ts

```ts
export function baseCompile(
  source: string | RootNode,
  options: CompilerOptions = {}
): CodegenResult {
  const onError = options.onError || defaultOnError;
  const isModuleMode = options.mode === "module";
  /* istanbul ignore if */
  if (__BROWSER__) {
    if (options.prefixIdentifiers === true) {
      onError(createCompilerError(ErrorCodes.X_PREFIX_ID_NOT_SUPPORTED));
    } else if (isModuleMode) {
      onError(createCompilerError(ErrorCodes.X_MODULE_MODE_NOT_SUPPORTED));
    }
  }

  const prefixIdentifiers =
    !__BROWSER__ && (options.prefixIdentifiers === true || isModuleMode);
  if (!prefixIdentifiers && options.cacheHandlers) {
    onError(createCompilerError(ErrorCodes.X_CACHE_HANDLER_NOT_SUPPORTED));
  }
  if (options.scopeId && !isModuleMode) {
    onError(createCompilerError(ErrorCodes.X_SCOPE_ID_NOT_SUPPORTED));
  }

  const resolvedOptions = extend({}, options, {
    prefixIdentifiers,
  });
  const ast = isString(source) ? baseParse(source, resolvedOptions) : source;
  const [nodeTransforms, directiveTransforms] =
    getBaseTransformPreset(prefixIdentifiers);

  if (!__BROWSER__ && options.isTS) {
    const { expressionPlugins } = options;
    if (!expressionPlugins || !expressionPlugins.includes("typescript")) {
      options.expressionPlugins = [...(expressionPlugins || []), "typescript"];
    }
  }

  transform(
    ast,
    extend({}, resolvedOptions, {
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []), // user transforms
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {} // user transforms
      ),
    })
  );

  return generate(ast, resolvedOptions);
}
```

1. 初始化选项和错误处理
   - 函数接收两个参数：`source`（待编译的源代码或者已经解析成抽象语法树），以及一个可选的配置对象`options`
   - 初始化错误处理函数，若未指定就是用默认的`defaultOnError`函数
   - 判断是否处于模块模式（module）以及是否在浏览器的环境下执行，根据不同的情况抛出特定的错误，比如在浏览器环境下不支持某些编译选项
2. 确定编译选项：
   - 根据给定的选项计算最终使用`prefixIdentifiers`值，即标识符是否需要前缀以便避免全局作用域冲突
   - 对于不支持的选项组合，如在非模块模式下启用`scopeId`或者启用缓存处理器（`cacheHandlers`）但是没有开启标识符前缀，同样抛出错误
3. 合并并扩展编译选项：
   - 使用传入的`options`合并并扩展成新的`resolveOptions`对象，包含已经确定的`prefixIdentifiers`设置
4. 解析或处理源代码：
   - 如果`source`是字符串，则使用`basePrase`函数将其解析成抽象语法树（AST）
   - 获取基础的节点转换集（`nodeTransform`）和指令转换集（`diectiveTransforms`），这些转换会在后续步骤应用到AST上面
5. 处理Ts插件：
   - 若不是在浏览器环境下且开启了ts支持，检查并且确保相关插件已经被添加到表达式插件列表当中
6. 应用转换：
   - 使用`transform`函数递归遍历和转换抽象语法树，包括基础转换和用户自定义的节点转换以及指令转换
7. 生成代码：
   - 最后，使用`generate`函数将经过转换后的抽象语法树转换成目标js代码片段，就是编译的结果

```ts
function reset() {
  tokenizer.reset();
  currentOpenTag = null;
  currentProp = null;
  currentAttrValue = "";
  currentAttrStartIndex = -1;
  currentAttrEndIndex = -1;
  stack.length = 0;
}

export function baseParse(input: string, options?: ParserOptions): RootNode {
  reset();
  currentInput = input;
  currentOptions = extend({}, defaultParserOptions);

  if (options) {
    let key: keyof ParserOptions;
    for (key in options) {
      if (options[key] != null) {
        // @ts-expect-error
        currentOptions[key] = options[key];
      }
    }
  }

  if (__DEV__) {
    if (!__BROWSER__ && currentOptions.decodeEntities) {
      console.warn(
        `[@vue/compiler-core] decodeEntities option is passed but will be ` +
          `ignored in non-browser builds.`
      );
    } else if (__BROWSER__ && !currentOptions.decodeEntities) {
      throw new Error(
        `[@vue/compiler-core] decodeEntities option is required in browser builds.`
      );
    }
  }

  tokenizer.mode =
    currentOptions.parseMode === "html"
      ? ParseMode.HTML
      : currentOptions.parseMode === "sfc"
      ? ParseMode.SFC
      : ParseMode.BASE;

  tokenizer.inXML =
    currentOptions.ns === Namespaces.SVG ||
    currentOptions.ns === Namespaces.MATH_ML;

  const delimiters = options?.delimiters;
  if (delimiters) {
    tokenizer.delimiterOpen = toCharCodes(delimiters[0]);
    tokenizer.delimiterClose = toCharCodes(delimiters[1]);
  }

  const root = (currentRoot = createRoot([], input));
  tokenizer.parse(currentInput);
  root.loc = getLoc(0, input.length);
  root.children = condenseWhitespace(root.children);
  currentRoot = null;
  return root;
}
```

通过模板字符串转化成ast语法树

1. 创建AST根节点
   - 创建一个`RootNode`对象作为AST的根节点，并关联输入的字符串的基本信息
2. 解析输入字符串：
   - 调用`tokenizer.parse(currentInput)`开始实际解析过程，将输入的字符串转换成AST节点
3. 设置位置信息和优化子节点
   - 给根节点设置准确的位置信息（行号，列号等）
   - 对AST的子节点进行处理，例如通过`condenseWhitespace`函数可能去除不必要的空白字符串优化AST
4. 清理状态并返回AST
   - 清除内部的临时引用，然后返回构建好的AST根节点

## 生成代码

通过`generate`生成`render`函数代码

根据节点的不同类型进行设置

```ts
export function generate(
  ast: RootNode,
  options: CodegenOptions & {
    onContextCreated?: (context: CodegenContext) => void;
  } = {}
): CodegenResult {
  const context = createCodegenContext(ast, options);
  if (options.onContextCreated) options.onContextCreated(context);
  const {
    mode,
    push,
    prefixIdentifiers,
    indent,
    deindent,
    newline,
    scopeId,
    ssr,
  } = context;

  const helpers = Array.from(ast.helpers);
  const hasHelpers = helpers.length > 0;
  const useWithBlock = !prefixIdentifiers && mode !== "module";
  const genScopeId = !__BROWSER__ && scopeId != null && mode === "module";
  const isSetupInlined = !__BROWSER__ && !!options.inline;

  // preambles
  // in setup() inline mode, the preamble is generated in a sub context
  // and returned separately.
  const preambleContext = isSetupInlined
    ? createCodegenContext(ast, options)
    : context;
  if (!__BROWSER__ && mode === "module") {
    genModulePreamble(ast, preambleContext, genScopeId, isSetupInlined);
  } else {
    genFunctionPreamble(ast, preambleContext);
  }
  // enter render function
  const functionName = ssr ? `ssrRender` : `render`;
  const args = ssr
    ? ["_ctx", "_push", "_parent", "_attrs"]
    : ["_ctx", "_cache"];
  if (!__BROWSER__ && options.bindingMetadata && !options.inline) {
    // binding optimization args
    args.push("$props", "$setup", "$data", "$options");
  }
  const signature =
    !__BROWSER__ && options.isTS
      ? args.map((arg) => `${arg}: any`).join(",")
      : args.join(", ");

  if (isSetupInlined) {
    push(`(${signature}) => {`);
  } else {
    push(`function ${functionName}(${signature}) {`);
  }
  indent();

  if (useWithBlock) {
    push(`with (_ctx) {`);
    indent();
    // function mode const declarations should be inside with block
    // also they should be renamed to avoid collision with user properties
    if (hasHelpers) {
      push(
        `const { ${helpers.map(aliasHelper).join(", ")} } = _Vue\n`,
        NewlineType.End
      );
      newline();
    }
  }

  // generate asset resolution statements
  if (ast.components.length) {
    genAssets(ast.components, "component", context);
    if (ast.directives.length || ast.temps > 0) {
      newline();
    }
  }
  if (ast.directives.length) {
    genAssets(ast.directives, "directive", context);
    if (ast.temps > 0) {
      newline();
    }
  }
  if (__COMPAT__ && ast.filters && ast.filters.length) {
    newline();
    genAssets(ast.filters, "filter", context);
    newline();
  }

  if (ast.temps > 0) {
    push(`let `);
    for (let i = 0; i < ast.temps; i++) {
      push(`${i > 0 ? `, ` : ``}_temp${i}`);
    }
  }
  if (ast.components.length || ast.directives.length || ast.temps) {
    push(`\n`, NewlineType.Start);
    newline();
  }

  // generate the VNode tree expression
  if (!ssr) {
    push(`return `);
  }
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context);
  } else {
    push(`null`);
  }

  if (useWithBlock) {
    deindent();
    push(`}`);
  }

  deindent();
  push(`}`);

  return {
    ast,
    code: context.code,
    preamble: isSetupInlined ? preambleContext.code : ``,
    map: context.map ? context.map.toJSON() : undefined,
  };
}
```

1. 创建代码生成上下文：根据输入的AST和选项创建一个`CodegenContext`对象，其中包含了各种辅助状态和方法，如`push`（向字符串中添加内容和方法）,`index/deindent`（用于缩进控制），`mode`（当前的编译模式）等
   1. 通过传入的参数ast和options 创建一个codegenContext对象
   2. 并且放入一些方法，push（将新的代码添加到现有的代码上），index（增进缩进层次），deindent（减少缩进层次），newline（添加一个换行符并更新行号和列号信息）
2. 生成签名函数：根据不同的编译模式（SSR或者普通渲染）和选项，决定生成的函数名称（如render或ssrRender）以及函数参数列表
3. 生成前置代码段：根据模式选择生成模块前缀代码（`gemmodulePreamble`）或者函数前缀代码（`genFunctionPreamble`）
4. 进入渲染函数体：开始定义渲染函数主体，并根据是否内联设置（inline）和类型脚本（TS）模式调整函数签名
5. 处理`with`语句：如果不在模块或者启用了`prefixIndentfiters`，就使用`with`语句包裹内部的代码，减少上下文引用时的重复写法，并导入必要的帮助函数
6. 资产声明：生成组件，指令和其他的资源注册代码
7. 临时变量声明：如果AST中包含临时变量（`temps`）则声明他们
8. 生成vnode树：生成对应的AST节点的javascript代码，将Vue组件模板转换成Js表达式，最终生成vnode树
9. 闭合函数体：关闭`with`语句块（如果有的话）和渲染函数的主体
10. 返回结果：返回一个对象，其中包括原始的AST，生成的Js代码字符串，以及在内联设置模式下的额外前置代字符串（`preamble`）。同时，如果存在映射关系，还会返回一个`SourceMap`对象

------

# runtime-dom —— 渲染器

## createApp

```ts
export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args);

  if (__DEV__) {
    injectNativeTagCheck(app);
    injectCompilerOptionsCheck(app);
  }

  const { mount } = app;
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    const container = normalizeContainer(containerOrSelector);
    if (!container) return;

    const component = app._component;
    if (!isFunction(component) && !component.render && !component.template) {
      // __UNSAFE__
      // Reason: potential execution of JS expressions in in-DOM template.
      // The user must make sure the in-DOM template is trusted. If it's
      // rendered by the server, the template should not contain any user data.
      component.template = container.innerHTML;
      // 2.x compat check
      if (__COMPAT__ && __DEV__) {
        for (let i = 0; i < container.attributes.length; i++) {
          const attr = container.attributes[i];
          if (attr.name !== "v-cloak" && /^(v-|:|@)/.test(attr.name)) {
            compatUtils.warnDeprecation(
              DeprecationTypes.GLOBAL_MOUNT_CONTAINER,
              null
            );
            break;
          }
        }
      }
    }

    // clear content before mounting
    container.innerHTML = "";
    const proxy = mount(container, false, resolveRootNamespace(container));
    if (container instanceof Element) {
      container.removeAttribute("v-cloak");
      container.setAttribute("data-v-app", "");
    }
    return proxy;
  };

  return app;
}) as CreateAppFunction<Element>;

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  );
}
```

这个是和创建app相关的

1. 创建渲染器：首先调用`ensureRenderer()`函数来确保至创建了一个渲染器实例，渲染器负责将vue组件转换成DOM元素，并在必要的地方进行更新
2. 创建应用实例：使用渲染器`createApp`方法创建一个应用实例，传入的参数`args`通常是一个组件构造函数或者组件选项对象
3. 开发环境检查：在开发的环境下，注入了一些检查函数，如`injectNativeTagCheck`和`injectComplierOrSelectot`，用于检测潜在的问题和警告
4. 重写挂载方法：覆盖原生的`mount`方法，新方法首先规范化传入的挂载容器（`containerOrSelector`）然后执行以下的操作：
   - 检查是否存在组件构造函数或有效的模板，如果没有，尝试从挂载容器的innerHTML提取模板（这是一个不安全的操作，只应在信任的环境中操作）
   - 清空挂载容器的内容，避免重复的进行渲染
   - 调用原有的mount方法，将组件挂载到容器上，并返回代理对象（proxy）
   - 在挂载完成之后，移除容器上的`v-cloak`属性，添加`data-v-app`属性，用于Vue的一些样式和行为
5. 返回应用实例：最后，返回增强过的应用实例，用户可以继续使用`.mount()`方法将应用挂载到指定的DOM元素上面，也可以使用`.use()`方法安装插件，以及其他的应用实例的方法和属性

nodeOps和创建各种节点相关

```ts
import type { RendererOptions } from "@vue/runtime-core";

export const svgNS = "http://www.w3.org/2000/svg";
export const mathmlNS = "http://www.w3.org/1998/Math/MathML";

const doc = (typeof document !== "undefined" ? document : null) as Document;

const templateContainer = doc && /*#__PURE__*/ doc.createElement("template");

export const nodeOps: Omit<RendererOptions<Node, Element>, "patchProp"> = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null);
  },

  remove: (child) => {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },

  createElement: (tag, namespace, is, props): Element => {
    const el =
      namespace === "svg"
        ? doc.createElementNS(svgNS, tag)
        : namespace === "mathml"
        ? doc.createElementNS(mathmlNS, tag)
        : doc.createElement(tag, is ? { is } : undefined);

    if (tag === "select" && props && props.multiple != null) {
      (el as HTMLSelectElement).setAttribute("multiple", props.multiple);
    }

    return el;
  },

  createText: (text) => doc.createTextNode(text),

  createComment: (text) => doc.createComment(text),

  setText: (node, text) => {
    node.nodeValue = text;
  },

  setElementText: (el, text) => {
    el.textContent = text;
  },

  parentNode: (node) => node.parentNode as Element | null,

  nextSibling: (node) => node.nextSibling,

  querySelector: (selector) => doc.querySelector(selector),

  setScopeId(el, id) {
    el.setAttribute(id, "");
  },

  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(content, parent, anchor, namespace, start, end) {
    // <parent> before | first ... last | anchor </parent>
    const before = anchor ? anchor.previousSibling : parent.lastChild;
    // #5308 can only take cached path if:
    // - has a single root node
    // - nextSibling info is still available
    if (start && (start === end || start.nextSibling)) {
      // cached
      while (true) {
        parent.insertBefore(start!.cloneNode(true), anchor);
        if (start === end || !(start = start!.nextSibling)) break;
      }
    } else {
      // fresh insert
      templateContainer.innerHTML =
        namespace === "svg"
          ? `<svg>${content}</svg>`
          : namespace === "mathml"
          ? `<math>${content}</math>`
          : content;

      const template = templateContainer.content;
      if (namespace === "svg" || namespace === "mathml") {
        // remove outer svg/math wrapper
        const wrapper = template.firstChild!;
        while (wrapper.firstChild) {
          template.appendChild(wrapper.firstChild);
        }
        template.removeChild(wrapper);
      }
      parent.insertBefore(template, anchor);
    }
    return [
      // first
      before ? before.nextSibling! : parent.firstChild!,
      // last
      anchor ? anchor.previousSibling! : parent.lastChild!,
    ];
  },
};
```

# 大概流程

创建模板流程大概流程，配合文章头部的流程图使用

- 用户调用`createApp`，先调用`runtime-dom/index`中的createApp方法

  - 先确保保存在渲染器实例，`ensureRenderer`返回一个渲染器对象，渲染器对象包含`render`,`hydrate`,`createApp`
  - 对于`render`:
    - 参数
      - `vnode`：这是一个虚拟DOM节点，他是对实际DOM元素的一种抽象表示，包含元素类型，属性，子节点信息等
      - `container`：这是一个DOM容器元素，即将vnode渲染的目标容器
      - `namespace`(可选)：在某些情况下，可能需要指定特定的命名空间，特别是在处理SVG或者自定义命名空间元素时
    - 过程：
      - 如果传入的是vnode为空，则检查`conmtainer`是否已经存在关联的vnode，如果有，则执行卸载操作（unmount），从DOM中移除已有的相关节点及其子树
      - 否则，如果`vnode`是空的，则执行`patch`操作，这个操作比较新旧两个vnode（当前容器上的vnode和新传入的vnode），并根据他们之间的差异来最小化更新DOM，确保DOM结构和最新的vnode状态一致
      - 调用预`flush`和后`flush`的回调函数队列（`flushPreFlushCbs`和`flushPostFlushCbs`）,这些函数从DOM更新前后执行，可以用作一些副作用管理或者异步任务的调度
      - 最后，将当前渲染的vnode赋值给容器的`_vnode`属性，以便进行更新进行比较
    - 对于`createApp`，实际就是调用了`createAppAPI(render)`位于runtime-core的apiCreateApp.ts中。这个`createAppAPI`最终返回的是一个app对象
      - 创建上下文context（通过createAppContext）并且创立了一个插件的容器`installPluigins`
      - app对象 包含 props component，还有context和instance实例
      - 也包括use,,mixin,component,diective,mount,unmount,provide方法，除了mount方法和unmount方法，其他返回的都是app对象，因此调用可以是链式调用。并且provide是在`context.provides`对象上进行绑定值，
      - **PS：provide方法是在当前实例的provides上绑定的一个键值对**

- 然后用户进行挂载使用`app.mount('#app')`这里运行的逻辑是执行app对象的mount方法（上文提到的app）

  - 在mount方法当中

    - 创建一个vnode节点，（createvnode(rootComponent,rootProps)）rootProps = null

      - 这个方法调用了createVnode，里面返回的是，调用createBaseVnode方法，这个方法返回一个vnode对象，其shapeFlag 的类型是 `shapeFlags.ELEMENT`

    - 然后将用户调用createApp是生成的context放到vnode上的appContext的

    - 然后调用render方法，`render(vnode,rootContainer,namespace)`vnode是vnode的节点，rootContainer 是需要挂载的字符串

    - render方法在`runtime-core/renderer.ts`中

      - render方法调用patch方法，其传入了`n1=null,n2=vnode`

      - patch方法通过重重筛选，最终调用了`processElement`方法

      - 在processElement方法中，因为`n1==null`所以调用`mountElement`方法

        - mountElement方法中将el 和 vnode.el 进行赋值，调用(hostCreateElement)，为创建的DOM元素

        - 然后设置作用域和ID。setScopedId(el,vnode,vnode.scopeId,slotScopeIds,parentConponent)

        - 然后将创建的元素插入到指定的容器当中，并确定相对于锚点(anchor)的位置（hostInsert（el,container,anchor））初始锚点是null

          ```ts
          insert: (child, parent, anchor) => {
            parent.insertBefore(child, anchor || null);
          };
          ```

- 然后就是对声明响应式的数据进行处理。这里需要清楚，targetMap是存储，对象与依赖收集器的关系，依赖收集器存储的是依赖响应式对象的副作用函数

  - 当访问或者修改响应式对象的属性的时候，proxy会记录对该属性的读取（收集依赖）和写入（触发通知）操作，调用receive方法

  - get时触发track方法，收集依赖，targetMap是类似于之前的dep存在，存储着，对象——对应的依赖对的关系

    - ```ts
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
      }
      let dep = depsMap.get(key);
      if (!dep) {
        depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))));
      }
      ```

    - 然后调用trackEffect，确保dep的唯一标识符是最新的，并且更新依赖数量

  - set触发trigger方法，取得当前target的对应的依赖映射（depsMap，依赖收集器）

    - ```ts
      const depsMap = targetMap.get(target)
          let deps: (Dep | undefined)[] = []
            deps = [...depsMap.values()]
        ...set
        deps.push(depsMap.get(ITERATE_KEY))
      ```

  - 然后遍历deps，然后调用`triggerEffect`方法，用于触发那些依赖于特定的响应式数据集合的副作用函数

    - ```ts
      export function triggerEffects(
        dep: Dep,
        dirtyLevel: DirtyLevels,
        debuggerEventExtraInfo?: DebuggerEventExtraInfo
      ) {
        pauseScheduling();
        for (const effect of dep.keys()) {
          if (
            effect._dirtyLevel < dirtyLevel &&
            dep.get(effect) === effect._trackId
          ) {
            const lastDirtyLevel = effect._dirtyLevel;
            effect._dirtyLevel = dirtyLevel;
            if (lastDirtyLevel === DirtyLevels.NotDirty) {
              effect.trigger();
            }
          }
        }
        scheduleEffects(dep);
        resetScheduling();
      }
      ```

    - 然后进行派发更新，实现副作用调度，然后进行patch对比，对比之后进行更新DOM

------

# 杂项

## 指令相关

### v-if

v-if 在编译的时候，会先调用，transformlf，这函是一个结构指令转换器工厂函数，他接收的一个正则表达式作为匹配指令名称的参数，并返回一个转换函数，当遇到符合条件的指令就调用processlf函数处理节点。

为后续的render函数做准备

```ts
export const transformIf = createStructuralDirectiveTransform(
  /^(if|else|else-if)$/, // 指定转入参数的形式
  (node, dir, context) => {
      
      // 处理条件分支的核心函数，接收一个回调函数处理每个分支
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
      const siblings = context.parent!.children; // 动态的收集key的值
        //遍历所有的兄弟节点
      let i = siblings.indexOf(ifNode);
      let key = 0;
      while (i-- >= 0) {
        const sibling = siblings[i];
        if (sibling && sibling.type === NodeTypes.IF) {
          key += sibling.branches.length;
        }
      }

      // Exit callback. Complete the codegenNode when all children have been
      // transformed.
      return () => {
        if (isRoot) {
          ifNode.codegenNode = createCodegenNodeForBranch(
            branch,
            key,
            context
          ) as IfConditionalExpression;
        } else {
          // attach this branch's codegen node to the v-if root.
          const parentCondition = getParentCondition(ifNode.codegenNode!);
          parentCondition.alternate = createCodegenNodeForBranch(
            branch,
            key + ifNode.branches.length - 1,
            context
          );
        }
      };
    });
  }
);
```

1. 代码功能：将模板中的条件指令（v-if/v-else/v-else-if）转换成可执行的JS代码生成节点（codegenNode）为后续生成rendert函数做准备

2. 外层函数使用正则进行表示：确定传入的值的指令类型 
   process ：处理条件分支的核心函数，接收一个回调函数处理每个分支

3. 动态key的计算：

   1. ```ts
      const siblings = context.parent!.children;
      let i = siblings.indexOf(ifNode);
      let key = 0;
      while (i-- >= 0) {
        const sibling = siblings[i];
        if (sibling && sibling.type === NodeTypes.IF) {
          key += sibling.branches.length;
        }
      }
      ```

   2. 作用：计算当前分支的唯一key，用于正确的渲染链式条件语句（if+。。。）

   3. 原理：遍历当前节点的所有兄弟节点，统计所有的v-if分支的数量，确保key的唯一性

4. 退出回调

   1. 问题场景：父节点的代码生成可能需要子节点完全处理后的信息

   2. 退出回调的场景：

      - 依赖子节点的信息
      - 维护树形结构
      - 性能优化

   3. ```ts
      return () => {
        if (isRoot) {
          ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context);
        } else {
          const parentCondition = getParentCondition(ifNode.codegenNode!);
          parentCondition.alternate = createCodegenNodeForBranch(branch, key + ifNode.branches.length - 1, context);
        }
      };
      ```

   4. 执行时机：在当前分支的所有子节点转换完成之后执行（Vue编译器的退出回调机制）

   5. 逻辑：退出回调挂载到对应的层级上

      - 根分支：创建完整的条件表达式节点
      - 嵌套分支：将当前分支挂载到父条件的alternate（else分支）上 
