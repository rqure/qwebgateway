async function main() {
    const app = Vue.createApp({});
    
    const context = {
        qConfigServerInteractor: new ServerInteractor(`${location.protocol == "https:" ? "wss:" : "ws:"}//${window.location.hostname}:20000/ws`)
    };

    context.qConfigServerInteractor.connect();

    registerBackupModalComponent(app, context);
    registerCreateEntityModalComponent(app, context);
    registerCreateFieldModalComponent(app, context);
    registerCreateTypeModalComponent(app, context);
    registerDeleteEntityModalComponent(app, context);
    registerRestoreModalComponent(app, context);
    registerTreeNodeComponent(app, context);

    app.mount('#desktop');
}