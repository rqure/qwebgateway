async function main() {
    const app = Vue.createApp({});
    registerBackupModalComponent(app);
    registerCreateEntityModalComponent(app);
    registerCreateTypeModalComponent(app);
    registerDeleteEntityModalComponent(app);
    registerModifyTypeModalComponent(app);
    registerRestoreModalComponent(app);
    registerTreeNodeComponent(app);
    app.mount('#desktop');
}

main()