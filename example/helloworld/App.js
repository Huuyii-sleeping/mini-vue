import { h } from '../../lib/guide-mini-vue.esm.js'


window.self = null
export const App = {
    name : 'App',
    render() {
        window.self = this
        return h('div', {
            id: 'root',
            class: ['red', 'hard'],
        }, 
        'hi,' + this.msg
    )
    },
    setup() {
        return {
            msg: 'mini-vue-1'
        }
    }
}