function registerCreateEntityModalComponent(app, context) {
    return app.component("create-entity-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Entity</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="parentIdInput" placeholder="ExampleEntity" v-model="parentId">
                    <label for="parentIdInput">Parent ID</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="entityNameInput" placeholder="ExampleEntity" v-model="entityName">
                    <label for="entityNameInput">Entity Name</label>
                </div>
                <div class="form-floating mb-3">
                    <select class="form-select form-select-lg" id="entityTypeSelect" aria-label="Select entity type" v-model="entityType">
                        <option v-for="t in availableTypes" :value="t">{{t}}</option>
                    </select>
                    <label for="entityTypeSelect">Entity Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-success" @click="onCreateButtonPressed" :disabled="isCreateDisabled">Create</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                entityName: "",
                entityType: "",
                parentId: "",
                availableTypes: [],
                serverInteractor: context.qConfigServerInteractor
            }
        },
        async mounted() {
            const getEntityTypes = () => {
                this.serverInteractor
                    .send(new proto.qmq.WebConfigGetEntityTypesRequest(), proto.qmq.WebConfigGetEntityTypesResponse)
                    .then(response => {
                        this.availableTypes = response.getTypesList();
                        qDebug(`[create-entity-modal::mounted] Got all entity types: ${this.availableTypes}`);
                    })
                    .catch(error => {
                        qError(`[create-entity-modal::mounted] Failed to get all entity types: ${error}`)
                        this.availableTypes = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[create-entity-modal::mounted] Retrying get all entity types request...")
                            setTimeout(getEntityTypes, 1000);
                        }
                    });
            }

            getEntityTypes();
        },
        methods: {
            async onCreateButtonPressed() {
                const me = this;
                const request = new proto.qmq.WebConfigCreateEntityRequest();
                request.setParentid(me.parentId);
                request.setName(me.entityName);
                request.setType(me.entityType);

                me.serverInteractor
                    .send(request, proto.qmq.WebConfigCreateEntityResponse)
                    .then(response => {
                        qInfo(`[create-entity-modal::onCreateButtonPressed] Create entity response status: ${response.getStatus()}`)
                    })
                    .catch(error => {
                        qError(`[create-entity-modal::onCreateButtonPressed] Failed to create entity: ${error}`)
                    })
                
                me.entityName = "";
                me.entityType = "";
                me.parentId = "";
            },
            async onCancelButtonPressed() {
                const me = this;
                me.entityName = "";
                me.entityType = "";
                me.parentId = "";
            },
        },
        computed: {
            isCreateDisabled() {
                const me = this;
                return me.entityName.length == 0 || me.entityType.length == 0;
            }
        }
    })
}