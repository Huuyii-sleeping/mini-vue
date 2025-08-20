import { describe, expect, it } from "vitest";
import { effect } from "../effect";
import { isRef, proxyRef, ref, unRef } from "../ref";

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
    
    it('isRef',() => {
        const a = ref(1)
        expect(isRef(a)).toBe(true)
        const b = ref(1)
        expect(unRef(b)).toBe(1)
    })

    it('proxyRef',() => {
        const user = {
            age : ref(10),
            name : 'xiaoming'
        }
        const proxyUser = proxyRef(user)
        expect(user.age.value).toBe(10)
        expect(proxyUser.age).toBe(10)
        expect(proxyUser.name).toBe('xiaoming')

        proxyUser.age = 20
        expect(proxyUser.age).toBe(20)
        expect(user.age.value).toBe(20) // same change
    })
})