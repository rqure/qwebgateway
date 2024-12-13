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
                            <i :class="getFieldIcon(selectedFieldType)" class="field-type-icon me-2"></i>
                            {{selectedFieldType || 'Select field type...'}}
                        </span>
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <ul class="dropdown-menu w-100">
                        <li v-for="type in availableTypes" 
                            class="dropdown-item" 
                            @click="onTypeSelect(type)">
                            <i :class="getFieldIcon(type)" class="field-type-icon me-2"></i>{{type}}
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
            qEntityStore
                .getEventManager()
                .addEventListener(Q_STORE_EVENTS.CONNECTED, this.onStoreConnected.bind(this))
                .addEventListener(Q_STORE_EVENTS.DISCONNECTED, this.onStoreDisconnected.bind(this));

            return {
                fieldName: "",
                selectedFieldType: "",
                availableTypes: qEntityStore.getAvailableFieldTypes().filter(type => type !== 'LogMessage'),
                
            }
        },

        mounted() {
            
        },

        methods: {
            onStoreConnected() {
                
            },

            onStoreDisconnected() {
                
            },

            onCancelButtonPressed() {
                const me = this;
                me.fieldName = "";
                me.selectedFieldType = "";
            },

            onCreateButtonPressed() {
                qEntityStore.createField(this.fieldName, this.selectedFieldType);
            },

            onTypeSelect(fieldType) {
                const me = this;
                me.selectedFieldType = fieldType;
            },

            getFieldIcon(fieldType) {
                // Remove 'protobufs.' prefix if present
                const type = fieldType?.replace('protobufs.', '') || '';
                
                const iconMap = {
                    'Bool': 'bi bi-toggle2-on',
                    'Int': 'bi bi-123',
                    'Float': 'bi bi-graph-up',
                    'String': 'bi bi-text-paragraph',
                    'Timestamp': 'bi bi-calendar-event',
                    'BinaryFile': 'bi bi-file-earmark-binary',
                    'EntityReference': 'bi bi-link-45deg',
                    'Transformation': 'bi bi-code-square'
                };
                return iconMap[type] || 'bi bi-dot';
            }
        },
        computed: {
            isCreateDisabled() {
                const me = this;
                return me.fieldName.length == 0 || me.selectedFieldType.length == 0;
            },
        }
    })
}