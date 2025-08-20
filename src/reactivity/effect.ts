import { extend } from "../shared"

let shouldTrack: any
let activeEffect: ReactiveEffect

class ReactiveEffect {
    private _fn: any
    deps: any = []
    active: any = true
    onStop?: () => void
    constructor(fn: any, public scheduler?: any) {
        this._fn = fn
    }
    run() {

        if (!this.active) {
            return this._fn()
        }
        shouldTrack = true
        activeEffect = this
        const result = this._fn()
        shouldTrack = false
        return result
    }
    stop() {
        if (this.active) {
            cleanEffect(this)
            if (this.onStop) {
                this.onStop()
            }
            this.active = false
        }
    }
}

export function effect(fn: any, options: any = {}) {
    const { scheduler } = options
    const _effect = new ReactiveEffect(fn, scheduler)
    extend(_effect, options)
    _effect.run()
    const runner: any = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

const targetMap = new Map()
export function track(target: any, key: any) {
    if (!isTracking()) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        depsMap = new Map()
        targetMap.set(target, depsMap)
    }
    let dep = depsMap.get(key)
    if (!dep) {
        dep = new Set()
        depsMap.set(key, dep)
    }
    trackEffect(dep)
}

export function trackEffect(dep: any) {
    if (dep.has(activeEffect)) return
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}

export function isTracking() {
    return activeEffect && shouldTrack !== false
}

export function trigger(target: any, key: any) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return
    triggerEffect(dep)
}

export function triggerEffect(dep: any) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler()
        } else {
            effect.run()
        }
    }
}

export function stop(runner: any) {
    runner.effect.stop()
}

function cleanEffect(effect: any) {
    effect.deps.forEach((dep: any) => {
        dep.delete(effect)
    })
    effect.deps.length = 0
}