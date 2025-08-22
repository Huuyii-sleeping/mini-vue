import { effect } from "../reactivity"
import { EMPTY_OBJ } from "../shared"
import { shapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp"
import { Fragment, Text } from "./vnode"

export function createRender(options) {
    const {
        createElement,
        patchProps: hostPatchProps,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText
    } = options

    function render(vnode: any, container: any) {
        // patch
        patch(null, vnode, container, null, null)
    }

    function patch(n1, n2, container: any, parentComponent, anchor) {
        const { type, shapeFlag } = n2
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor)
                break
            case Text:
                processText(n1, n2, container)
            default:
                if (shapeFlag & shapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & shapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
                break
        }
    }


    function processText(n1, n2, container) {
        const { children } = n2
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2, container, parentComponent, anchor)
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor)
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
        }

    }

    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        const el = (n2.el = n1.el)
        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProps(el, oldProps, newProps)
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag
        const { shapeFlag } = n2
        const c1 = n1.children
        const c2 = n2.children
        if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
                unmountChilren(n1.children)
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        } else {
            if (prevShapeFlag & shapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, '')
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                patchKeyChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }

    function patchKeyChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0
        let e1 = c1.length - 1
        let e2 = c2.length - 1

        function isSameVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key
        }

        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, anchor)
            } else {
                break
            }
            i++
        }


        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, anchor)
            } else {
                break
            }
            e1--, e2--
        }
        if (i > e1) {
            if (i <= e2) {
                const nextPos = i + 1
                const anchor = nextPos > c2.length ? null : c2[nextPos].el
                patch(null, c2[i], container, parentComponent, anchor)
            }
        }
    }

    function unmountChilren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el
            hostRemove(el)
        }

    }

    function patchProps(el, oldProps, newProps) {
        if (oldProps === newProps) return
        for (const key in newProps) {
            const prevProp = oldProps[key]
            const nextProp = newProps[key]
            if (prevProp !== nextProp) {
                hostPatchProps(el, key, prevProp, nextProp)
            }
        }
        if (oldProps === EMPTY_OBJ) return
        for (const key in oldProps) {
            if (!(key in newProps)) {
                hostPatchProps(el, key, oldProps[key], null)
            }
        }
    }

    function mountElement(n2, container, parentComponent, anchor) {
        const el = (n2.el = createElement(n2.type))
        const { children, shapeFlag } = n2
        if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (shapeFlag & shapeFlags.ARRAY_CHILDREN) {
            mountChildren(n2.children, el, parentComponent, anchor)
        }
        const { props } = n2
        for (const key in props) {
            const val = props[key]

            hostPatchProps(el, key, null, val)
        }
        container.append(el)
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor)
        })
    }

    function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor)
    }

    function mountComponent(initalVnode: any, container: any, parentComponent: any, anchor) {
        const instance = createComponentInstance(initalVnode, parentComponent)

        setupComponent(instance)
        setupRenderEffect(instance, initalVnode, container, anchor)
    }

    function setupRenderEffect(instance: any, initalVnode, container: any, anchor) {
        effect(() => {
            if (!instance.isMounted) {
                instance.isMounted = true
                const { proxy } = instance
                const subTree = (instance.subTree = instance.render.call(proxy))
                //  vnode tree
                patch(null, subTree, container, instance, anchor)
                initalVnode.el = subTree.el
            } else {
                const { proxy } = instance
                const subTree = instance.render.call(proxy)
                const prevSubtree = instance.subTree
                instance.subTree = subTree
                patch(prevSubtree, subTree, container, instance, anchor)
            }

        })
    }
    return {
        createApp: createAppAPI(render)
    }
}



