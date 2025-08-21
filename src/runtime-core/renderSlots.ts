import { createVnode } from "./vnode";

export function renderSlots(slots, name, props) {
    const slot = slots[name]
    console.log(slot)
    if (slot) {
        if(typeof slot === 'function'){
            return createVnode('div',{},slot(props))
        }
    }
}