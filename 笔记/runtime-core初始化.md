# runtime-core核心流程

![image-20250711083331322](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250711083331322.png)

打包之后的文件

`h`渲染函数 渲染DOM元素

`template` -> `render函数`

遇见组件进行拆箱 拆箱之后拿到对应的信息 获得element

将element全部渲染出来

1. 创建App对象 具有mount方法

2. 进行初始化

   1. 生成虚拟节点`vNode`

   2. 生成`render函数` 对虚拟节点的类型进行处理

      1. 调用patch

         1. 基于vnode的类型执行

            1. 处理shapeFlag component的类型

               1. 组件的初始化（收集信息）

                  1. 创建`componment instance对象`
                  2. `setup component`
                     1. 初始化prop
                     2. 初始化 slots
                     3. 调用setup
                     4. 设置render函数
                  3. `setupRenderEffect`

                  最后生成element的类型

         2. 处理shapeFlag component

            1. element初始化
               1. 使用dom的api创建真实的element
               2. 处理chilldren节点
               3. 处理元素上面的prop进行处理
               4. 触发beforeMount钩子 
                  1. vnode Hook 虚拟节点
                  2. Directive指令
