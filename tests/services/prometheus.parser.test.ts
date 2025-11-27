import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PrometheusParser } from '../../services/prometheus/prometheus.parser'
import { PrometheusApiResponse } from '../../services/prometheus/prometheus.interfaces'

describe('PrometheusParser.getProcessList', () => {
        it('builds and sorts process list when process metrics are present', async () => {
                const response: PrometheusApiResponse = {
                        status: 'success',
                        data: {
                                resultType: 'vector',
                                result: [
                                        {
                                                metric: {
                                                        __name__: 'active_process_list',
                                                        instance: 'server:9182',
                                                        job: 'agent'
                                                },
                                                value: [1730000000, '3']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'active_process_memory_usage',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        pid: '100',
                                                        process: 'alpha'
                                                },
                                                value: [1730000000, '50']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'active_process_memory_usage',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        pid: '200',
                                                        process: 'beta'
                                                },
                                                value: [1730000000, '30']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_cpu_usage_percent',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        pid: '100',
                                                        process: 'alpha'
                                                },
                                                value: [1730000000, '25']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_cpu_usage_percent',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        pid: '200',
                                                        process: 'beta'
                                                },
                                                value: [1730000000, '10']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_instance_count',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'alpha'
                                                },
                                                value: [1730000000, '2']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_instance_count',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'beta'
                                                },
                                                value: [1730000000, '1']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_memory_workingset_mb',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'alpha',
                                                        instances: '2'
                                                },
                                                value: [1730000000, '150']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_memory_workingset_mb',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'beta',
                                                        instances: '1'
                                                },
                                                value: [1730000000, '80']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_memory_private_mb',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'alpha',
                                                        instances: '2'
                                                },
                                                value: [1730000000, '75']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_memory_private_mb',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'beta',
                                                        instances: '1'
                                                },
                                                value: [1730000000, '40']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_cpu_usage_percent',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'alpha',
                                                        instances: '2'
                                                },
                                                value: [1730000000, '35']
                                        },
                                        {
                                                metric: {
                                                        __name__: 'process_group_cpu_usage_percent',
                                                        instance: 'server:9182',
                                                        job: 'agent',
                                                        process: 'beta',
                                                        instances: '1'
                                                },
                                                value: [1730000000, '15']
                                        }
                                ]
                        }
                }

                const parser = new PrometheusParser(response)
                const result = await parser.getProcessList()

                assert.strictEqual(result.status, 'ok')
                assert.strictEqual(result.total, 3)
                assert.deepStrictEqual(
                        result.processes.map(process => process.name),
                        ['alpha', 'beta']
                )
                assert.strictEqual(result.processes[0].metrics.cpu, 35)
                assert.strictEqual(result.processes[1].metrics.cpu, 15)
                assert.strictEqual(result.processes[0].metrics.memory.workingSet, 150)
                assert.strictEqual(result.processes[0].metrics.memory.private, 75)
        })
})
