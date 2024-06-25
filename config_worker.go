package main

import (
	"unicode"

	qdb "github.com/rqure/qdb/src"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ConfigWorker struct {
	db                qdb.IDatabase
	dbConnectionState qdb.ConnectionState_ConnectionStateEnum
}

func NewConfigWorker(db qdb.IDatabase) *ConfigWorker {
	return &ConfigWorker{
		db:                db,
		dbConnectionState: qdb.ConnectionState_DISCONNECTED,
	}
}

func (w *ConfigWorker) Init() {

}

func (w *ConfigWorker) Deinit() {

}

func (w *ConfigWorker) DoWork() {

}

func (w *ConfigWorker) TriggerSchemaUpdate() {
	root := w.db.FindEntities("Root")

	for _, id := range root {
		request := &qdb.DatabaseRequest{
			Id:    id,
			Field: "SchemaUpdateTrigger",
		}

		w.db.Read([]*qdb.DatabaseRequest{request})

		if request.Success {
			w.db.Write([]*qdb.DatabaseRequest{request})
		}
	}
}

func (w *ConfigWorker) OnNewClientMessage(args ...interface{}) {
	client := args[0].(qdb.IWebClient)
	msg := args[1].(*qdb.WebMessage)

	if msg.Payload.MessageIs(&qdb.WebConfigCreateEntityRequest{}) {
		w.onConfigCreateEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigDeleteEntityRequest{}) {
		w.onConfigDeleteEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetEntityRequest{}) {
		w.onConfigGetEntityRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigSetFieldSchemaRequest{}) {
		w.onConfigSetFieldSchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetFieldSchemaRequest{}) {
		w.onConfigGetFieldSchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetEntityTypesRequest{}) {
		w.onConfigGetEntityTypesRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetEntitySchemaRequest{}) {
		w.onConfigGetEntitySchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigSetEntitySchemaRequest{}) {
		w.onConfigSetEntitySchemaRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigCreateSnapshotRequest{}) {
		w.onConfigCreateSnapshotRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigRestoreSnapshotRequest{}) {
		w.onConfigRestoreSnapshotRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetAllFieldsRequest{}) {
		w.onConfigGetAllFieldsRequest(client, msg)
	} else if msg.Payload.MessageIs(&qdb.WebConfigGetRootRequest{}) {
		w.onConfigGetRootRequest(client, msg)
	}
}

func (w *ConfigWorker) onConfigCreateEntityRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigCreateEntityRequest)
	response := new(qdb.WebConfigCreateEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigCreateEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qdb.Info("[ConfigWorker::onConfigCreateEntityRequest] Created entity: %v", request)
	w.db.CreateEntity(request.Type, request.ParentId, request.Name)

	response.Status = qdb.WebConfigCreateEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigCreateEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate()
}

func (w *ConfigWorker) onConfigDeleteEntityRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigDeleteEntityRequest)
	response := new(qdb.WebConfigDeleteEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigDeleteEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qdb.Info("[ConfigWorker::onConfigDeleteEntityRequest] Deleted entity: %v", request)
	w.db.DeleteEntity(request.Id)

	response.Status = qdb.WebConfigDeleteEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigDeleteEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate()
}

