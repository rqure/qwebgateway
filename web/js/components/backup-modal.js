function registerBackupModalComponent(app) {
    return app.component("backup-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Database Backup</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Modal body text goes here.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success">Backup</button>
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
                serverInteractor: app.serverInteractor
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