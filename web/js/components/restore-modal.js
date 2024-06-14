function registerRestoreModalComponent(app, context) {
    return app.component("restore-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Restore Database</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Modal body text goes here.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Restore</button>
            </div>
        </div>
    </div>
</div>`,
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