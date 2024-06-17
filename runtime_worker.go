package main

import (
	qmq "github.com/rqure/qmq/src"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type RuntimeWorker struct {
	db                qmq.IDatabase
	dbConnectionState qmq.ConnectionState_ConnectionStateEnum

	clientIdToClient    map[string]qmq.IWebClient
	clientSubscriptions map[string]map[string][]*qmq.DatabaseNotification
}

func NewRuntimeWorker(db qmq.IDatabase) *RuntimeWorker {
	return &RuntimeWorker{
		db:                  db,
		dbConnectionState:   qmq.ConnectionState_DISCONNECTED,
		clientIdToClient:    make(map[string]qmq.IWebClient),
		clientSubscriptions: make(map[string]map[string][]*qmq.DatabaseNotification),
	}
}

func (w *RuntimeWorker) Init() {

}

func (w *RuntimeWorker) Deinit() {

}

func (w *RuntimeWorker) DoWork() {

}

func (w *RuntimeWorker) OnClientConnected(args ...interface{}) {
	client := args[0].(qmq.IWebClient)
	w.clientIdToClient[client.Id()] = client
	w.clientSubscriptions[client.Id()] = make(map[string][]*qmq.DatabaseNotification)
}

func (w *RuntimeWorker) OnClientDisconnected(args ...interface{}) {
	clientId := args[0].(string)
	delete(w.clientIdToClient, clientId)
	delete(w.clientSubscriptions, clientId)
}

func (w *RuntimeWorker) OnNewClientMessage(args ...interface{}) {
	client := args[0].(qmq.IWebClient)
	msg := args[1].(*qmq.WebMessage)

	if msg.Payload.MessageIs(&qmq.WebRuntimeDatabaseRequest{}) {
		w.onRuntimeDatabaseRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebRuntimeRegisterNotificationRequest{}) {
		w.onRuntimeRegisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebRuntimeUnregisterNotificationRequest{}) {
		w.onRuntimeUnregisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebRuntimeGetNotificationsRequest{}) {
		w.onRuntimeGetNotificationsRequest(client, msg)
	}
}

func (w *RuntimeWorker) OnDatabaseConnected() {
	w.dbConnectionState = qmq.ConnectionState_CONNECTED
}

func (w *RuntimeWorker) OnDatabaseDisconnected() {
	w.dbConnectionState = qmq.ConnectionState_DISCONNECTED
}

func (w *RuntimeWorker) onProcessNotifications(notification *qmq.DatabaseNotification) {
	for clientId := range w.clientSubscriptions {
		if w.clientSubscriptions[clientId][notification.Token] != nil {
			w.clientSubscriptions[clientId][notification.Token] = append(w.clientSubscriptions[clientId][notification.Token], notification)
		}
	}
}

func (w *RuntimeWorker) onRuntimeDatabaseRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebRuntimeDatabaseRequest)
	response := new(qmq.WebRuntimeDatabaseResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Database is not connected.", request)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.RequestType == qmq.WebRuntimeDatabaseRequest_READ {
		qmq.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Read request: %v", request.Requests)
		w.db.Read(request.Requests)
	} else if request.RequestType == qmq.WebRuntimeDatabaseRequest_WRITE {
		qmq.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Write request: %v", request.Requests)
		w.db.Write(request.Requests)
	} else {
		qmq.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Unknown request type.", request)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}