func (w *ConfigWorker) onConfigGetEntityRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetEntityRequest)
	response := new(qdb.WebConfigGetEntityResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	entity := w.db.GetEntity(request.Id)
	if entity == nil {
		qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not get entity")
		response.Status = qdb.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Entity = entity
	response.Status = qdb.WebConfigGetEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntityRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigSetFieldSchemaRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigSetFieldSchemaRequest)
	response := new(qdb.WebConfigSetFieldSchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Schema == nil {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Schema is nil.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if _, err := protoregistry.GlobalTypes.FindMessageByName(protoreflect.FullName(request.Schema.Type)); err != nil {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Schema type does not exist.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Field == "" {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field is empty.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
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
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field is not alphanumeric.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	if request.Schema.Name != request.Field {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not handle request %v. Field and schema type do not match.", request)
		response.Status = qdb.WebConfigSetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qdb.Info("[ConfigWorker::onConfigSetFieldSchemaRequest] Set field schema: %v", request)
	w.db.SetFieldSchema(request.Field, request.Schema)

	response.Status = qdb.WebConfigSetFieldSchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigSetFieldSchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate()
}

func (w *ConfigWorker) onConfigGetFieldSchemaRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetFieldSchemaRequest)
	response := new(qdb.WebConfigGetFieldSchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigGetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	schema := w.db.GetFieldSchema(request.Field)
	if schema == nil {
		qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not get field schema")
		response.Status = qdb.WebConfigGetFieldSchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Schema = schema
	response.Status = qdb.WebConfigGetFieldSchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetFieldSchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntityTypesRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetEntityTypesRequest)
	response := new(qdb.WebConfigGetEntityTypesResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntityTypesRequest] Could not unmarshal request: %v", err)
		return
	}

	types := w.db.GetEntityTypes()

	response.Types = types
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntityTypesRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntitySchemaRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetEntitySchemaRequest)
	response := new(qdb.WebConfigGetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	schema := w.db.GetEntitySchema(request.Type)
	if schema == nil {
		qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not get entity schema")
		response.Status = qdb.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	response.Schema = schema
	response.Status = qdb.WebConfigGetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetEntitySchemaRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigSetEntitySchemaRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigSetEntitySchemaRequest)
	response := new(qdb.WebConfigSetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
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
		qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Entity type is not alphanumeric.", request)
		response.Status = qdb.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	for _, field := range request.Fields {
		if w.db.GetFieldSchema(field) == nil {
			qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not handle request %v. Field schema does not exist.", request)
			response.Status = qdb.WebConfigSetEntitySchemaResponse_FAILURE
			msg.Header.Timestamp = timestamppb.Now()
			if err := msg.Payload.MarshalFrom(response); err != nil {
				qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
				return
			}

			client.Write(msg)
			return
		}
	}

	qdb.Info("[ConfigWorker::onConfigSetEntitySchemaRequest] Set entity schema: %v", request)
	w.db.SetEntitySchema(request.Name, &qdb.DatabaseEntitySchema{
		Name:   request.Name,
		Fields: request.Fields,
	})

	response.Status = qdb.WebConfigSetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigSetEntitySchemaRequest] Could not marshal response: %v", err)
		return
	}
	client.Write(msg)
	w.TriggerSchemaUpdate()
}

func (w *ConfigWorker) onConfigCreateSnapshotRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigCreateSnapshotRequest)
	response := new(qdb.WebConfigCreateSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigCreateSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qdb.Info("[ConfigWorker::onConfigCreateSnapshotRequest] Created snapshot: %v", request)
	snapshot := w.db.CreateSnapshot()

	response.Snapshot = snapshot
	response.Status = qdb.WebConfigCreateSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigCreateSnapshotRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigRestoreSnapshotRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigRestoreSnapshotRequest)
	response := new(qdb.WebConfigRestoreSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not handle request %v. Database is not connected.", request)
		response.Status = qdb.WebConfigRestoreSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	qdb.Info("[ConfigWorker::onConfigRestoreSnapshotRequest] Restored snapshot: %v", request)
	w.db.RestoreSnapshot(request.Snapshot)

	response.Status = qdb.WebConfigRestoreSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigRestoreSnapshotRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate()
}

func (w *ConfigWorker) onConfigGetAllFieldsRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetAllFieldsRequest)
	response := new(qdb.WebConfigGetAllFieldsResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetAllFieldsRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigGetAllFieldsRequest] Could not handle request %v. Database is not connected.", request)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetAllFieldsRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	fields := w.db.GetFieldSchemas()

	for _, field := range fields {
		response.Fields = append(response.Fields, field.Name)
	}

	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetAllFieldsRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetRootRequest(client qdb.IWebClient, msg *qdb.WebMessage) {
	request := new(qdb.WebConfigGetRootRequest)
	response := new(qdb.WebConfigGetRootResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetRootRequest] Could not unmarshal request: %v", err)
		return
	}

	if w.dbConnectionState != qdb.ConnectionState_CONNECTED {
		qdb.Error("[ConfigWorker::onConfigGetRootRequest] Could not handle request %v. Database is not connected.", request)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			qdb.Error("[ConfigWorker::onConfigGetRootRequest] Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	root := w.db.FindEntities("Root")

	for _, id := range root {
		response.RootId = id
	}
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		qdb.Error("[ConfigWorker::onConfigGetRootRequest] Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) OnDatabaseConnected() {
	w.dbConnectionState = qdb.ConnectionState_CONNECTED
}

func (w *ConfigWorker) OnDatabaseDisconnected() {
	w.dbConnectionState = qdb.ConnectionState_DISCONNECTED
}
