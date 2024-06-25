DATABASE_EVENTS = {
    CONNECTED: "connected",
    CREATE_SNAPSHOT: "create_snapshot",
    DISCONNECTED: "disconnected",
    ENTITY_CREATED: "entity_created",
    ENTITY_DELETED: "entity_deleted",
    ENTITY_TYPE_CREATED: "entity_type_created",
    FIELD_CREATED: "field_created",
    NOTIFICATION: "notification",
    QUERY_ALL_ENTITY_TYPES: "query_all_entity_types",
    QUERY_ALL_FIELDS: "query_all_fields",
    QUERY_ENTITY_SCHEMA: "query_entity_schema",
    QUERY_ENTITY: "query_entity",
    QUERY_ROOT_ENTITY_ID: "query_root_entity_id",
    READ_RESULT: "read_result",
    REGISTER_NOTIFICATION_RESPONSE: "register_notification_response",
    RESTORE_SNAPSHOT: "restore_snapshot",
    WRITE_RESULT: "write_result"
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
        return Object.keys(proto.qdb).filter(type => !type.startsWith("Web") && !type.startsWith("Database"));
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
            .send(new proto.qdb.WebRuntimeGetDatabaseConnectionStatusRequest(), proto.qdb.WebRuntimeGetDatabaseConnectionStatusResponse)
            .then(response => {
                if (response.getStatus().getRaw() !== proto.qdb.ConnectionState.ConnectionStateEnum.CONNECTED) {
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
        
        this.processNotifications();

        setTimeout(() => {
            this.mainLoop();
        }, this._mainLoopInterval);
    }

    createEntity(parentId, entityName, entityType) {
        const me = this;
        const request = new proto.qdb.WebConfigCreateEntityRequest();
        request.setParentid(parentId);
        request.setName(entityName);
        request.setType(entityType);

        me._serverInteractor
            .send(request, proto.qdb.WebConfigCreateEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigCreateEntityResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigGetEntityRequest();
        request.setId(entityId);
        this._serverInteractor
            .send(request, proto.qdb.WebConfigGetEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigGetEntityResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigGetEntitySchemaRequest();
        request.setType(entityType);

        this._serverInteractor
            .send(request, proto.qdb.WebConfigGetEntitySchemaResponse)
            .then(response => {
                if(response.getStatus() !== proto.qdb.WebConfigGetEntitySchemaResponse.StatusEnum.SUCCESS) {
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
            .send(new proto.qdb.WebConfigGetAllFieldsRequest(), proto.qdb.WebConfigGetAllFieldsResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ALL_FIELDS, {fields: response.getFieldsList()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryAllFields] Failed to get all fields: ${error}`)
            });
    }

    queryAllEntityTypes() {
        this._serverInteractor
            .send(new proto.qdb.WebConfigGetEntityTypesRequest(), proto.qdb.WebConfigGetEntityTypesResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.QUERY_ALL_ENTITY_TYPES, {entityTypes: response.getTypesList()});
            })
            .catch(error => {
                qError(`[DatabaseInteractor::queryAllEntityTypes] Failed to get all entity types: ${error}`)
            });
    }

    deleteEntity(entityId) {
        const me = this;
        const request = new proto.qdb.WebConfigDeleteEntityRequest();
        request.setId(entityId);

        me._serverInteractor
            .send(request, proto.qdb.WebConfigDeleteEntityResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigDeleteEntityResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigSetEntitySchemaRequest();
        request.setName(entityType);
        request.setFieldsList(entityFields);

        this._serverInteractor
            .send(request, proto.qdb.WebConfigSetEntitySchemaResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigSetEntitySchemaResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigSetFieldSchemaRequest();
        request.setField( fieldName );

        const schema = new proto.qdb.DatabaseFieldSchema();
        schema.setName( fieldName );
        schema.setType( 'qdb.' + fieldType );
        request.setSchema( schema );

        this._serverInteractor.send(request, proto.qdb.WebConfigSetFieldSchemaResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigSetFieldSchemaResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigCreateSnapshotRequest();

        me._serverInteractor
            .send(request, proto.qdb.WebConfigCreateSnapshotResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigCreateSnapshotResponse.StatusEnum.SUCCESS) {
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
        const request = new proto.qdb.WebConfigRestoreSnapshotRequest();
        request.setSnapshot((snapshot));
        me._serverInteractor
            .send(request, proto.qdb.WebConfigRestoreSnapshotResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebConfigRestoreSnapshotResponse.StatusEnum.SUCCESS) {
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
            .send(new proto.qdb.WebConfigGetRootRequest(), proto.qdb.WebConfigGetRootResponse)
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

    processNotifications() {
        this._serverInteractor
            .send(new proto.qdb.WebRuntimeGetNotificationsRequest(), proto.qdb.WebRuntimeGetNotificationsResponse)
            .then(response => {
                response.getNotificationsList().forEach(notification => {
                    this._eventManager.dispatchEvent(DATABASE_EVENTS.NOTIFICATION, {notification: notification});
                });
            })
            .catch(error => {
                qError(`[DatabaseInteractor::processNotifications] Failed to get notifications: ${error}`);
            });
    }

    registerNotifications(nRequests, responseIdentifier) {
        const request = new proto.qdb.WebRuntimeRegisterNotificationRequest();
        request.setRequestsList(nRequests.map(r => {
            const nr = new proto.qdb.DatabaseNotificationConfig();
            if (r.id) {
                nr.setId(r.id);
            }
            if (r.type) {
                nr.setType(r.type);
            }

            nr.setField(r.field);
            nr.setContextfieldsList(r.context || []);
            nr.setNotifyonchange(r.notifyOnChange === true);

            return nr;
        }));

        this._serverInteractor
            .send(request, proto.qdb.WebRuntimeRegisterNotificationResponse)
            .then(response => {
                if (response.getTokensList().length === 0) {
                    qError(`[DatabaseInteractor::registerNotification] Could not complete the request: No tokens returned`);
                    return;
                }

                this._eventManager.dispatchEvent(DATABASE_EVENTS.REGISTER_NOTIFICATION_RESPONSE, {
                    tokens: response.getTokensList().filter(t => t !== ""),
                    responseIdentifier: responseIdentifier
                });
            })
            .catch(error => {
                qError(`[DatabaseInteractor::registerNotification] Failed to register notification: ${error}`);
            });
    }

    unregisterNotifications(tokens) {
        const request = new proto.qdb.WebRuntimeUnregisterNotificationRequest();
        request.setTokensList(tokens);

        this._serverInteractor
            .send(request, proto.qdb.WebRuntimeUnregisterNotificationResponse)
            .then(response => {
                if (response.getStatus() !== proto.qdb.WebRuntimeUnregisterNotificationResponse.StatusEnum.SUCCESS) {
                    qError(`[DatabaseInteractor::unregisterNotification] Could not complete the request: ${response.getStatus()}`);
                    return;
                }
            })
            .catch(error => {
                qError(`[DatabaseInteractor::unregisterNotification] Failed to unregister notification: ${error}`);
            });
    }

    read(dbRequest) {
        const request = new proto.qdb.WebRuntimeDatabaseRequest();
        request.setRequesttype(proto.qdb.WebRuntimeDatabaseRequest.RequestTypeEnum.READ);
        request.setRequestsList(dbRequest.map(r => {
            const dr = new proto.qdb.DatabaseRequest();

            dr.setId(r.id);
            dr.setField(r.field);

            return dr;
        }));

        this._serverInteractor
            .send(request, proto.qdb.WebRuntimeDatabaseResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.READ_RESULT, response.getResponseList());
            })
            .catch(error => {
                qError(`[DatabaseInteractor::read] Failed to read entity: ${error}`);
            }); 
    }

    write(dbRequest) {
        const request = new proto.qdb.WebRuntimeDatabaseRequest();
        request.setRequesttype(proto.qdb.WebRuntimeDatabaseRequest.RequestTypeEnum.WRITE);
        request.setRequestsList(dbRequest.map(r => {
            const dr = new proto.qdb.DatabaseRequest();

            dr.setId(r.id);
            dr.setField(r.field);
            dr.setValue(r.value);

            return dr;
        }));

        this._serverInteractor
            .send(request, proto.qdb.WebRuntimeDatabaseResponse)
            .then(response => {
                this._eventManager.dispatchEvent(DATABASE_EVENTS.WRITE_RESULT, response.getResponseList());
            })
            .catch(error => {
                qError(`[DatabaseInteractor::write] Failed to write entity: ${error}`);
            });
    }
}