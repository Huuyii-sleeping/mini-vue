import { NodeTypes } from "./ast"

const enum TagType {
    Start,
    End,
}

export function baseParse(content) {
    const context = createParseContent(content)
    return createRoot(parseChildren(context, []))
}

function parseChildren(context, ancestors) {
    const nodes: any[] = []
    while (!(isEnd(context, ancestors))) {
        let node
        const s = context.source
        if (s.startsWith('{{')) {
            node = parseInpolation(context)
        } else if (s[0] === '<') {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context,ancestors)
            }
        } else {
            node = parseText(context)
        }
        nodes.push(node)
    }
    return nodes
}

function isEnd(context, ancestors) {
    const s = context.source
    if(s.startsWith('</')){
        for(let i = 0 ;i < ancestors.length;i++){
            const tag = ancestors[i].tag
            if(startsWithEndTagOpen(s,tag)){
                return true
            }
        }
    }
    
    return !context.source
}

function parseText(context) {
    let endIndex = context.source.length
    const endTokens = ['<', '{{']
    for (let i = 0; i < endTokens.length; i++) {
        const endToken = endTokens[i]
        const index = context.source.indexOf(endToken)
        if (index !== -1 && endIndex > index) {
            endIndex = index
        }
    }

    const content = parseTextData(context, endIndex)
    advanceBy(context, content.length)
    return {
        type: NodeTypes.TEXT,
        content,
    }
}

function parseTextData(context, length) {
    return context.source.slice(0, length)
}

function parseElement(context,ancestors) {
    const element: any = parseTag(context, TagType.Start)
    ancestors.push(element)
    element.children = parseChildren(context, ancestors)
    ancestors.pop()
    if(startsWithEndTagOpen(context.source,element.tag)){  
        parseTag(context,TagType.End)
    }else{
        throw new Error('缺少结束标签')
    }
    return element
}

function startsWithEndTagOpen(source,tag){
    return source.startsWith('</') && source.slice(2,2 + tag.length).toLowerCase() === tag
}

function parseTag(context, type: TagType) {
    const match: any = /^<\/?([a-z]*)/.exec(context.source)
    if (!match) return
    const tag = match[1]
    advanceBy(context, match[0].length)
    advanceBy(context, 1)

    if (type === TagType.End) return

    return {
        type: NodeTypes.ELEMENT,
        tag,
    }
}

function parseInpolation(context) {
    const openDelimiter = '{{'
    const closeDelimiter = '}}'

    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
    advanceBy(context, openDelimiter.length)
    const rawContentLength = closeIndex - openDelimiter.length
    const rawContent = context.source.slice(0, rawContentLength)

    const content = rawContent.trim()
    advanceBy(context, rawContentLength + closeDelimiter.length)
    return {
        type: NodeTypes.INTERPPLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content
        }
    }
}

function advanceBy(context, length) {
    context.source = context.source.slice(length)
}

function createParseContent(content) {
    return {
        source: content
    }
}

function createRoot(children) {
    return {
        children,
        type : NodeTypes.ROOT
    }
}