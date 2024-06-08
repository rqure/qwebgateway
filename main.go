package main

import (
	"os"

	qmq "github.com/rqure/qmq/src"
)

func getDatabaseAddress() string {
	addr := os.Getenv("QMQ_ADDR")
	if addr == "" {
		addr = "redis:6379"
	}

	return addr
}

func main() {
	db := qmq.NewRedisDatabase(qmq.RedisDatabaseConfig{
		Address: getDatabaseAddress(),
	})

	dbWorker := qmq.NewDatabaseWorker(db)
	webServiceWorker := qmq.NewWebServiceWorker()

	// Create a new application configuration
	config := qmq.ApplicationConfig{
		Name: "config",
		Workers: []qmq.IWorker{
			dbWorker,
			webServiceWorker,
		},
	}

	// Create a new application
	app := qmq.NewApplication(config)

	// Execute the application
	app.Execute()
}
