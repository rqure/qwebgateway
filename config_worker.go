package main

import (
	"unicode"

	qmq "github.com/rqure/qmq/src"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ConfigWorker struct {
	db                qmq.IDatabase
	dbConnectionState qmq.ConnectionState_ConnectionStateEnum
}

func NewConfigWorker(db qmq.IDatabase) *ConfigWorker {
	return &ConfigWorker{
		db:                db,
		dbConnectionState: qmq.ConnectionState_DISCONNECTED,
	}
}

func (w *ConfigWorker) Init() {

}

func (w *ConfigWorker) Deinit() {

}

func (w *ConfigWorker) DoWork() {

}

func (w *ConfigWorker) OnNewClientMessage(args ...interface{}) {
	client := args[0].(qmq.IWebClient)
	msg := args[1].(*qmq.WebMessage)

	if msg.Payload.MessageIs(&qmq.WebConfigCreateEntityRequest{}) {
		w.onConfigCreateEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigDeleteEntityRequest{}) {
		w.onConfigDeleteEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigGetEntityRequest{}) {
		w.onConfigGetEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigSetFieldSchemaRequest{}) {
		w.onConfigSetFieldSchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigGetFieldSchemaRequest{}) {
		w.onConfigGetFieldSchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigGetEntityTypesRequest{}) {
		w.onConfigGetEntityTypesRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigGetEntitySchemaRequest{}) {
		w.onConfigGetEntitySchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigSetEntitySchemaRequest{}) {
		w.onConfigSetEntitySchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigCreateSnapshotRequest{}) {
		w.onConfigCreateSnapshotRequest(client, msg)
	} else if msg.Payload.MessageIs(&qmq.WebConfigRestoreSnapshotRequest{}) {
		w.onConfigRestoreSnapshotRequest(client, msg)
	} else {
		qmq.Error("[ConfigWorker::OnNewClientMessage] Could not handle client message. Unknown message type: %v", msg.Payload)
	}
}

func (w *ConfigWorker) onConfigCreateEntityRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigCreateEntityRequest)
	response := new(qmq.WebConfigCreateEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigCreateEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qmq.Info("[ConfigWorker::onConfigCreateEntityRequest] Created entity: %v", request)
	w.db.CreateEntity(request.Type, request.ParentId, request.Name)

	response.Status = qmq.WebConfigCreateEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigDeleteEntityRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigDeleteEntityRequest)
	response := new(qmq.WebConfigDeleteEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigDeleteEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qmq.Info("[ConfigWorker::onConfigDeleteEntityRequest] Deleted entity: %v", request)
	w.db.DeleteEntity(request.Id)

	response.Status = qmq.WebConfigDeleteEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntityRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigGetEntityRequest)
	response := new(qmq.WebConfigGetEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	entity := w.db.GetEntity(request.Id)
	if entity == nil {
		qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not get entity")
		response.Status = qmq.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Entity = entity
	response.Status = qmq.WebConfigGetEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigSetFieldSchemaRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigSetFieldSchemaRequest)
	response := new(qmq.WebConfigSetFieldSchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Schema == nil {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Schema is nil.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if _, err := protoregistry.GlobalTypes.FindMessageByName(protoreflect.FullName(request.Schema.Type)); err != nil {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Schema type does not exist.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Field == "" {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field is empty.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	// Check if field is alphanumeric
	isAlphanumeric := func(field string) bool {
		for _, char := range field {
			if !unicode.IsLetter(char) && !unicode.IsNumber(char) {
				return false
			}
		}
		return true
	}

	if !isAlphanumeric(request.Field) {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field is not alphanumeric.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Schema.Name != request.Field {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field and schema type do not match.", request)
		response.Status = qmq.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qmq.Info("[ConfigWorker::onConfigSetFieldSchemaRequest] Set field schema: %v", request)
	w.db.SetFieldSchema(request.Field, request.Schema)

	response.Status = qmq.WebConfigSetFieldSchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetFieldSchemaRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigGetFieldSchemaRequest)
	response := new(qmq.WebConfigGetFieldSchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigGetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	schema := w.db.GetFieldSchema(request.Field)
	if schema == nil {
		qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not get field schema")
		response.Status = qmq.WebConfigGetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Schema = schema
	response.Status = qmq.WebConfigGetFieldSchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntityTypesRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigGetEntityTypesRequest)
	response := new(qmq.WebConfigGetEntityTypesResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntityTypesRequest] Could not unmarshal request: %v", err)
		return
	}

	types := w.db.GetEntityTypes()

	response.Types = types
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntityTypesRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntitySchemaRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigGetEntitySchemaRequest)
	response := new(qmq.WebConfigGetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	schema := w.db.GetEntitySchema(request.Type)
	if schema == nil {
		qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not get entity schema")
		response.Status = qmq.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Schema = schema
	response.Status = qmq.WebConfigGetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigSetEntitySchemaRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigSetEntitySchemaRequest)
	response := new(qmq.WebConfigSetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	// Check if entityType is alphanumeric
	isAlphanumeric := func(entityType string) bool {
		for _, char := range entityType {
			if !unicode.IsLetter(char) && !unicode.IsNumber(char) {
				return false
			}
		}
		return true
	}

	if !isAlphanumeric(request.Name) {
		qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Entity type is not alphanumeric.", request)
		response.Status = qmq.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	for _, field := range request.Fields {
		if w.db.GetFieldSchema(field) == nil {
			qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Field schema does not exist.", request)
			response.Status = qmq.WebConfigSetEntitySchemaResponse_FAILURE
			msg.Header.Timestamp = timestamppb.Now()
			if err := msg.Payload.MarshalFrom(response); err != nil {
				qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
				return
			}

			client.Write(msg)
			return
		}
	}

	qmq.Info("[ConfigWorker::onConfigSetEntitySchemaRequest] Set entity schema: %v", request)
	w.db.SetEntitySchema(request.Name, &qmq.DatabaseEntitySchema{
		Name:   request.Name,
		Fields: request.Fields,
	})

	response.Status = qmq.WebConfigSetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
		return
	}
	client.Write(msg)
}

func (w *ConfigWorker) onConfigCreateSnapshotRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigCreateSnapshotRequest)
	response := new(qmq.WebConfigCreateSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigCreateSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qmq.Info("[ConfigWorker::onConfigCreateSnapshotRequest] Created snapshot: %v", request)
	snapshot := w.db.CreateSnapshot()

	response.Snapshot = snapshot
	response.Status = qmq.WebConfigCreateSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigRestoreSnapshotRequest(client qmq.IWebClient, msg *qmq.WebMessage) {
	request := new(qmq.WebConfigRestoreSnapshotRequest)
	response := new(qmq.WebConfigRestoreSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qmq.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qmq.ConnectionState_CONNECTED {
		qmq.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qmq.WebConfigRestoreSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qmq.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qmq.Info("[ConfigWorker::onConfigRestoreSnapshotRequest] Restored snapshot: %v", request)
	w.db.RestoreSnapshot(request.Snapshot)

	response.Status = qmq.WebConfigRestoreSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qmq.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) OnDatabaseConnected() {
	w.dbConnectionState = qmq.ConnectionState_CONNECTED
}

func (w *ConfigWorker) OnDatabaseDisconnected() {
	w.dbConnectionState = qmq.ConnectionState_DISCONNECTED
}
