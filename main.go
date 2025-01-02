package main

import (
	"os"

	"github.com/rqure/qlib/pkg/app"
	"github.com/rqure/qlib/pkg/app/workers"
	"github.com/rqure/qlib/pkg/data/store"
)

func getStoreAddress() string {
	addr := os.Getenv("Q_ADDR")
	if addr == "" {
		addr = "postgres://postgres:postgres@postgres:5432/postgres?sslmode=disable"
	}

	return addr
}

func getWebServiceAddress() string {
	addr := os.Getenv("Q_WEB_ADDR")
	if addr == "" {
		addr = "0.0.0.0:20000"
	}

	return addr
}

func main() {
	s := store.NewPostgres(store.PostgresConfig{
		ConnectionString: getStoreAddress(),
	})

	storeWorker := workers.NewStore(s)
	webWorker := workers.NewWeb(getWebServiceAddress())

	configWorker := NewConfigWorker(s)
	runtimeWorker := NewRuntimeWorker(s)
	restApiWorker := NewRestApiWorker()

	storeWorker.Connected.Connect(configWorker.OnStoreConnected)
	storeWorker.Disconnected.Connect(configWorker.OnStoreDisconnected)
	webWorker.Received.Connect(configWorker.OnNewClientMessage)
	restApiWorker.Received.Connect(configWorker.OnNewClientMessage)

	storeWorker.Connected.Connect(runtimeWorker.OnStoreConnected)
	storeWorker.Disconnected.Connect(runtimeWorker.OnStoreDisconnected)
	webWorker.Received.Connect(runtimeWorker.OnNewClientMessage)
	webWorker.ClientConnected.Connect(runtimeWorker.OnClientConnected)
	webWorker.ClientDisconnected.Connect(runtimeWorker.OnClientDisconnected)
	restApiWorker.Received.Connect(runtimeWorker.OnNewClientMessage)
	restApiWorker.ClientConnected.Connect(runtimeWorker.OnClientConnected)
	restApiWorker.ClientDisconnected.Connect(runtimeWorker.OnClientDisconnected)

	a := app.NewApplication("webgateway")
	a.AddWorker(storeWorker)
	a.AddWorker(restApiWorker)
	a.AddWorker(webWorker)
	a.AddWorker(configWorker)
	a.AddWorker(runtimeWorker)
	a.Execute()
}
