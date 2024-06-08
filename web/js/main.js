async function main() {
    const app = Vue.createApp({});
    registerCreateEntityModalComponent(app);
    registerCreateTypeModalComponent(app);
    registerDeleteEntityModalComponent(app);
    registerModifyTypeModalComponent(app);
    registerTreeNodeComponent(app);
    app.mount('#desktop');
}

main()