import { h } from '../../lib/guide-mini-vue.esm.js'
import { foo } from './foo.js'

window.self = null
export const App = {
    name : 'App',
    render() {
        window.self = this
        return h('div', {
            id: 'root',
            class: ['red', 'hard'],
            onClick(){
                console.log('click')
            }
        }, 
        // 'hi,' + this.msg
    
        [h('div',{},'hi'+this.msg),h(foo,{
            onAdd(){
                console.log('onAdd')
            }
        })]
    )
    },
    setup() {
        return {
            msg: 'mini-vue-1'
        }
    }
}