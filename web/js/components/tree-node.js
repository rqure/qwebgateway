function registerTreeNodeComponent(app, context) {
    return app.component("tree-node", {
        template: `
            <li class="tree-node" 
                :class="{ 'selected': isSelected }" 
                @click.stop="onFocus"
                @contextmenu.prevent="showContextMenu">
                <div class="tree-node-content">
                    <i v-if="expandable" 
                       class="bi bi-chevron-right tree-node-icon" 
                       :class="{ 'expanded': expanded }"
                       @click.stop="toggleExpand"></i>
                    <i v-else class="bi bi-circle-fill tree-node-icon opacity-25"></i>
                    <span class="badge rounded-pill" 
                          :class="'text-bg-' + getTypeColor()">{{localEntityType}}</span>
                    <span>{{localEntityName || localEntityId}}</span>
                </div>
                <ul v-if="expanded" class="list-unstyled tree-node-children">
                    <tree-node v-for="child in localEntityChildren" 
                             :key="child.getRaw()"
                             :entityId="child.getRaw()" />
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
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));

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
            if (this.database.isConnected()) {
                this.onDatabaseConnected();
            }
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;

                if (this.localEntityId === "") {
                    this.database
                        .queryRootEntityId()
                        .then(event => this.onQueryRootEntityId(event))
                        .catch(error => qError(`[TreeNode::onDatabaseConnected] Failed to query root entity ID: ${error}`));
                } else {
                    this.database
                        .queryEntity(this.localEntityId)
                        .then(event => this.onQueryEntity(event))
                        .catch(error => qError(`[TreeNode::onDatabaseConnected] Failed to query entity ${this.localEntityId}: ${error}`));
                }
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            onQueryRootEntityId(event) {
                if (this.localEntityId === "") {
                    this.localEntityId = event.rootId;

                    this.database
                        .queryEntity(this.localEntityId)
                        .then(event => this.onQueryEntity(event))
                        .catch(error => qError(`[TreeNode::onQueryRootEntityId] Failed to query entity ${this.localEntityId}: ${error}`));
                
                    this.database
                        .registerNotifications([
                            {type: "Root", field: "SchemaUpdateTrigger"},
                        ], this.onSchemaUpdate.bind(this))
                        .then(event => this.onRegisterNotification(event))
                        .catch(error => qError(`[TreeNode::onQueryRootEntityId] Failed to register notifications for entity ${this.localEntityId}: ${error}`));
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
                    this.database
                        .read(event.schema.getFieldsList().map(f => {
                            return {
                                id: this.selectedNode.entityId,
                                field: f
                            };
                        }))
                        .then(results => this.onRead(results))
                        .catch(error => qError(`[TreeNode::onQueryEntitySchema] Failed to read entity ${this.selectedNode.entityId}: ${error}`));

                    if (this.selectedNode.notificationTokens.length > 0) {
                        this.database
                            .unregisterNotifications(this.selectedNode.notificationTokens.slice())
                            .then(event => this.selectedNode.notificationTokens = [])
                            .catch(error => qError(`[TreeNode::onQueryEntitySchema] Failed to unregister notifications for entity ${this.selectedNode.entityId}: ${error}`));
                    }

                    this.database
                        .registerNotifications(event.schema.getFieldsList().map(f => {
                            return {
                                id: this.selectedNode.entityId,
                                field: f
                            };
                        }), this.onNotification.bind(this))
                        .then(event => this.onRegisterNotification(event))
                        .catch(error => qError(`[TreeNode::onQueryEntitySchema] Failed to register notifications for entity ${this.selectedNode.entityId}: ${error}`));
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
                        qError(`[TreeNode::onRead] Failed to process read response: ${e}`);
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

                this.database
                    .queryEntitySchema(this.localEntityType)
                    .then(event => this.onQueryEntitySchema(event))
                    .catch(error => qError(`[TreeNode::onFocus] Failed to query schema for entity ${this.localEntityId}: ${error}`));
            },

            onRegisterNotification(event) {
                this.selectedNode.notificationTokens = event.tokens;
            },

            onSchemaUpdate(notification) {
                if (notification.getCurrent().getName() === "SchemaUpdateTrigger" && !this.selectedNode.notificationTokens.includes(notification.getToken()) ) {
                    // Received a SchemaUpdateTrigger notification, re-query the schema
                    this.database
                        .queryEntity(this.localEntityId)
                        .then(event => this.onQueryEntity(event))
                        .catch(error => qError(`[TreeNode::onSchemaUpdate] Failed to query entity ${this.localEntityId}: ${error}`));
                }
            },

            onNotification(notification) {
                const field = notification.getCurrent();

                if (this.selectedNode.entityId !== field.getId()) {
                    qWarn(`[TreeNode::onNotification] Received notification for entity ${notification.getCurrent().getId()} but selected entity is ${this.selectedNode.entityId}`);
                    return;
                }
                
                const protoClass = field.getValue().getTypeName().split('.').reduce((o,i)=> o[i], proto);

                const model = this.selectedNode.entityFields[field.getName()];
                model.typeClass = protoClass;
                model.typeName = field.getValue().getTypeName();
                model.name = field.getName();
                if (model.typeName !== 'qdb.Transformation') {
                    model.value = protoClass.deserializeBinary(field.getValue().getValue_asU8()).getRaw();
                }
                model.writeTime = field.getWritetime().toDate().toLocaleString( 'sv-SE', {
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        } ) + "." + field.getWritetime().toDate().toLocaleString( 'sv-SE', {
                            fractionalSecondDigits: 3
                        } );

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
            },

            getTypeColor() {
                // Map entity types to Bootstrap colors
                const hash = this.localEntityType.split('').reduce((acc, char) => {
                    return char.charCodeAt(0) + ((acc << 5) - acc);
                }, 0);
                const colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
                return colors[Math.abs(hash) % colors.length];
            },

            showContextMenu(event) {
                context.contextMenuManager.show(event, {
                    entityId: this.localEntityId,
                    entityType: this.localEntityType,
                    entityName: this.localEntityName
                });
            }
        },

        computed: {
            expandable() {
                return this.localEntityChildren.length > 0;
            },
            isSelected() {
                return this.selectedNode.entityId === this.localEntityId;
            }
        }
    })
}