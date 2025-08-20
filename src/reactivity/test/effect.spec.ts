import { describe, expect, it, vi } from "vitest";
import { reactive } from "../reactive";
import { effect,stop } from "../effect";

describe('effect', () => {

    it('happy path', () => {
        const user = reactive({
            age: 10
        })

        let nextAge
        effect(() => {
            nextAge = user.age + 1
        })
        expect(nextAge).toBe(11)
        user.age++
        expect(nextAge).toBe(12)
    })

    it('should return when _effect', () => {
        let foo = 1
        const runner = effect(() => {
            foo++
            return 'foo' // effect set return 
        })
        expect(foo).toBe(2)
        const r = runner()
        expect(foo).toBe(3)
        expect(r).toBe('foo')
    })

    it('scheduler', () => {
        let dummy
        let run: any
        const scheduler = vi.fn(() => {
            run = runner
        })
        const obj = reactive({ foo: 1 })
        const runner = effect(() => {
            dummy = obj.foo
        }, { scheduler })
        expect(scheduler).not.toHaveBeenCalled()
        expect(dummy).toBe(1)
        obj.foo++
        expect(scheduler).toHaveBeenCalledTimes(1)
        expect(dummy).toBe(1)
        run()
        expect(dummy).toBe(2)
    })

    it('stop',() => {
        let dummy 
        const obj = reactive({ prop : 1 })
        const runner = effect(() => {
            dummy = obj.prop
        })
        obj.prop = 2
        expect(dummy).toBe(2)
        stop(runner)
        obj.prop++ // prop++ (set) = prop + 1 (get+set)
        expect(dummy).toBe(2)
        
        runner()
        expect(dummy).toBe(3)
    })

    it('onStop',() => {
        const obj = reactive({
            foo : 1
        })
        const onStop = vi.fn()
        let dummy
        const runner = effect(() => {
            dummy = obj.foo
        },{ onStop })
        stop(runner)
        expect(onStop).toBeCalledTimes(1)
    })
})