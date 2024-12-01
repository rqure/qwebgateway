function registerTreeNodeComponent(app, context) {
    app.provide('treeStore', context.treeStore);

    return app.component("tree-node", {
        template: `
            <li class="tree-node" 
                :class="{ 'selected': isSelected, 'has-children': hasChildren }" 
                @click.stop="onNodeSelect"
                @contextmenu.prevent="showContextMenu">
                <div class="tree-node-content">
                    <i v-if="hasChildren" 
                       class="bi bi-chevron-right tree-node-icon" 
                       :class="{ 'expanded': expanded }"
                       @click.stop="toggleExpand"></i>
                    <i v-else class="bi bi-circle-fill tree-node-icon opacity-25"></i>
                    <span class="badge rounded-pill" 
                          :class="'text-bg-' + getTypeColor()">{{nodeData.type}}</span>
                    <span>{{nodeData.name || nodeData.id}}</span>
                </div>
                <transition name="expand">
                    <ul v-if="expanded" class="list-unstyled tree-node-children">
                        <tree-node v-for="childId in nodeData.children" 
                                 :key="childId"
                                 :entity-id="childId" />
                    </ul>
                </transition>
            </li>`,

        props: {
            entityId: {
                type: String,
                required: true
            }
        },

        data() {
            return {
                expanded: this.entityId === "", // Auto-expand root node
                nodeData: Vue.reactive({
                    id: this.entityId || "", // Ensure empty string if undefined
                    name: "",
                    type: "",
                    children: []
                })
            }
        },

        inject: ['treeStore'],

        async created() {
            // Register this node instance with the store
            this.treeStore.registerNode(this.entityId || "", this);
            
            if (this.database.isConnected()) {
                await this.initializeNode();
                if (this.entityId === "") {
                    // Only root node needs to listen for schema updates
                    await this.registerSchemaUpdateListener();
                }
            }

            // Set up database event listeners
            this.database.getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));
        },

        beforeUnmount() {
            this.treeStore.unregisterNode(this.entityId);
            // Clean up notifications if this is root node
            if (this.notificationToken) {
                this.database.unregisterNotifications([this.notificationToken]);
            }
        },

        computed: {
            database() {
                return context.qDatabaseInteractor;
            },
            isSelected() {
                return this.treeStore.selectedNode.entityId === this.entityId;
            },
            hasChildren() {
                return this.nodeData.children.length > 0;
            }
        },

        methods: {
            async initializeNode() {
                try {
                    if (this.entityId === "") {
                        const rootEvent = await this.database.queryRootEntityId();
                        this.nodeData.id = rootEvent.rootId;
                        await this.registerSchemaUpdateListener();
                    }
                    
                    const entityEvent = await this.database.queryEntity(this.nodeData.id);
                    this.updateNodeFromEntity(entityEvent.entity);
                } catch (error) {
                    qError(`[TreeNode::initializeNode] Failed to initialize node ${this.entityId}: ${error}`);
                }
            },

            updateNodeFromEntity(entity) {
                this.nodeData.name = entity.getName();
                this.nodeData.type = entity.getType();
                
                // Convert EntityReference objects to strings and update children
                const newChildren = entity.getChildrenList().map(child => {
                    return typeof child === 'string' ? child : child.getRaw();
                });

                // Only update if children have changed
                if (JSON.stringify(this.nodeData.children) !== JSON.stringify(newChildren)) {
                    this.nodeData.children = newChildren;
                }
            },

            async registerSchemaUpdateListener() {
                try {
                    const event = await this.database.registerNotifications([
                        {type: "Root", field: "SchemaUpdateTrigger"}
                    ], this.onSchemaUpdate.bind(this));
                    this.notificationToken = event.tokens[0];
                } catch (error) {
                    qError(`[TreeNode::registerSchemaUpdateListener] Failed to register schema update listener: ${error}`);
                }
            },

            async onSchemaUpdate(notification) {
                if (notification.getCurrent().getName() === "SchemaUpdateTrigger") {
                    // Refresh all nodes when schema updates
                    const nodes = Array.from(this.treeStore.nodes.values());
                    for (const node of nodes) {
                        await node.initializeNode();
                    }
                }
            },

            onDatabaseConnected() {
                this.initializeNode();
            },

            onDatabaseDisconnected() {
                // Clear node data but maintain structure
                this.nodeData.name = "";
                this.nodeData.type = "";
                this.nodeData.children = [];
            },

            onNodeSelect() {
                this.treeStore.selectNode(this.nodeData);
            },

            toggleExpand() {
                this.expanded = !this.expanded;
            },

            getTypeColor() {
                const hash = this.nodeData.type.split('').reduce((acc, char) => {
                    return char.charCodeAt(0) + ((acc << 5) - acc);
                }, 0);
                const colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
                return colors[Math.abs(hash) % colors.length];
            },

            showContextMenu(event) {
                context.contextMenuManager.show(event, {
                    entityId: this.nodeData.id,
                    entityType: this.nodeData.type,
                    entityName: this.nodeData.name
                });
            }
        }
    });
}