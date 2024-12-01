function registerCreateFieldModalComponent(app, context) {
    return app.component("create-field-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Create Field</h5>
                    <small class="text-muted">Define a new field type for entities</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-info mb-4">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-puzzle me-2"></i>
                        <div>
                            <strong>Field Types</strong>
                            <p class="mb-0 small">Fields are the building blocks of entity types.</p>
                        </div>
                    </div>
                </div>

                <div class="form-floating mb-4">
                    <input type="text" class="form-control form-control-lg" 
                           id="fieldNameInput" placeholder="ExampleField" 
                           v-model="fieldName"
                           autofocus>
                    <label for="fieldNameInput">
                        <i class="bi bi-tag me-1"></i>Field Name
                    </label>
                </div>

                <div class="d-flex align-items-center gap-2 mb-3">
                    <h6 class="mb-0 text-secondary">Field Type</h6>
                    <hr class="flex-grow-1 my-0">
                </div>

                <div class="dropdown w-100">
                    <button class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between" 
                            type="button" 
                            data-bs-toggle="dropdown">
                        <span>
                            <i class="bi bi-code-square me-2"></i>
                            {{selectedFieldType || 'Select field type...'}}
                        </span>
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <ul class="dropdown-menu w-100">
                        <li v-for="type in availableTypes" 
                            class="dropdown-item" 
                            @click="onTypeSelect(type)">
                            <i class="bi bi-code-square me-2"></i>{{type}}
                        </li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" 
                        data-bs-dismiss="modal" @click="onCancelButtonPressed">
                    <i class="bi bi-x-lg me-2"></i>Cancel
                </button>
                <button type="button" class="btn btn-primary" 
                        data-bs-dismiss="modal" 
                        @click="onCreateButtonPressed" 
                        :disabled="isCreateDisabled">
                    <i class="bi bi-plus-lg me-2"></i>Create Field
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
                fieldName: "",
                selectedFieldType: "",
                availableTypes: context.qDatabaseInteractor.getAvailableFieldTypes(),
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
                const me = this;
                me.fieldName = "";
                me.selectedFieldType = "";
            },

            onCreateButtonPressed() {
                this.database.createField(this.fieldName, this.selectedFieldType);
            },

            onTypeSelect(fieldType) {
                const me = this;
                me.selectedFieldType = fieldType;
            }
        },
        computed: {
            isCreateDisabled() {
                const me = this;
                return me.fieldName.length == 0 || me.selectedFieldType.length == 0 || !me.isDatabaseConnected;
            },
        }
    })
}