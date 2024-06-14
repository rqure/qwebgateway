function registerCreateTypeModalComponent(app, context) {
    return app.component("create-type-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Type</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="entityTypeNameInput" placeholder="ExampleType" v-model="entityType" @change="onEntityTypeChange" @keyup.enter="onEntityTypeChange">
                    <label for="entityTypeNameInput">Type Name</label>
                </div>
                <div class="mb-3">
                    <button class="btn btn-lg w-100 btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Add Field
                    </button>
                    <ul class="dropdown-menu w-100">
                        <li class="dropdown-item w-100" v-for="availableField in availableFields" @click="onSelectField(availableField)">{{availableField}}</li>
                    </ul>
                </div>
                <ul class="list-group">
                    <li v-for="field in entityFields" class="list-group-item d-flex justify-content-between align-items-start">
                        <div>{{field}}</div>
                        <span class="badge text-bg-secondary" @click="onDeleteField(field)">🗑</span>
                    </li>
                </ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-success" data-bs-dismiss="modal" @click="onCreateButtonPressed" :disabled="isCreateEditDisabled">Create/Edit</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                entityType: "",
                entityFields: [],
                allEntityTypes: [],
                allFields: [],
                serverInteractor: context.qConfigServerInteractor
            }
        },
        async mounted() {
            const getAllFields = () => {
                this.serverInteractor
                    .send(new proto.qmq.WebConfigGetAllFieldsRequest(), proto.qmq.WebConfigGetAllFieldsResponse)
                    .then(response => {
                        this.allFields = response.getFieldsList();
                    })
                    .catch(error => {
                        qError(`[create-type-modal::mounted] Failed to get all fields: ${error}`)
                        this.allFields = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[create-type-modal::mounted] Retrying get all fields request...")
                            setTimeout(getAllFields, 1000);
                        }
                    });
            }
            
            const getEntityTypes = () => {
                this.serverInteractor
                    .send(new proto.qmq.WebConfigGetEntityTypesRequest(), proto.qmq.WebConfigGetEntityTypesResponse)
                    .then(response => {
                        this.allEntityTypes = response.getTypesList();
                        qDebug(`[create-type-modal::mounted] Got all entity types: ${this.allEntityTypes}`);
                    })
                    .catch(error => {
                        qError(`[create-type-modal::mounted] Failed to get all entity types: ${error}`)
                        this.allEntityTypes = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[create-type-modal::mounted] Retrying get all entity types request...")
                            setTimeout(getEntityTypes, 1000);
                        }
                    });
            }

            getAllFields();
            getEntityTypes();
        },
        methods: {
            onSelectField(field) {
                this.entityFields.push(field);
            },
            onDeleteField(field) {
                this.entityFields = this.entityFields.filter(f => f !== field);
            },
            async onEntityTypeChange() {
                if (!this.allEntityTypes.includes(this.entityType)) {
                    this.entityFields = [];
                    return;
                }

                const request = new proto.qmq.WebConfigGetEntitySchemaRequest();
                request.setType(this.entityType);

                this.serverInteractor
                    .send(request, proto.qmq.WebConfigGetEntitySchemaResponse)
                    .then(response => {
                        this.entityFields = [];
                        if(response.getStatus() === proto.qmq.WebConfigGetEntitySchemaResponse.StatusEnum.SUCCESS) {
                            this.entityFields = response.getSchema().getFieldsList();
                        }
                    })
                    .catch(error => {
                        qError(`[create-type-modal::onEntityTypeChange] Failed to get entity schema: ${error}`)
                        this.entityFields = [];
                    });
            },
            async onCancelButtonPressed() {
                this.entityType = "";
                this.entityFields = [];
            },
            async onCreateButtonPressed() {
                const request = new proto.qmq.WebConfigSetEntitySchemaRequest();
                request.setName(this.entityType);
                request.setFieldsList(this.entityFields);

                this.serverInteractor
                    .send(request, proto.qmq.WebConfigSetEntitySchemaResponse)
                    .then(response => {
                        qDebug("[create-type-modal::onCreateButtonPressed] Response: " + response);
                    })
                    .catch(error => {
                        qError("[create-type-modal::onCreateButtonPressed] Could not complete the request: " + error)
                    });
                
                this.entityType = "";
                this.entityFields = [];
            },
        },
        computed: {
            isCreateEditDisabled() {
                return this.entityType.length == 0;
            },

            availableFields() {
                return this.allFields.filter(field => !this.entityFields.includes(field));
            }
        }
    })
}