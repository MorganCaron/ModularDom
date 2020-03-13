import { Component } from 'ts/ModularDom'
import html from './index.html'
import css from '!!raw-loader!./style.css'

@Component({
	selector: 'home-page',
	template: html,
	style: css
})
export class Home extends HTMLElement {
}
