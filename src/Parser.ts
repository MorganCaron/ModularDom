import { Elem, Attributes, VDOMText, VDOMObject, VDOMElem } from './VDom'

class ModularDomParser {
	values: (string | VDOMObject | EventListener)[]
	indexValue: number
	indexChar: number

	currentValue(): (string | VDOMObject | EventListener) {
		return this.values[this.indexValue]
	}
	currentString(): string {
		return this.currentValue() as string
	}
	currentChar(): string {
		return (this.currentValue() as string)[this.indexChar]
	}

	isSpace(char: string): boolean {
		return ' \t\n'.includes(char)
	}
	isChar(char: string): boolean {
		return /[@_\-0-9A-Za-z]/.test(char)
	}
	isString(): boolean {
		return (typeof this.currentValue() === 'string')
	}
	isEndOfString(): boolean {
		return this.indexChar >= this.currentString().length
	}
	isEndOfValues(): boolean {
		return this.indexValue >= this.values.length
	}

	gotoNextValue(): void {
		if (!this.isEndOfValues()) {
			++this.indexValue
			this.indexChar = 0
		}
	}
	getNextWord(): string {
		let word = ''
		while (!this.isEndOfString() && this.isChar(this.currentChar())) {
			word += this.currentChar()
			++this.indexChar
		}
		return word
	}

	parseCommentary(): void {
		const typeCommentary = this.currentChar()
		++this.indexChar
		if (typeCommentary == '/') {
			const length = this.currentString().substring(this.indexChar).indexOf('\n')
			if (length != -1)
				this.indexChar += length + 1
		}
		else if (typeCommentary == '*') {
			const length = this.currentString().substring(this.indexChar).indexOf('*/')
			if (length != -1)
				this.indexChar += length + 2
		}
		this.parseSpace()
	}

	parseSpace(): void {
		while (!this.isEndOfString() && this.isSpace(this.currentChar()))
			++this.indexChar
		if (this.indexChar + 1 < this.currentString().length && this.currentChar() == '/' && '/*'.includes(this.currentString()[this.indexChar + 1])) {
			++this.indexChar
			this.parseCommentary()
			if (this.isEndOfString())
				this.gotoNextValue()
		}
	}

	parseQuote(): string {
		const quoteType = this.currentChar()
		if (!"'\"".includes(quoteType))
			throw new Error(`Syntax error: Character " ou ' is missing.`)
		++this.indexChar
		let quotation = ''
		while (!this.isEndOfValues() && ((!this.isEndOfString() && this.currentChar() !== quoteType) || (this.isEndOfString() && this.indexValue + 1 < this.values.length && typeof this.values[this.indexValue + 1] === 'string'))) {
			if (!this.isEndOfString()) {
				quotation += this.currentChar()
				if (this.currentChar() === '\\') {
					++this.indexChar
					quotation += this.currentChar()
					if (this.isEndOfString())
						throw new Error(`Syntax error: Character \\ must escape a character.`)
				}
				++this.indexChar
			}
			else {
				quotation += this.values[++this.indexValue] as string
				this.gotoNextValue()
			}
		}
		if (this.isEndOfValues() || this.isEndOfString() || this.currentChar() !== quoteType)
			throw new Error(`Syntax error: Character " ou ' is missing.`)
		++this.indexChar
		return quotation
	}

	parseValue(): string | EventListener {
		this.parseSpace()
		if (!this.isEndOfString() && "'\"".includes(this.currentChar()))
			return this.parseQuote()
		if (this.isEndOfString()) {
			this.gotoNextValue()
			const currentValue = this.currentValue()
			if (typeof currentValue !== 'function')
				throw new Error('Syntax error: The placeholder is not a function.')
			this.gotoNextValue()
			return currentValue as EventListener
		}
		return this.getNextWord()
	}

	parseAttributes(): Attributes {
		let attrs: Attributes = {}
		while (!this.isEndOfString() && this.isChar(this.currentChar())) {
			const attr = this.getNextWord()
			this.parseSpace()
			if (this.isEndOfString() || this.currentChar() !== ':')
				throw new Error(`Syntax error: Character ':' is missing after ${attr} attribute.`)
			++this.indexChar
			attrs[attr] = this.parseValue()
			this.parseSpace()
		}
		return attrs
	}

