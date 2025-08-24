import { NodeTypes } from "./ast"
import { TO_DISPLAT_STRING } from "./runtimeHelpers"

export function transform(root, options = {}) {
    const context = createTransformContent(root, options)
    traverseNode(root, context)
    createRootCodegen(root)
    root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root) {
    const child = root.children[0]
    if(child.type === NodeTypes.ELEMENT){
        root.codegenNode = child.codegenNode
    }else{
      root.codegenNode = root.children[0]  
    }
    
}

function createTransformContent(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1)
        }
    }
    return context
}

function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms
    const exitFns: any[] = []
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        const onExit: any = transform(node, context)
        if(onExit)exitFns.push(onExit)
    }
    switch (node.type) {
        case NodeTypes.INTERPPLATION:
            context.helper(TO_DISPLAT_STRING)
            break
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traversChildren(node, context)
            break
        default:
            break
    }

    let i = exitFns.length
    while(i--){
        exitFns[i]()
    }
}


function traversChildren(node, context) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}