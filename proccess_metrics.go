package metrics

import (
	"fmt"
	"log"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/shirou/gopsutil/process"
)

var (
	ProccessCount = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_proccess_list",
			Help: "Total number of active proccesses",
		},
	)

	ProccessMemoryUsage = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "active_proccess_memory_usage",
			Help: "Memory usage for each active proccess",
		},
		[]string{"process", "pid"},
	)

	ProccessCPUUsage = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "proccess_cpu_usage_percent",
			Help: "CPU usage for each active proccess",
		},
		[]string{"process", "pid"},
	)
)

func RecordProccessInfo() {
	go func() {
		for {
			proccesses, err := process.Processes()
			if err != nil {
				log.Printf("Error getting proccess info: %v", err)
				return
			}

			// Set total count of proccesses
			ProccessCount.Set(float64(len(proccesses)))

			// total memory and cpu usage for chrome
			var chromeMemoryUsage float64
			var chromeCpuUsage float64

			for _, proc := range proccesses {
				name, err := proc.Name()
				if err != nil {
					continue // skip if cannot get name
				}

				pid := proc.Pid

				// for chrome processes only
				if name == "chrome.exe" {

					memInfo, err := proc.MemoryInfo()
					if err == nil {
						chromeMemoryUsage += float64(memInfo.RSS) / (1024 * 1024)
					}
					cpuPercent, err := proc.CPUPercent()
					if err == nil {
						chromeCpuUsage += cpuPercent
					}
					continue

				}

				// memory usage for each proccess
				memInfo, err := proc.MemoryInfo()
				if err == nil {
					memoryInMB := float64(memInfo.RSS) / (1024 * 1024)
					ProccessMemoryUsage.With(prometheus.Labels{
						"process": name,
						"pid":     fmt.Sprint(pid),
					}).Set(memoryInMB)
				}

				cpuPercent, err := proc.CPUPercent()
				if err == nil {
					ProccessCPUUsage.With(prometheus.Labels{
						"process": name,
						"pid":     fmt.Sprint(pid),
					}).Set(cpuPercent)

				}

			}
			ProccessMemoryUsage.With(prometheus.Labels{
				"process": "chrome.exe",
				"pid":     "total_chrome",
			}).Set(chromeMemoryUsage)

			ProccessCPUUsage.With(prometheus.Labels{
				"process": "chrome.exe",
				"pid":     "total_chrome",
			}).Set(chromeCpuUsage)

			time.Sleep(5 * time.Second) // period of update
		}
	}()
}
