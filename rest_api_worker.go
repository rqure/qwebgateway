package main

import (
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	qdb "github.com/rqure/qdb/src"
	"github.com/rqure/qlib/pkg/log"
	"github.com/rqure/qlib/pkg/protobufs"
	"github.com/rqure/qlib/pkg/signalslots"
	"github.com/rqure/qlib/pkg/signalslots/signal"
	web "github.com/rqure/qlib/pkg/web/go"
	jsonpb "google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const DefaultClientTimeout = 5 * time.Second
const DefaultRequestTimeout = 5 * time.Second

type ClientIdResponse struct {
	ClientId string
}

type RestApiWebClient struct {
	Request    web.Message
	ResponseCh chan web.Message
	Token      *RestApiWebClientToken
}

type RestApiWebClientToken struct {
	ClientId string
	Timeout  time.Duration
	ExpireAt time.Time
}

func (c *RestApiWebClient) Id() string {
	if c.Request == nil || c.Request.Header == nil {
		return ""
	}

	return c.Request.Header.Id
}

func (c *RestApiWebClient) Read() web.Message {
	return c.Request
}

func (c *RestApiWebClient) Write(msg web.Message) {
	c.ResponseCh <- msg
}

func (c *RestApiWebClient) Close() {

}

type RestApiWorker struct {
	ClientConnected    signalslots.Signal
	ClientDisconnected signalslots.Signal
	Received           signalslots.Signal

	activeClients map[string]*RestApiWebClientToken
	clientCh      chan *RestApiWebClient
}

func NewRestApiWorker() *RestApiWorker {
	return &RestApiWorker{
		activeClients:      make(map[string]*RestApiWebClientToken),
		clientCh:           make(chan *RestApiWebClient, 1024),
		ClientConnected:    signal.NewSignal(),
		ClientDisconnected: signal.NewSignal(),
		Received:           signal.NewSignal(),
	}
}

func (w *RestApiWorker) Init() {
	http.HandleFunc("/make-client-id", func(wr http.ResponseWriter, r *http.Request) {
		clientTimeout := DefaultClientTimeout
		clientTimeoutStr := r.URL.Query().Get("clientTimeout")
		if clientTimeoutStr != "" {
			log.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", clientTimeoutStr)
			if timeout, err := time.ParseDuration(clientTimeoutStr); err == nil {
				clientTimeout = timeout
			} else {
				log.Error("[RestApiWorker::Init::/make-client-id] Invalid clientTimeout: %v", err)
			}
		}

		requestTimeout := DefaultRequestTimeout
		requestTimeoutStr := r.URL.Query().Get("requestTimeout")
		if requestTimeoutStr != "" {
			log.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", requestTimeoutStr)
			if timeout, err := time.ParseDuration(requestTimeoutStr); err == nil {
				requestTimeout = timeout
			} else {
				log.Error("[RestApiWorker::Init::/make-client-id] Invalid requestTimeout: %v", err)
			}
		}

		response := &ClientIdResponse{
			ClientId: uuid.NewString(),
		}

		client := &RestApiWebClient{
			Request: &protobufs.WebMessage{
				Header: &protobufs.WebHeader{
					Id:        response.ClientId,
					Timestamp: timestamppb.Now(),
				},
			},
			ResponseCh: make(chan web.Message, 1),
			Token: &RestApiWebClientToken{
				ClientId: response.ClientId,
				Timeout:  clientTimeout,
				ExpireAt: time.Now().Add(clientTimeout),
			},
		}

		timeout := time.NewTimer(requestTimeout)
		w.clientCh <- client
		select {
		case response := <-client.ResponseCh:
			// Send response back to client
			marshaller := &jsonpb.MarshalOptions{
				EmitUnpopulated:   true,
				EmitDefaultValues: true,
			}
			s, err := marshaller.Marshal(response)
			if err != nil {
				log.Error("[RestApiWorker::Init::/make-client-id] Failed to marshal response: %v", err)
				http.Error(wr, err.Error(), http.StatusInternalServerError)
				return
			}
			wr.Write([]byte(s))

			if !timeout.Stop() {
				<-timeout.C
			}
		case <-timeout.C:
			log.Error("[RestApiWorker::Init::/make-client-id] Timeout waiting for response")
			http.Error(wr, "Timeout waiting for response", http.StatusInternalServerError)
			return
		}
	})

	http.Handle("/api", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		client := &RestApiWebClient{
			Request:    &protobufs.WebMessage{},
			ResponseCh: make(chan web.Message, 1),
		}

		// Parse request and assume it is a WebMessage in JSON form
		if r.Body == nil {
			log.Error("[RestApiWorker::Init::/api] Request body is nil")
			http.Error(wr, "Request body is nil", http.StatusBadRequest)
			return
		}

		rBody, err := io.ReadAll(r.Body)
		if err != nil {
			log.Error("[RestApiWorker::Init::/api] Failed to read request body: %v", err)
			http.Error(wr, err.Error(), http.StatusBadRequest)
			return
		}

		err = jsonpb.Unmarshal(rBody, client.Request)
		if err != nil {
			log.Error("[RestApiWorker::Init::/api] Failed to parse request: %v", err)
			http.Error(wr, err.Error(), http.StatusBadRequest)
			return
		}

		requestTimeout := DefaultRequestTimeout
		requestTimeoutStr := r.URL.Query().Get("requestTimeout")
		if requestTimeoutStr != "" {
			log.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", requestTimeoutStr)
			if timeout, err := time.ParseDuration(requestTimeoutStr); err == nil {
				requestTimeout = timeout
			} else {
				log.Error("[RestApiWorker::Init::/make-client-id] Invalid requestTimeout: %v", err)
			}
		}

		// Send request to worker thread and wait for response
		timeout := time.NewTimer(requestTimeout)
		w.clientCh <- client
		select {
		case response := <-client.ResponseCh:
			// Send response back to client
			marshaller := &jsonpb.MarshalOptions{
				EmitUnpopulated:   true,
				EmitDefaultValues: true,
			}
			s, err := marshaller.Marshal(response)
			if err != nil {
				log.Error("[RestApiWorker::Init::/api] Failed to marshal response: %v", err)
				http.Error(wr, err.Error(), http.StatusInternalServerError)
				return
			}
			wr.Write([]byte(s))

			if !timeout.Stop() {
				<-timeout.C
			}
		case <-timeout.C:
			log.Error("[RestApiWorker::Init::/api] Timeout waiting for response")
			http.Error(wr, "Timeout waiting for response", http.StatusInternalServerError)
			return
		}
	}))

	http.Handle("/examples/WebConfigCreateEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigCreateEntityRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigCreateEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigCreateEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigDeleteEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigDeleteEntityRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigDeleteEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigDeleteEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigSetEntitySchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigSetEntitySchemaRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigSetEntitySchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigSetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigCreateSnapshotRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigCreateSnapshotRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigCreateSnapshotRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigCreateSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigRestoreSnapshotRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigRestoreSnapshotRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigRestoreSnapshotRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigRestoreSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntityTypesRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetEntityTypesRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityTypesRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityTypesRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntitySchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetEntitySchemaRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntitySchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetEntityRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetFieldSchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetFieldSchemaRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetFieldSchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigSetFieldSchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigSetFieldSchemaRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigSetFieldSchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigSetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetRootRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetRootRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetRootRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetRootRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetAllFieldsRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebConfigGetAllFieldsRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetAllFieldsRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebConfigGetAllFieldsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeDatabaseRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebRuntimeDatabaseRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeDatabaseRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeDatabaseRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeRegisterNotificationRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebRuntimeRegisterNotificationRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeRegisterNotificationRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeRegisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeGetNotificationsRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebRuntimeGetNotificationsRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeGetNotificationsRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Timestamp: timestamppb.Now(),
				Id:        uuid.NewString(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeGetNotificationsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeUnregisterNotificationRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebRuntimeUnregisterNotificationRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeUnregisterNotificationRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Header: &protobufs.WebHeader{
				Id:        uuid.NewString(),
				Timestamp: timestamppb.Now(),
			},
			Payload: payload,
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeUnregisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeGetDatabaseConnectionStatusRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&protobufs.WebRuntimeGetDatabaseConnectionStatusRequest{})

		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeGetDatabaseConnectionStatusRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &protobufs.WebMessage{
			Payload: payload,
			Header: &protobufs.WebHeader{
				Id:        uuid.NewString(),
				Timestamp: timestamppb.Now(),
			},
		}

		marshaller := &jsonpb.MarshalOptions{
			EmitUnpopulated:   true,
			EmitDefaultValues: true,
		}
		s, err := marshaller.Marshal(response)
		if err != nil {
			log.Error("[RestApiWorker::Init::/examples/WebRuntimeGetDatabaseConnectionStatusRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))
}

func (w *RestApiWorker) Deinit() {

}

func (w *RestApiWorker) DoWork() {
	for clientId, token := range w.activeClients {
		if time.Since(token.ExpireAt) > 0 {
			qdb.Info("[RestApiWorker::DoWork] Client '%v' has been inactive for %v, disconnecting", clientId, token.Timeout)
			delete(w.activeClients, clientId)
			w.ClientDisconnected.Emit(clientId)
		}
	}

	for {
		select {
		case client := <-w.clientCh:
			if client.Token != nil {
				qdb.Info("[RestApiWorker::DoWork] New client connected: %v", client.Id())
				w.activeClients[client.Id()] = client.Token
				w.ClientConnected.Emit(client)
				client.Request.Header.AuthenticationStatus = protobufs.WebHeader_AUTHENTICATED
				client.Write(client.Request)
			} else if token, ok := w.activeClients[client.Id()]; ok {
				token.ExpireAt = time.Now().Add(token.Timeout)
				client.Request.Header.AuthenticationStatus = protobufs.WebHeader_AUTHENTICATED
				w.onRequest(client)
			} else {
				if client.Request == nil {
					client.Request = &protobufs.WebMessage{}
				}

				if client.Request.Header == nil {
					client.Request.Header = &protobufs.WebHeader{}
				}

				client.Request.Header.AuthenticationStatus = protobufs.WebHeader_UNAUTHENTICATED
				client.Request.Payload = nil
				client.Write(client.Request)
			}
		default:
			return
		}
	}
}

func (w *RestApiWorker) onRequest(client *RestApiWebClient) {
	log.Trace("[RestApiWorker::onRequest] Received request from client: %v", client.Request)

	w.Received.Emit(client, client.Request)
}
