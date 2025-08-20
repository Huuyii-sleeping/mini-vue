import { track, trigger } from "./effect"
import { reactiveFlag } from "./reactive"

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

function createGetter(isReadonly: any = false) {
    return function get(target: any, key: any) {     
        const res = Reflect.get(target, key)
        if(key === reactiveFlag.IS_REACTIVE)return !isReadonly
        if(key === reactiveFlag.IS_READONLY)return isReadonly
        if (!isReadonly) {
            track(target, key)
        }
        return res
    }
}

function createSetter() {
    return function set(target: any, key: any, value: any) {
        const res = Reflect.set(target, key, value)
        trigger(target, key)
        return res
    }
}

export const mutableHandler = {
    get,
    set,
}

export const readonlyHandler = {
    get: readonlyGet,
    set(target: any, key: any, value: any) {
        console.warn('readonly message')
        return true
    }
}