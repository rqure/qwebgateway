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
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ALL_FIELDS, this.onQueryAllFields.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ALL_ENTITY_TYPES, this.onQueryAllEntityTypes.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ENTITY_SCHEMA, this.onQueryEntitySchema.bind(this));

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
            this.isDatabaseConnected = this.database.isConnected();

            if (this.isDatabaseConnected) {
                this.database.queryAllEntityTypes();
                this.database.queryAllFields();
            }
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;

                this.database.queryAllEntityTypes();
                this.database.queryAllFields();
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryAllFields(event) {
                this.allFields = event.fields;
                this.allFields.sort();
            },

            onQueryAllEntityTypes(event) {
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

                this.database.queryEntitySchema(this.entityType);
            },

            onCancelButtonPressed() {
                this.entityType = "";
                this.entityFields = [];
            },

            onCreateButtonPressed() {
                const request = new proto.qdb.WebConfigSetEntitySchemaRequest();
                request.setName(this.entityType);
                request.setFieldsList(this.entityFields);

                this.database.createOrUpdateEntityType(this.entityType, this.entityFields.slice());
                
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