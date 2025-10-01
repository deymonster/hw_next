package core

import (
	"errors"
	"log"
	"os"
	"strconv"
	"sync"
	"time"
)

type Activation struct {
	DeviceID string    `json:"deviceId"`
	AgentKey string    `json:"agentKey"`
	IP       string    `json:"ipAddress"`
	Port     int       `json:"port"`
	At       time.Time `json:"activatedAt"`
}

type Store struct {
	mu        sync.RWMutex
	maxAgents int
	jobName   string
	items     map[string]Activation // key = deviceId
}

func NewStore() *Store {
	max := 50
	if v := os.Getenv("MAX_AGENTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			max = n
		}
	}
	job := os.Getenv("JOB_NAME")
	if job == "" {
		job = "windows-agents"
	}

	return &Store{
		maxAgents: max,
		jobName:   job,
		items:     make(map[string]Activation),
	}
}

func (s *Store) Status() (max, active, remaining int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	active = len(s.items)
	max = s.maxAgents
	remaining = max - active
	return
}

func (s *Store) AllTargets() (job string, targets []string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, a := range s.items {
		targets = append(targets, a.IP+":"+strconv.Itoa(a.Port))
	}
	return s.jobName, targets
}

var ErrLimitReached = errors.New("license limit reached")

func (s *Store) Activate(dev Activation) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	log.Printf("[STORE] Activation request - DeviceID: %s, IP: %s:%d, AgentKey: %s", 
		dev.DeviceID, dev.IP, dev.Port, dev.AgentKey)
	
	if len(s.items) >= s.maxAgents {
		log.Printf("[STORE] Activation failed - License limit reached (%d/%d)", len(s.items), s.maxAgents)
		return ErrLimitReached
	}
	
	dev.At = time.Now()
	s.items[dev.DeviceID] = dev
	
	log.Printf("[STORE] Device activated successfully - DeviceID: %s, Total active: %d/%d", 
		dev.DeviceID, len(s.items), s.maxAgents)
	
	return nil
}

func (s *Store) Deactivate(deviceID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if _, exists := s.items[deviceID]; exists {
		delete(s.items, deviceID)
		log.Printf("[STORE] Device deactivated successfully - DeviceID: %s, Total active: %d/%d", 
			deviceID, len(s.items), s.maxAgents)
	} else {
		log.Printf("[STORE] Deactivation attempted for non-existent DeviceID: %s", deviceID)
	}
}

// MaxAgents возвращает максимальное количество агентов
func (s *Store) MaxAgents() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.maxAgents
}

// JobName возвращает имя задачи для Prometheus
func (s *Store) JobName() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.jobName
}
