package main

import (
	"os"

	"github.com/rqure/qlib/pkg/app"
	"github.com/rqure/qlib/pkg/app/workers"
	"github.com/rqure/qlib/pkg/data/store"
)

func getDatabaseAddress() string {
	addr := os.Getenv("Q_ADDR")
	if addr == "" {
		addr = "redis:6379"
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
	s := store.NewRedis(store.RedisConfig{
		Address: getDatabaseAddress(),
	})

	storeWorker := workers.NewStore(s)
	webWorker := workers.NewWeb(getWebServiceAddress())
	leadershipWorker := workers.NewLeadership(s)

	configWorker := NewConfigWorker(s)
	runtimeWorker := NewRuntimeWorker(s)
	restApiWorker := NewRestApiWorker()

	storeWorker.Connected.Connect(leadershipWorker.OnStoreConnected)
	storeWorker.Disconnected.Connect(leadershipWorker.OnStoreDisconnected)

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
	a.AddWorker(leadershipWorker)
	a.AddWorker(restApiWorker)
	a.AddWorker(webWorker)
	a.AddWorker(configWorker)
	a.AddWorker(runtimeWorker)
	a.Execute()
}
