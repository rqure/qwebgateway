function registerTreeContextMenuComponent(app, context) {
    // Register tooltip directive
    app.directive('tooltip', {
        mounted(el, binding) {
            new bootstrap.Tooltip(el, {
                title: binding.value,
                placement: binding.arg || 'top',
                trigger: 'hover'
            });
        },
        unmounted(el) {
            const tooltip = bootstrap.Tooltip.getInstance(el);
            if (tooltip) {
                tooltip.dispose();
            }
        }
    });

    app.component('tree-context-menu', {
        template: `
            <div class="context-menu" v-show="visible" :style="menuStyle">
                <div class="list-group">
                    <!-- Entity Actions -->
                    <div class="context-menu-group">
                        <div class="context-menu-header">Entity Actions</div>
                        <button class="list-group-item list-group-item-action d-flex align-items-center gap-2" 
                                @click="handleAction('create-child-entity')"
                                v-tooltip="'Ctrl+N'">
                            <i class="bi bi-plus-circle"></i> Create Child Entity
                        </button>
                        <button class="list-group-item list-group-item-action d-flex align-items-center gap-2" 
                                @click="handleAction('delete-entity')"
                                v-if="canDelete">
                            <i class="bi bi-trash"></i> Delete This Entity
                        </button>
                    </div>
                    
                    <!-- Schema Actions -->
                    <div class="context-menu-group">
                        <div class="context-menu-header">Schema Actions</div>
                        <button class="list-group-item list-group-item-action d-flex align-items-center gap-2" 
                                @click="handleAction('create-type')"
                                v-tooltip="'Ctrl+T'">
                            <i class="bi bi-gear"></i> Create Type
                        </button>
                    </div>

                    <!-- Database Actions -->
                    <div class="context-menu-group">
                        <div class="context-menu-header">Database Actions</div>
                        <button class="list-group-item list-group-item-action d-flex align-items-center gap-2" 
                                @click="handleAction('backup')"
                                v-tooltip="'Ctrl+B'">
                            <i class="bi bi-download"></i> Backup
                        </button>
                        <button class="list-group-item list-group-item-action d-flex align-items-center gap-2" 
                                @click="handleAction('restore')"
                                v-tooltip="'Ctrl+R'">
                            <i class="bi bi-upload"></i> Restore
                        </button>
                    </div>
                </div>
            </div>`,

        inject: ['treeStore'],

        mounted() {
            context.contextMenuManager.instance = this;
            document.addEventListener('click', this.hide);
            document.addEventListener('contextmenu', this.hide);
            console.log('Context menu mounted:', this); // Debug log
        },

        data() {
            return {
                visible: false,
                x: 0,
                y: 0,
                targetNode: null
            }
        },

        computed: {
            menuStyle() {
                return {
                    left: this.x + 'px',
                    top: this.y + 'px',
                    display: this.visible ? 'block' : 'none'
                }
            },
            canDelete() {
                return this.targetNode && this.targetNode.id !== "root";
            }
        },

        methods: {
            show(event, node) {
                console.log('Show context menu:', event, node);
                event.preventDefault();
                event.stopPropagation();
                
                this.targetNode = node;
                this.visible = true;
                
                // Position menu handling
                this.x = event.clientX;
                this.y = event.clientY;

                // Adjust position if menu would go off screen
                this.$nextTick(() => {
                    const menu = this.$el;
                    const rect = menu.getBoundingClientRect();
                    
                    if (this.x + rect.width > window.innerWidth) {
                        this.x = window.innerWidth - rect.width;
                    }
                    
                    if (this.y + rect.height > window.innerHeight) {
                        this.y = window.innerHeight - rect.height;
                    }
                });
            },

            hide(event) {
                if (event && event.type === 'contextmenu') {
                    const path = event.composedPath();
                    if (path.some(el => el.classList && el.classList.contains('tree-node'))) {
                        return;
                    }
                }
                this.visible = false;
                this.targetNode = null;
            },

            handleAction(action) {
                this.hide();
                
                switch(action) {
                    case 'create-child-entity':
                        new bootstrap.Modal(document.getElementById('create-entity-modal')).show();
                        break;
                    case 'delete-entity':
                        new bootstrap.Modal(document.getElementById('delete-entity-modal')).show();
                        break;
                    case 'create-type':
                        new bootstrap.Modal(document.getElementById('create-type-modal')).show();
                        break;
                    case 'backup':
                        new bootstrap.Modal(document.getElementById('backup-modal')).show();
                        break;
                    case 'restore':
                        new bootstrap.Modal(document.getElementById('restore-modal')).show();
                        break;
                }
            }
        },

        beforeUnmount() {
            document.removeEventListener('click', this.hide);
            document.removeEventListener('contextmenu', this.hide);
            if (context.contextMenuManager.instance === this) {
                context.contextMenuManager.instance = null;
            }
        }
    });
}