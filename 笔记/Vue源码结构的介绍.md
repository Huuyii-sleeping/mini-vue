# Vue源码结构的介绍

![image-20250710170946405](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250710170946405.png)

## compiler-sfc

打包过程是 compiler-sfc实现的 转换成js代码文件

template -> rander函数的转换过程

sfc 依赖下面的 dom和core文件 将template转换成对应的 rander函数，转换成对应的js文件

在运行的时候进行执行

编译之后生成的代码

![image-20250710214848325](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250710214848325.png) 

![image-20250711083249427](C:\Users\Lenovo\AppData\Roaming\Typora\typora-user-images\image-20250711083249427.png)

渲染成真实的dom元素

下面执行文件的代码

## runtime-core

运行的时候依赖runtime-core里面的函数











