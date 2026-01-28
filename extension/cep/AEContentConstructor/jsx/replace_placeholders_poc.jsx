/**
 * AE Content Constructor — JSX runtime for CEP panel
 *
 * Важно:
 * - Этот файл НЕ должен сам запускаться при загрузке.
 * - Он просто объявляет функции, которые вызывает CEP-панель через evalScript().
 */

// Имя композиции-шаблона по умолчанию (fallback).
var TEMPLATE_COMP_NAME = "TEMPLATE_MAIN";

function getSelectedFootageItems() {
    var proj = app.project;
    if (!proj) {
        return [];
    }

    var items = proj.selection;
    var result = [];

    for (var i = 0; i < items.length; i++) {
        if (items[i] instanceof FootageItem) {
            result.push(items[i]);
        }
    }

    return result;
}

function findCompByName(name) {
    var proj = app.project;
    if (!proj) {
        return null;
    }

    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem && item.name === name) {
            return item;
        }
    }

    return null;
}

function getPlaceholderIndexFromName(layerName) {
    if (typeof layerName !== "string") {
        return -1;
    }

    // Берём "PH_1" из "PH_1 whatever"
    var base = layerName.split(" ")[0];
    var match = /^PH_?(\d+)/.exec(base);
    if (!match) {
        return -1;
    }

    var num = parseInt(match[1], 10);
    if (isNaN(num) || num <= 0) {
        return -1;
    }

    return num - 1; // PH1 → 0, PH2 → 1, ...
}

function _walkCompAndReplace(comp, footageItems, visited) {
    if (!comp || !(comp instanceof CompItem)) {
        return;
    }

    // Защита от зацикливания: не обрабатываем одну и ту же comp дважды.
    for (var v = 0; v < visited.length; v++) {
        if (visited[v] === comp) {
            return;
        }
    }
    visited.push(comp);

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);

        // Нас интересуют только AVLayer с source (футаж или precomp)
        if (!(layer instanceof AVLayer) || !layer.source) {
            continue;
        }

        // Если это pre-comp — рекурсивно заходим внутрь, прежде чем трогать имя слоя.
        if (layer.source instanceof CompItem) {
            _walkCompAndReplace(layer.source, footageItems, visited);
        }

        var idx = getPlaceholderIndexFromName(layer.name);
        if (idx >= 0 && idx < footageItems.length) {
            var footage = footageItems[idx];
            if (footage) {
                layer.replaceSource(footage, false);
            }
        }
    }
}

function replacePlaceholdersInComp(comp, footageItems) {
    if (!comp || !(comp instanceof CompItem)) {
        return;
    }

    app.beginUndoGroup("Replace Placeholders");

    try {
        _walkCompAndReplace(comp, footageItems, []);
    } finally {
        app.endUndoGroup();
    }
}

/**
 * Точка входа для CEP-панели.
 *
 * @param {string} compName имя композиции-шаблона (например TEMPLATE_MAIN)
 * @returns {string} статус/ошибка для отображения в UI
 */
function runReplacePlaceholdersPoCWithCompName(compName) {
    var proj = app.project;
    if (!proj) {
        return "Проект не найден";
    }

    var footageItems = getSelectedFootageItems();
    if (footageItems.length === 0) {
        return "Выдели футажи в Project";
    }

    var compNameToUse = compName && compName.length ? compName : TEMPLATE_COMP_NAME;
    var templateComp = findCompByName(compNameToUse);
    if (!templateComp) {
        return "Не найден шаблон: " + compNameToUse;
    }

    var newComp = templateComp.duplicate();
    if (!newComp) {
        return "Не удалось создать дубликат";
    }

    try {
        replacePlaceholdersInComp(newComp, footageItems);
    } catch (e) {
        return "Ошибка: " + e.toString();
    }

    try {
        if (typeof newComp.openInViewer === "function") {
            newComp.openInViewer();
        }
    } catch (e2) {}

    return "Создана композиция: " + newComp.name;
}

