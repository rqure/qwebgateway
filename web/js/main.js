async function main() {
    const app = Vue.createApp({
        data() {
            return {
                serverInteractor: new ServerInteractor(`ws://${window.location.hostname}:20000/ws`),
            }
        }
    });
    registerBackupModalComponent(app);
    registerCreateEntityModalComponent(app);
    registerCreateFieldModalComponent(app);
    registerCreateTypeModalComponent(app);
    registerDeleteEntityModalComponent(app);
    registerModifyTypeModalComponent(app);
    registerRestoreModalComponent(app);
    registerTreeNodeComponent(app);
    app.mount('#desktop');
}