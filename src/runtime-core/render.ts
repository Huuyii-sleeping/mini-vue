import { effect } from "../reactivity"
import { shapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp"
import { Fragment, Text } from "./vnode"

export function createRender(options) {
    const {
        createElement,
        patchProps,
        insert
    } = options

    function render(vnode: any, container: any) {
        // patch
        patch(null, vnode, container, null)
    }

    function patch(n1, n2, container: any, parentComponent) {
        const { type, shapeFlag } = n2
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent)
                break
            case Text:
                processText(n1, n2, container)
            default:
                if (shapeFlag & shapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent)
                } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent)
                }
                break
        }
    }


    function processText(n1, n2, container) {
        const { children } = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent)
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent)
        } else {
            patchElement(n1, n2, container)
        }

    }

    function patchElement(n1,n2,container){
        
    }

    function mountElement(n2, container, parentComponent) {
        const el = (n2.el = createElement(n2.type))
        const { children, shapeFlag } = n2
        if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
            mountChildren(n2, el, parentComponent)
        }
        const { props } = n2
        for (const key in props) {
            const val = props[key]

            patchProps(el, key, val)
        }
        container.append(el)
        insert(el, container)
    }

    function mountChildren(n2, container, parentComponent) {
        n2.children.forEach((v) => {
            patch(null, v, container, parentComponent)
        })
    }

    function processComponent(n1, n2: any, container: any, parentComponent) {
        mountComponent(n2, container, parentComponent)
    }

    function mountComponent(initalVnode: any, container: any, parentComponent: any) {
        const instance = createComponentInstance(initalVnode, parentComponent)

        setupComponent(instance)
        setupRenderEffect(instance, initalVnode, container)
    }

    function setupRenderEffect(instance: any, initalVnode, container: any) {
        effect(() => {
            if (!instance.isMounted) {
                instance.isMounted = true
                const { proxy } = instance
                const subTree = (instance.subTree = instance.render.call(proxy))
                //  vnode tree
                patch(null, subTree, container, instance)
                initalVnode.el = subTree.el
            } else {
                const { proxy } = instance
                const subTree = instance.render.call(proxy)
                const prevSubtree = instance.subTree
                instance.subTree = subTree
                patch(prevSubtree, subTree, container, instance)
            }

        })
    }
    return {
        createApp: createAppAPI(render)
    }
}



