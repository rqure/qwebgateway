package main

import (
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	qdb "github.com/rqure/qdb/src"
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
	Request    *qdb.WebMessage
	ResponseCh chan *qdb.WebMessage
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

func (c *RestApiWebClient) Read() *qdb.WebMessage {
	return c.Request
}

func (c *RestApiWebClient) Write(msg *qdb.WebMessage) {
	c.ResponseCh <- msg
}

func (c *RestApiWebClient) Close() {

}

type RestApiWorkerSignals struct {
	ClientConnected    qdb.Signal
	ClientDisconnected qdb.Signal
	Received           qdb.Signal
}

type RestApiWorker struct {
	activeClients map[string]*RestApiWebClientToken
	clientCh      chan *RestApiWebClient
	Signals       RestApiWorkerSignals
}

func NewRestApiWorker() *RestApiWorker {
	return &RestApiWorker{
		activeClients: make(map[string]*RestApiWebClientToken),
		clientCh:      make(chan *RestApiWebClient, 1024),
	}
}

func (w *RestApiWorker) Init() {
	http.HandleFunc("/make-client-id", func(wr http.ResponseWriter, r *http.Request) {
		clientTimeout := DefaultClientTimeout
		clientTimeoutStr := r.URL.Query().Get("clientTimeout")
		if clientTimeoutStr != "" {
			qdb.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", clientTimeoutStr)
			if timeout, err := time.ParseDuration(clientTimeoutStr); err == nil {
				clientTimeout = timeout
			} else {
				qdb.Error("[RestApiWorker::Init::/make-client-id] Invalid clientTimeout: %v", err)
			}
		}

		requestTimeout := DefaultRequestTimeout
		requestTimeoutStr := r.URL.Query().Get("requestTimeout")
		if requestTimeoutStr != "" {
			qdb.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", requestTimeoutStr)
			if timeout, err := time.ParseDuration(requestTimeoutStr); err == nil {
				requestTimeout = timeout
			} else {
				qdb.Error("[RestApiWorker::Init::/make-client-id] Invalid requestTimeout: %v", err)
			}
		}

		response := &ClientIdResponse{
			ClientId: uuid.NewString(),
		}

		client := &RestApiWebClient{
			Request: &qdb.WebMessage{
				Header: &qdb.WebHeader{
					Id:        response.ClientId,
					Timestamp: timestamppb.Now(),
				},
			},
			ResponseCh: make(chan *qdb.WebMessage, 1),
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
				qdb.Error("[RestApiWorker::Init::/make-client-id] Failed to marshal response: %v", err)
				http.Error(wr, err.Error(), http.StatusInternalServerError)
				return
			}
			wr.Write([]byte(s))

			if !timeout.Stop() {
				<-timeout.C
			}
		case <-timeout.C:
			qdb.Error("[RestApiWorker::Init::/make-client-id] Timeout waiting for response")
			http.Error(wr, "Timeout waiting for response", http.StatusInternalServerError)
			return
		}
	})

	http.Handle("/api", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		client := &RestApiWebClient{
			Request:    &qdb.WebMessage{},
			ResponseCh: make(chan *qdb.WebMessage, 1),
		}

		// Parse request and assume it is a WebMessage in JSON form
		if r.Body == nil {
			qdb.Error("[RestApiWorker::Init::/api] Request body is nil")
			http.Error(wr, "Request body is nil", http.StatusBadRequest)
			return
		}

		rBody, err := io.ReadAll(r.Body)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/api] Failed to read request body: %v", err)
			http.Error(wr, err.Error(), http.StatusBadRequest)
			return
		}

		err = jsonpb.Unmarshal(rBody, client.Request)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/api] Failed to parse request: %v", err)
			http.Error(wr, err.Error(), http.StatusBadRequest)
			return
		}

		requestTimeout := DefaultRequestTimeout
		requestTimeoutStr := r.URL.Query().Get("requestTimeout")
		if requestTimeoutStr != "" {
			qdb.Trace("[RestApiWorker::Init::/make-client-id] Received query parameter: %v", requestTimeoutStr)
			if timeout, err := time.ParseDuration(requestTimeoutStr); err == nil {
				requestTimeout = timeout
			} else {
				qdb.Error("[RestApiWorker::Init::/make-client-id] Invalid requestTimeout: %v", err)
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
				qdb.Error("[RestApiWorker::Init::/api] Failed to marshal response: %v", err)
				http.Error(wr, err.Error(), http.StatusInternalServerError)
				return
			}
			wr.Write([]byte(s))

			if !timeout.Stop() {
				<-timeout.C
			}
		case <-timeout.C:
			qdb.Error("[RestApiWorker::Init::/api] Timeout waiting for response")
			http.Error(wr, "Timeout waiting for response", http.StatusInternalServerError)
			return
		}
	}))

	http.Handle("/examples/WebConfigCreateEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigCreateEntityRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigDeleteEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigDeleteEntityRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigDeleteEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigDeleteEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigSetEntitySchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigSetEntitySchemaRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetEntitySchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigCreateSnapshotRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigCreateSnapshotRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateSnapshotRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigRestoreSnapshotRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigRestoreSnapshotRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigRestoreSnapshotRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigRestoreSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntityTypesRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetEntityTypesRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityTypesRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityTypesRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntitySchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetEntitySchemaRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntitySchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetEntityRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetEntityRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetFieldSchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetFieldSchemaRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetFieldSchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigSetFieldSchemaRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigSetFieldSchemaRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetFieldSchemaRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetRootRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetRootRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetRootRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetRootRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebConfigGetAllFieldsRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebConfigGetAllFieldsRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetAllFieldsRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetAllFieldsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeDatabaseRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebRuntimeDatabaseRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeDatabaseRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeDatabaseRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeRegisterNotificationRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebRuntimeRegisterNotificationRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeRegisterNotificationRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeRegisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeGetNotificationsRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebRuntimeGetNotificationsRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetNotificationsRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetNotificationsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeUnregisterNotificationRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebRuntimeUnregisterNotificationRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeUnregisterNotificationRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeUnregisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		wr.Write([]byte(s))
	}))

	http.Handle("/examples/WebRuntimeGetDatabaseConnectionStatusRequest", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		payload, err := anypb.New(&qdb.WebRuntimeGetDatabaseConnectionStatusRequest{})

		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetDatabaseConnectionStatusRequest] Failed to create payload: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}

		response := &qdb.WebMessage{
			Payload: payload,
			Header: &qdb.WebHeader{
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
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetDatabaseConnectionStatusRequest] Failed to marshal response: %v", err)
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
			w.Signals.ClientDisconnected.Emit(clientId)
		}
	}

	for {
		select {
		case client := <-w.clientCh:
			if client.Token != nil {
				qdb.Info("[RestApiWorker::DoWork] New client connected: %v", client.Id())
				w.activeClients[client.Id()] = client.Token
				w.Signals.ClientConnected.Emit(client)
				client.Request.Header.AuthenticationStatus = qdb.WebHeader_AUTHENTICATED
				client.Write(client.Request)
			} else if token, ok := w.activeClients[client.Id()]; ok {
				token.ExpireAt = time.Now().Add(token.Timeout)
				client.Request.Header.AuthenticationStatus = qdb.WebHeader_AUTHENTICATED
				w.onRequest(client)
			} else {
				if client.Request == nil {
					client.Request = &qdb.WebMessage{}
				}

				if client.Request.Header == nil {
					client.Request.Header = &qdb.WebHeader{}
				}

				client.Request.Header.AuthenticationStatus = qdb.WebHeader_UNAUTHENTICATED
				client.Request.Payload = nil
				client.Write(client.Request)
			}
		default:
			return
		}
	}
}

func (w *RestApiWorker) onRequest(client *RestApiWebClient) {
	qdb.Trace("[RestApiWorker::onRequest] Received request from client: %v", client.Request)

	w.Signals.Received.Emit(client, client.Request)
}
