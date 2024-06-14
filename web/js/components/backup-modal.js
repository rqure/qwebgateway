function registerBackupModalComponent(app, context) {
    return app.component("backup-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Database Backup</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Create a database backup.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" data-bs-dismiss="modal" @click="onBackupButtonClicked">Backup</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {
            async onBackupButtonClicked() {
                const me = this;
                const request = new proto.qmq.WebConfigCreateSnapshotRequest();
                me.serverInteractor
                    .send(request, proto.qmq.WebConfigCreateSnapshotResponse)
                    .then(response => {
                        qInfo(`[backup-modal::onBackupButtonClicked] Backup database response ${response}`);
                    })
                    .catch(error => {
                        qError(`[backup-modal::onBackupButtonClicked] Failed to backup database: ${error}`);
                    });
            }
        },
        computed: {
            
        }
    })
}