	parseElement(): Elem {
		const value = this.values[this.indexValue]
		if (typeof value === 'string') {
			if ('\'"'.includes(this.currentChar()))
				return new VDOMText(this.parseQuote())
			else {
				const tag = this.getNextWord()
				if (tag.length === 0)
					throw new Error('Syntax error: Tag name is missing.')
				this.parseSpace()
				const attrs = this.parseAttributes()
				let content: string | Elem[]
				if (this.isEndOfString())
					throw new Error('Syntax error: Missing element content or \';\' character.')
				if ('\'"'.includes(this.currentChar()))
					content = this.parseQuote()
				else {
					if (this.currentChar() === ';') {
						++this.indexChar
						return new VDOMElem(tag, '', attrs)
					}
					if (this.currentChar() !== '{')
						throw new Error('Syntax error: Character \'{\' or \';\' is missing.')
					++this.indexChar
					content = this.parseBlock(true)
				}
				return new VDOMElem(tag, content, attrs)
			}
		}
		else if (value instanceof VDOMObject)
			return value
		else
			throw new Error('Syntax error: Use of a function out of context')
	}

	parseBlock(untilBracket: boolean = false): Elem[] {
		let elems: Elem[] = []
		const jumpToNextElem = () => {
			if (this.isString()) {
				this.parseSpace()
				if (this.isEndOfString())
					++this.indexValue
			}
		}
		if (!this.isEndOfValues())
			jumpToNextElem()
		while (!this.isEndOfValues() && !(untilBracket && this.isString() && !this.isEndOfString() && this.currentChar() === '}')) {
			elems.push(this.parseElement())
			if (typeof this.currentValue() !== 'string')
				this.gotoNextValue()
			jumpToNextElem()
		}
		if (untilBracket) {
			if (this.isEndOfValues() || !this.isString() || this.isEndOfString() || this.currentChar() !== '}')
				throw new Error('Syntax error: Character \'}\' is missing.')
			++this.indexChar
			this.parseSpace()
		}
		return elems
	}

	parseView(values: (string | VDOMObject | EventListener)[]): Elem[] {
		this.values = values
		this.indexValue = 0
		this.indexChar = 0
		return this.parseBlock()
	}

	parseTag(values: (string | EventListener)[]): VDOMElem {
		this.values = values
		this.indexValue = 0
		this.indexChar = 0
		const tag = this.getNextWord()
		if (tag.length == 0)
			throw new Error('Syntax error: Tag name is missing.')
		this.parseSpace()
		const attrs = this.parseAttributes()
		return new VDOMElem(tag, '', attrs)
	}
}

export const View = (literals: TemplateStringsArray, ...placeholders: (string | Elem | Elem[] | EventListener)[]): Elem[] => {
	const convertPlaceholder = (placeholder: (string | Elem | Elem[] | EventListener)): (string | VDOMObject | EventListener)[] => {
		if (placeholder instanceof VDOMText)
			return [(placeholder as VDOMText).el.wholeText]
		if (Array.isArray(placeholder))
			return placeholder.map(elem => (elem instanceof VDOMText) ? (elem as VDOMText).el.wholeText : elem)
		return [placeholder]
	}
	let indexLiteral = 0
	const values = placeholders.map(elem => [literals[indexLiteral++], ...convertPlaceholder(elem)]).reduce(<T>(arr0: T[], arr1: T[]) => [...arr0, ...arr1], [])
	values.push(literals[indexLiteral])
	return new ModularDomParser().parseView(values)
}

export const Tag = (literals: TemplateStringsArray, ...placeholders: (string | EventListener)[]): VDOMElem => {
	let values: (string | EventListener)[] = []
	for (let i = 0; i < placeholders.length; ++i) {
		values.push(literals[i])
		values.push(placeholders[i])
	}
	values.push(literals[placeholders.length])
	return new ModularDomParser().parseTag(values)
}