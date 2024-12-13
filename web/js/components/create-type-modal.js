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
                            @click="showFieldForm = true">
                        <i class="bi bi-plus-lg me-1"></i>Add Field
                    </button>
                </div>

                <!-- New Field Form -->
                <div v-if="showFieldForm" class="mb-3 p-3 border rounded">
                    <div class="form-floating mb-3">
                        <input type="text" class="form-control" 
                               id="fieldNameInput" placeholder="fieldName"
                               v-model="newFieldName">
                        <label for="fieldNameInput">Field Name</label>
                    </div>
                    
                    <div class="dropdown w-100 mb-3">
                        <button class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-between" 
                                type="button" 
                                data-bs-toggle="dropdown">
                            <span>{{selectedFieldType || 'Select field type...'}}</span>
                            <i class="bi bi-chevron-down"></i>
                        </button>
                        <ul class="dropdown-menu w-100">
                            <li v-for="type in fieldTypes" 
                                class="dropdown-item" 
                                @click="selectedFieldType = type">
                                {{type}}
                            </li>
                        </ul>
                    </div>

                    <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-outline-secondary btn-sm" @click="cancelFieldAdd">
                            Cancel
                        </button>
                        <button class="btn btn-primary btn-sm" 
                                @click="addField" 
                                :disabled="!canAddField">
                            Add Field
                        </button>
                    </div>
                </div>

                <div class="field-list">
                    <div v-for="(field, index) in entityFields" 
                         :key="field"
                         class="field-item mb-2"
                         draggable="true"
                         @dragstart="onDragStart($event, index)"
                         @dragover.prevent
                         @dragenter="onDragEnter($event, index)"
                         @drop="onDrop($event, index)"
                         :class="{ 'dragging': draggedIndex === index }">
                        <div class="field-item-content">
                            <i class="bi bi-grip-vertical text-secondary drag-handle me-1"></i>
                            <i :class="getFieldIcon(field)" class="field-type-icon text-primary me-1"></i>
                            <span class="flex-grow-1">{{field.getName()}}</span>
                            <small class="text-muted me-2">{{getTypeName(field.getType())}}</small>
                            <button class="btn btn-link btn-sm text-danger p-0" 
                                    @click="onDeleteField(field)">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
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
            const iconMap = {
                'protobufs.Bool': 'bi-toggle2-on',
                'protobufs.Int': 'bi-123',
                'protobufs.Float': 'bi-graph-up',
                'protobufs.String': 'bi-text-paragraph',
                'protobufs.Timestamp': 'bi-calendar-event',
                'protobufs.BinaryFile': 'bi-file-earmark-binary',
                'protobufs.EntityReference': 'bi-link-45deg',
                'protobufs.Transformation': 'bi-code-square'
            };

            qEntityStore
                .getEventManager()
                .addEventListener(Q_STORE_EVENTS.CONNECTED, this.onStoreConnected.bind(this))
                .addEventListener(Q_STORE_EVENTS.DISCONNECTED, this.onStoreDisconnected.bind(this));

            return {
                entityType: "",
                entityFields: [],
                allEntityTypes: [],
                iconMap, // Add iconMap to data
                fieldTypes: qEntityStore.getAvailableFieldTypes().filter(type => 
                    iconMap['protobufs.' + type]
                ),
                draggedIndex: null,
                dropTargetIndex: null,
                showFieldForm: false,
                newFieldName: "",
                selectedFieldType: ""
            }
        },

        mounted() {
            if (qEntityStore.isConnected()) {
                this.onStoreConnected();
            }
        },

        methods: {
            onStoreConnected() {
                

                qEntityStore
                    .queryAllEntityTypes()
                    .then(event => this.onQueryAllEntityTypes(event))
                    .catch(error => qError(`[CreateTypeModal::onDatabaseConnected] ${error}`));
            },

            onStoreDisconnected() {
                
            },

            onQueryAllEntityTypes(event) {
                event.entityTypes.sort();
                this.allEntityTypes = event.entityTypes;
            },

            onQueryEntitySchema(event) {
                this.entityFields = [];
                
                if (event.schema.getName() === this.entityType) {
                    const fields = event.schema.getFieldsList();
                    this.entityFields = fields.map(field => {
                        const schema = new proto.protobufs.DatabaseFieldSchema();
                        schema.setName(field.getName());
                        schema.setType(field.getType());
                        return schema;
                    });
                }
            },

            onSelectField(fieldType) {
                // Generate a unique field name
                const baseName = fieldType.toLowerCase();
                let fieldName = baseName;
                let counter = 1;
                
                while (this.entityFields.some(f => f.getName() === fieldName)) {
                    fieldName = `${baseName}${counter}`;
                    counter++;
                }
                
                // Create field schema
                const fieldSchema = new proto.protobufs.DatabaseFieldSchema();
                fieldSchema.setName(fieldName);
                fieldSchema.setType('protobufs.' + fieldType);

                this.entityFields.push(fieldSchema);
            },

            onDeleteField(field) {
                this.entityFields = this.entityFields.filter(f => f.getName() !== field.getName());
            },

            onEntityTypeChange() {
                if (!this.allEntityTypes.includes(this.entityType)) {
                    this.entityFields = [];
                    return;
                }

                qEntityStore
                    .queryEntitySchema(this.entityType)
                    .then(event => this.onQueryEntitySchema(event))
                    .catch(error => qError(`[CreateTypeModal::onEntityTypeChange] ${error}`));
            },

            onCancelButtonPressed() {
                this.entityType = "";
                this.entityFields = [];
            },

            onCreateButtonPressed() {
                qEntityStore
                    .createOrUpdateEntityType(this.entityType, this.entityFields)
                    .catch(error => qError(`[CreateTypeModal::onCreateButtonPressed] Failed to create entity type: ${error}`));
                
                this.entityType = "";
                this.entityFields = [];
            },

            onDragStart(event, index) {
                this.draggedIndex = index;
                event.target.classList.add('dragging');
                // Set drag data (required for Firefox)
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', index);
            },

            onDragEnter(event, index) {
                if (this.draggedIndex === null) return;
                
                const items = document.querySelectorAll('.field-item');
                items.forEach(item => item.classList.remove('drag-over'));
                
                if (this.draggedIndex !== index) {
                    event.target.closest('.field-item').classList.add('drag-over');
                }
            },

            onDrop(event, index) {
                event.preventDefault();
                const items = document.querySelectorAll('.field-item');
                items.forEach(item => {
                    item.classList.remove('dragging', 'drag-over');
                });

                if (this.draggedIndex !== null && this.draggedIndex !== index) {
                    // Reorder the fields array
                    const fields = [...this.entityFields];
                    const [movedItem] = fields.splice(this.draggedIndex, 1);
                    fields.splice(index, 0, movedItem);
                    this.entityFields = fields;
                }
                
                this.draggedIndex = null;
            },

            addField() {
                const fieldSchema = new proto.protobufs.DatabaseFieldSchema();
                fieldSchema.setName(this.newFieldName);
                fieldSchema.setType('protobufs.' + this.selectedFieldType);
                this.entityFields.push(fieldSchema);
                
                // Reset form
                this.newFieldName = "";
                this.selectedFieldType = "";
                this.showFieldForm = false;
            },

            cancelFieldAdd() {
                this.newFieldName = "";
                this.selectedFieldType = "";
                this.showFieldForm = false;
            },

            getFieldIcon(field) {
                return `bi ${this.iconMap[field.getType()] || 'bi-dot'}`;
            },

            getTypeName(type) {
                return type.replace('protobufs.', '');
            }
        },
        computed: {
            isCreateEditDisabled() {
                return this.entityType.length == 0;
            },

            availableFields() {
                return this.fieldTypes.filter(type => 
                    !this.entityFields.find(field => field.getType() === 'protobufs.' + type)
                );
            },

            canAddField() {
                return this.newFieldName && 
                       this.selectedFieldType && 
                       !this.entityFields.find(f => f.getName() === this.newFieldName);
            }
        }
    })
}