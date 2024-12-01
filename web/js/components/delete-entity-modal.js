function registerDeleteEntityModalComponent(app, context) {
    return app.component("delete-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Delete Entity</h5>
                    <small class="text-muted">This action cannot be undone</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info mb-4">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-info-circle me-2"></i>
                        <strong>Entity Details</strong>
                    </div>
                    <div class="ms-4">
                        <div class="mb-1"><strong>Type:</strong> {{selectedNode.entityType}}</div>
                        <div class="mb-1"><strong>Name:</strong> {{selectedNode.entityName}}</div>
                        <div><strong>ID:</strong> {{selectedNode.entityId}}</div>
                    </div>
                </div>
                <div class="alert alert-warning">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Warning:</strong>&nbsp;This will permanently delete the entity and all its data.
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                    Cancel
                </button>
                <button type="button" class="btn btn-danger" 
                        data-bs-dismiss="modal" 
                        @click="onDeleteButtonPressed" 
                        :disabled="!isDatabaseConnected">
                    <i class="bi bi-trash me-2"></i>Delete Entity
                </button>
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
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onCancelButtonPressed() {
                const me = this;
                me.entityId = "";
            },

            onDeleteButtonPressed() {
                this.database
                    .deleteEntity(this.selectedNode.entityId)
                    .catch(error => qError(`[DeleteEntityModal::onDeleteButtonPressed] ${error}`));
            }
        },

        computed: {
            isDeleteDisabled() {
                return this.entityId === "" || !this.isDatabaseConnected;
            }
        }
    })
}