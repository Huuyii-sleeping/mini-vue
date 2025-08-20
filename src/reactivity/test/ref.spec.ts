import { describe, expect, it } from "vitest";
import { effect } from "../effect";
import { ref } from "../ref";

describe('ref',() => {
    it('happy path',() => {
        const a = ref(10)
        expect(a.value).toBe(10)
    })

    it('should be reactive',() => {
        const a = ref(1)
        let dummy
        let calls = 0
        effect(() => {
            calls ++
            dummy = a.value
        })
        expect(calls).toBe(1)
        expect(dummy).toBe(1)
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
        
        // same not trigger
        a.value = 2
        expect(calls).toBe(2)
        expect(dummy).toBe(2)
    })

    it('should make nested property reactive',() => {
        const a = ref({
            count : 3
        })
        let dummy 
        effect(() => {
        dummy = a.value.count
        })
        expect(dummy).toBe(3)
        a.value.count = 2
        expect(dummy).toBe(2)
    })
})