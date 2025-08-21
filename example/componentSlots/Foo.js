import { h } from '../../lib/guide-mini-vue.esm.js'
import { renderSlots } from '../../lib/guide-mini-vue.esm.js'
export const Foo = {
    setup() {
        return {}
    },
    render() {
        const foo = h('p', {}, 'foo')
        const age = 10
        return h('div', {}, [renderSlots(this.$slots, 'header', { age }), renderSlots(this.$slots, 'footer')])
    }
}