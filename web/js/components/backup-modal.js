function registerBackupModalComponent(app, context) {
    return app.component("backup-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Database Backup</h5>
                    <small class="text-muted">Create and download a backup of your database</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
                <div class="mb-4">
                    <i class="bi bi-database-fill-down display-1 text-primary opacity-75"></i>
                </div>
                <p class="mb-4">Click "Create Backup" to generate a backup file of your current database state.</p>
                <button class="btn btn-primary w-100 mb-3" @click="onBackupButtonClicked" :disabled="!isDatabaseConnected">
                    <i class="bi bi-download me-2"></i>Create Backup
                </button>
                <button class="btn btn-success w-100" :disabled="isDownloadDisabled">
                    <a :href="blobUrl" download="qdb.db" class="text-white text-decoration-none">
                        <i class="bi bi-file-earmark-arrow-down me-2"></i>Download Backup File
                    </a>
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
                blobUrl: "",
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

            onBackupButtonClicked() {
                this.database
                    .createSnapshot()
                    .then(event => this.onCreateSnapshot(event))
                    .catch(error => qError(`[BackupModal::onBackupButtonClicked] Failed to create database snapshot: ${error}`));
            }
        },
        
        computed: {
            isDownloadDisabled() {
                return this.blobUrl === "";
            }
        }
    })
}