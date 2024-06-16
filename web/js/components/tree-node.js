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
                v-for="child in localEntityChildren"
                :key="child.entityId"
                :entityName="child.entityName"
                :entityType="child.entityType"
                :entityId="child.entityId"
                :entityChildren="child.entityChildren" />
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
            return {
                localEntityId: this.entityId,
                localEntityName: this.entityName,
                localEntityType: this.entityType,
                localEntityChildren: this.entityChildren,
                expanded: false,
                serverInteractor: context.qConfigServerInteractor
            }
        },
        async created() {
            const getChildren = (obj, children) => {
                children.forEach(child => {
                    const childRequest = new proto.qmq.WebConfigGetEntityRequest();
                    childRequest.setId(child.getId());

                    this.serverInteractor
                        .send(childRequest, proto.qmq.WebConfigGetEntityResponse)
                        .then(childResponse => {
                            qInfo(`[tree-node::created] Received get entity response: ${childResponse.getStatus()}`);
                            if (childResponse.getStatus() !== proto.qmq.WebConfigGetEntityResponse.StatusEnum.SUCCESS) {
                                return;
                            }

                            const childObj = {
                                entityId: childResponse.getEntity().getId(),
                                entityName: childResponse.getEntity().getName(),
                                entityType: childResponse.getEntity().getType(),
                                entityChildren: []
                            };
                            
                            getChildren(childObj, childResponse.getEntity().getChildrenList())

                            obj.localEntityChildren.push(childObj);
                        });
                });
            };

            const getEntity = (entityId) => {
                const request = new proto.qmq.WebConfigGetEntityRequest();
                request.setId(entityId);
                this.serverInteractor
                    .send(request, proto.qmq.WebConfigGetEntityResponse)
                    .then(response => {
                        qInfo(`[tree-node::mounted] Received get entity response: ${response.getStatus()}`);
                        if (response.getStatus() !== proto.qmq.WebConfigGetEntityResponse.StatusEnum.SUCCESS) {
                            return;
                        }

                        this.localEntityName = response.getEntity().getName();
                        this.localEntityType = response.getEntity().getType();
                        this.localEntityId = response.getEntity().getId();

                        getChildren(this, response.getEntity().getChildrenList());
                    })
                    .catch(error => {
                        qError(`[tree-node::mounted] Failed to get entity: ${error}`)
                        this.localEntityName = "";
                        this.localEntityType = "";
                        this.localEntityId = "";
                        this.localEntityChildren = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[tree-node::mounted] Retrying get entity request...")
                            setTimeout(() => getEntity(entityId), 1000);
                        }
                    });
            };

            const getRoot = () => {
                this.serverInteractor
                    .send(new proto.qmq.WebConfigGetRootRequest(), proto.qmq.WebConfigGetRootResponse)
                    .then(response => {
                        if (response.getRootid() === "") {
                            return;
                        }

                        getEntity(response.getRootid());
                    })
                    .catch(error => {
                        qError(`[tree-node::mounted] Failed to get root: ${error}`)
                        this.localEntityName = "";
                        this.localEntityType = "";
                        this.localEntityId = "";
                        this.localEntityChildren = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[tree-node::mounted] Retrying get root request...")
                            setTimeout(getRoot, 1000);
                        }
                    });
            };

            if (this.localEntityId === "") {
                getRoot();
            } else {
                getEntity(this.localEntityId);
            }
        },
        methods: {
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