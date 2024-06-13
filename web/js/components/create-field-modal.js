function registerCreateFieldModalComponent(app, context) {
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
                    <input type="text" class="form-control" id="fieldNameInput" placeholder="ExampleField" v-model="fieldName">
                    <label for="fieldNameInput">Field Name</label>
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary dropdown-toggle btn-lg w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        {{selectedFieldType || "Select Type"}}
                    </button>
                    <ul class="dropdown-menu scrollable-dropdown-menu">
                        <li v-for="fieldType in availableTypes" @click="onTypeSelect(fieldType)"><a class="dropdown-item">{{fieldType}}</a></li>
                    </ul>
              </div>
            </div>
            <div class="modal-footer">
                <button type="button"
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    @click="onCancelButtonPressed">
                    Cancel
                </button>
                <button type="button"
                    class="btn btn-success"
                    @click="onCreateButtonPressed"
                    :disabled="isCreateDisabled">
                    Create
                </button>
            </div>
        </div>
    </div>
</div>`,
        data() {
            return {
                fieldName: "",
                selectedFieldType: "",
                availableTypes: Object.keys(proto.qmq)
                                    .filter(type => !type.startsWith("Web")),
                serverInteractor: context.qConfigServerInteractor
            }
        },
        async mounted() {
            
        },
        methods: {
            async onCancelButtonPressed() {
                const me = this;
                me.fieldName = "";
                me.selectedFieldType = "";
            },

            async onCreateButtonPressed() {
                const me = this;
                const request = new proto.qmq.WebConfigSetFieldSchemaRequest();
                request.setField( me.fieldName );

                const schema = new proto.qmq.DatabaseFieldSchema();
                schema.setName( me.fieldName );
                schema.setType( 'qmq.' + me.selectedFieldType );
                request.setSchema( schema );

                me.serverInteractor.send(request, proto.qmq.WebConfigSetFieldSchemaResponse)
                    .then(response => {
                        qDebug("[create-field-modal::onCreateButtonPressed] Response: " + response);
                    })
                    .catch(error => {
                        qError("[create-field-modal::onCreateButtonPressed] Could not complete the request: " + error)
                    });
            },

            async onTypeSelect(fieldType) {
                const me = this;
                me.selectedFieldType = fieldType;
            }
        },
        computed: {
            isCreateDisabled() {
                const me = this;
                return me.fieldName.length == 0 || me.selectedFieldType.length == 0;
            },
        }
    })
}