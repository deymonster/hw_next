export function LogoImage() {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			xmlnsXlink='http://www.w3.org/1999/xlink'
			viewBox='0 0 2400 2400'
			xmlSpace='preserve'
			width={42}
			height={42}
		>
			<title>Monitor Logo</title>
			<g>
				{/* Монитор - внешняя рамка */}
				<path
					className='fill-primary'
					d='M0,300 L0,1800 L300,2100 H2100 L2400,1800 V300 L2100,0 H300 L0,300z'
				/>
				{/* Экран - внутренняя часть */}
				<polygon
					className='fill-white'
					points='300,450 2100,450 2100,1650 300,1650'
				/>
				<g id='screen-content'>
					{/* Линии графиков */}
					<path
						className='stroke-primary'
						strokeWidth='100'
						fill='none'
						d='M500,1200 L900,800 L1300,1400 L1700,600'
					/>
					{/* Вторая линия графика */}
					<path
						className='stroke-primary'
						strokeWidth='100'
						fill='none'
						opacity='0.5'
						d='M500,1000 L900,1200 L1300,900 L1700,1100'
					/>
					{/* Точки данных */}
					<circle
						cx='900'
						cy='800'
						r='120'
						className='fill-primary'
					/>
					<circle
						cx='1300'
						cy='1400'
						r='120'
						className='fill-primary'
					/>
					<circle
						cx='1700'
						cy='600'
						r='120'
						className='fill-primary'
					/>
				</g>
				{/* Подставка монитора */}
				<path
					className='fill-primary'
					d='M900,2100 L1500,2100 L1400,2400 L1000,2400 Z'
				/>
			</g>
		</svg>
	)
}
