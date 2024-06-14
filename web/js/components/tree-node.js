function registerTreeNodeComponent(app, context) {
    return app.component("tree-node", {
        template: `
    <li class="list-group-item list-group-item-action">
        <div>{{name}}<span v-if="expandable">[{{ expanded ? '-' : '+' }}]</span></div>
        <ul class="list-group">
            <tree-node v-for="child in children" :name="child.name" :type="child.type" :id="child.id" :children="child.children"></tree-node>
        </ul>
    </li>`,
        data() {
            return {
                name: "",
                type: "",
                id: "",
                children: [],
                expanded: false,
                serverInteractor: context.qConfigServerInteractor
            }
        },
        async mounted() {
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

                        this.name = response.getEntity().getName();
                        this.type = response.getEntity().getType();
                        this.id = response.getEntity().getId();
                        this.children = response.getEntity().getChildrenList();
                    })
                    .catch(error => {
                        qError(`[tree-node::mounted] Failed to get entity: ${error}`)
                        this.name = "";
                        this.type = "";
                        this.id = "";
                        this.children = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[tree-node::mounted] Retrying get entity request...")
                            setTimeout(() => getEntity(entityId), 1000);
                        }
                    });
            }

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
                        this.name = "";
                        this.type = "";
                        this.id = "";
                        this.children = [];

                        if (error.message === "Connection closed" ) {
                            qInfo("[tree-node::mounted] Retrying get root request...")
                            setTimeout(getRoot, 1000);
                        }
                    });
            }

            if (this.id === "") {
                getRoot();
            } else {
                getEntity(this.id);
            }
        },
        methods: {

        },
        computed: {
            expandable() {
                return this.children.length > 0;
            }
        }
    })
}