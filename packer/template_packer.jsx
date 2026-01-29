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
    var placeholderCounter = 1;

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

    function addPlaceholderMarker(layer, index, label) {
        var markerProp = layer.property("Marker");
        if (!markerProp) return;
        var comment = "PH:" + index;
        if (label && label.length) {
            comment += "_" + label;
        }
        var mv = new MarkerValue(comment);
        markerProp.setValueAtTime(layer.inPoint, mv);
    }

    function parsePlaceholderIndex(layer) {
        var markerProp = layer.property("Marker");
        if (!markerProp || markerProp.numKeys < 1) return null;
        var mv = markerProp.keyValue(1);
        if (!mv || !mv.comment) return null;
        var match = /^PH:(\d+)(?:_(.*))?/.exec(mv.comment);
        if (!match) return null;
        return parseInt(match[1], 10);
    }

    function parsePlaceholderLabel(layer) {
        var markerProp = layer.property("Marker");
        if (!markerProp || markerProp.numKeys < 1) return "";
        var mv = markerProp.keyValue(1);
        if (!mv || !mv.comment) return "";
        var match = /^PH:(\d+)(?:_(.*))?/.exec(mv.comment);
        if (!match) return "";
        return match[2] || "";
    }

    function detectPlaceholderType(layer) {
        try {
            if (layer && layer.property && layer.property("Source Text")) {
                return "text";
            }
        } catch (e) {}
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

    function buildTemplateJson(templateId, name, description, mainCompName, placeholders, preview, project) {
        return {
            id: templateId,
            name: name,
            description: description,
            mainCompName: mainCompName,
            preview: preview,
            project: project,
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

    function collectAssets(packageFolder) {
        try {
            var assetsFolder = new Folder(packageFolder.fsName + "/assets");
            if (!assetsFolder.exists) {
                assetsFolder.create();
            }

            if (app.project.collectFiles) {
                app.project.collectFiles(assetsFolder);
                return;
            }

            // Fallback: manual copy (without relink)
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof FootageItem && it.file) {
                    try {
                        var dst = new File(assetsFolder.fsName + "/" + it.file.name);
                        it.file.copy(dst);
                    } catch (e1) {}
                }
            }
        } catch (e2) {
            alertError("Collect assets failed: " + e2.toString());
        }
    }

    function collectPlaceholders(comp) {
        var list = [];
        var visited = [];

        function alreadyVisited(target) {
            for (var v = 0; v < visited.length; v++) {
                if (visited[v] === target) return true;
            }
            visited.push(target);
            return false;
        }

        function walk(targetComp) {
            if (!targetComp || !(targetComp instanceof CompItem)) return;
            if (alreadyVisited(targetComp)) return;

            for (var i = 1; i <= targetComp.numLayers; i++) {
                var layer = targetComp.layer(i);
                if (!layer) continue;

                var idx = parsePlaceholderIndex(layer);
                if (idx !== null && !isNaN(idx)) {
                    var label = parsePlaceholderLabel(layer);
                    list.push({
                        index: idx,
                        label: label && label.length ? label : layer.name,
                        type: detectPlaceholderType(layer),
                        layerRef: targetComp.name + " : Layer " + i
                    });
                }

                if (layer.source instanceof CompItem) {
                    walk(layer.source);
                }
            }
        }

        walk(comp);
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

        var counterRow = groupActions.add("group");
        counterRow.add("statictext", undefined, "Counter:");
        var counterInput = counterRow.add("edittext", undefined, String(placeholderCounter));
        counterInput.characters = 6;
        var resetBtn = counterRow.add("button", undefined, "Reset");

        var reduceRow = groupActions.add("group");
        var reduceCheckbox = reduceRow.add("checkbox", undefined, "Reduce project + collect assets");
        reduceCheckbox.value = true;

        var markBtn = groupActions.add("button", undefined, "Mark placeholders (selected layers)");
        var buildBtn = groupActions.add("button", undefined, "Build package");

        resetBtn.onClick = function () {
            placeholderCounter = 1;
            counterInput.text = "1";
        };

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
            var startIdx = parseInt(counterInput.text, 10);
            if (isNaN(startIdx) || startIdx <= 0) {
                startIdx = placeholderCounter;
            }
            for (var i = 0; i < sel.length; i++) {
                var idx = startIdx + i;
                addPlaceholderMarker(sel[i], idx, sel[i].name);
            }
            placeholderCounter = startIdx + sel.length;
            counterInput.text = String(placeholderCounter);
            app.endUndoGroup();
            alert("Marked " + sel.length + " layers as placeholders.");
        };

        buildBtn.onClick = function () {
            var proj = app.project;
            if (!proj) {
                alertError("Project not found");
                return;
            }
            if (!proj.file) {
                alertError("Save the project before packaging");
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

            var originalFile = proj.file;
            var workProjectFile = new File(packageFolder.fsName + "/_working.aep");
            try {
                proj.save(workProjectFile);
            } catch (eSaveCopy) {
                alertError("Failed to save project copy: " + eSaveCopy.toString());
                return;
            }

            app.open(workProjectFile);
            proj = app.project;
            var compCopy = null;
            for (var ci = 1; ci <= proj.numItems; ci++) {
                var it = proj.item(ci);
                if (it instanceof CompItem && it.name === compName) {
                    compCopy = it;
                    break;
                }
            }
            if (!compCopy) {
                alertError("Main comp not found in copied project");
                if (originalFile) app.open(originalFile);
                return;
            }
            comp = compCopy;

            if (reduceCheckbox.value) {
                try {
                    app.project.reduceProject(comp);
                } catch (eReduce) {
                    alertError("Reduce project failed: " + eReduce.toString());
                }
            }

            // Render preview
            var previewFile = new File(packageFolder.fsName + "/preview.mp4");
            renderPreview(comp, previewFile);

            // Save project copy
            var projectFile = new File(packageFolder.fsName + "/project.aep");
            proj.save(projectFile);

            if (reduceCheckbox.value) {
                collectAssets(packageFolder);
            }

            var templateJson = buildTemplateJson(
                templateId,
                nameInput.text,
                descInput.text,
                comp.name,
                placeholders,
                { mp4: "preview.mp4", jpg: "preview.jpg" },
                { aep: "project.aep" }
            );

            var jsonFile = new File(packageFolder.fsName + "/template.json");
            writeJsonFile(jsonFile, templateJson);

            if (originalFile) {
                try {
                    app.open(originalFile);
                } catch (_eOpen) {}
            }
            alert("Package created in: " + packageFolder.fsName);
        };

        win.onResizing = win.onResize = function () { this.layout.resize(); };
        return win;
    }

    var ui = buildUI();
    ui.show();
})();

