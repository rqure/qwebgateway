const qEntityStore = new QEntityStore();

async function main() {
    const createDefaultNode = () => ({
        entityId: "",
        entityName: "",
        entityType: "",
        entitySchema: null,
        entityFields: {},
        notificationTokens: []
    });

    const treeStore = Vue.reactive({
        selectedNode: createDefaultNode(),
        nodes: new Map(), // Cache for all tree nodes
        registerNode(id, node) {
            this.nodes.set(id, node);
        },
        unregisterNode(id) {
            this.nodes.delete(id);
        },
        getNode(id) {
            return this.nodes.get(id);
        },
        clearSelection() {
            const oldId = this.selectedNode.entityId;
            Object.assign(this.selectedNode, createDefaultNode());
            return oldId;
        },
        selectNode(node) {
            // If selecting the same node, just update name/type in case they changed
            if (this.selectedNode.entityId === node.id) {
                this.selectedNode.entityName = node.name;
                this.selectedNode.entityType = node.type;
                return;
            }
            
            const oldId = this.clearSelection();
            if (oldId && oldId !== node.id) {
                const oldNode = this.getNode(oldId);
                if (oldNode) oldNode.selected = false;
            }
            
            Object.assign(this.selectedNode, {
                entityId: node.id,
                entityName: node.name,
                entityType: node.type
            });
            
            const newNode = this.getNode(node.id);
            if (newNode) newNode.selected = true;
        }
    });

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
        treeStore,
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

    qEntityStore.runInBackground(true);

    Q_CURRENT_LOG_LEVEL=Q_LOG_LEVELS.DEBUG;

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