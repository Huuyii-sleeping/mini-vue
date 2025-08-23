export function transform(root, options) {
    const context = createTransformContent(root, options)
    traverseNode(root, context)
}

function createTransformContent(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || []
    }
    return context
}

function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        transform(node)
    }
    traversChildren(node,context)
}

function traversChildren(node,context) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}