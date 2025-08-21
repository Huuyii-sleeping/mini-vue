import { shapeFlags } from "../shared/shapeFlags"

export function initSlots(instance, children) {
    const { vnode } = instance
    if (vnode.shapeFlag & shapeFlags.SLOT_CHILDREN) {
        nomalizeObjectSlots(children, instance)
    }

}

function nomalizeObjectSlots(children, instance) {
    const slots = {}
    for (const key in children) {
        const val = children[key]
        slots[key] = (props) => normalizeSlotsValue(val(props))
    }
    instance.slots = slots
}

function normalizeSlotsValue(value) {
    return Array.isArray(value) ? value : [value]
}