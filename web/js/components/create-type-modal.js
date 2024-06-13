function registerCreateTypeModalComponent(app, context) {
    return app.component("create-type-modal", {
        template: `
<div class="modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Type</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="entityTypeNameInput" placeholder="ExampleType" v-model="entityType">
                    <label for="entityTypeNameInput">Type Name</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success">Create</button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                entityType: "",
                entityFields: [],
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {

        },
        computed: {

        }
    })
}