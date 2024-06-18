DATABASE_EVENTS = {
    ENTITY_CREATED: "entity_created",
    ENTITY_DELETED: "entity_deleted",
    FIELD_CREATED: "field_created",
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
                qDebug("[DatabaseInteractor::createField] Response: " + response);
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
                qInfo(`[DatabaseInteractor::createSnapshot] Backup database response ${response.getStatus()}`);
                if (response.getStatus() !== proto.qmq.WebConfigCreateSnapshotResponse.StatusEnum.SUCCESS) {
                    return;
                }
                
                const blob = new Blob([response.getSnapshot().serializeBinary()], {type: "application/octet-stream"});
                me.blobUrl = window.URL.createObjectURL(blob);
            })
            .catch(error => {
                qError(`[backup-modal::onBackupButtonClicked] Failed to backup database: ${error}`);
            });
    }

    async restoreSnapshot() {

    }

    async registerNotification() {

    }

    async unregisterNotification() {

    }
}