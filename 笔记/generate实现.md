# generate实现

这个步骤是模板编译流程中的 的最后一个阶段

负责将最后的优化后的AST树转换成能够执行的render函数字符串，

## generate作用

1. 输入 ： 优化后的AST语法树

2. 输出 ： 类似下面的render字符串

   ```ts
   function render(){
   	return _c('div',{attrs : {id : 'app'}},[
   		_c('p',[_v(_s(message))]),
   		_c('button',{on : {click : handleClick}},[_v('Click')])
   	])
   }
   ```

3. 核心目标 ： 将模板的声明式描述转换成虚拟的DOM创建逻辑

## generate核心的流程

### 解析string类型实现

从单元测试入手

```ts
describe('codegen',() => {
    it('string',() => {
        const ast = baseParse('hi')
        transform(ast)
        const {code} = generate(ast)
        // 快照模式 code进行对比
        // 1. 抓bug
        // 2. 有意 （主动更新快照）
        expect(code).toMatchSnapshot()
    })
})
```

```ts
function generate(ast){
	const context = function createCodegenContext()
	const { push } = context
    
    push('return ')
    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signatrue = args.join(',')

    push(`function ${functionName}(${signatrue}){`)
    genNode(ast.codegenNode, context)
    push('}')

    return {
        code : context.code
    }
    
}

function createCodegenContext() {
	const context = {
		code : '',
		push(source){
			code += source
		}
	}
}

function genNode(node,context){
    const {push} = context
    push(`return '${node.content}'`)
}
```

### 生成插值类型的实现

照例从单元测试入手（插值类型）

```ts
    it('interpolation',() => {
        const ast = baseParse('{{message}}')
        transform(ast,{
            nodeTransforms : [transformExpression]
        })
        const {code} = generate(ast)
        expect(code).toMatchSnapshot()
    })
```

生成的快照

```ts
// Jest Snapshot v1, https://jestjs.io/docs/snapshot-testing

exports[`codegen interpolation 1`] = `
"const { toDisplayString: _toDisplayString } = Vue
return function render(_ctx,_cache){return _toDisplayString(_ctx.message)}"
`;

exports[`codegen string 1`] = `
"
return function render(_ctx,_cache){return 'hi'}"
`;

```

着重观察插值类型

首先 实现基本的大体函数

```ts
export function generate(ast) {
    const context: any = createCodegenContext()
    const { push } = context

    // 生成function的处理
    genFunctionPreamble(ast, context)

    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signatrue = args.join(',')

    push(`function ${functionName}(${signatrue}){`)
    push('return ')
    genNode(ast.codegenNode, context)
    push('}')

    return {
        code: context.code
    }
}

// 实现对象类型用来 做相应的操作
function createCodegenContext() {
    const context: any = {
        code: '',
        // 拼接操作
        push(source) {
            context.code += source
        },
        
        // 帮助解析字符串
        helper(key){
            return `_${helperMaping[key]}`
        }
    }
    return context
}

// 实现代码中的return逻辑
function genNode(node, context) {
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context)
            break
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        default:
            break
    }
}
//不同的类型 做出对应的操作
function genExpression(node, context) {
    const { push } = context
    push(`${node.content}`)
}

// 这个就是设置函数主体内容
function genText(node, context) {
    const { push } = context
    push(`'${node.content}'`)
}

function genInterpolation(node, context) {
    console.log(node)
    const { push,helper } = context
    push(`${helper(TO_DISPLAYING_STRING)}(`)
    genNode(node.content,context)
    push(')')
}

// return 之前的前缀的设置
function genFunctionPreamble(ast, context) {
    const { push } = context
    const VueBinging = 'Vue'
    const aliasHelper = (s) => `${helperMaping[s]}: _${helperMaping[s]}`
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(',')} } = ${VueBinging}`)
    }
    push('\n')
    push('return ')
}
```

有些我们需要的对象类型，我们可以再transform进行设置

对AST树进行修饰

### element类型的解析实现

实现对应的类型

创建对应的函数类型

创建我们需要使用的 createElement的函数 便于下面的引用

```ts

export const TO_DISPLAYING_STRING = Symbol('toDisplayString')
export const CREATE_ELEMENT_VNODE = Symbol('createElementVnode')
// 映射 外界能够进行访问
export const helperMaping = {
    [TO_DISPLAYING_STRING] : 'toDisplayString',
    [CREATE_ELEMENT_VNODE] : 'createElementVnode'
}
```

创建对应的单元测试

```ts
    it('element',() => {
                const ast = baseParse('<div></div>')
        transform(ast,{
            nodeTransforms : [transformElement]
        })
        const {code} = generate(ast)
        expect(code).toMatchSnapshot()
    })
```

传入我们设置对应的插件

传入之后进行调用 后续的return过程需要进行使用

在 codegen 的进行辨别使用

```ts
function genElement(node,context){
    const {push,helper} = context
    const {tag} = node
    push(`${helper(CREATE_ELEMENT_VNODE)}('${tag}')`)
}
```

进行解析拼接

### 实现联合复杂的解析

首先从单元测试入手

```ts
   it('element', () => {
        const ast: any = baseParse('<div>hi,{{message}}</div>')
        transform(ast, {
            nodeTransforms: [transformText,transformElement ]
        })
        const { code } = generate(ast)
        expect(code).toMatchSnapshot()
    })
```

实现解析联合类型

我们可以往想要增加联系的两个元素的之间添加一个“+”节点，用来识别建立联系，这个我们可以通过插件进行实现

```ts
import { NodeTypes } from "../ast";

export function transformText(node) {

    function isText(node) {
        return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
    }
    let currentContainer

    if (node.type === NodeTypes.ELEMENT) {
        const { children } = node
        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (isText(child)) {
                // 找到对应的ast树中的节点，进行操作 变更位置 建立联系等
                for (let j = i + 1; j < children.length; j++) {
                    const next = children[j]
                    if (isText(next)) {
                        if (!currentContainer) {
                            currentContainer = children[i] = {
                                type: NodeTypes.COMPOUND_EXPRESSION,
                                children: [child]
                            }
                        }
                        currentContainer.children.push('+')
                        currentContainer.children.push(next)
                        // 原来位置上面位置上的进行位置重置了
                        // 将原来位置上面的 children[j] 进行删除
                        children.splice(j,1)
                        j --
                    }else{
                        // 不是element就可以进行删除了
                        currentContainer = undefined
                        break
                    }
                }
            }
        }
    }
}
```

找到有联系的节点

两者的头上有一个共同的节点，之间有一个+节点 便于后续的操作

我们在`genNode`里面添加设置联合类型分支

```ts
case NodeTypes.COMPOUND_EXPRESSION:
            genComponentExpression(node, context)


function genComponentExpression(node, context) {
    const { push } = context
    const children = node.children
    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isString(child)) { // 就是‘+’
            push(child)
        } else {
            genNode(child, context)
        }
    }
}


```

我们设置的这些标识符都可以在transform 的 插件中进行表示设置