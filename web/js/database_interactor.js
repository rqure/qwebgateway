DATABASE_EVENTS = {
    CONNECTED: "connected",
    DISCONNECTED: "disconnected",
    ENTITY_CREATED: "entity_created",
    ENTITY_DELETED: "entity_deleted",
    FIELD_CREATED: "field_created",
    ENTITY_TYPE_CREATED: "entity_type_created",
    QUERY_ALL_FIELDS: "query_all_fields",
    QUERY_ALL_ENTITY_TYPES: "query_all_entity_types",
    QUERY_ENTITY_SCHEMA: "query_entity_schema",
    QUERY_ENTITY: "query_entity",
    QUERY_ROOT_ENTITY_ID: "query_root_entity_id",
    CREATE_SNAPSHOT: "create_snapshot",
    RESTORE_SNAPSHOT: "restore_snapshot",
    NOTIFICATION: "notification",
    READ_RESULT: "read_result"
}

class DatabaseEventListener {
    constructor(eventName, callback) {
        this._eventName = eventName;
        this._callback = callback;
    }

    getEventName() {
        return this._eventName;
    }

    getCallback() {
        return this._callback;
    }

    invokeCallback(eventData) {
        this._callback(eventData);
    }
}

class DatabaseEventManager {
    constructor() {
        this._listeners = {};
    }

    addEventListener(eventName, callback) {
        if (!this._listeners[eventName]) {
            this._listeners[eventName] = [];
        }

        this._listeners[eventName].push(new DatabaseEventListener(eventName, callback));

        return this;
    }

    removeEventListener(eventName, callback) {
        if (!this._listeners[eventName]) {
            return;
        }

        this._listeners[eventName] = this._listeners[eventName].filter(listener => listener.callback !== callback);
    }

    dispatchEvent(eventName, eventData) {
        if (!this._listeners[eventName]) {
            return;
        }

        this._listeners[eventName].forEach(listener => listener.invokeCallback(eventData));
    }

}

class DatabaseInteractor {
    constructor() {
        this._serverInteractor = new ServerInteractor(`${location.protocol == "https:" ? "wss:" : "ws:"}//${location.hostname}${location.port == "" ? "" : ":" + location.port}/ws`);
        this._eventManager = new DatabaseEventManager();
        this._runInBackground = false;
        this._mainLoopInterval = 500;
        this._isConnected = null;
    }

    isConnected() {
        return this._isConnected;
    }

    getServerInteractor() {
        return this._serverInteractor;
    }

    getEventManager() {
        return this._eventManager;
    }

    getAvailableFieldTypes() {
        return Object.keys(proto.qmq).filter(type => !type.startsWith("Web") && !type.startsWith("Database"));
    }

    setMainLoopInterval(interval) {
        this._mainLoopInterval = interval
    }

    runInBackground(runInBackground) {
        this._runInBackground = runInBackground;

        this.mainLoop();
    }

    mainLoop() {
        if (!this._runInBackground) {
            return;
        }

        if (!this._serverInteractor.isConnected()) {
            this._serverInteractor.connect();

            setTimeout(() => {
                this.mainLoop();
            }, this._mainLoopInterval);

            return;
        }

        this._serverInteractor
            .send(new proto.qmq.WebRuntimeGetDatabaseConnectionStatusRequest(), proto.qmq.WebRuntimeGetDatabaseConnectionStatusResponse)
            .then(response => {
                if (response.getStatus().getRaw() !== proto.qmq.ConnectionState.ConnectionStateEnum.CONNECTED) {
                    if(this._isConnected !== false) {
                        this._isConnected = false;
                        this._eventManager.dispatchEvent(DATABASE_EVENTS.DISCONNECTED, {});
                    }
                } else {
                    if(this._isConnected !== true) {
                        this._isConnected = true;
                        this._eventManager.dispatchEvent(DATABASE_EVENTS.CONNECTED, {});
                    }
                }
            })
            .catch(error => {
                qError(`[DatabaseInteractor::mainLoop] Failed to get database connection status: ${error}`);
            });

        setTimeout(() => {
            this.mainLoop();
        }, this._mainLoopInterval);
    }

