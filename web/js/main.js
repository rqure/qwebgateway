async function main() {
    const app = Vue.createApp({});
    NewTreeNode(app);
    app.mount('#desktop');
}

main()