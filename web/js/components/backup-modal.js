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
                <button class="btn btn-primary" :disabled="isDownloadDisabled"><a :href="blobUrl" download="qmq.db">Download Backup</a></button>
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
                .addEventListener(new DatabaseEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this)))
                .addEventListener(new DatabaseEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this)))
                .addEventListener(new DatabaseEventListener(DATABASE_EVENTS.CREATE_SNAPSHOT, this.onCreateSnapshot.bind(this)));

            return {
                blobUrl: "",
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

            async onBackupButtonClicked() {
                this.database.createSnapshot();
            }
        },
        
        computed: {
            isDownloadDisabled() {
                return this.blobUrl === "";
            }
        }
    })
}