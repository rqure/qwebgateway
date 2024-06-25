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
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));

            return {
                snapshot: null,
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
                    me.snapshot = proto.qdb.DatabaseSnapshot.deserializeBinary(new Uint8Array(e.target.result));
                };
                reader.readAsArrayBuffer(file);
            },

            onRestoreButtonPressed() {
                const me = this;
                me.database.restoreSnapshot(me.snapshot);
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