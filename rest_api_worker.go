package main

import (
	"net/http"
	"time"

	"github.com/golang/protobuf/jsonpb"
	"github.com/google/uuid"
	qdb "github.com/rqure/qdb/src"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type RestApiWebClient struct {
	Request    *qdb.WebMessage
	ResponseCh chan *qdb.WebMessage
}

func (c *RestApiWebClient) Id() string {
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
	Received qdb.Signal
}

type RestApiWorker struct {
	clientCh chan *RestApiWebClient
	Signals  RestApiWorkerSignals
}

func NewRestApiWorker() *RestApiWorker {
	return &RestApiWorker{
		clientCh: make(chan *RestApiWebClient, 1024),
	}
}

func (w *RestApiWorker) Init() {
	http.Handle("/api", http.HandlerFunc(func(wr http.ResponseWriter, r *http.Request) {
		client := &RestApiWebClient{
			Request:    &qdb.WebMessage{},
			ResponseCh: make(chan *qdb.WebMessage, 1),
		}
		// Parse request and assume it is a WebMessage in JSON form
		err := jsonpb.Unmarshal(r.Body, client.Request)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/api] Failed to parse request: %v", err)
			http.Error(wr, err.Error(), http.StatusBadRequest)
			return
		}

		// Send request to worker thread and wait for response
		w.clientCh <- client
		select {
		case response := <-client.ResponseCh:
			// Send response back to client
			marshaller := &jsonpb.Marshaler{
				EmitDefaults: true,
			}
			s, err := marshaller.MarshalToString(response)
			if err != nil {
				qdb.Error("[RestApiWorker::Init::/api] Failed to marshal response: %v", err)
				http.Error(wr, err.Error(), http.StatusInternalServerError)
				return
			}
			wr.Write([]byte(s))
		case <-time.After(5 * time.Second):
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigDeleteEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigCreateSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigRestoreSnapshotRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityTypesRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntitySchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetEntityRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigSetFieldSchemaRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetRootRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebConfigGetAllFieldsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeDatabaseRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: true,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeRegisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: false,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetNotificationsRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: false,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeUnregisterNotificationRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
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

		marshaller := &jsonpb.Marshaler{
			EmitDefaults: false,
		}
		err = marshaller.Marshal(wr, response)
		if err != nil {
			qdb.Error("[RestApiWorker::Init::/examples/WebRuntimeGetDatabaseConnectionStatusRequest] Failed to marshal response: %v", err)
			http.Error(wr, err.Error(), http.StatusInternalServerError)
			return
		}
	}))
}

func (w *RestApiWorker) Deinit() {

}

func (w *RestApiWorker) DoWork() {
	for {
		select {
		case client := <-w.clientCh:
			w.onRequest(client)
		default:
			return
		}
	}
}

func (w *RestApiWorker) onRequest(client *RestApiWebClient) {
	qdb.Trace("[RestApiWorker::onRequest] Received request from client: %v", client.Request)

	w.Signals.Received.Emit(client, client.Request)
}
