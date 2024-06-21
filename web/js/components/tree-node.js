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
                .addEventListener(DATABASE_EVENTS.QUERY_ENTITY, this.onQueryEntity.bind(this))
                .addEventListener(DATABASE_EVENTS.QUERY_ENTITY_SCHEMA, this.onQueryEntitySchema.bind(this))
                .addEventListener(DATABASE_EVENTS.READ_RESULT, this.onRead.bind(this));

            return {
                selectedNode: context.selectedNode,
                localEntityId: this.entityId,
                localEntityName: this.entityName,
                localEntityType: this.entityType,
                localEntityChildren: this.entityChildren,
                expanded: false,
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },

        created() {
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

            onQueryEntitySchema(event) {
                if (this.localEntityType === event.schema.getName()) {
                    this.selectedNode.entitySchema = event.schema;
                    this.database.read(event.schema.getFieldsList().map(f => {
                        return {
                            id: this.selectedNode.entityId,
                            field: f
                        };
                    }));
                }
            },

            onRead(results) {
                const fromDotNotation = (dotNotation, value) => {
                    const ret = {};
                    dotNotation.split('.').reduce((prev, key, i, self) => {
                        return prev[key] = (i === self.length - 1) ? value : prev[key] || {};
                    }, ret);
                    
                    return ret;
                }

                for (const result of results) {
                    this.selectedNode.entityFields[result.getName()] = fromDotNotation(result.getValue().getTypeName(), proto)?.deserializeBinary(result.getValue().getValue_asU8());
                }
            },
            
            toggleExpand() {
                this.expanded = !this.expanded;
            },

            onFocus() {
                this.selectedNode.entityId = this.localEntityId;
                this.selectedNode.entityName = this.localEntityName;
                this.selectedNode.entityType = this.localEntityType;
                this.selectedNode.entityFields = {};

                this.database.queryEntitySchema(this.localEntityType);
            }
        },

        computed: {
            expandable() {
                return this.localEntityChildren.length > 0;
            }
        }
    })
}