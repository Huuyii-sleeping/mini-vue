import { hasChange, isObject } from "../shared";
import { isTracking, trackEffect, triggerEffect } from "./effect";
import { reactive } from "./reactive";

class RefImp {
    private _value: any
    public dep: any
    private _rawVal: any
    public _v_is_ref = true
    constructor(val: any) {
        this._rawVal = val
        this._value = convert(val)
        this.dep = new Set()
    }
    get value() {
        trackRefValue(this)
        return this._value
    }
    set value(newValue) {
        if (!hasChange(newValue, this._rawVal)) return
        this._rawVal = newValue
        this._value = convert(newValue)
        triggerEffect(this.dep)
    }
}

function trackRefValue(ref: any) {
    if (isTracking()) {
        trackEffect(ref.dep)
    }
}

function convert(value: any) {
    return isObject(value) ? reactive(value) : value
}

export function ref(val: any) {
    return new RefImp(val)
}

export function isRef(val: any) {
    return val._v_is_ref
}

export function unRef(val: any) {
    if (!isRef(val)) return val
    return val._value
}

export function proxyRef(val: any) {
    return new Proxy(val, {
        get(target, key) {
            return unRef(Reflect.get(target, key))
        },
        set(target: any, key: any, val: any) {
            if (isRef(target[key]) && !isRef(val)) {
                return target[key].value = val
            } else {
                return Reflect.set(target, key, val)
            }
        }
    })
}