function registerEntityViewerComponent(app, context) {
    // Add auto-resize directive
    app.directive('auto-resize', {
        mounted(el) {
            const resize = () => {
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
            }
            el.addEventListener('input', resize)
            // Initial resize
            resize()
        }
    })

    return app.component("entity-viewer", {
        template: `
<div v-if="treeStore.selectedNode.entityId.length" class="entity-viewer">
    <div class="entity-card">
        <div class="entity-header">
            <h4 class="mb-3">Entity Details</h4>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="field-group">
                        <div class="field-label"><i class="bi bi-tag field-type-icon"></i> Type</div>
                        <input type="text" class="form-control" v-model="treeStore.selectedNode.entityType" readonly>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="field-group">
                        <div class="field-label"><i class="bi bi-key field-type-icon"></i> ID</div>
                        <input type="text" class="form-control" v-model="treeStore.selectedNode.entityId" readonly>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="field-group">
                        <div class="field-label"><i class="bi bi-pencil field-type-icon"></i> Name</div>
                        <input type="text" class="form-control" v-model="treeStore.selectedNode.entityName" readonly>
                    </div>
                </div>
            </div>
        </div>

        <div v-for="(field, name) in treeStore.selectedNode.entityFields" :key="name" class="field-group">
            <div class="row">
                <div class="col-md-3">
                    <div class="field-label">
                        <i :class="getFieldIcon(field)" class="field-type-icon"></i>
                        {{name}}
                    </div>
                </div>
                <div class="col-md-9">
                    <div class="field-value">
                        <transition name="field-update" v-if="field.typeName !== 'protobufs.Transformation'">
                            <div :key="field.value">
                                <!-- Boolean Field -->
                                <select v-if="field.typeName === 'protobufs.Bool'" 
                                        class="form-select" 
                                        v-model.lazy="field.value" 
                                        @change="onBoolFieldChange(field)">
                                    <option value="false">False</option>
                                    <option value="true">True</option>
                                </select>

                                <!-- Number Fields -->
                                <input v-if="field.typeName === 'protobufs.Int' || field.typeName === 'protobufs.Float'"
                                       type="number" 
                                       class="form-control" 
                                       v-model.lazy="field.value" 
                                       @keyup.enter="onSubmitField($event, field)"
                                       @change="field.typeName === 'protobufs.Int' ? onIntFieldChange(field) : onFloatFieldChange(field)">

                                <!-- String Field -->
                                <textarea v-if="field.typeName === 'protobufs.String'"
                                          class="form-control" 
                                          v-model.lazy="field.value" 
                                          @keyup.enter="onSubmitField($event, field)"
                                          @change="onStringFieldChange(field)"
                                          v-auto-resize
                                          rows="1"></textarea>

                                <!-- Timestamp Field -->
                                <input v-if="field.typeName === 'protobufs.Timestamp'"
                                       type="datetime-local" 
                                       class="form-control" 
                                       v-model.lazy="field.value" 
                                       @keyup.enter="onSubmitField($event, field)"
                                       @change="onTimestampFieldChanged(field)">

                                <!-- File Field -->
                                <div v-if="field.typeName === 'protobufs.BinaryFile'" class="file-control">
                                    <input type="file" :id="'file-' + name" @change="onFileSelected($event, field)">
                                    <label :for="'file-' + name">
                                        <i class="bi bi-cloud-upload me-2"></i>
                                        Choose File
                                    </label>
                                    <div v-if="field.blobUrl" class="download-btn">
                                        <a :href="field.blobUrl" download="data.bin" class="btn btn-outline-primary btn-sm">
                                            <i class="bi bi-download me-2"></i>Download File
                                        </a>
                                    </div>
                                </div>

                                <!-- Entity Reference -->
                                <input v-if="field.typeName === 'protobufs.EntityReference'"
                                       type="text" 
                                       class="form-control" 
                                       v-model.lazy="field.value" 
                                       @keyup.enter="onSubmitField($event, field)"
                                       @change="onEntityReferenceChanged(field)">

                                <!-- Enum Field -->
                                <select v-if="isEnum(field.typeClass)"
                                        class="form-select" 
                                        v-model.lazy="field.value" 
                                        @change="onEnumFieldChanged(field)">
                                    <option v-for="(choiceValue, choiceName) in enumChoices(field.typeClass)" 
                                            :value="choiceValue">{{choiceName}}</option>
                                </select>
                            </div>
                        </transition>

                        <!-- Transformation fields (no transition) -->
                        <textarea v-if="field.typeName === 'protobufs.Transformation'"
                                  class="form-control" 
                                  v-model="field.value" 
                                  @blur="onTransformationChanged(field)"
                                  @keyup.enter="$event.target.blur()"
                                  v-auto-resize
                                  rows="1"></textarea>

                        <div class="field-timestamp">{{field.writeTime}}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`,

        inject: ['treeStore'],  // Inject the tree store

        data() {
            qEntityStore
                .getEventManager()
                .addEventListener(Q_STORE_EVENTS.CONNECTED, this.onStoreConnected.bind(this))
                .addEventListener(Q_STORE_EVENTS.DISCONNECTED, this.onStoreDisconnected.bind(this));

            return {
                
            }
        },

        mounted() {
            if (qEntityStore.isConnected()) {
                this.onStoreConnected();
            }
        },

        methods: {
            onStoreConnected() {
                
            },

            onStoreDisconnected() {
                
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
                const value = new proto.protobufs.Bool();
                value.setRaw(field.value === "true");
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onBoolFieldChange] ${error}`));
            },

            onIntFieldChange(field) {
                const parsedValue = parseInt(field.value);
                if (isNaN(parsedValue)) {
                    return;
                }

                const value = new proto.protobufs.Int();
                value.setRaw(parsedValue);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onIntFieldChange] ${error}`));
            },

            onFloatFieldChange(field) {
                const parsedValue = parseFloat(field.value);
                if (isNaN(parsedValue)) {
                    return;
                }

                const value = new proto.protobufs.Float();
                value.setRaw(parsedValue);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onFloatFieldChange] ${error}`));
            },

            onStringFieldChange(field) {
                const value = new proto.protobufs.String();
                value.setRaw(field.value);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onStringFieldChange] ${error}`));
            },

            onTimestampFieldChanged(field) {
                const value = new proto.protobufs.Timestamp();
                value.setRaw( new proto.google.protobuf.Timestamp.fromDate(new Date(field.value)) );
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onTimestampFieldChanged] ${error}`));
            },

            onEntityReferenceChanged(field) {
                const value = new proto.protobufs.EntityReference();
                value.setRaw(field.value);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onEntityReferenceChanged] ${error}`));
            },

            onTransformationChanged(field) {
                const value = new proto.protobufs.Transformation();
                value.setRaw(field.value);
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onTransformationChanged] ${error}`));
            },

            onEnumFieldChanged(field) {
                const value = new field.typeClass();
                value.setRaw(parseInt(field.value));
                const valueAsAny = new proto.google.protobuf.Any();
                valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                qEntityStore.write([
                    {
                        id: this.treeStore.selectedNode.entityId,
                        field: field.name,
                        value: valueAsAny
                    }
                ]).catch(error => qError(`[EntityViewer::onEnumFieldChanged] ${error}`));
            },

            onFileSelected(event, field) {
                const me = this;
                const file = event.target.files[0];
                if (!file) {
                    return;
                }

                async function bufferToBase64(buffer) {
                    // use a FileReader to generate a base64 data URI:
                    const base64url = await new Promise(r => {
                      const reader = new FileReader()
                      reader.onload = () => r(reader.result)
                      reader.readAsDataURL(new Blob([buffer]))
                    });
                    return base64url;
                }

                const reader = new FileReader();
                reader.onload = async function(e) {
                    field.value = await bufferToBase64(new Uint8Array(e.target.result));
                    const value = new proto.protobufs.BinaryFile();
                    value.setRaw(field.value);
                    const valueAsAny = new proto.google.protobuf.Any();
                    valueAsAny.pack(value.serializeBinary(), qMessageType(value));

                    me.database.write([
                        {
                            id: me.treeStore.selectedNode.entityId,
                            field: field.name,
                            value: valueAsAny
                        }
                    ]).catch(error => qError(`[EntityViewer::onFileSelected] ${error}`));
                };
                reader.readAsArrayBuffer(file);
            },

            getFieldIcon(field) {
                const iconMap = {
                    'protobufs.Bool': 'bi-toggle2-on',
                    'protobufs.Int': 'bi-123',
                    'protobufs.Float': 'bi-graph-up',
                    'protobufs.String': 'bi-text-paragraph',
                    'protobufs.Timestamp': 'bi-calendar-event',
                    'protobufs.BinaryFile': 'bi-file-earmark-binary',
                    'protobufs.EntityReference': 'bi-link-45deg',
                    'protobufs.Transformation': 'bi-code-square'
                };
                return `bi ${iconMap[field.typeName] || 'bi-dot'}`;
            },

            onSubmitField(event, field) {
                // Prevent newline in textarea
                event.preventDefault();
                // Only blur if Shift isn't held
                if (!event.shiftKey) {
                    event.target.blur();
                }
            }
        },

        computed: {
        }
    })
}