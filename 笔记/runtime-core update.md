# runtime-core update 的核心流程

- 响应式的值发生变化（setup） 

- 触发收集的effect函数 （instance update）

  - 再次执行render函数，获取最新的vnode
  - 触发 beforeUpdate hook
  - 触发 onVnodeBeforeUpdate
  - 重新调用  patch 进行对比（diff算法实现）
    - 基于 vnode 的不同类型进行对比
      - 处理 shapeFlag component类型
        - 处理组件的更新
        - 检测是否需要更新组件
      - 处理shapeFlag shapeFlag.ELEMENT 类型
        - 处理element函数
  - 触发 update hook
  - 触发 onVnodeUpdated 

  