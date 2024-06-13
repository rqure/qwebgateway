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
                <div class="mb-3">
                    <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Add Field
                    </button>
                    <ul class="dropdown-menu">
                        <li class="dropdown-item" v-for="availableField in availableFields" @click="onSelectField(availableField)">{{availableField}}</li>
                    </ul>
                </div>
                <ul>
                    <li v-for="field in entityFields">
                        {{field}}<span class="badge text-bg-secondary" @click="onDeleteField(field)">🗑</span>
                    </li>
                </ul>
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
                allFields: [],
                serverInteractor: context.qConfigServerInteractor
            }
        },
        mounted() {

        },
        methods: {
            onSelectField(field) {
                this.entityFields.push(field);
            },
            onDeleteField(field) {
                this.entityFields = this.entityFields.filter(f => f !== field);
            }
        },
        computed: {
            availableFields() {
                return this.allFields.filter(field => !this.entityFields.includes(field));
            }
        }
    })
}