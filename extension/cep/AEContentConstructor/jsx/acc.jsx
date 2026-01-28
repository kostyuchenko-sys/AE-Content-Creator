/**
 * AE Content Constructor - JSX runtime functions for CEP panel.
 *
 * Важно: этот файл НЕ должен автозапускаться при загрузке. Он только определяет функции,
 * которые вызывает панель через `CSInterface.evalScript`.
 */

/**
 * Возвращает массив выделенных FootageItem из Project-панели.
 */
function acc_getSelectedFootageItems() {
    var proj = app.project;
    if (!proj) return [];

    var items = proj.selection;
    var result = [];

    for (var i = 0; i < items.length; i++) {
        if (items[i] instanceof FootageItem) result.push(items[i]);
    }

    return result;
}

function acc_findCompByName(name) {
    var proj = app.project;
    if (!proj) return null;

    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem && item.name === name) return item;
    }

    return null;
}

function acc_getPlaceholderIndexFromName(layerName) {
    if (typeof layerName !== "string") return -1;

    var base = layerName.split(" ")[0];
    var match = /^PH_?(\d+)/.exec(base);
    if (!match) return -1;

    var num = parseInt(match[1], 10);
    return isNaN(num) || num <= 0 ? -1 : num - 1;
}

function acc_walkCompAndReplace(comp, footageItems, visited) {
    if (!comp || !(comp instanceof CompItem)) return;

    for (var v = 0; v < visited.length; v++) {
        if (visited[v] === comp) return;
    }
    visited.push(comp);

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);

        if (!(layer instanceof AVLayer) || !layer.source) continue;

        if (layer.source instanceof CompItem) {
            acc_walkCompAndReplace(layer.source, footageItems, visited);
        }

        var idx = acc_getPlaceholderIndexFromName(layer.name);
        if (idx >= 0 && idx < footageItems.length && footageItems[idx]) {
            layer.replaceSource(footageItems[idx], false);
        }
    }
}

/**
 * Импортирует файлы в текущий проект AE и выделяет их в Project панели.
 *
 * pathsJson: JSON-строка массива путей.
 * Возвращает строку статуса.
 */
function acc_importFiles(pathsJson) {
    var proj = app.project;
    if (!proj) return "Проект не найден";

    var paths;
    try {
        paths = JSON.parse(pathsJson);
    } catch (e) {
        return "Ошибка: неверный JSON путей";
    }

    if (!paths || !paths.length) return "Нет файлов для импорта";

    var importedItems = [];

    for (var i = 0; i < paths.length; i++) {
        try {
            var file = new File(paths[i]);
            if (!file.exists) continue;

            var importOptions = new ImportOptions(file);
            // importAs может быть недоступен для некоторых типов, поэтому в try
            try {
                importOptions.importAs = ImportAsType.FOOTAGE;
            } catch (_) {}

            var item = proj.importFile(importOptions);
            if (item) importedItems.push(item);
        } catch (e2) {
            // пропускаем
        }
    }

    if (importedItems.length > 0) {
        proj.selection = importedItems;
        return "Импортировано: " + importedItems.length;
    }

    return "Не удалось импортировать файлы";
}

/**
 * Собирает композицию из шаблона compName по выделенным футажам.
 * Возвращает строку статуса.
 */
function acc_buildFromSelection(compName) {
    var proj = app.project;
    if (!proj) return "Проект не найден";

    var footageItems = acc_getSelectedFootageItems();
    if (!footageItems.length) return "Выдели футажи в Project";

    var nameToUse = compName && compName.length ? compName : "TEMPLATE_MAIN";
    var templateComp = acc_findCompByName(nameToUse);
    if (!templateComp) return "Не найден шаблон: " + nameToUse;

    var newComp = templateComp.duplicate();
    if (!newComp) return "Не удалось создать дубликат";

    app.beginUndoGroup("AE Content Constructor: Build");
    try {
        acc_walkCompAndReplace(newComp, footageItems, []);
    } catch (e) {
        app.endUndoGroup();
        return "Ошибка: " + e.toString();
    }
    app.endUndoGroup();

    try {
        if (typeof newComp.openInViewer === "function") newComp.openInViewer();
    } catch (_) {}

    return "Создана композиция: " + newComp.name;
}

