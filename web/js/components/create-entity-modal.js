function registerCreateEntityModalComponent(app, context) {
    return app.component("create-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Create Child Entity</h5>
                    <small class="text-muted">Add a new entity under the selected parent</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info mb-4">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-folder me-2"></i>
                        <strong>Parent:</strong>&nbsp;{{treeStore.selectedNode.entityName || treeStore.selectedNode.entityId}}
                    </div>
                </div>
                <div class="form-floating mb-4">
                    <input type="text" class="form-control form-control-lg" 
                           id="entityNameInput" placeholder="ExampleEntity" 
                           v-model="entityName"
                           autofocus>
                    <label for="entityNameInput">Entity Name</label>
                </div>
                <div class="form-floating">
                    <select class="form-select form-select-lg" 
                            id="entityTypeSelect" 
                            v-model="entityType">
                        <option value="" disabled>Select a type</option>
                        <option v-for="t in availableEntityTypes" :value="t">{{t}}</option>
                    </select>
                    <label for="entityTypeSelect">Entity Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" 
                        data-bs-dismiss="modal" 
                        @click="onCancelButtonPressed">
                    Cancel
                </button>
                <button type="button" class="btn btn-success" 
                        data-bs-dismiss="modal" 
                        @click="onCreateButtonPressed" 
                        :disabled="isCreateDisabled">
                    <i class="bi bi-plus-circle me-2"></i>Create Entity
                </button>
            </div>
        </div>
    </div>
</div>`,

        inject: ['treeStore'],

        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));

            return {
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

            async onCreateButtonPressed() {
                try {
                    await this.database.createEntity(
                        this.treeStore.selectedNode.entityId,
                        this.entityName,
                        this.entityType
                    );
                    
                    // Trigger update for parent node
                    const parentNode = this.treeStore.getNode(this.treeStore.selectedNode.entityId);
                    if (parentNode) {
                        await parentNode.initializeNode();
                    }
                } catch (error) {
                    qError(`[CreateEntityModal::onCreateButtonPressed] Failed to create entity: ${error}`);
                }
                
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