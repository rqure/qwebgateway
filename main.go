package main

import (
	"os"

	qdb "github.com/rqure/qdb/src"
)

func getDatabaseAddress() string {
	addr := os.Getenv("qdb_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	return addr
}

func main() {
	db := qdb.NewRedisDatabase(qdb.RedisDatabaseConfig{
		Address: getDatabaseAddress(),
	})

	dbWorker := qdb.NewDatabaseWorker(db)
	webServiceWorker := qdb.NewWebServiceWorker()
	configWorker := NewConfigWorker(db)
	runtimeWorker := NewRuntimeWorker(db)

	dbWorker.Signals.Connected.Connect(qdb.Slot(configWorker.OnDatabaseConnected))
	dbWorker.Signals.Disconnected.Connect(qdb.Slot(configWorker.OnDatabaseDisconnected))
	webServiceWorker.Signals.Received.Connect(qdb.SlotWithArgs(configWorker.OnNewClientMessage))

	dbWorker.Signals.Connected.Connect(qdb.Slot(runtimeWorker.OnDatabaseConnected))
	dbWorker.Signals.Disconnected.Connect(qdb.Slot(runtimeWorker.OnDatabaseDisconnected))
	webServiceWorker.Signals.Received.Connect(qdb.SlotWithArgs(runtimeWorker.OnNewClientMessage))
	webServiceWorker.Signals.ClientConnected.Connect(qdb.SlotWithArgs(runtimeWorker.OnClientConnected))
	webServiceWorker.Signals.ClientDisconnected.Connect(qdb.SlotWithArgs(runtimeWorker.OnClientDisconnected))

	// Create a new application configuration
	config := qdb.ApplicationConfig{
		Name: "config",
		Workers: []qdb.IWorker{
			dbWorker,
			webServiceWorker,
			configWorker,
			runtimeWorker,
		},
	}

	// Create a new application
	app := qdb.NewApplication(config)

	// Execute the application
	app.Execute()
}
