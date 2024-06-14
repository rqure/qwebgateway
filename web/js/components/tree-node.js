function registerTreeNodeComponent(app, context) {
    return app.component("tree-node", {
        template: `
    <li class="list-group-item list-group-item-action">
        <div>
            <span class="badge text-bg-primary">{{entityType}}</span>
            {{entityName}}
            <span class="badge text-bg-info" v-if="expandable">{{ expanded ? '-' : '+' }}</span>
        </div>
        <ul class="list-group">
            <tree-node
                v-for="child in entityChildren"
                :entityName="child.entityName"
                :entityType="child.entityType"
                :entityId="child.entityId"
                :entityChildren="child.entityChildren" />
        </ul>
    </li>`,
        data() {
            return {
                entityName: "",
                entityType: "",
                entityId: "",
                entityChildren: [],
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

                            obj.entityChildren.push(childObj);
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

                        this.entityName = response.getEntity().getName();
                        this.entityType = response.getEntity().getType();
                        this.entityId = response.getEntity().getId();

                        getChildren(this, response.getEntity().getChildrenList());
                    })
                    .catch(error => {
                        qError(`[tree-node::mounted] Failed to get entity: ${error}`)
                        this.entityName = "";
                        this.entityType = "";
                        this.entityId = "";
                        this.entityChildren = [];

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
                        this.entityName = "";
                        this.entityType = "";
                        this.entityId = "";
                        this.entityChildren = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[tree-node::mounted] Retrying get root request...")
                            setTimeout(getRoot, 1000);
                        }
                    });
            };

            if (this.entityId === "") {
                getRoot();
            }
        },
        methods: {

        },
        computed: {
            expandable() {
                return this.entityChildren.length > 0;
            }
        }
    })
}