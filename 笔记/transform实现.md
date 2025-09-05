# transform实现

## 作用

是parse之后的阶段 负责对AST进行优化和转换

中间的优化阶段

## transform核心作用

1. 优化AST	
   1. 标记静态的节点，减少运行的时候的运算
2. 指令转换 将v-if 等的指令转换成可以执行的js逻辑
3. 处理特殊的语法 插值 动态属性 事件等
4. 规范化结构 确保AST符合Vue的渲染逻辑，处理slot component等

对前面生成的ast树实现增删改查的操作

实现

1. 树的深度优先遍历（找节点）

2. 使用插件体系 进行transform操作 ，找到代码中不变的部分和可变的部分进行抽离 和 操作 

3. 根据test对代码进行测试和重构

   ```ts
   describe('transform', () => {
       it('happy path', () => {
           const ast = baseParse('<div>hi,{{message}}</div>')
           // 传递进去 直接再外部进行设置transform
           const plugin = (node) => {
               if (node.type === NodeTypes.TEXT) {
                   node.content = node.content + 'mini-vue'
               }
           }
   
           // 实现程序的外部的处理
           transform(ast,{
               nodeTransforms : [plugin]
           })
   
           const nodeText = ast.children[0].children[0]
           expect(nodeText.content).toBe('hi,mini-vue')
       })
   })
   ```

   

```ts

export function transform(root, options) {
    const context = createTransformContext(root, options)
    // 使用深度优先此案进行遍历 拿到所有的节点
    traverseNode(root, context)
}

function traverseNode(node, context) {
    console.log(node)

    // element or 插值
    const nodeTransforms = context.nodeTransforms
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        transform(node)
    }

    traverseChildren(node,context)
}

function traverseChildren(node, context) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}

function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || []
    }
    return context
}
```

