function registerCreateFieldModalComponent(app) {
    return app.component("create-field-modal", {
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
                    <input type="text" class="form-control" id="fieldNameInput" placeholder="ExampleField">
                    <label for="fieldNameInput">Name</label>
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary dropdown-toggle btn-lg w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Type
                    </button>
                    <ul class="dropdown-menu scrollable-dropdown-menu">
                        <li v-for="fieldType in availableTypes"><a class="dropdown-item">{{fieldType}}</a></li>
                    </ul>
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
                name: "",
                type: "",
                availableTypes: Object.keys(proto.qmq),
                serverInteractor: app.serverInteractor
            }
        },
        async mounted() {
            
        },
        methods: {

        },
        computed: {

        }
    })
}