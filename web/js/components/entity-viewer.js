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
            <select class="form-select" v-model="field.value" :id="\`\${selectedNode.entityId}-\${name}\`">
                <option value="false">False</option>
                <option value="true">True</option>  
            </select>
        </div>
        <div v-if="field.typeName === 'qmq.Int'" class="col-sm-6">
            <input type="number" class="form-control" v-model="field.value">
        </div>
        <div v-if="field.typeName === 'qmq.Float'" class="col-sm-6">
            <input type="number" class="form-control" v-model="field.value">
        </div>
        <div v-if="field.typeName === 'qmq.String'" class="col-sm-6">
            <input type="text" class="form-control" v-model="field.value">
        </div>
        <div v-if="field.typeName === 'qmq.Timestamp'" class="col-sm-6">
            <input type="datetime-local" class="form-control" v-model="field.value">
        </div>
        <div v-if="field.typeName === 'qmq.BinaryFile'" class="col-sm-6">
            <input type="file" class="form-control" v-model="field.value">
        </div>
        <div v-if="field.typeName === 'qmq.EntityReference'" class="col-sm-6">
            <input type="text" class="form-control" v-model="field.value">
        </div>
        <div v-if="isEnum(field.typeName)" class="col-sm-6">
            <label class="visually-hidden" v-bind:for="\`\${selectedNode.entityId}-\${name}\`">Choices</label>
            <select class="form-select" v-model="field.value" :id="\`\${selectedNode.entityId}-\${name}\`">
                <option v-for="(choiceValue, choiceName) for enumChoices(field.typeName)" :value="choiceValue">{{choiceName}}</option>
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
        },

        computed: {
            
        }
    })
}