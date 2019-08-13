import * as Prism from 'prismjs'

import { Elem, Layout, Body, Tag, View, Reactive, Router, Writer, WriterOptions } from 'ModularDom'

export class RouterPage extends Layout {
	constructor() {
		super(Tag`div class: container-fluid`)
		this.update()
	}

	render(): Elem[] {
		return View`
			h2 "Router"
			p class: lead {
				"The framework is finished, but this documentation is not yet finished." br;
				"Come back in a few days, this page will be written." br;
				"Thanks," br; br; "Morgan."
			}
		`
	}

	afterRender() {
		Prism.highlightAllUnder(this.el)
	}
}
