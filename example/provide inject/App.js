import { h,inject,provide } from '../../lib/guide-mini-vue.esm.js'
const Provider = {
    name: 'Provider',
    setup() {
        provide('foo', 'fooVal')
        provide('bar', 'barVal')
    },
    render() {
        return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
    }
}

const ProviderTwo = {
    name : 'ProviderTwo',
    render(){
        return h('div',{},[h('p',{},`ProviderTwo foo:${this.foo}`),h(Consumer)])
    },
    setup(){
        provide('foo','fooTwo')
        const foo = inject('foo')
        return {
            foo
        }
    }
}

const Consumer = {
    name: 'Consumer',
    setup() {
        const foo = inject('foo')
        const bar = inject('bar')

        return {
            foo,
            bar
        }
    },
    render() {
        return h('div', {}, `Consumer: - ${this.foo} - ${this.bar}`)
    }
}

export const App = {
    render() {
        return h(Provider)
    },
    setup() {
        return {}
    }
}