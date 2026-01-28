/**
 * Template Packer для After Effects
 *
 * Делает:
 * - маркировку плейсхолдеров на слоях
 * - генерацию template.json
 * - рендер preview
 * - сохранение project.aep в папку пакета
 */

(function () {
    var WIN_TITLE = "Template Packer";

    function alertError(msg) {
        alert("Template Packer: " + msg);
    }

    function getCompItems() {
        var comps = [];
        var proj = app.project;
        if (!proj) {
            return comps;
        }
        for (var i = 1; i <= proj.numItems; i++) {
            var it = proj.item(i);
            if (it instanceof CompItem) {
                comps.push(it);
            }
        }
        return comps;
    }

    function getActiveComp() {
        var proj = app.project;
        if (!proj) return null;
        if (proj.activeItem instanceof CompItem) {
            return proj.activeItem;
        }
        return null;
    }

    function addPlaceholderMarker(layer, index) {
        var markerProp = layer.property("Marker");
        if (!markerProp) return;
        var mv = new MarkerValue("PH:" + index);
        markerProp.setValueAtTime(layer.inPoint, mv);
    }

    function parsePlaceholderIndex(layer) {
        var markerProp = layer.property("Marker");
        if (!markerProp || markerProp.numKeys < 1) return null;
        var mv = markerProp.keyValue(1);
        if (!mv || !mv.comment) return null;
        var match = /^PH:(\d+)/.exec(mv.comment);
        if (!match) return null;
        return parseInt(match[1], 10);
    }

    function detectPlaceholderType(layer) {
        if (layer.source instanceof CompItem) {
            return "comp";
        }
        if (layer.source instanceof FootageItem) {
            try {
                if (layer.source.mainSource && layer.source.mainSource.isStill) {
                    return "image";
                }
            } catch (e) {}
            return "video";
        }
        return "footage";
    }

    function buildTemplateJson(templateId, name, description, mainCompName, placeholders, preview) {
        return {
            id: templateId,
            name: name,
            description: description,
            mainCompName: mainCompName,
            preview: preview,
            placeholders: placeholders
        };
    }

    function writeJsonFile(file, data) {
        if (!file) return false;
        file.encoding = "UTF-8";
        if (!file.open("w")) return false;
        var json;
        if (typeof JSON !== "undefined" && JSON.stringify) {
            json = JSON.stringify(data, null, 2);
        } else {
            json = data.toSource();
        }
        file.write(json);
        file.close();
        return true;
    }

    function renderPreview(comp, outFile) {
        try {
            var rqItem = app.project.renderQueue.items.add(comp);
            var om = rqItem.outputModule(1);
            try {
                om.applyTemplate("H.264");
            } catch (e) {
                // fallback to default template
            }
            om.file = outFile;
            rqItem.render = true;
            app.project.renderQueue.render();
        } catch (e2) {
            alertError("Preview render failed: " + e2.toString());
        }
    }

    function collectPlaceholders(comp) {
        var list = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (!layer || !layer.source) continue;
            var idx = parsePlaceholderIndex(layer);
            if (idx === null || isNaN(idx)) continue;
            list.push({
                index: idx,
                label: layer.name,
                type: detectPlaceholderType(layer),
                layerRef: "Layer " + i
            });
        }
        list.sort(function (a, b) { return a.index - b.index; });
        return list;
    }

    function buildUI() {
        var win = new Window("palette", WIN_TITLE, undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];

        var groupMeta = win.add("panel", undefined, "Template Info");
        groupMeta.orientation = "column";
        groupMeta.alignChildren = ["fill", "top"];

        var idRow = groupMeta.add("group");
        idRow.add("statictext", undefined, "ID:");
        var idInput = idRow.add("edittext", undefined, "basic_story");
        idInput.characters = 20;

        var nameRow = groupMeta.add("group");
        nameRow.add("statictext", undefined, "Name:");
        var nameInput = nameRow.add("edittext", undefined, "Basic Story");
        nameInput.characters = 20;

        var descRow = groupMeta.add("group");
        descRow.add("statictext", undefined, "Description:");
        var descInput = descRow.add("edittext", undefined, "Template description");
        descInput.characters = 30;

        var compRow = groupMeta.add("group");
        compRow.add("statictext", undefined, "Main Comp:");
        var compDropdown = compRow.add("dropdownlist", undefined, []);

        var comps = getCompItems();
        for (var c = 0; c < comps.length; c++) {
            compDropdown.add("item", comps[c].name);
        }
        if (compDropdown.items.length > 0) compDropdown.selection = 0;

        var outputRow = groupMeta.add("group");
        outputRow.add("statictext", undefined, "Output folder:");
        var outputInput = outputRow.add("edittext", undefined, "");
        outputInput.characters = 25;
        var browseBtn = outputRow.add("button", undefined, "Browse");
        browseBtn.onClick = function () {
            var folder = Folder.selectDialog("Select output folder");
            if (folder) outputInput.text = folder.fsName;
        };

        var groupActions = win.add("panel", undefined, "Actions");
        groupActions.orientation = "column";
        groupActions.alignChildren = ["fill", "top"];

        var markBtn = groupActions.add("button", undefined, "Mark placeholders (selected layers)");
        var buildBtn = groupActions.add("button", undefined, "Build package");

        markBtn.onClick = function () {
            var comp = getActiveComp();
            if (!comp) {
                alertError("No active comp");
                return;
            }
            var sel = comp.selectedLayers;
            if (!sel || sel.length === 0) {
                alertError("Select layers to mark");
                return;
            }
            app.beginUndoGroup("Mark Placeholders");
            for (var i = 0; i < sel.length; i++) {
                addPlaceholderMarker(sel[i], i + 1);
            }
            app.endUndoGroup();
            alert("Marked " + sel.length + " layers as placeholders.");
        };

        buildBtn.onClick = function () {
            var proj = app.project;
            if (!proj) {
                alertError("Project not found");
                return;
            }
            var compName = compDropdown.selection ? compDropdown.selection.text : "";
            var comp = null;
            for (var i = 0; i < comps.length; i++) {
                if (comps[i].name === compName) {
                    comp = comps[i];
                    break;
                }
            }
            if (!comp) {
                alertError("Main comp not selected");
                return;
            }
            var outDir = outputInput.text;
            if (!outDir) {
                alertError("Output folder is required");
                return;
            }

            var templateId = idInput.text;
            if (!templateId) {
                alertError("Template ID is required");
                return;
            }

            var packageFolder = new Folder(outDir + "/" + templateId);
            if (!packageFolder.exists) {
                packageFolder.create();
            }

            var placeholders = collectPlaceholders(comp);
            if (placeholders.length === 0) {
                alertError("No placeholders found. Mark layers first.");
                return;
            }

            // Render preview
            var previewFile = new File(packageFolder.fsName + "/preview.mp4");
            renderPreview(comp, previewFile);

            // Save project copy
            var projectFile = new File(packageFolder.fsName + "/project.aep");
            proj.save(projectFile);

            var templateJson = buildTemplateJson(
                templateId,
                nameInput.text,
                descInput.text,
                comp.name,
                placeholders,
                { mp4: "preview.mp4", jpg: "preview.jpg" }
            );

            var jsonFile = new File(packageFolder.fsName + "/template.json");
            writeJsonFile(jsonFile, templateJson);

            alert("Package created in: " + packageFolder.fsName);
        };

        win.onResizing = win.onResize = function () { this.layout.resize(); };
        return win;
    }

    var ui = buildUI();
    ui.show();
})();

