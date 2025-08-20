import { describe, expect, it } from "vitest";
import { isProxy, isReactive, reactive } from "../reactive";

describe('reactive',() => {
    it('happy path',() => {
        const original = { foo : 1 }
        const observed = reactive(original)
        expect(observed).not.toBe(original)
        expect(observed.foo).toBe(1)
        expect(isProxy(observed)).toBe(true)
        expect(isProxy(original)).toBe(false)
    })
})