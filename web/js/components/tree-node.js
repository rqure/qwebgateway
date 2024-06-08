function NewTreeNode(app) {
    return app.component("tree-node", {
        // template: "#tree-node-template",
        template: `
    <li>
        <div>{{name}}<span v-if="expandable">[{{ expanded ? '-' : '+' }}]</span></div>
        <ul>
            <tree-node v-for="child in children" :name="child.name" :type="child.type" :id="child.id" :children="child.children"></tree-node>
        </ul>
    </li>`,
        data() {
            return {
                name: "{{name}}",
                type: "{{type}}",
                id: "{{id}}",
                children: [],
                expanded: false
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