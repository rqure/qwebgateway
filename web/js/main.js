async function main() {
    const app = Vue.createApp({
        data() {
            return {
                isDarkTheme: window.matchMedia('(prefers-color-scheme: dark)').matches
            }
        },
        methods: {
            toggleTheme() {
                this.isDarkTheme = !this.isDarkTheme;
                document.documentElement.setAttribute('data-bs-theme', this.isDarkTheme ? 'dark' : 'light');
            }
        },
        mounted() {
            document.documentElement.setAttribute('data-bs-theme', this.isDarkTheme ? 'dark' : 'light');
        }
    });
    
    const context = {
        qDatabaseInteractor: new DatabaseInteractor(),
        selectedNode: Vue.reactive({
            entityId: "",
            entityName: "",
            entityType: "",
            entitySchema: null,
            entityFields: {},
            notificationTokens: [],
        }),
        contextMenuManager: Vue.reactive({
            instance: null,
            show: (event, node) => {
                if (context.contextMenuManager.instance) {
                    context.contextMenuManager.instance.show(event, node);
                }
            }
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
    registerTreeContextMenuComponent(app, context);

    app.mount('#desktop');

    context.qDatabaseInteractor.runInBackground(true);

    CURRENT_LOG_LEVEL=LOG_LEVELS.DEBUG;

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    new bootstrap.Modal(document.getElementById('create-entity-modal')).show();
                    break;
                case 't':
                    e.preventDefault();
                    new bootstrap.Modal(document.getElementById('create-type-modal')).show();
                    break;
                case 'b':
                    e.preventDefault();
                    new bootstrap.Modal(document.getElementById('backup-modal')).show();
                    break;
                case 'r':
                    e.preventDefault();
                    new bootstrap.Modal(document.getElementById('restore-modal')).show();
                    break;
            }
        }
    });
}