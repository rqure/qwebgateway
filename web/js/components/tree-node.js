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
                v-for="child in localEntityChildren" :entityId="child.getRaw()" />
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
                .addEventListener(DATABASE_EVENTS.READ_RESULT, this.onRead.bind(this))
                .addEventListener(DATABASE_EVENTS.REGISTER_NOTIFICATION_RESPONSE, this.onRegisterNotification.bind(this))
                .addEventListener(DATABASE_EVENTS.NOTIFICATION, this.onNotification.bind(this));

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
                this.onDatabaseConnected();
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
                
                    this.database.registerNotifications([
                        {id: event.rootId, field: "SchemaUpdateTrigger"},
                    ], "Root");
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

                    if (this.selectedNode.notificationTokens.length > 0) {
                        this.database.unregisterNotifications(this.selectedNode.notificationTokens.slice());
                        this.selectedNode.notificationTokens = [];
                    }

                    this.database.registerNotifications(event.schema.getFieldsList().map(f => {
                        return {
                            id: this.selectedNode.entityId,
                            field: f
                        };
                    }), this.selectedNode.entityId);
                }
            },

            onRead(results) {
                for (const result of results) {
                    try {
                        if (!result.getSuccess()) {
                            continue;
                        }
    
                        const protoClass = result.getValue().getTypeName().split('.').reduce((o,i)=> o[i], proto);
                        this.selectedNode.entityFields[result.getField()] = {
                            name: result.getField(),
                            value: protoClass.deserializeBinary(result.getValue().getValue_asU8()).getRaw(),
                            typeClass: protoClass,
                            typeName: result.getValue().getTypeName(),
                            writeTime: result.getWritetime().getRaw().toDate().toLocaleString( 'sv-SE', {
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                } ) + "." + result.getWritetime().getRaw().toDate().toLocaleString( 'sv-SE', {
                                    fractionalSecondDigits: 3
                                } )
                        };

                        if (protoClass === proto.qdb.Timestamp) {
                            this.selectedNode.entityFields[result.getField()].value = this.selectedNode.entityFields[result.getField()].value.toDate().toLocaleString( 'sv-SE', {
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            } );
                        }

                        if (protoClass === proto.qdb.BinaryFile) {                            
                            fetch(this.selectedNode.entityFields[result.getField()].value)
                                .then(res => res.blob())
                                .then(blob => {
                                    this.selectedNode.entityFields[result.getField()].blobUrl = window.URL.createObjectURL(blob);
                                });
                        }
                    } catch (e) {
                        qError(`[tree-node::onRead] Failed to process read response: ${e}`);
                        continue;
                    }
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
            },

            onRegisterNotification(event) {
                if (this.selectedNode.entityId !== event.responseIdentifier) {
                    return;
                }

                this.selectedNode.notificationTokens = event.tokens;
            },

            onNotification(event) {
                if (event.notification.getCurrent().getName() === "SchemaUpdateTrigger" && !this.selectedNode.notificationTokens.includes(event.notification.getToken()) ) {
                    // Received a SchemaUpdateTrigger notification, re-query the schema
                    this.database.queryEntity(this.localEntityId);
                    return;
                }

                const field = event.notification.getCurrent();

                if (this.selectedNode.entityId !== field.getId()) {
                    qWarn(`[tree-node::onNotification] Received notification for entity ${event.notification.getCurrent().getId()} but selected entity is ${this.selectedNode.entityId}`);
                    return;
                }
                
                const protoClass = field.getValue().getTypeName().split('.').reduce((o,i)=> o[i], proto);
                this.selectedNode.entityFields[field.getName()] = {
                    name: field.getName(),
                    value: protoClass.deserializeBinary(field.getValue().getValue_asU8()).getRaw(),
                    typeClass: protoClass,
                    typeName: field.getValue().getTypeName(),
                    writeTime: field.getWritetime().toDate().toLocaleString( 'sv-SE', {
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        } ) + "." + field.getWritetime().toDate().toLocaleString( 'sv-SE', {
                            fractionalSecondDigits: 3
                        } )
                };

                if (protoClass === proto.qdb.Timestamp) {
                    this.selectedNode.entityFields[field.getName()].value = this.selectedNode.entityFields[field.getName()].value.toDate().toLocaleString( 'sv-SE', {
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    } );
                }

                if (protoClass === proto.qdb.BinaryFile) {
                    fetch(this.selectedNode.entityFields[field.getName()].value)
                        .then(res => res.blob())
                        .then(blob => {
                            this.selectedNode.entityFields[field.getName()].blobUrl = window.URL.createObjectURL(blob);
                        });
                }
            }
        },

        computed: {
            expandable() {
                return this.localEntityChildren.length > 0;
            }
        }
    })
}