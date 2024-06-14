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
            return {
                blobUrl: "",
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {
            onCancelButtonClicked() {
                if (this.blobUrl !== "") {
                    window.URL.revokeObjectURL(this.blobUrl);
                }

                this.blobUrl = "";
            },

            async onBackupButtonClicked() {
                const me = this;
                const request = new proto.qmq.WebConfigCreateSnapshotRequest();
                me.serverInteractor
                    .send(request, proto.qmq.WebConfigCreateSnapshotResponse)
                    .then(response => {
                        qInfo(`[backup-modal::onBackupButtonClicked] Backup database response ${response.getStatus()}`);
                        if (response.getStatus() !== proto.qmq.WebConfigCreateSnapshotResponse.StatusEnum.SUCCESS) {
                            return;
                        }
                        
                        const blob = new Blob([response.getSnapshot().serializeBinary()], {type: "application/octet-stream"});
                        me.blobUrl = window.URL.createObjectURL(blob);
                    })
                    .catch(error => {
                        qError(`[backup-modal::onBackupButtonClicked] Failed to backup database: ${error}`);
                    });
            }
        },
        computed: {
            isDownloadDisabled() {
                return this.blobUrl === "";
            }
        }
    })
}