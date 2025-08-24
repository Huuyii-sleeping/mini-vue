export * from './runtime-dom'
export * from './reactivity'
import { registerRuntimeComplier } from './runtime-dom'

import { baseCompiler } from './complier-core/src'
import * as runtimeDom from './runtime-dom'

function complierToFunction(template){
    const { code } = baseCompiler(template)
    const render = new Function('Vue',code)(runtimeDom)
    return render
}

registerRuntimeComplier(complierToFunction)