function registerRestoreModalComponent(app, context) {
    return app.component("restore-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Restore Database</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="onCancelButtonPressed"></button>
            </div>
            <div class="modal-body">
                <input class="form-control" type="file" @change="onFileUpload">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-danger" data-bs-dismiss="modal" :disabled="isRestoreDisabled" @click="onRestoreButtonPressed">Restore</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                snapshot: null,
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {
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
                    me.snapshot = proto.qmq.DatabaseSnapshot.deserializeBinary(new Uint8Array(e.target.result));
                };
                reader.readAsArrayBuffer(file);
            },

            async onRestoreButtonPressed() {
                const me = this;
                const request = new proto.qmq.WebConfigRestoreSnapshotRequest();
                request.setSnapshot((me.snapshot));
                me.serverInteractor
                    .send(request, proto.qmq.WebConfigRestoreSnapshotResponse)
                    .then(response => {
                        qInfo(`[restore-modal::onRestoreButtonPressed] Restore database response ${response.getStatus()}`);
                    })
                    .catch(error => {
                        qError(`[restore-modal::onRestoreButtonPressed] Failed to restore database: ${error}`);
                    });
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