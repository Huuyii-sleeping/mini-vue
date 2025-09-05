# element处理实现

## Component实现

1. 创建虚拟节点

   ```ts
   export function createVnode(type, props?, children?) {
       const vnode = {
           type,
           props,
           children,
       }
       return vnode
   }
   ```

   通过mount（container）找到对应的节点 

   1. ```ts
      export function createApp(rootComponent){
      	return {
      		mount(rootComponent){
      			const vnode = createVnode(rootCompoent)
      			render(vnode,rootContainer)
      		}
      	}
      }
      ```

   2. 对render传递的组件进行处理

      ```ts
      export function render(vnode, container) {
          // --patch
          patch(vnode, container)
      
      }
      ```

   3. 处理组件的逻辑
      组件还是元素

      ```ts
      function patch(vnode, container) {
          // TODO 判断vnode是不是element ？区分element和component？
          // component -> obj element -> string
          if (typeof vnode.type === 'string') {
              processElement(vnode, container)
          } else if (isObject(vnode.type)) {
              processComponent(vnode, container)
          }
      
      }
      ```

   4. 之后进行组件的挂载
      处理相关的组件实例和对应的数据

      ```ts
      function processComponent(vnode, container) {
          mountComponent(vnode, container) // 进行组件的挂载
      
      }
      
      function mountComponent(vnode, container) {
          // 创建组件实例
          const instance = createComponentInstance(vnode)
          // 对组件进行处理
          setupComponent(instance)
          setupRenderEffect(instance, container)
      }
      ```

      1. setupComponent 主要是将虚拟的节点转换成组件实例对象
         简便后续的操作

         ```ts
         export function setupComponent(instance) {
             // todo 
             // initProps()
             // initSlots()
         
             setupStatefulComponent(instance)
         }
         ```

         1. ```
            function setupStatefulComponent(instance) {
                // 调用setup 拿到返回值
                const Component = instance.type
                const { setup } = Component
                if (setup) {
                    // function object
                    const setupResult = setup()
                    handleSetupResult(instance, setupResult)
                }
            }
            ```

         2. 处理结果

            ```ts
            function handleSetupResult(instance, setupResult) {
                // 对 function object进行判断
                if (typeof setupResult === 'object') {
                    instance.setup = setupResult
                }
                finishComponentSetup(instance)
            }
            
            function finishComponentSetup(instance) {
                const Component = instance.type
                instance.render = Component.render
            }
            ```

      2. setupRenderEffect 
         相当于开盒操作将里面的元素拿出来
         里面的元素还得进行patch操作

         1. ```ts
            function setupRenderEffect(instance, container) {
                const subTree = instance.render()
                // vnode tree
                // vnode -> patch
                // component -> vnode : element -> mountElement
                patch(subTree, container)
            }
            ```



## element处理

1. mount初始化

   ```ts
   function processElement(vnode, container) {
       mountElement(vnode, container)
   }
   
   ```

   对内部的元素进行处理

   ```ts
   function mountElement(vnode, container) {
       // 创建element 并进行挂载
       const el = document.createElement(vnode.type)
       // children的处理
       const { children } = vnode
       if(typeof children === 'string'){
           el.textContent = children
       }else if(Array.isArray(children)){
           // 内部都是vnode -> element
           // 需要进行patch
           mountChildren(vnode,container)
       }
       
       // props
       const { props } = vnode
       for (const key in props) {
           const val = props[key]
           el.setAttribute(key,val)
       }
       container.append(el)
   }
   
   ```

2. mountChildren

   ```ts
   function mountChildren(vnode,container){
       vnode.children.forEach(v => {
           patch(v,container)
       })
   }
   ```

   