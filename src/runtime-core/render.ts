import { effect } from "../reactivity"
import { EMPTY_OBJ } from "../shared"
import { shapeFlags } from "../shared/shapeFlags"
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp"
import { queueJobs } from "./scheduler"
import { shouleUpdateComponent } from "./updateComponentUtils"
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
                const nextPos = e2 + 1
                const anchor = nextPos < c2.length ? c2[nextPos].el : null
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el)
                i++
            }
        } else {
            let s1 = i
            let s2 = i

            let toBePatched = e2 - s2 + 1
            let patched = 0
            const keyToNewIndexMap = new Map()
            const newIndexToldIndexMap = new Array(toBePatched)
            let move = false
            let maxNewIndexSoFar = 0
            for (let i = 0; i < toBePatched; i++)newIndexToldIndexMap[i] = 0

            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i]
                keyToNewIndexMap.set(nextChild.key, i)
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i]
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                    continue
                }
                let newIndex
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    for (let j = s2; j < e2; j++) {
                        if (isSameVnodeType(prevChild, c2[j])) {
                            newIndex = j
                            break
                        }
                    }
                }
                if (newIndex === undefined) {
                    hostRemove(prevChild.el)
                } else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        move = true
                    }
                    newIndexToldIndexMap[newIndex - s2] = i + 1
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    patched++
                }
            }
            const increacingNewIndexSequence = move ? getSequence(newIndexToldIndexMap) : []
            let j = increacingNewIndexSequence.length - 1
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2
                const nextChild = c2[nextIndex]
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null

                if (newIndexToldIndexMap[i] === 0) { // new child
                    patch(null, nextChild, container, parentComponent, anchor)
                }

                if (j < 0 || i !== increacingNewIndexSequence[j]) {
                    console.log('移动位置')
                    hostInsert(nextChild.el, container, anchor)
                } else {
                    j--
                }
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
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor)
        } else {
            updateComponent(n1, n2)
        }
    }

    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component)
        if (shouleUpdateComponent(n1, n2)) {
            instance.next = n2
            instance.update()
        } else {
            n2.el = n1.el
            instance.vnode = n2
        }

    }

    function mountComponent(initalVnode: any, container: any, parentComponent: any, anchor) {
        const instance = (initalVnode.component = createComponentInstance(initalVnode, parentComponent))

        setupComponent(instance)
        setupRenderEffect(instance, initalVnode, container, anchor)
    }

    function setupRenderEffect(instance: any, initalVnode, container: any, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                instance.isMounted = true
                const { proxy } = instance
                const subTree = (instance.subTree = instance.render.call(proxy,proxy))
                //  vnode tree
                patch(null, subTree, container, instance, anchor)
                initalVnode.el = subTree.el
            } else {
                const { proxy, next, vnode } = instance
                if (next) {
                    next.el = vnode.el
                    updateComponentPreRender(instance, next)
                }
                const subTree = instance.render.call(proxy,proxy)
                const prevSubtree = instance.subTree
                instance.subTree = subTree
                patch(prevSubtree, subTree, container, instance, anchor)
            }

        },{
            scheduler(){
                queueJobs(instance.update)
            }
        })
    }

    return {
        createApp: createAppAPI(render)
    }
}

function updateComponentPreRender(instance, nextVnode) {
    instance.vnode = nextVnode
    instance.next = null
    instance.props = nextVnode.props
}

function getSequence(nums) {
    if (nums.length === 0) return []

    const dp = []
    const prevIndices = new Array(nums.length).fill(-1)

    for (let i = 0; i < nums.length; i++) {
        let left = 0, right = dp.length
        while (left < right) {
            const mid = Math.floor((left + right) / 2)
            if (nums[dp[mid]] < nums[i]) {
                left = mid + 1
            } else right = mid
        }

        if (left === dp.length) {
            dp.push(i as never)
        } else {
            dp[left] = i as never
        }

        if (left > 0) {
            prevIndices[i] = dp[left - 1]
        }
    }

    const res = []
    let current = dp[dp.length - 1]
    while (current !== -1) {
        res.push(current)
        current = prevIndices[current] as never
    }
    return res.reverse()
}


