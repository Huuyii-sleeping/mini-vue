import { describe, expect, it } from "vitest";
import { isReadonly, shallowReadonly } from "../reactive";

describe('shallowReadonly',() => {
    it('',() => {
        const prop = shallowReadonly({a : { foo : 1 }})
        expect(isReadonly(prop)).toBe(true)
        expect(isReadonly(prop.a)).toBe(false)
    })
})