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
                name: "{{name}}",
                type: "{{type}}",
                id: "{{id}}",
                children: [],
                expanded: false,
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

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