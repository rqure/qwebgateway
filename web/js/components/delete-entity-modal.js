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
                        <div class="mb-1"><strong>Type:</strong> {{treeStore.selectedNode.entityType}}</div>
                        <div class="mb-1"><strong>Name:</strong> {{treeStore.selectedNode.entityName}}</div>
                        <div><strong>ID:</strong> {{treeStore.selectedNode.entityId}}</div>
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
                        @click="onDeleteButtonPressed">
                    <i class="bi bi-trash me-2"></i>Delete Entity
                </button>
            </div>
        </div>
    </div>
</div>`,

        inject: ['treeStore'],

        data() {
            qEntityStore
                .getEventManager()
                .addEventListener(Q_STORE_EVENTS.CONNECTED, this.onStoreConnected.bind(this))
                .addEventListener(Q_STORE_EVENTS.DISCONNECTED, this.onStoreDisconnected.bind(this));

            return {
                
            }
        },

        mounted() {
            if (qEntityStore.isConnected()) {
                this.onStoreConnected();
            }
        },

        methods: {
            onStoreConnected() {
                
            },

            onStoreDisconnected() {
                
            },

            async onDeleteButtonPressed() {
                try {
                    // Store parent node reference before deletion
                    const nodeToDelete = this.treeStore.selectedNode;
                    const parentNode = this.treeStore.nodes.get(nodeToDelete.parentId);

                    await qEntityStore.deleteEntity(nodeToDelete.entityId);

                    // Clear selection and refresh parent node
                    this.treeStore.clearSelection();
                    if (parentNode) {
                        await parentNode.initializeNode();
                    }
                } catch (error) {
                    qError(`[DeleteEntityModal::onDeleteButtonPressed] ${error}`);
                }
            }
        }
    })
}