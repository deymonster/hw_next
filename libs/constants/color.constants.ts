export const BASE_COLORS = [
	{
		name: 'violet',
		color: '262.1 83.3% 57.8%'
	},
	{
		name: 'blue',
		color: '204, 70%, 53%'
	},
	{
		name: 'turquoise',
		color: '176, 77%, 41%'
	},
	{
		name: 'yellow',
		color: '48, 89%, 50%'
	},
	{
		name: 'peach',
		color: '17, 94%, 67%'
	},
	{
		name: 'pink',
		color: '330.4 81.2% 60.4%'
	},
	{
		name: 'rose',
		color: '340, 82%, 52%'
	},
	{
		name: 'red',
		color: '0 72.2% 50.6%'
	}
] as const

export type TypeBaseColor = (typeof BASE_COLORS)[number]['name']
