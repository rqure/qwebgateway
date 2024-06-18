async function main() {
    const app = Vue.createApp({});
    
    const context = {
        qDatabaseInteractor: new DatabaseInteractor()
    };

    registerBackupModalComponent(app, context);
    registerCreateEntityModalComponent(app, context);
    registerCreateFieldModalComponent(app, context);
    registerCreateTypeModalComponent(app, context);
    registerDeleteEntityModalComponent(app, context);
    registerRestoreModalComponent(app, context);
    registerTreeNodeComponent(app, context);

    app.mount('#desktop');

    context.qDatabaseInteractor.runInBackground(true);
}