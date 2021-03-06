import { Elem, Layout, Body, Tag, View, Reactive, Router, Writer, WriterOptions } from 'ModularDom'

export class Card extends Layout {
	title: string
	description: string
	image: string

	constructor(title: string, description: string, image: string) {
		super(Tag`div class: card`)
		this.title = title
		this.description = description
		this.image = image
		this.update()
	}

	render(): Elem[] {
		return View`
			h5 "${this.title}"
			img src: "${this.image}" alt: "${this.title}";
			p "${this.description}"
		`
	}
}
