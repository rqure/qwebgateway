function registerCreateEntityModalComponent(app, context) {
    return app.component("create-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Child Entity</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info mb-3">
                    <strong>Parent Entity:</strong> {{selectedNode.entityName || selectedNode.entityId}}
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="entityNameInput" placeholder="ExampleEntity" v-model="entityName">
                    <label for="entityNameInput">Entity Name</label>
                </div>
                <div class="form-floating mb-3">
                    <select class="form-select form-select-lg" id="entityTypeSelect" aria-label="Select entity type" v-model="entityType">
                        <option v-for="t in availableEntityTypes" :value="t">{{t}}</option>
                    </select>
                    <label for="entityTypeSelect">Entity Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-success" data-bs-dismiss="modal" @click="onCreateButtonPressed" :disabled="isCreateDisabled">Create</button>
            </div>
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
                entityName: "",
                entityType: "",
                availableEntityTypes: [],
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },
        
        mounted() {
            if (this.database.isConnected()) {
                this.onDatabaseConnected();
            }
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;
                
                if (this.isDatabaseConnected) {
                    this.database
                        .queryAllEntityTypes()
                        .then(event => this.onQueryAllEntityTypes(event))
                        .catch(error => qError(`[CreateEntityModal::onDatabaseConnected] ${error}`));
                }
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryAllEntityTypes(event) {
                // sorted alphabetically
                event.entityTypes.sort();
                this.availableEntityTypes = event.entityTypes;
            },

            onCreateButtonPressed() {
                this.database
                    .createEntity(this.selectedNode.entityId, this.entityName, this.entityType)
                    .catch(error => qError(`[CreateEntityModal::onCreateButtonPressed] Failed to create entity: ${error}`));
                
                this.entityName = "";
                this.entityType = "";
            },

            onCancelButtonPressed() {
                this.entityName = "";
                this.entityType = "";
            },
        },
        computed: {
            isCreateDisabled() {
                return this.entityName.length == 0 || this.entityType.length == 0 || !this.isDatabaseConnected;
            }
        }
    })
}