function registerCreateTypeModalComponent(app, context) {
    return app.component("create-type-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Create/Edit Type</h5>
                    <small class="text-muted">Define a new entity type or modify an existing one</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-4">
                    <input type="text" class="form-control form-control-lg" 
                           id="entityTypeNameInput" placeholder="ExampleType" 
                           v-model="entityType" 
                           @change="onEntityTypeChange" 
                           @keyup.enter="onEntityTypeChange"
                           autofocus>
                    <label for="entityTypeNameInput">Type Name</label>
                </div>

                <div class="d-flex align-items-center gap-2 mb-3">
                    <h6 class="mb-0 text-secondary">Fields</h6>
                    <hr class="flex-grow-1 my-0">
                    <button class="btn btn-primary btn-sm" 
                            type="button" 
                            data-bs-toggle="dropdown">
                        <i class="bi bi-plus-lg me-1"></i>Add Field
                    </button>
                    <ul class="dropdown-menu scrollable-dropdown-menu w-100">
                        <li v-for="availableField in availableFields" 
                            class="dropdown-item" 
                            @click="onSelectField(availableField)">
                            <i class="bi bi-input-cursor me-2"></i>{{availableField}}
                        </li>
                    </ul>
                </div>

                <div class="field-list">
                    <div v-for="field in entityFields" 
                         class="field-item d-flex align-items-center p-2 rounded mb-2">
                        <i class="bi bi-input-cursor me-2 text-primary"></i>
                        <span class="flex-grow-1">{{field}}</span>
                        <button class="btn btn-link btn-sm text-danger p-0" 
                                @click="onDeleteField(field)">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                    <div v-if="entityFields.length === 0" 
                         class="text-center text-muted p-4">
                        <i class="bi bi-layout-text-window-reverse display-4 mb-2"></i>
                        <p>No fields added yet. Click "Add Field" to begin.</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" 
                        data-bs-dismiss="modal" 
                        @click="onCancelButtonPressed">
                    Cancel
                </button>
                <button type="button" class="btn btn-primary" 
                        data-bs-dismiss="modal" 
                        @click="onCreateButtonPressed" 
                        :disabled="isCreateEditDisabled">
                    <i class="bi bi-check-lg me-2"></i>Save Type
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
                entityType: "",
                entityFields: [],
                allEntityTypes: [],
                allFields: [],
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

                this.database
                    .queryAllEntityTypes()
                    .then(event => this.onQueryAllEntityTypes(event))
                    .catch(error => qError(`[CreateTypeModal::onDatabaseConnected] ${error}`));

                this.database
                    .queryAllFields()
                    .then(event => this.onQueryAllFields(event))
                    .catch(error => qError(`[CreateTypeModal::onDatabaseConnected] ${error}`));
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryAllFields(event) {
                this.allFields = event.fields;
                this.allFields.sort();
            },

            onQueryAllEntityTypes(event) {
                event.entityTypes.sort();
                this.allEntityTypes = event.entityTypes;
            },

            onQueryEntitySchema(event) {
                this.entityFields = [];
                
                if (event.schema.getName() === this.entityType) {
                    this.entityFields = event.schema.getFieldsList();
                }
            },

            onSelectField(field) {
                this.entityFields.push(field);
            },

            onDeleteField(field) {
                this.entityFields = this.entityFields.filter(f => f !== field);
            },

            onEntityTypeChange() {
                if (!this.allEntityTypes.includes(this.entityType)) {
                    this.entityFields = [];
                    return;
                }

                this.database
                    .queryEntitySchema(this.entityType)
                    .then(event => this.onQueryEntitySchema(event))
                    .catch(error => qError(`[CreateTypeModal::onEntityTypeChange] ${error}`));
            },

            onCancelButtonPressed() {
                this.entityType = "";
                this.entityFields = [];
            },

            onCreateButtonPressed() {
                const request = new proto.qdb.WebConfigSetEntitySchemaRequest();
                request.setName(this.entityType);
                request.setFieldsList(this.entityFields);

                this.database
                    .createOrUpdateEntityType(this.entityType, this.entityFields.slice())
                    .catch(error => qError(`[CreateTypeModal::onCreateButtonPressed] Failed to create entity type: ${error}`));
                
                this.entityType = "";
                this.entityFields = [];
            },
        },
        computed: {
            isCreateEditDisabled() {
                return this.entityType.length == 0 || !this.isDatabaseConnected;
            },

            availableFields() {
                return this.allFields.filter(field => !this.entityFields.includes(field));
            }
        }
    })
}