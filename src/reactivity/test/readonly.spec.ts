import { describe, expect, it, vi } from "vitest";
import { isReadonly, readonly } from "../reactive";

describe('readonly',() => {
    it('happy path',() => {
        const original = { foo : 1, bar : { baz : 2 }}
        const wrapped = readonly(original)
        expect(wrapped).not.toBe(original)
        expect(isReadonly(wrapped)).toBe(true)
        expect(wrapped.foo).toBe(1)
    })

    it('set warning',() => {
        // mock
        console.warn = vi.fn()
        const user = readonly({
            age : 10
        })
        user.age = 11
        expect(user.age).toBe(10)
        expect(console.warn).toBeCalled()
    })

    it('nested readonly',() => {
        const original = {
            foo : { bar : 1 },
            array : [{ bar : 1 }]
        }
        const observed = readonly(original)
        expect(isReadonly(observed.foo)).toBe(true)
        expect(isReadonly(observed.array)).toBe(true)
        expect(isReadonly(observed.array[0])).toBe(true)
    })
})