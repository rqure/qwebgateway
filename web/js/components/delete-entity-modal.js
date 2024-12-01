function registerDeleteEntityModalComponent(app, context) {
    return app.component("delete-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Delete Entity</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this entity?</p>
                <div class="alert alert-info">
                    <strong>Type:</strong> {{selectedNode.entityType}}<br>
                    <strong>Name:</strong> {{selectedNode.entityName}}<br>
                    <strong>ID:</strong> {{selectedNode.entityId}}
                </div>
                <div class="alert alert-warning">
                    This action cannot be undone!
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="onDeleteButtonPressed" :disabled="!isDatabaseConnected">
                    Delete
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