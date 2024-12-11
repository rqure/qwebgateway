package main

import (
	"github.com/rqure/qlib/pkg/app"
	"github.com/rqure/qlib/pkg/data"
	"github.com/rqure/qlib/pkg/data/entity"
	"github.com/rqure/qlib/pkg/data/notification"
	"github.com/rqure/qlib/pkg/data/query"
	"github.com/rqure/qlib/pkg/data/request"
	"github.com/rqure/qlib/pkg/log"
	"github.com/rqure/qlib/pkg/protobufs"
	web "github.com/rqure/qlib/pkg/web/go"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type RuntimeWorker struct {
	store            data.Store
	isStoreConnected bool

	clientNotificationQueue  map[string]map[string][]data.Notification
	clientNotificationTokens map[string]map[string]data.NotificationToken
}

func NewRuntimeWorker(store data.Store) *RuntimeWorker {
	return &RuntimeWorker{
		store:                    store,
		isStoreConnected:         false,
		clientNotificationQueue:  make(map[string]map[string][]data.Notification),
		clientNotificationTokens: make(map[string]map[string]data.NotificationToken),
	}
}

func (w *RuntimeWorker) Init(app.Handle) {

}

func (w *RuntimeWorker) Deinit() {

}

func (w *RuntimeWorker) DoWork() {

}

func (w *RuntimeWorker) OnClientConnected(args ...interface{}) {
	client := args[0].(web.Client)
	w.clientNotificationQueue[client.Id()] = make(map[string][]data.Notification)
	w.clientNotificationTokens[client.Id()] = make(map[string]data.NotificationToken)
}

func (w *RuntimeWorker) OnClientDisconnected(args ...interface{}) {
	clientId := args[0].(string)

	for _, token := range w.clientNotificationTokens[clientId] {
		log.Info("[RuntimeWorker::OnClientDisconnected] Unbinding notification token: %v", token)
		token.Unbind()
	}

	delete(w.clientNotificationQueue, clientId)
	delete(w.clientNotificationTokens, clientId)
}

func (w *RuntimeWorker) OnNewClientMessage(args ...interface{}) {
	client := args[0].(web.Client)
	msg := args[1].(web.Message)

	if msg.Payload.MessageIs(&protobufs.WebRuntimeDatabaseRequest{}) {
		w.onRuntimeDatabaseRequest(client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebRuntimeRegisterNotificationRequest{}) {
		w.onRuntimeRegisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebRuntimeUnregisterNotificationRequest{}) {
		w.onRuntimeUnregisterNotificationRequest(client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebRuntimeGetNotificationsRequest{}) {
		w.onRuntimeGetNotificationsRequest(client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebRuntimeGetDatabaseConnectionStatusRequest{}) {
		w.onRuntimeGetDatabaseConnectionStatusRequest(client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebRuntimeGetEntitiesRequest{}) {
		w.onRuntimeGetEntitiesRequest(client, msg)
	}
}

func (w *RuntimeWorker) OnStoreConnected() {
	w.isStoreConnected = true
}

func (w *RuntimeWorker) OnStoreDisconnected() {
	w.isStoreConnected = false
}

func (w *RuntimeWorker) onRuntimeDatabaseRequest(client web.Client, msg web.Message) {
	req := new(protobufs.WebRuntimeDatabaseRequest)
	rsp := new(protobufs.WebRuntimeDatabaseResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Database is not connected.", req)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	reqs := []data.Request{}
	for _, r := range req.Requests {
		reqs = append(reqs, request.FromPb(r))
	}

	if req.RequestType == protobufs.WebRuntimeDatabaseRequest_READ {
		log.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Read request: %v", req.Requests)
		w.store.Read(reqs...)
		rsp.Response = req.Requests
	} else if req.RequestType == protobufs.WebRuntimeDatabaseRequest_WRITE {
		log.Info("[RuntimeWorker::onRuntimeDatabaseRequest] Write request: %v", req.Requests)
		w.store.Write(reqs...)
		rsp.Response = req.Requests
	} else {
		log.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not handle request %v. Unknown request type.", req)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("[RuntimeWorker::onRuntimeDatabaseRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeRegisterNotificationRequest(client web.Client, msg web.Message) {
	req := new(protobufs.WebRuntimeRegisterNotificationRequest)
	rsp := new(protobufs.WebRuntimeRegisterNotificationResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Could not unmarshal request: %v", err)
		return
	}

	for _, cfg := range req.Requests {
		token := w.store.Notify(notification.FromConfigPb(cfg), notification.NewCallback(func(n data.Notification) {
			if w.clientNotificationQueue[client.Id()][n.GetToken()] != nil {
				w.clientNotificationQueue[client.Id()][n.GetToken()] = append(w.clientNotificationQueue[client.Id()][n.GetToken()], n)
			}
		}))

		if w.clientNotificationTokens[client.Id()][token.Id()] != nil {
			w.clientNotificationTokens[client.Id()][token.Id()].Unbind()
		}
		w.clientNotificationTokens[client.Id()][token.Id()] = token

		if w.clientNotificationQueue[client.Id()][token.Id()] == nil {
			w.clientNotificationQueue[client.Id()][token.Id()] = make([]data.Notification, 0)
		}

		log.Info("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Registered notification token '%v' for client %s", token.Id(), client.Id())

		rsp.Tokens = append(rsp.Tokens, token.Id())
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("[RuntimeWorker::onRuntimeRegisterNotificationRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeUnregisterNotificationRequest(client web.Client, msg web.Message) {
	request := new(protobufs.WebRuntimeUnregisterNotificationRequest)
	response := new(protobufs.WebRuntimeUnregisterNotificationResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		log.Error("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Could not unmarshal request: %v", err)
		return
	}

	for _, token := range request.Tokens {
		if w.clientNotificationTokens[client.Id()][token] != nil {
			w.clientNotificationTokens[client.Id()][token].Unbind()
			delete(w.clientNotificationTokens[client.Id()], token)
		}

		if w.clientNotificationQueue[client.Id()][token] != nil {
			delete(w.clientNotificationQueue[client.Id()], token)
		}

		log.Info("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Unregistered notification: %v for client %s", token, client.Id())
	}

	response.Status = protobufs.WebRuntimeUnregisterNotificationResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		log.Error("[RuntimeWorker::onRuntimeUnregisterNotificationRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetNotificationsRequest(client web.Client, msg web.Message) {
	req := new(protobufs.WebRuntimeGetNotificationsRequest)
	rsp := new(protobufs.WebRuntimeGetNotificationsResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetNotificationsRequest] Could not unmarshal request: %v", err)
		return
	}

	for tok, ntfs := range w.clientNotificationQueue[client.Id()] {
		for _, n := range ntfs {
			rsp.Notifications = append(rsp.Notifications, notification.ToPb(n))
		}
		w.clientNotificationQueue[client.Id()][tok] = make([]data.Notification, 0)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetNotificationsRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetDatabaseConnectionStatusRequest(client web.Client, msg web.Message) {
	req := new(protobufs.WebRuntimeGetDatabaseConnectionStatusRequest)
	rsp := new(protobufs.WebRuntimeGetDatabaseConnectionStatusResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetDatabaseConnectionStatusRequest] Could not unmarshal request: %v", err)
		return
	}

	rsp.Connected = w.isStoreConnected

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetDatabaseConnectionStatusRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *RuntimeWorker) onRuntimeGetEntitiesRequest(client web.Client, msg web.Message) {
	req := new(protobufs.WebRuntimeGetEntitiesRequest)
	rsp := new(protobufs.WebRuntimeGetEntitiesResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetEntitiesRequest] Could not unmarshal request: %v", err)
		return
	}

	entities := query.New(w.store).ForType(req.EntityType).Execute()

	for _, ent := range entities {
		rsp.Entities = append(rsp.Entities, entity.ToEntityPb(ent))
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("[RuntimeWorker::onRuntimeGetEntitiesRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}
