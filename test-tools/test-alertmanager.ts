// Тестовый payload от AlertManager
const testAlertManagerPayload = {
	alerts: [
		{
			status: 'firing',
			labels: {
				alertname: 'Замена оборудования',
				severity: 'critical',
				instance: '192.168.1.107:9182',
				job: 'windows-exporter'
			},
			annotations: {
				description: 'Test alert about hardware change',
				summary: 'Test alert about hardware change'
			},
			startsAt: '2024-01-15T10:30:00Z',
			endsAt: '0001-01-01T00:00:00Z',
			generatorURL: 'http://prometheus:9090'
		}
	]
}

// Функция для тестирования
export async function testAlertEndpoint() {
	try {
		const response = await fetch('http://localhost:3000/api/alerts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(testAlertManagerPayload)
		})

		const result = await response.json()
		console.log('Test result:', result)

		return result
	} catch (error) {
		console.error('Test failed:', error)
		throw error
	}
}

if (require.main === module) {
	testAlertEndpoint()
		.then(result => {
			console.log('✅ Test completed successfully:', result)
			process.exit(0)
		})
		.catch(error => {
			console.error('❌ Test failed:', error)
			process.exit(1)
		})
}
