# 组件props实现

组件props怎么进行传递

1. 在组件的setup当中接收props
2. 在render的里面能够通过this访问props
3. 实现props的shallowreadonly

当自组件具有props的时候，我们需要在setComponent的地方进行props的初始化，
将props能够挂载到组件实例对象身上

后面调用setup函数的时候，我们传递这个参数就行

后续对组件的props的参数就行操作就行

使用dom的原生操作之类的就能够实现