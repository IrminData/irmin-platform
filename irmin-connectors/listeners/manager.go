package listeners

import (
	"context"
	"fmt"
	"irmin-connectors/db"
	"log/slog"
	"sync"
)

// ListenerFunc is a function type for starting a connector-specific listener.
// It should block until the context is cancelled or an error occurs.
type ListenerFunc func(ctx context.Context, logger *slog.Logger, subscription db.Subscription, database *db.Database) error

// activeListener tracks a running listener goroutine.
type activeListener struct {
	cancel context.CancelFunc
	done   chan struct{}
}

// Manager manages active listeners for subscriptions.
// It provides thread-safe methods to start and stop listeners dynamically.
type Manager struct {
	mu        sync.RWMutex
	listeners map[uint]*activeListener
	logger    *slog.Logger
	database  *db.Database

	// ConnectorListeners maps connector names to their listener functions.
	// This is populated during initialization.
	ConnectorListeners map[string]ListenerFunc
}

// NewManager creates a new listener manager.
func NewManager(logger *slog.Logger, database *db.Database) *Manager {
	return &Manager{
		listeners:          make(map[uint]*activeListener),
		logger:             logger,
		database:           database,
		ConnectorListeners: make(map[string]ListenerFunc),
	}
}

// RegisterConnectorListener registers a listener function for a connector.
func (m *Manager) RegisterConnectorListener(connectorName string, listenerFunc ListenerFunc) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.ConnectorListeners[connectorName] = listenerFunc
}

// StartListener starts a listener for the given subscription.
// If a listener is already running for this subscription, it returns an error.
func (m *Manager) StartListener(connectorName string, subscription db.Subscription) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Check if listener is already running
	if _, exists := m.listeners[subscription.ID]; exists {
		return fmt.Errorf("listener already running for subscription %d", subscription.ID)
	}

	// Get the listener function for this connector
	listenerFunc, ok := m.ConnectorListeners[connectorName]
	if !ok {
		return fmt.Errorf("no listener registered for connector: %s", connectorName)
	}

	// Create context for this listener
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})

	// Store the active listener
	m.listeners[subscription.ID] = &activeListener{
		cancel: cancel,
		done:   done,
	}

	// Start the listener goroutine
	go func() {
		defer close(done)
		defer func() {
			m.mu.Lock()
			delete(m.listeners, subscription.ID)
			m.mu.Unlock()
		}()

		m.logger.Info("Starting listener",
			"subscription_id", subscription.ID,
			"connector", connectorName)

		if err := listenerFunc(ctx, m.logger, subscription, m.database); err != nil {
			if ctx.Err() == nil {
				// Error occurred but context wasn't cancelled
				m.logger.Error("Listener error",
					"subscription_id", subscription.ID,
					"connector", connectorName,
					"error", err)
			}
		}

		m.logger.Info("Listener stopped",
			"subscription_id", subscription.ID,
			"connector", connectorName)
	}()

	return nil
}

// StopListener stops the listener for the given subscription ID.
// It waits for the listener to fully stop before returning.
func (m *Manager) StopListener(subscriptionID uint) error {
	m.mu.Lock()
	listener, exists := m.listeners[subscriptionID]
	if !exists {
		m.mu.Unlock()
		return fmt.Errorf("no listener running for subscription %d", subscriptionID)
	}
	m.mu.Unlock()

	// Cancel the context to signal the listener to stop
	listener.cancel()

	// Wait for the listener to finish
	<-listener.done

	return nil
}

// StopListenerAsync stops the listener without waiting for it to finish.
func (m *Manager) StopListenerAsync(subscriptionID uint) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	listener, exists := m.listeners[subscriptionID]
	if !exists {
		return fmt.Errorf("no listener running for subscription %d", subscriptionID)
	}

	// Cancel the context to signal the listener to stop
	listener.cancel()

	return nil
}

// IsListenerRunning checks if a listener is running for the given subscription ID.
func (m *Manager) IsListenerRunning(subscriptionID uint) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, exists := m.listeners[subscriptionID]
	return exists
}

// GetActiveListenerCount returns the number of active listeners.
func (m *Manager) GetActiveListenerCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.listeners)
}

// StopAll stops all active listeners.
// This should be called during graceful shutdown.
func (m *Manager) StopAll() {
	m.mu.Lock()
	listenersCopy := make([]*activeListener, 0, len(m.listeners))
	for _, listener := range m.listeners {
		listenersCopy = append(listenersCopy, listener)
	}
	m.mu.Unlock()

	// Cancel all listeners
	for _, listener := range listenersCopy {
		listener.cancel()
	}

	// Wait for all listeners to finish
	for _, listener := range listenersCopy {
		<-listener.done
	}

	m.logger.Info("All listeners stopped")
}
