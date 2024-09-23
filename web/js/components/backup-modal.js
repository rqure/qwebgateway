function registerBackupModalComponent(app, context) {
    return app.component("backup-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Database Backup</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="onCancelButtonClicked"></button>
            </div>
            <div class="modal-body">
                <button class="btn btn-primary" :disabled="isDownloadDisabled"><a :href="blobUrl" download="qdb.db">Download Backup</a></button>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonClicked">Cancel</button>
                <button type="button" class="btn btn-success" @click="onBackupButtonClicked">Backup</button>
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