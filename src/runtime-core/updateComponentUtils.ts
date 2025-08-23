export function shouleUpdateComponent(n1,n2){
    const { props: prevVnode } = n1
    const { props: nextVnode } = n2
    
    for (const key in nextVnode) {
        if(nextVnode[key] !== prevVnode[key])return true
    }
    return false
}