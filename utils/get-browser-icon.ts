import { CircleHelp } from 'lucide-react'
import {
	FaChrome,
	FaEdge,
	FaFirefoxBrowser,
	FaOpera,
	FaSafari,
	FaYandex
} from 'react-icons/fa6'

export function getBrowserIcon(browser: string) {
	switch (browser.toLowerCase()) {
		case 'chrome':
			return FaChrome
		case 'firefox':
			return FaFirefoxBrowser
		case 'safari':
			return FaSafari
		case 'opera':
			return FaOpera
		case 'edge':
			return FaEdge
		case 'yandex':
			return FaYandex
		default:
			return CircleHelp
	}
}