    createEntity(parentId, entityName, entityType) {
        const me = this;
        const request = new proto.qmq.WebConfigCreateEntityRequest();
        request.setParentid(parentId);
        request.setName(entityName);
        request.setType(entityType);

        me._serverInteractor
            .send(request, proto.qmq.WebConfigCreateEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigCreateEntityResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::createEntity] Could not complete the request: ${response.getStatus()}`);
                    return;
                }
                
                me._eventManager.dispatchEvent(DATABASE_EVENTS.ENTITY_CREATED, {entityName: entityName, entityType: entityType, parentId: parentId});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::createEntity] Failed to create entity: ${error}`)
            })
    }

    queryEntity(entityId) {
        const request = new proto.qmq.WebConfigGetEntityRequest();
        request.setId(entityId);
        this._serverInteractor
            .send(request, proto.qmq.WebConfigGetEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigGetEntityResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::queryEntity] Could not complete the request: ${response.getStatus()}`);
                    return;
                }
                
                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ENTITY, {entity: response.getEntity()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryEntity] Failed to get entity: ${error}`)
            });
    }

    queryEntitySchema(entityType) {
        const request = new proto.qmq.WebConfigGetEntitySchemaRequest();
        request.setType(entityType);

        this._serverInteractor
            .send(request, proto.qmq.WebConfigGetEntitySchemaResponse)
            .then(response => {
                if(response.getStatus() !== proto.qmq.WebConfigGetEntitySchemaResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::queryEntitySchema] Failed to get entity schema: ${response.getStatus()}`);
                    return;
                }

                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ENTITY_SCHEMA, {schema: response.getSchema()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryEntitySchema] Failed to get entity schema: ${error}`)
            });
    }

    queryAllFields() {
        this._serverInteractor
            .send(new proto.qmq.WebConfigGetAllFieldsRequest(), proto.qmq.WebConfigGetAllFieldsResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ALL_FIELDS, {fields: response.getFieldsList()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryAllFields] Failed to get all fields: ${error}`)
            });
    }

    queryAllEntityTypes() {
        this._serverInteractor
            .send(new proto.qmq.WebConfigGetEntityTypesRequest(), proto.qmq.WebConfigGetEntityTypesResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ALL_ENTITY_TYPES, {entityTypes: response.getTypesList()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryAllEntityTypes] Failed to get all entity types: ${error}`)
            });
    }

    deleteEntity(entityId) {
        const me = this;
        const request = new proto.qmq.WebConfigDeleteEntityRequest();
        request.setId(entityId);

        me._serverInteractor
            .send(request, proto.qmq.WebConfigDeleteEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigDeleteEntityResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::deleteEntity] Could not complete the request: ${response.getStatus()}`);
                    return;
                }

                me._eventManager.dispatchEvent(DATABASE_EVENTS.ENTITY_DELETED, {entityId: entityId});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::deleteEntity] Failed to delete entity: ${error}`);
            });
    }

    createOrUpdateEntityType(entityType, entityFields) {
        const request = new proto.qmq.WebConfigSetEntitySchemaRequest();
        request.setName(entityType);
        request.setFieldsList(entityFields);

        this._serverInteractor
            .send(request, proto.qmq.WebConfigSetEntitySchemaResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigSetEntitySchemaResponse.StatusEnum.SUCCESS) {
                    qError("[DatabaseInteractor::createOrUpdateEntityType] Could not complete the request: " + response.getStatus());
                    return;
                }
                this._eventManager.dispatchEvent(DATABASE_EVENTS.ENTITY_TYPE_CREATED, {entityType: entityType, entityFields: entityFields});
            })
            .catch(error => {
                qError("[DatabaseInteractor::createOrUpdateEntityType] Could not complete the request: " + error)
            });
    }

    createField(fieldName, fieldType) {
        const request = new proto.qmq.WebConfigSetFieldSchemaRequest();
        request.setField( fieldName );

        const schema = new proto.qmq.DatabaseFieldSchema();
        schema.setName( fieldName );
        schema.setType( 'qmq.' + fieldType );
        request.setSchema( schema );

        this._serverInteractor.send(request, proto.qmq.WebConfigSetFieldSchemaResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigSetFieldSchemaResponse.StatusEnum.SUCCESS) {
                    qError("[DatabaseInteractor::createField] Could not complete the request: " + response.getStatus());
                    return;
                }
                this._eventManager.dispatchEvent(DATABASE_EVENTS.FIELD_CREATED, {fieldName: fieldName, fieldType: fieldType});
            })
            .catch(error => {
                qError("[DatabaseInteractor::createField] Could not complete the request: " + error)
            });
    }

    createSnapshot() {
        const me = this;
        const request = new proto.qmq.WebConfigCreateSnapshotRequest();

        me._serverInteractor
            .send(request, proto.qmq.WebConfigCreateSnapshotResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigCreateSnapshotResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::createSnapshot] Could not complete the request: ${response.getStatus()}`);
                    return;
                }
                
                me._eventManager.dispatchEvent(DATABASE_EVENTS.CREATE_SNAPSHOT, {snapshot: response.getSnapshot()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::createSnapshot] Failed to backup database: ${error}`);
            });
    }

    restoreSnapshot(snapshot) {
        const me = this;
        const request = new proto.qmq.WebConfigRestoreSnapshotRequest();
        request.setSnapshot((snapshot));
        me._serverInteractor
            .send(request, proto.qmq.WebConfigRestoreSnapshotResponse)
            .then(response => {
                if (response.getStatus() !== proto.qmq.WebConfigRestoreSnapshotResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::restoreSnapshot] Could not complete the request: ${response.getStatus()}`);
                    return;
                }

                me._eventManager.dispatchEvent(DATABASE_EVENTS.RESTORE_SNAPSHOT, {});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::restoreSnapshot] Failed to restore database: ${error}`);
            });
    }

    queryRootEntityId() {
        this._serverInteractor
            .send(new proto.qmq.WebConfigGetRootRequest(), proto.qmq.WebConfigGetRootResponse)
            .then(response => {
                if (response.getRootid() === "") {
                    qError("[DatabaseInteractor::getRootEntity] Could not complete the request: Root ID is empty");
                    return;
                }

                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ROOT_ENTITY_ID, {rootId: response.getRootid()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::getRootEntity] Failed to get root entity: ${error}`);
            });
    }

    registerNotification() {

    }

    unregisterNotification() {

    }

    read(dbRequest) {
        const request = new proto.qmq.WebRuntimeDatabaseRequest();
        request.setRequesttype(proto.qmq.WebRuntimeDatabaseRequest.RequestTypeEnum.READ);
        request.setRequestsList(dbRequest.map(r => {
            const dr = new proto.qmq.DatabaseRequest();

            dr.setId(r.id);
            dr.setField(r.field);

            return dr;
        }));

        this._serverInteractor
            .send(request, proto.qmq.WebRuntimeDatabaseResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.READ_RESULT, response.getResponseList());
            })
            .catch(error => {
                qError(`[DatabaseInteractor::read] Failed to read entity: ${error}`);
            }); 
    }
}