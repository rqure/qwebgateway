async function main() {
    const app = Vue.createApp({});
    
    const context = {
        qDatabaseInteractor: new DatabaseInteractor(),
        selectedNode: Vue.reactive({
            entityId: "",
            entityName: "",
            entityType: "",
            entitySchema: null,
            entityFields: {},
            notificationTokens: [],
        })
    };

    registerBackupModalComponent(app, context);
    registerCreateEntityModalComponent(app, context);
    registerCreateFieldModalComponent(app, context);
    registerCreateTypeModalComponent(app, context);
    registerDeleteEntityModalComponent(app, context);
    registerRestoreModalComponent(app, context);
    registerTreeNodeComponent(app, context);
    registerEntityViewerComponent(app, context);

    app.mount('#desktop');

    context.qDatabaseInteractor.runInBackground(true);

    CURRENT_LOG_LEVEL=LOG_LEVELS.DEBUG;
}