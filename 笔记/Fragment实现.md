# Fragment实现

实现组件渲染的时候children不设置div进行包裹

直接渲染子组件

设置fragment组件的type

在patch组件加载的的时候进行设置，当`type === Fragment`的i时候，单独的进行考虑

直接调用函数进行mountChildren

实现子组件的渲染

记得在vnode当中设置当前的类型