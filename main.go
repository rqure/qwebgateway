package main

import (
	"os"

	qdb "github.com/rqure/qdb/src"
)

func getDatabaseAddress() string {
	addr := os.Getenv("QDB_ADDR")
	if addr == "" {
		addr = "redis:6379"
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
	leaderElectionWorker := qdb.NewLeaderElectionWorker(db)
	schemaValidator := qdb.NewSchemaValidator(db)

	schemaValidator.AddEntity("Root", "SchemaUpdateTrigger")

	dbWorker.Signals.SchemaUpdated.Connect(qdb.Slot(schemaValidator.OnSchemaUpdated))
	leaderElectionWorker.AddAvailabilityCriteria(func() bool {
		return schemaValidator.IsValid()
	})

	dbWorker.Signals.Connected.Connect(qdb.Slot(leaderElectionWorker.OnDatabaseConnected))
	dbWorker.Signals.Disconnected.Connect(qdb.Slot(leaderElectionWorker.OnDatabaseDisconnected))

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
		Name: "webgateway",
		Workers: []qdb.IWorker{
			dbWorker,
			leaderElectionWorker,
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
