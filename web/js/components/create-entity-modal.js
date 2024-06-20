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
                        <option v-for="t in availableEntityTypes" :value="t">{{t}}</option>
                    </select>
                    <label for="entityTypeSelect">Entity Type</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onCancelButtonPressed">Cancel</button>
                <button type="button" class="btn btn-success" data-bs-dismiss="modal" @click="onCreateButtonPressed" :disabled="isCreateDisabled">Create</button>
            </div>
        </div>
    </div>
</div>`,

        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ALL_ENTITY_TYPES, this.onQueryAllEntityTypes.bind(this));

            return {
                entityName: "",
                entityType: "",
                parentId: "",
                availableEntityTypes: [],
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },
        
        mounted() {
            this.database.queryAllEntityTypes();

            this.isDatabaseConnected = this.database.isConnected();
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;
                if (this.isDatabaseConnected) {
                    this.database.queryAllEntityTypes();
                }
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryAllEntityTypes(event) {
                this.availableEntityTypes = event.entityTypes;
            },

            onCreateButtonPressed() {
                const me = this;
                this.database.createEntity(me.parentId, me.entityName, me.entityType);
                
                me.entityName = "";
                me.entityType = "";
                me.parentId = "";
            },

            onCancelButtonPressed() {
                const me = this;

                me.entityName = "";
                me.entityType = "";
                me.parentId = "";
            },
        },
        computed: {
            isCreateDisabled() {
                const me = this;
                return me.entityName.length == 0 || me.entityType.length == 0 || !me.isDatabaseConnected;
            }
        }
    })
}