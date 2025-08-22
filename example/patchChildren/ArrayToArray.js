import { h, ref } from '../../lib/guide-mini-vue.esm.js'

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
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C')
// ]

// const nextChildren = [
//     h('p', { key: 'D' }, 'D'),
//     h('p', { key: 'E' }, 'E'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C'),
// ]
// const prevChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
//     h('p', { key: 'C' }, 'C')
// ]

// const nextChildren = [
//     h('p', { key: 'A' }, 'A'),
//     h('p', { key: 'B' }, 'B'),
// ]
const prevChildren = [
    h('p', { key: 'A' }, 'A'),
    h('p', { key: 'B' }, 'B'),

]

const nextChildren = [
    h('p', { key: 'C' }, 'C'),
    h('p', { key: 'A' }, 'A'),
    h('p', { key: 'B' }, 'B'),
]

export default {
    name: 'ArrayToText',
    setup() {
        const isChange = ref(false)
        window.isChange = isChange
        return {
            isChange
        }
    },
    render() {
        const self = this
        return self.isChange === true ? h('div', {}, nextChildren) : h('div', {}, prevChildren)
    }
}