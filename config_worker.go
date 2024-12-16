package main

import (
	"context"
	"unicode"

	"github.com/rqure/qlib/pkg/app"
	"github.com/rqure/qlib/pkg/data"
	"github.com/rqure/qlib/pkg/data/entity"
	"github.com/rqure/qlib/pkg/data/query"
	"github.com/rqure/qlib/pkg/data/snapshot"
	"github.com/rqure/qlib/pkg/log"
	"github.com/rqure/qlib/pkg/protobufs"
	web "github.com/rqure/qlib/pkg/web/go"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ConfigWorker struct {
	store            data.Store
	isStoreConnected bool
}

func NewConfigWorker(store data.Store) *ConfigWorker {
	return &ConfigWorker{
		store:            store,
		isStoreConnected: false,
	}
}

func (w *ConfigWorker) Init(context.Context, app.Handle) {

}

func (w *ConfigWorker) Deinit(context.Context) {

}

func (w *ConfigWorker) DoWork(context.Context) {

}

func (w *ConfigWorker) TriggerSchemaUpdate(ctx context.Context) {
	for _, root := range query.New(w.store).ForType("Root").Execute(ctx) {
		root.GetField("SchemaUpdateTrigger").WriteInt(ctx, 0)
	}
}

func (w *ConfigWorker) OnNewClientMessage(ctx context.Context, args ...interface{}) {
	client := args[0].(web.Client)
	msg := args[1].(web.Message)

	if msg.Payload.MessageIs(&protobufs.WebConfigCreateEntityRequest{}) {
		w.onConfigCreateEntityRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigDeleteEntityRequest{}) {
		w.onConfigDeleteEntityRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigGetEntityRequest{}) {
		w.onConfigGetEntityRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigGetEntityTypesRequest{}) {
		w.onConfigGetEntityTypesRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigGetEntitySchemaRequest{}) {
		w.onConfigGetEntitySchemaRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigSetEntitySchemaRequest{}) {
		w.onConfigSetEntitySchemaRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigCreateSnapshotRequest{}) {
		w.onConfigCreateSnapshotRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigRestoreSnapshotRequest{}) {
		w.onConfigRestoreSnapshotRequest(ctx, client, msg)
	} else if msg.Payload.MessageIs(&protobufs.WebConfigGetRootRequest{}) {
		w.onConfigGetRootRequest(ctx, client, msg)
	}
}

func (w *ConfigWorker) onConfigCreateEntityRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigCreateEntityRequest)
	rsp := new(protobufs.WebConfigCreateEntityResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigCreateEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	log.Info("Created entity: %v", req)
	w.store.CreateEntity(ctx, req.Type, req.ParentId, req.Name)

	rsp.Status = protobufs.WebConfigCreateEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate(ctx)
}

func (w *ConfigWorker) onConfigDeleteEntityRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigDeleteEntityRequest)
	rsp := new(protobufs.WebConfigDeleteEntityResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigDeleteEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	log.Info("Deleted entity: %v", req)
	w.store.DeleteEntity(ctx, req.Id)

	rsp.Status = protobufs.WebConfigDeleteEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate(ctx)
}

func (w *ConfigWorker) onConfigGetEntityRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigGetEntityRequest)
	rsp := new(protobufs.WebConfigGetEntityResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	ent := w.store.GetEntity(ctx, req.Id)
	if ent == nil {
		log.Error("Could not get entity")
		rsp.Status = protobufs.WebConfigGetEntityResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	rsp.Entity = entity.ToEntityPb(ent)
	rsp.Status = protobufs.WebConfigGetEntityResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntityTypesRequest(ctx context.Context, client web.Client, msg web.Message) {
	request := new(protobufs.WebConfigGetEntityTypesRequest)
	response := new(protobufs.WebConfigGetEntityTypesResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	types := w.store.GetEntityTypes(ctx)

	response.Types = types
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigGetEntitySchemaRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigGetEntitySchemaRequest)
	rsp := new(protobufs.WebConfigGetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	sch := w.store.GetEntitySchema(ctx, req.Type)
	if sch == nil {
		log.Error("Could not get entity schema")
		rsp.Status = protobufs.WebConfigGetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	rsp.Schema = entity.ToSchemaPb(sch)
	rsp.Status = protobufs.WebConfigGetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigSetEntitySchemaRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigSetEntitySchemaRequest)
	rsp := new(protobufs.WebConfigSetEntitySchemaResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
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

	if !isAlphanumeric(req.Schema.Name) {
		log.Error("Could not handle request %v. Entity type is not alphanumeric.", req)
		rsp.Status = protobufs.WebConfigSetEntitySchemaResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	log.Info("Set entity schema: %v", req)
	sch := entity.FromSchemaPb(req.Schema)
	w.store.SetEntitySchema(ctx, sch)

	rsp.Status = protobufs.WebConfigSetEntitySchemaResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}
	client.Write(msg)
	w.TriggerSchemaUpdate(ctx)
}

func (w *ConfigWorker) onConfigCreateSnapshotRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigCreateSnapshotRequest)
	rsp := new(protobufs.WebConfigCreateSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigCreateSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	log.Info("Created snapshot: %v", req)
	ss := w.store.CreateSnapshot(ctx)

	rsp.Snapshot = snapshot.ToPb(ss)
	rsp.Status = protobufs.WebConfigCreateSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) onConfigRestoreSnapshotRequest(ctx context.Context, client web.Client, msg web.Message) {
	req := new(protobufs.WebConfigRestoreSnapshotRequest)
	rsp := new(protobufs.WebConfigRestoreSnapshotResponse)

	if err := msg.Payload.UnmarshalTo(req); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", req)
		rsp.Status = protobufs.WebConfigRestoreSnapshotResponse_FAILURE
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(rsp); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	log.Info("Restored snapshot: %v", req)
	w.store.RestoreSnapshot(ctx, snapshot.FromPb(req.Snapshot))

	rsp.Status = protobufs.WebConfigRestoreSnapshotResponse_SUCCESS
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(rsp); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
	w.TriggerSchemaUpdate(ctx)
}

func (w *ConfigWorker) onConfigGetRootRequest(ctx context.Context, client web.Client, msg web.Message) {
	request := new(protobufs.WebConfigGetRootRequest)
	response := new(protobufs.WebConfigGetRootResponse)

	if err := msg.Payload.UnmarshalTo(request); err != nil {
		log.Error("Could not unmarshal request: %v", err)
		return
	}

	if !w.isStoreConnected {
		log.Error("Could not handle request %v. Database is not connected.", request)
		msg.Header.Timestamp = timestamppb.Now()
		if err := msg.Payload.MarshalFrom(response); err != nil {
			log.Error("Could not marshal response: %v", err)
			return
		}

		client.Write(msg)
		return
	}

	root := w.store.FindEntities(ctx, "Root")

	for _, id := range root {
		response.RootId = id
	}
	msg.Header.Timestamp = timestamppb.Now()
	if err := msg.Payload.MarshalFrom(response); err != nil {
		log.Error("Could not marshal response: %v", err)
		return
	}

	client.Write(msg)
}

func (w *ConfigWorker) OnStoreConnected(context.Context) {
	w.isStoreConnected = true
}

func (w *ConfigWorker) OnStoreDisconnected() {
	w.isStoreConnected = true
}
