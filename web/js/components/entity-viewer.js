function registerTreeNodeComponent(app, context) {
    return app.component("tree-node", {
        template: `
    <li class="list-group-item list-group-item-action">
        <div @click="onFocus">
            <span class="mr-5" v-if="!expandable"></span>
            <span class="badge text-bg-primary">{{localEntityType}}</span>
            {{localEntityName}}
            <span class="badge text-bg-info" v-if="expandable" @click="toggleExpand">{{ expanded ? '-' : '+' }}</span>
        </div>
        <ul class="list-group list-group-flush" v-if="expanded">
            <tree-node
                v-for="child in localEntityChildren" :entityId="child.getId()" />
        </ul>
    </li>`,

        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ENTITY, this.onQueryEntity.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ALL_FIELDS, this.onQueryAllFields.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ALL_ENTITY_TYPES, this.onQueryAllEntityTypes.bind(this));

            return {
                app: app,
                entityId: "",
                entityName: "",
                entityType: "",
                entitySchema: null,
                fieldValueMap: {},
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },

        async mounted() {
            this.isDatabaseConnected = this.database.isConnected();
            this.app.$on("focus-entity", this.onFocusEntity.bind(this));
            if (this.isDatabaseConnected) {
                this.onDatabaseConnected();
            }
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;

                this.database.queryEntity(this.entityId);
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryEntity(event) {
                this.entityName = event.entity.getName();
                this.entityType = event.entity.getType();
                // this.entitySchema = event.entity.getSchema();
                // this.fieldValueMap = event.entity.getFieldValueMap();
            },

            onFocusEntity(entityId) {
                this.entityId = entityId;

                if (this.isDatabaseConnected) {
                    this.database.queryEntity(this.entityId);
                }
            }
        },

        computed: {
            
        }
    })
}