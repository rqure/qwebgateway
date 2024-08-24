package main

import (
	qdb "github.com/rqure/qdb/src"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type RuntimeWorker struct {
	db                qdb.IDatabase
	dbConnectionState qdb.ConnectionState_ConnectionStateEnum

	clientNotificationQueue  map[string]map[string][]*qdb.DatabaseNotification
	clientNotificationTokens map[string]map[string]qdb.INotificationToken
}

func NewRuntimeWorker(db qdb.IDatabase) *RuntimeWorker {
	return &RuntimeWorker{
		db:                       db,
		dbConnectionState:        qdb.ConnectionState_DISCONNECTED,
		clientNotificationQueue:  make(map[string]map[string][]*qdb.DatabaseNotification),
		clientNotificationTokens: make(map[string]map[string]qdb.INotificationToken),
	}
}

func (w *RuntimeWorker) Init() {

}

func (w *RuntimeWorker) Deinit() {

}

func (w *RuntimeWorker) DoWork() {

}

func (w *RuntimeWorker) OnClientConnected(args ...interface{}) {
	client := args[0].(qdb.IWebClient)
	w.clientNotificationQueue[client.Id()] = make(map[string][]*qdb.DatabaseNotification)
	w.clientNotificationTokens[client.Id()] = make(map[string]qdb.INotificationToken)
}

func (w *RuntimeWorker) OnClientDisconnected(args ...interface{}) {
	clientId := args[0].(string)

	for _, token := range w.clientNotificationTokens[clientId] {
		token.Unbind()
	}

	delete(w.clientNotificationQueue, clientId)
	delete(w.clientNotificationTokens, clientId)
}

func (w *RuntimeWorker) OnNewClientMessage(args ...interface{}) {
	client := args[0].(qdb.IWebClient)
	msg := args[1].(*qdb.WebMessage)

	if msg.Payload.MessageIs(&qdb.WebRuntimeDatabaseRequest{}) {
		w.onRuntimeDatabaseRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebRuntimeRegisterNotificationRequest{}) {
		w.onRuntimeRegisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebRuntimeUnregisterNotificationRequest{}) {
		w.onRuntimeUnregisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebRuntimeGetNotificationsRequest{}) {
		w.onRuntimeGetNotificationsRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebRuntimeGetDatabaseConnectionStatusRequest{}) {
		w.onRuntimeGetDatabaseConnectionStatusRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebRuntimeGetEntitiesRequest{}) {
		w.onRuntimeGetEntitiesRequest(client, msg)
	}
}

func (w *RuntimeWorker) OnDatabaseConnected() {
	w.dbConnectionState = qdb.ConnectionState_CONNECTED
}

func (w *RuntimeWorker) OnDatabaseDisconnected() {
	w.dbConnectionState = qdb.ConnectionState_DISCONNECTED
}

func (w *RuntimeWorker) onProcessNotifications(notification *qdb.DatabaseNotification) {
	for clientId := range w.clientNotificationQueue {
		if w.clientNotificationQueue[clientId][notification.Token] != nil {
			w.clientNotificationQueue[clientId][notification.Token] = append(w.clientNotificationQueue[clientId][notification.Token], notification)
		}
	}
}

func (w *RuntimeWorker) onRuntimeDatabaseRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeDatabaseRequest)
	response := new(qdb.WebRuntimeDatabaseResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Database is not connected.", request)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.RequestType == qdb.WebRuntimeDatabaseRequest_READ {
		qdb.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Read request: %v", request.Requests)
		w.db.Read(request.Requests)
		response.Response = request.Requests
	} else if request.RequestType == qdb.WebRuntimeDatabaseRequest_WRITE {
		qdb.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Write request: %v", request.Requests)
		w.db.Write(request.Requests)
		response.Response = request.Requests
	} else {
		qdb.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Unknown request type.", request)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeRegisterNotificationRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeRegisterNotificationRequest)
	response := new(qdb.WebRuntimeRegisterNotificationResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Could not unmarshal request: %v", err)
		return
	}

	for _, request := range request.Requests {
		token := w.db.Notify(request, qdb.NewNotificationCallback(w.onProcessNotifications))

		if w.clientNotificationTokens[client.Id()][token.Id()] != nil {
			w.clientNotificationTokens[client.Id()][token.Id()].Unbind()
			w.clientNotificationTokens[client.Id()][token.Id()] = token
		}

		if w.clientNotificationQueue[client.Id()][token.Id()] == nil {
			w.clientNotificationQueue[client.Id()][token.Id()] = make([]*qdb.DatabaseNotification, 0)
		}

		qdb.Info("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Registered notification: %v for client %s", token, client.Id())

		response.Tokens = append(response.Tokens, token.Id())
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeUnregisterNotificationRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeUnregisterNotificationRequest)
	response := new(qdb.WebRuntimeUnregisterNotificationResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Could not unmarshal request: %v", err)
		return
	}

	for _, token := range request.Tokens {
		w.db.Unnotify(token)

		if w.clientNotificationQueue[client.Id()][token] != nil {
			delete(w.clientNotificationQueue[client.Id()], token)
		}

		qdb.Info("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Unregistered notification: %v for client %s", token, client.Id())
	}

	response.Status = qdb.WebRuntimeUnregisterNotificationResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetNotificationsRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeGetNotificationsRequest)
	response := new(qdb.WebRuntimeGetNotificationsResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetNotificationsRequest] Could not unmarshal request: %v", err)
		return
	}

	for token, notifications := range w.clientNotificationQueue[client.Id()] {
		response.Notifications = append(response.Notifications, notifications...)
		w.clientNotificationQueue[client.Id()][token] = make([]*qdb.DatabaseNotification, 0)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetNotificationsRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetDatabaseConnectionStatusRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeGetDatabaseConnectionStatusRequest)
	response := new(qdb.WebRuntimeGetDatabaseConnectionStatusResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetDatabaseConnectionStatusRequest] Could not unmarshal request: %v", err)
		return
	}

	response.Status = &qdb.ConnectionState{Raw: w.dbConnectionState}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetDatabaseConnectionStatusRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetEntitiesRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebRuntimeGetEntitiesRequest)
	response := new(qdb.WebRuntimeGetEntitiesResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetEntitiesRequest] Could not unmarshal request: %v", err)
		return
	}

	entities := qdb.NewEntityFinder(w.db).Find(qdb.SearchCriteria{
		EntityType: request.EntityType,
	})

	for _, entity := range entities {
		response.Entities = append(response.Entities, &qdb.DatabaseEntity{
			Id:       entity.GetId(),
			Type:     entity.GetType(),
			Name:     entity.GetName(),
			Parent:   entity.GetParent(),
			Children: entity.GetChildren(),
		})
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[RuntimeWorker::onRuntimeGetEntitiesRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}
