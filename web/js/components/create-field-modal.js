function registerCreateFieldModalComponent(app, context) {
    return app.component("create-field-modal", {
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
                    <input type="text" class="form-control" id="fieldNameInput" placeholder="ExampleField" v-model="fieldName">
                    <label for="fieldNameInput">Field Name</label>
                </div>
                <div class="form-floating mb-3">
                    <select class="form-select form-select-lg" id="fieldTypeSelect" aria-label="Select field type" v-model="selectedFieldType">
                        <option v-for="fieldType in availableTypes" :value="fieldType">{{fieldType}}</option>
                    </select>
                    <label for="fieldTypeSelect">Field Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button"
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    @click="onCancelButtonPressed">
                    Cancel
                </button>
                <button type="button"
                    class="btn btn-success"
                    data-bs-dismiss="modal"
                    @click="onCreateButtonPressed"
                    :disabled="isCreateDisabled">
                    Create
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