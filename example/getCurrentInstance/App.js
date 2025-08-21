import { h,getCurrentInstance } from '../../lib/guide-mini-vue.esm.js'
import { foo } from './foo.js'
export const App = {
    name : 'App',
    render(){
        return h('div',{},[h('p',{},'currentInstace demo'),h(foo)])
    },
    setup(){
        const instance = getCurrentInstance()
        console.log('App:',instance)
    }
}