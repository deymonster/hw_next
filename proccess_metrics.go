package metrics

import (
	"fmt"
	"log"
	"time"
	"unsafe"

	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/sys/windows"
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

type SYSTEM_INFO struct {
	ProcessorArchitecture     uint16
	Reserved                  uint16
	PageSize                  uint32
	MinimumApplicationAddress uintptr
	MaximumApplicationAddress uintptr
	ActiveProcessorMask       uintptr
	NumberOfProcessors        uint32
	ProcessorType             uint32
	AllocationGranularity     uint32
	ProcessorLevel            uint16
	ProcessorRevision         uint16
}

type PROCESSENTRY32 struct {
	Size            uint32
	CntUsage        uint32
	ProcessID       uint32
	DefaultHeapID   uintptr
	ModuleID        uint32
	CntThreads      uint32
	ParentProcessID uint32
	PriClassBase    int32
	Flags           uint32
	ExeFile         [windows.MAX_PATH]uint16
}

type PROCESS_MEMORY_COUNTERS_EX struct {
	CB                         uint32
	PageFaultCount             uint32
	PeakWorkingSetSize         uint64
	WorkingSetSize             uint64
	QuotaPeakPagedPoolUsage    uint64
	QuotaPagedPoolUsage        uint64
	QuotaPeakNonPagedPoolUsage uint64
	QuotaNonPagedPoolUsage     uint64
	PagefileUsage              uint64
	PeakPagefileUsage          uint64
	PrivateUsage               uint64
}

type ProcessInfo struct {
	PID       uint32
	Name      string
	RowIndex  int
	Handle    windows.Handle
	HasHandle bool
}

// getProcessList получает список процессов и открывает хэндлы
func getProcessList() ([]ProcessInfo, error) {
	var processes []ProcessInfo

	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, err
	}
	defer windows.CloseHandle(snapshot)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))

	err = windows.Process32First(snapshot, &entry)
	if err != nil {
		return nil, err
	}

	for {
		processID := entry.ProcessID
		exeName := windows.UTF16ToString(entry.ExeFile[:])

		proc := ProcessInfo{
			PID:       processID,
			Name:      exeName,
			HasHandle: false,
		}

		handle, err := windows.OpenProcess(
			windows.PROCESS_QUERY_INFORMATION|windows.PROCESS_VM_READ,
			false,
			processID,
		)

		if err == nil {
			proc.Handle = handle
			proc.HasHandle = true
		}

		processes = append(processes, proc)

		// Получаем следующий процесс
		err = windows.Process32Next(snapshot, &entry)
		if err != nil {
			break
		}
	}

	return processes, nil
}

func filetimeToUint64(ft windows.Filetime) uint64 {
	return (uint64(ft.HighDateTime) << 32) | uint64(ft.LowDateTime)
}

func cleanupHandles(processes []ProcessInfo) {
	for _, proc := range processes {
		if proc.HasHandle {
			windows.CloseHandle(proc.Handle)
		}
	}
}

func RecordProccessInfo() {
	go func() {
		// Инициализация структур для отслеживания времени
		prevProcessTimes := make(map[uint32]uint64)
		var prevSystemTime uint64

		// Инициализация PSAPI
		psapi := windows.NewLazySystemDLL("psapi.dll")
		getProcessMemoryInfo := psapi.NewProc("GetProcessMemoryInfo")

		// Получаем количество процессоров
		kernel32 := windows.NewLazySystemDLL("kernel32.dll")
		getSystemInfo := kernel32.NewProc("GetSystemInfo")
		var si SYSTEM_INFO

		// Вызов GetSystemInfo
		_, _, _ = getSystemInfo.Call(uintptr(unsafe.Pointer(&si)))
		cpuCores := float64(si.NumberOfProcessors)

		for {
			// Получаем список процессов
			processes, err := getProcessList()
			if err != nil {
				log.Printf("Ошибка получения списка процессов: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}

			// Устанавливаем общее количество процессов
			ProccessCount.Set(float64(len(processes)))

			// Получение системного времени
			getSystemTimes := kernel32.NewProc("GetSystemTimes")
			var idleTime, kernelTime, userTime windows.Filetime
			ret, _, err := getSystemTimes.Call(
				uintptr(unsafe.Pointer(&idleTime)),
				uintptr(unsafe.Pointer(&kernelTime)),
				uintptr(unsafe.Pointer(&userTime)),
			)
			if ret == 0 {
				log.Printf("GetSystemTimes failed: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}
			currentSystemTime := filetimeToUint64(kernelTime) + filetimeToUint64(userTime)

			// Обрабатываем каждый процесс
			for _, proc := range processes {
				if !proc.HasHandle {
					continue
				}

				// Получение информации о CPU
				var creation, exit, kernel, user windows.Filetime
				err = windows.GetProcessTimes(
					proc.Handle,
					&creation,
					&exit,
					&kernel,
					&user,
				)

				if err != nil {
					continue
				}

				currentProcessTime := filetimeToUint64(kernel) + filetimeToUint64(user)

				// Расчет загрузки CPU
				cpuUsage := 0.0
				if prevSystemTime > 0 && prevProcessTimes[proc.PID] > 0 {
					timeDelta := currentSystemTime - prevSystemTime
					processDelta := currentProcessTime - prevProcessTimes[proc.PID]

					if timeDelta > 0 {
						cpuUsage = (float64(processDelta) / float64(timeDelta)) * 100 / cpuCores
					}
				}
				prevProcessTimes[proc.PID] = currentProcessTime

				// Получение информации о памяти
				var memInfo PROCESS_MEMORY_COUNTERS_EX
				memInfo.CB = uint32(unsafe.Sizeof(memInfo))
				ret, _, _ = getProcessMemoryInfo.Call(
					uintptr(proc.Handle),
					uintptr(unsafe.Pointer(&memInfo)),
					uintptr(memInfo.CB),
				)

				if ret == 0 {
					continue
				}

				// Устанавливаем метрики для каждого процесса
				ProccessMemoryUsage.With(prometheus.Labels{
					"process": proc.Name,
					"pid":     fmt.Sprint(proc.PID),
				}).Set(float64(memInfo.PrivateUsage))

				ProccessCPUUsage.With(prometheus.Labels{
					"process": proc.Name,
					"pid":     fmt.Sprint(proc.PID),
				}).Set(cpuUsage)
			}

			// Закрываем хэндлы процессов
			cleanupHandles(processes)

			// Ждем 5 секунд перед следующим обновлением
			time.Sleep(5 * time.Second)
		}
	}()
}
