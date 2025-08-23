import { describe, expect, test } from "vitest";
import { baseParse } from "../parse";
import { NodeTypes } from "../ast";

describe('parse', () => {
    describe('interpolation', () => {
        test('simple interpolation', () => {
            const ast = baseParse('{{message}}')
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.INTERPPLATION,
                content: {
                    type: NodeTypes.SIMPLE_EXPRESSION,
                    content: 'message'
                }
            })
        })
    })
    describe('element', () => {
        test('element div', () => {
            const ast = baseParse('<div></div>')
            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.ELEMENT,
                tag: 'div',
                children: []
            })
        })
    })

    describe('text', () => {
        test('simple text', () => {
            const ast = baseParse('some text')

            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.TEXT,
                content: 'some text'
            })
        })
    })

    describe('all in', () => {
        test('all in', () => {
            const ast = baseParse('<div>hi,{{message}}</div>')

            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.ELEMENT,
                tag: 'div',
                children: [
                    {
                        type: NodeTypes.TEXT,
                        content: 'hi,'
                    },
                    {
                        type: NodeTypes.INTERPPLATION,
                        content: {
                            type: NodeTypes.SIMPLE_EXPRESSION,
                            content: 'message'
                        }
                    }
                ]
            })
        })
    })

    describe('nest test', () => {
        test('all in', () => {
            const ast = baseParse('<div><p>hi</p>hi,{{message}}</div>')

            expect(ast.children[0]).toStrictEqual({
                type: NodeTypes.ELEMENT,
                tag: 'div',
                children: [
                    {
                        type : NodeTypes.ELEMENT,
                        tag : 'p',
                        children : [
                            {
                                type : NodeTypes.TEXT,
                                content : 'hi'
                            }
                        ],
                    },
                    {
                        type: NodeTypes.TEXT,
                        content: 'hi,'
                    },
                    {
                        type: NodeTypes.INTERPPLATION,
                        content: {
                            type: NodeTypes.SIMPLE_EXPRESSION,
                            content: 'message'
                        }
                    }
                ]
            })
        })
    })

    test('shoule wran',() => {
        expect(() => {
            baseParse('<div><span></div>')
        }).toThrow()
    })
})