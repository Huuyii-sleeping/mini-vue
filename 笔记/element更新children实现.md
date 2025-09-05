# element更新children实现

数组和文本节点的替换和更新

使用shapeFlag进行判断

## array -> text

```ts
    function patchChildren(n1, n2, container) {
        const prevShapeFlag = n1.shapeFlag
        const { shapeFlag } = n2
        const c2 = n2.children
        if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
                // text -> array
                // 原来的chilren清空
                unmountChildren(n1.children)
                // 设置新的text
                hostSetElementText(container,c2)
            }
        }
    }
```

使用的函数里面更多的也是原生的DOM操作

```ts
function remove(child){
    const parent = child.parentNode
    if(parent){
        parent.removeChild(child)
    }
}

function setElementText(el,text){
    el.textContent = text
}
```

## text -> text + text -> array

```ts
if (shapeFlag & shapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & shapeFlags.ARRAY_CHILDREN) {
                unmountChildren(n1.children)
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        }
```

先unMount删除对应的children 再进行children的设置

## array -> array

我们设置对应的数组的值

进行简单的替换是很简单的（效率就很低下）

但是我们如何使用使用算法进行简化是很难的

我们可以使用双端对比算法进行比较

### 简单的diff算法实现

```ts
// 1.左侧的对比操作
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C')
// ]
// const nextChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'D' }, 'D'),
//     h('p', { key: 'E' }, 'E')
// ]

// 2.右端对比
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//     h('p', { key: 'D' }, 'D'),
//     h('p', { key: 'E' }, 'E'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C'),
// ]

// 3.新的比旧的长
// （1）左侧
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
// ]

// const nextChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C'),
//     h('p', { key: 'D' }, 'D'),
// ]
// （2）右侧
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
// ]

// const nextChildren = [
//     h('p', { key: 'C' }, 'C'),
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
// ]

// 4.老的比新的长
// 左侧
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C'),
// ]

// const nextChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
// ]
// 右侧
const prevChildren = [
    h('p', { key: 'C' }, 'C'),
    h('p', { key: 'A' }, 'A'),
    h('p', { key: 'B' }, 'B'),
]
const nextChildren = [
    h('p', { key: 'A' }, 'A'),
    h('p', { key: 'B' }, 'B'),
]

```

简单的实现diff的算法，使用两个的长度和一个移动的指针实现的

```ts
function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        // 左端对比
        const l2 = c2.length
        let i = 0
        let e1 = c1.length - 1
        let e2 = l2 - 1

        function isSomeVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key
        }

        while (i <= e1 && i <= e2) {
            const n1 = c1[i]
            const n2 = c2[i]
            if (isSomeVnodeType(n1, n2)) {
                // 进行子节点的子节点的对比 递归的调用这个函数
                // 确保字子节点也能够及时的更新！！！子节点可能不相同
                // 只要 type key相同就是相同的element不用管
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }

            i++
        }

        // 右侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1]
            const n2 = c2[e2]
            if (isSomeVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor)
            } else {
                break
            }
            e1--
            e2--
        }
        console.log(i, e1, e2)
        // 新的比较长 
        // 右侧 
        if (i > e1) {
            if (i <= e2) {

                const nextPos = i + 1
                const anchor = i + 1 < l2 ? c2[nextPos].el : null
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el)
                i ++
            }
        }

    }
```

### 复杂逻辑的实现

实现没有元素的删除以及现有元素的props子节点的更新

```ts
 // 中间对比
            // 实现没有的删除以及子节点的更新
	else	{let s1 = i // 老节点
            let s2 = i

            // 新节点的总数量
            const toBePatched = e2 - s2 + 1
            let patched = 0
            const keyToNewIndexMap = new Map()
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i]
                keyToNewIndexMap.set(nextChild.key, i)
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i]
                if(patched >= toBePatched){ 
                    // 更新的已经结束 后续的直接删除就行
                    hostRemove(prevChild.el)   
                }
                let newIndex
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVnodeType(prevChild, c2[j])) {
                            newIndex = j
                            break
                        }
                    }
                }

                if (newIndex === undefined) {
                    hostRemove(prevChild.el)
                } else {
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    patched ++
                }
            }
        }
```

实现移动逻辑

当元素在新旧元素都存在的时候，并且位置不相同的时候就会触发这个操作

想要实现

​	尽可能减少移动的次数 减少性能的消耗

我们可以找到一个稳定的序列 就是相邻的元素的相对位置不变

仔细思考就是   **求最长递增子序列(LIS)**

算法实现

```ts
// dp[i] -> 长度是i+1的LIS的最小末尾元素的下标
// preIndices数组是两个元素在LISui元素中的前驱下标，最终使用来进行回溯

function getLIS(nums){
	const dp = []
	const preIndices = new Array(nums.length).fill(-1)
	
	// 下面使用二分查找位置 -> 是在dp中进行查找第一个nums[dp[mid]] >= nums[i]的位置left
	for(let i = 0;i<nums.length;i++){
		let left = 0,right = dp.length
		while(left < right){
			const mid = Math.floor((left + right)/2)
			if(nums[dp[mid]] < nums[i]){
				left = mid + 1
			}else{
				right = mid
			}
		}
		if(left === dp.length){
			dp.push(i)
		}else{
			dp[left] = i
		}
		// 记录前驱节点 当前元素的前一个是dp[left - 1]
		if(left > 0)preIndices[i] = dp[left - 1]
	}
	// 进行结果的回溯 每次找到结果的回溯的数据
	const res = []
	let current = dp[dp.length-1]
	while(current !== -1){
		res.push(current)
		current = preIndice[current]
	}
	return res.reverse()
}
```

主要学习的优化的过程

```ts
 const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
            // 对比操作
            let j = increasingNewIndexSequence.length - 1
            for (let i = toBePatched-1; i >= 0; i--) {
                if (i !== increasingNewIndexSequence[j]) {
                    const nextIndex = i + s2
                    const nextChild = c2[nextIndex]
                    const anchor = nextIndex + 1 < l2 ? c2[nextIndex+1].el : null
                    hostInsert(nextChild.el,container,anchor)
                    
                } else {
                    j--
                }
            }
```

### ？？ 为什么我的节点没有进行显示删除操作就能够是实现交换

Vue3的虚拟DOM Diff算法（双端对比 + 最长子序列优化） 

核心逻辑是通过移动DOM节点而并非是删除重建来提升性能

Diff流程就是上面实现的过程

#### DOM节点的复用

- `nextChild.el` 实际上已经存在DOM节点
- `hostInsert` 实际上是 调用 parent.insertBefore() 是移动节点并非是创建节点
- 如果节点需要移动，浏览器会自动的将其从原来的位置，插入到新的位置

#### 为什么旧的元素消失了

- DOM元素的唯一性 
  - 一个DOM节点只能在同一时间存在同一个位置，当通过`insertBefore`移动节点时，自动从旧的位置删除

