import { extend } from "../shared"

class ReactiveEffect {
    private _fn: any
    deps: any = []
    active: any = true
    onStop?: () => void
    constructor(fn: any, public scheduler?: any) {
        this._fn = fn
    }
    run() {
        activeEffect = this
        return this._fn()
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
    extend(_effect,options)
    _effect.run()
    const runner: any = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

const targetMap = new Map()
let activeEffect: ReactiveEffect
export function track(target: any, key: any) {
    if (!activeEffect) return
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
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}

export function trigger(target: any, key: any) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    const dep = depsMap.get(key)
    if (!dep) return

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
}