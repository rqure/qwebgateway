function registerEntityViewerComponent(app, context) {
    return app.component("entity-viewer", {
        template: `
<div v-if="selectedNode.entityId.length" class="container-fluid border border-secondary rounded fill-v">
    <div class="row mt-3 mb-3">
        <label class="col-sm-2 col-form-label">Type</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityType" readonly>
        </div>
    </div>
    <div class="row mb-3">
        <label class="col-sm-2 col-form-label">Id</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityId" readonly>
        </div>
    </div>
    <div class="row mb-3">
        <label class="col-sm-2 col-form-label">Name</label>
        <div class="col-sm-10">
            <input type="text" class="form-control" v-model="selectedNode.entityName" readonly>
        </div>
    </div>
    <div v-for="(field, name) in selectedNode.entityFields" :key="name" class="row mb-3">
        <label class="col-sm-2 col-form-label">{{name}}</label>
        <div v-if="field.typeName === 'qmq.Bool'" class="col-sm-6">
            <label class="visually-hidden" v-bind:for="\`\${selectedNode.entityId}-\${name}\`">Choices</label>
            <select class="form-select" v-model="field.value" @change=onBoolFieldChange(field) :id="\`\${selectedNode.entityId}-\${name}\`">
                <option value="false">False</option>
                <option value="true">True</option>  
            </select>
        </div>
        <div v-if="field.typeName === 'qmq.Int'" class="col-sm-6">
            <input type="number" class="form-control" v-model="field.value" @change="onIntFieldChange(field)">
        </div>
        <div v-if="field.typeName === 'qmq.Float'" class="col-sm-6">
            <input type="number" class="form-control" v-model="field.value" @change="onFloatFieldChange(field)">
        </div>
        <div v-if="field.typeName === 'qmq.String'" class="col-sm-6">
            <input type="text" class="form-control" v-model="field.value" @change="onStringFieldChange(field)">
        </div>
        <div v-if="field.typeName === 'qmq.Timestamp'" class="col-sm-6">
            <input type="datetime-local" class="form-control" v-model="field.value" @change="onTimestampFieldChanged(field)">
        </div>
        <div v-if="field.typeName === 'qmq.BinaryFile'" class="col-sm-6">
            <input type="file" class="form-control" @change="onFileSelected(event, field)">
        </div>
        <div v-if="field.typeName === 'qmq.EntityReference'" class="col-sm-6">
            <input type="text" class="form-control" v-model="field.value" @change="onEntityReferenceChanged(field)">
        </div>
        <div v-if="isEnum(field.typeClass)" class="col-sm-6">
            <label class="visually-hidden" v-bind:for="\`\${selectedNode.entityId}-\${name}\`">Choices</label>
            <select class="form-select" v-model="field.value" :id="\`\${selectedNode.entityId}-\${name}\`" @change="onEnumFieldChanged(field)">
                <option v-for="(choiceValue, choiceName) in enumChoices(field.typeClass)" :value="choiceValue">{{choiceName}}</option>
            </select>
        </div>
        <label class="col-sm-4 col-form-label">{{field.writeTime}}</label>
    </div>
</div>`,

        data() {
            context.qDatabaseInteractor
                .getEventManager()
                .addEventListener(DATABASE_EVENTS.CONNECTED, this.onDatabaseConnected.bind(this))
                .addEventListener(DATABASE_EVENTS.DISCONNECTED, this.onDatabaseDisconnected.bind(this));

            return {
                selectedNode: context.selectedNode,
                database: context.qDatabaseInteractor,
                isDatabaseConnected: false
            }
        },

        mounted() {
            this.isDatabaseConnected = this.database.isConnected();
        },

        methods: {
            onDatabaseConnected() {
                this.isDatabaseConnected = true;
            },

            onDatabaseDisconnected() {
                this.isDatabaseConnected = false;
            },

            isEnum(typeClass) {
                for (let key in typeClass) {
                    if (key.endsWith("Enum")) {
                        return true;
                    }
                }

                return false;
            },

            enumChoices(typeClass) {
                for (let key in typeClass) {
                    if (key.endsWith("Enum")) {
                        return typeClass[key];
                    }
                }

                return {};
            },

            onBoolFieldChange(field) {
                const value = new proto.qmq.Bool();
                value.setRaw(field.value === "true");
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onIntFieldChange(field) {
                const parsedValue = parseInt(field.value);
                if (isNaN(parsedValue)) {
                    return;
                }

                const value = new proto.qmq.Int();
                value.setRaw(parsedValue);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onFloatFieldChange(field) {
                const parsedValue = parseFloat(field.value);
                if (isNaN(parsedValue)) {
                    return;
                }

                const value = new proto.qmq.Float();
                value.setRaw(parsedValue);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onStringFieldChange(field) {
                const value = new proto.qmq.String();
                value.setRaw(field.value);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onTimestampFieldChanged(field) {
                const value = new proto.qmq.Timestamp();
                value.setRaw( new proto.google.protobuf.Timestamp.fromDate(new Date(field.value)) );
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onEntityReferenceChanged(field) {
                const value = new proto.qmq.EntityReference();
                value.setRaw(field.value);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onEnumFieldChanged(field) {
                const value = new field.typeClass();
                value.setRaw(parseInt(field.value));
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                this.database.write([
                    {
                        id: this.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]);
            },

            onFileSelected(event, field) {
                const me = this;
                const file = event.target.files[0];
                if (!file) {
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    field.value = new Uint8Array(e.target.result);
                };
                reader.readAsArrayBuffer(file);
            }
        },

        computed: {
            
        }
    })
}