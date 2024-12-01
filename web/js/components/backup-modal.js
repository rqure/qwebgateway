function registerBackupModalComponent(app, context) {
    return app.component("backup-modal", {
        template: `
<div class="modal" tabindex="-1" @hidden.bs.modal="onModalHidden">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Create Backup</h5>
                    <small class="text-muted">Save your database state to a file</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
                <div class="mb-4">
                    <i class="bi bi-database-fill-down display-1 text-primary opacity-75"></i>
                </div>

                <div class="alert alert-info mb-4">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-info-circle me-2"></i>
                        <div>
                            <strong>Database Backup</strong>
                            <p class="mb-0 small">Creates a snapshot of your current database state.</p>
                        </div>
                    </div>
                </div>

                <div class="backup-actions">
                    <button class="btn btn-primary btn-lg w-100 mb-3" 
                            @click="onBackupButtonClicked" 
                            :disabled="!isDatabaseConnected || isLoading">
                        <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                        <i v-else class="bi bi-camera me-2"></i>
                        {{isLoading ? 'Creating Snapshot...' : 'Create Snapshot'}}
                    </button>

                    <a v-if="blobUrl" 
                       :href="blobUrl" 
                       download="qdb.db" 
                       class="btn btn-success btn-lg w-100">
                        <i class="bi bi-download me-2"></i>Download Backup File
                    </a>
                </div>
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
                blobUrl: "",
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false,
                isLoading: false
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

            onCreateSnapshot(event) {
                const blob = new Blob([event.snapshot.serializeBinary()], {type: "application/octet-stream"});
                this.blobUrl = window.URL.createObjectURL(blob);
            },

            onCancelButtonClicked() {
                if (this.blobUrl !== "") {
                    window.URL.revokeObjectURL(this.blobUrl);
                }

                this.blobUrl = "";
            },

            onModalHidden() {
                this.onCancelButtonClicked();
            },

            onBackupButtonClicked() {
                this.isLoading = true;
                this.database
                    .createSnapshot()
                    .then(event => this.onCreateSnapshot(event))
                    .catch(error => qError(`[BackupModal::onBackupButtonClicked] Failed to create database snapshot: ${error}`))
                    .finally(() => this.isLoading = false);
            }
        },
        
        computed: {
            isDownloadDisabled() {
                return this.blobUrl === "";
            }
        }
    })
}