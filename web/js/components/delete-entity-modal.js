function registerDeleteEntityModalComponent(app, context) {
    return app.component("delete-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Delete Entity</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="entityIdInput" placeholder="ExampleEntity" v-model="entityId">
                    <label for="entityIdInput">Entity ID</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="onDeleteButtonPressed" :disabled="isDeleteDisabled">Delete</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                entityId: "",
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {
            onCancelButtonPressed() {
                const me = this;
                me.entityId = "";
            },

            async onDeleteButtonPressed() {
                const me = this;
                const request = new proto.qmq.WebConfigDeleteEntityRequest();
                request.setId(me.entityId);
                me.serverInteractor
                    .send(request, proto.qmq.WebConfigDeleteEntityResponse)
                    .then(response => {
                        qInfo(`[delete-entity-modal::onDeleteButtonPressed] Delete entity response ${response}`);
                    })
                    .catch(error => {
                        qError(`[delete-entity-modal::onDeleteButtonPressed] Failed to delete entity: ${error}`);
                    });
            }
        },
        computed: {
            isDeleteDisabled() {
                return this.entityId === "";
            }
        }
    })
}