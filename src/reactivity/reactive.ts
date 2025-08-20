import { mutableHandler, readonlyHandler } from "./baseHandler"

export const enum reactiveFlag{
    IS_REACTIVE = '_v_isReactive',
    IS_READONLY = '_v_isReadonly'
}

export function reactive(raw: any) {
    return createActiveObject(raw, mutableHandler)
}

export function readonly(raw: any) {
    return createActiveObject(raw, readonlyHandler)
}

function createActiveObject(raw: any, baseHandler: any) {
    return new Proxy(raw, baseHandler)
}

export function isReactive(raw: any) {
    return !!raw[reactiveFlag.IS_REACTIVE]
}

export function isReadonly(raw: any){
    return !!raw[reactiveFlag.IS_READONLY]
}