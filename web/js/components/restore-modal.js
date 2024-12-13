function registerRestoreModalComponent(app, context) {
    return app.component("restore-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Restore Database</h5>
                    <small class="text-muted">Load a previous database backup</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="onCancelButtonPressed"></button>
            </div>
            <div class="modal-body text-center">
                <div class="mb-4">
                    <i class="bi bi-database-fill-up display-1 text-warning opacity-75"></i>
                </div>

                <div class="alert alert-warning mb-4">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <div>
                            <strong>Warning: Database Restore</strong>
                            <p class="mb-0 small">This will replace your current database with the backup file.</p>
                        </div>
                    </div>
                </div>

                <div class="upload-zone p-4 border border-dashed rounded-3 mb-4">
                    <input class="form-control" type="file" @change="onFileUpload">
                </div>

                <div class="backup-actions">
                    <button type="button" 
                            class="btn btn-outline-warning btn-lg w-100" 
                            data-bs-dismiss="modal" 
                            :disabled="isRestoreDisabled" 
                            @click="onRestoreButtonPressed">
                        <i class="bi bi-arrow-clockwise me-2"></i>Restore Database
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>`,

        data() {
            qEntityStore
                .getEventManager()
                .addEventListener(Q_STORE_EVENTS.CONNECTED, this.onStoreConnected.bind(this))
                .addEventListener(Q_STORE_EVENTS.DISCONNECTED, this.onStoreDisconnected.bind(this));

            return {
                snapshot: null,
                
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

            onCancelButtonPressed() {
                this.snapshot = null;
            },

            onFileUpload(event) {
                const me = this;
                const file = event.target.files[0];
                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    me.snapshot = proto.protobufs.DatabaseSnapshot.deserializeBinary(new Uint8Array(e.target.result));
                };
                reader.readAsArrayBuffer(file);
            },

            onRestoreButtonPressed() {
                qEntityStore
                    .restoreSnapshot(this.snapshot)
                    .catch(error => qError(`[RestoreModal::onRestoreButtonPressed] Failed to restore database: ${error}`));
                
                this.snapshot = null;
            }
        },
        
        computed: {
            isRestoreDisabled() {
                return this.snapshot === null;
            }
        }
    })
}