function registerEntityViewerComponent(app, context) {
    return app.component("entity-viewer", {
        template: `
<div v-if="selectedNode.entityId.length" class="container-fluid border border-secondary rounded fill-v">
    <div class="row mt-3 mb-3">
        <label class="col-sm-2 col-form-label">Type</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityType">
        </div>
    </div>
    <div class="row mb-3">
        <label class="col-sm-2 col-form-label">Id</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityId">
        </div>
    </div>
    <div class="row mb-3">
        <label class="col-sm-2 col-form-label">Name</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityName">
        </div>
    </div>
</div>`,

        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));

            return {
                selectedNode: context.selectedNode,
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },

        mounted() {
            this.isDatabaseConnected = this.database.isConnected();
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },
        },

        computed: {
            
        }
    })
}