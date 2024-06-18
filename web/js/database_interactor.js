DATABASE_EVENTS = {
    CONNECTED: "connected",
    DISCONNECTED: "disconnected",
    ENTITY_CREATED: "entity_created",
    ENTITY_DELETED: "entity_deleted",
    FIELD_CREATED: "field_created",
    ENTITY_TYPE_CREATED: "entity_type_created",
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

    get eventName() {
        return this._eventName;
    }

    get callback() {
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
        this._serverInteractor.connect();
        this._eventManager = new DatabaseEventManager();
    }

    get serverInteractor() {
        return this._serverInteractor;
    }

    get eventManager() {
        return this._eventManager;
    }

    availableFieldTypes() {
        return Object.keys(proto.qmq).filter(type => !type.startsWith("Web"));
    }

    async createEntity() {

    }

    async getEntity() {

    }

    async setEntity() {

    }

    async deleteEntity() {

    }

    async createField(fieldName, fieldType) {
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

    async createSnapshot() {
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

    async restoreSnapshot() {
        const me = this;
        const request = new proto.qmq.WebConfigRestoreSnapshotRequest();
        request.setSnapshot((me.snapshot));
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

    async registerNotification() {

    }

    async unregisterNotification() {

    }
}