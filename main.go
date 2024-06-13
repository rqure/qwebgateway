package main

import (
	"os"

	qmq "github.com/rqure/qmq/src"
)

func getDatabaseAddress() string {
	addr := os.Getenv("QMQ_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	return addr
}

func main() {
	db := qmq.NewRedisDatabase(qmq.RedisDatabaseConfig{
		Address: getDatabaseAddress(),
	})

	dbWorker := qmq.NewDatabaseWorker(db)
	webServiceWorker := qmq.NewWebServiceWorker()
	configWorker := NewConfigWorker(db)

	dbWorker.Signals.Connected.Connect(qmq.Slot(configWorker.OnDatabaseConnected))
	dbWorker.Signals.Disconnected.Connect(qmq.Slot(configWorker.OnDatabaseDisconnected))

	webServiceWorker.Signals.Received.Connect(qmq.SlotWithArgs(configWorker.OnNewClientMessage))

	// Create a new application configuration
	config := qmq.ApplicationConfig{
		Name: "config",
		Workers: []qmq.IWorker{
			dbWorker,
			webServiceWorker,
			configWorker,
		},
	}

	// Create a new application
	app := qmq.NewApplication(config)

	// Execute the application
	app.Execute()
}
