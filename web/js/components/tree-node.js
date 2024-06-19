function registerTreeNodeComponent(app, context) {
    return app.component("tree-node", {
        template: `
    <li class="list-group-item list-group-item-action">
        <div @click="toggleExpand">
            <span class="mr-5" v-if="!expandable"></span>
            <span class="badge text-bg-primary">{{localEntityType}}</span>
            {{localEntityName}}
            <span class="badge text-bg-info" v-if="expandable">{{ expanded ? '-' : '+' }}</span>
        </div>
        <ul class="list-group list-group-flush" v-if="expanded">
            <tree-node
                v-for="child in localEntityChildren" :entityId="child.getId()" />
        </ul>
    </li>`,
        props: {
            entityId: {
                type: String,
                default: ""
            },
            entityName: {
                type: String,
                default: ""
            },
            entityType: {
                type: String,
                default: ""
            },
            entityChildren: {
                type: Array,
                default: () => []
            }
        },
        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ROOT_ENTITY_ID, this.onQueryRootEntityId.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ENTITY, this.onQueryEntity.bind(this));

            return {
                localEntityId: this.entityId,
                localEntityName: this.entityName,
                localEntityType: this.entityType,
                localEntityChildren: this.entityChildren,
                expanded: false,
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },
        async created() {
            this.isDatabaseConnected = this.database.isConnected();

            if (this.isDatabaseConnected) {
                if (this.localEntityId === "") {
                    this.database.queryRootEntityId();
                } else {
                    this.database.queryEntity(this.localEntityId);
                }
            }
        },
        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;

                if (this.localEntityId === "") {
                    this.database.queryRootEntityId();
                } else {
                    this.database.queryEntity(this.localEntityId);
                }
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryRootEntityId(event) {
                if (this.localEntityId === "") {
                    this.localEntityId = event.rootId;
                    this.database.queryEntity(this.localEntityId);
                }
            },

            onQueryEntity(event) {
                if (this.localEntityId === event.entity.getId()) {
                    this.localEntityName = event.entity.getName();
                    this.localEntityType = event.entity.getType();
                    this.localEntityChildren = event.entity.getChildrenList();
                }
            },
            
            toggleExpand() {
                this.expanded = !this.expanded;
            }
        },
        computed: {
            expandable() {
                return this.localEntityChildren.length > 0;
            }
        }
    })
}