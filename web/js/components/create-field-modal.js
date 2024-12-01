function registerCreateFieldModalComponent(app, context) {
    return app.component("create-field-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title mb-1">Create Field</h5>
                    <small class="text-muted">Add a new field type to the database</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-4">
                    <input type="text" class="form-control form-control-lg" 
                           id="fieldNameInput" placeholder="ExampleField" 
                           v-model="fieldName"
                           autofocus>
                    <label for="fieldNameInput">Field Name</label>
                </div>
                <div class="form-floating">
                    <select class="form-select form-select-lg" 
                           id="fieldTypeSelect" 
                           v-model="selectedFieldType">
                        <option value="" disabled selected>Choose a field type...</option>
                        <option v-for="fieldType in availableTypes" :value="fieldType">
                            {{fieldType}}
                        </option>
                    </select>
                    <label for="fieldTypeSelect">Field Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" 
                        data-bs-dismiss="modal" @click="onCancelButtonPressed">
                    Cancel
                </button>
                <button type="button" class="btn btn-primary" 
                        data-bs-dismiss="modal" 
                        @click="onCreateButtonPressed" 
                        :disabled="isCreateDisabled">
                    <i class="bi bi-plus-circle me-2"></i>Create Field
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