/**
 * PoC: замена плейсхолдеров в шаблонной композиции.
 *
 * Сценарий использования:
 * 1. В Project-панели есть комп-шаблон (например, "TEMPLATE_MAIN") с слоями-плейсхолдерами:
 *    PH_1, PH_2, PH_3 (видеослои или precomp'ы).
 * 2. В Project-панели пользователь выделяет 1..N футажей (видео/изображения) в нужном порядке.
 * 3. Запускает этот скрипт:
 *    - Скрипт ищет comp-шаблон по имени.
 *    - Создает его дубликат.
 *    - По очереди подставляет выделенные футажи в слои, чьи имена начинаются с "PH_".
 *
 * Важно: этот скрипт специально сделан максимально простым и «прозрачным»,
 * чтобы использовать его как первый PoC и основу для дальнейшего усложнения.
 */

// Имя композиции-шаблона по умолчанию.
var TEMPLATE_COMP_NAME = "TEMPLATE_MAIN";

/**
 * Получить выделенные элементы Project-панели, отфильтрованные по FootageItem.
 */
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

/**
 * Найти композицию по имени в проекте.
 */
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

/**
 * Создать дубликат композиции.
 */
function duplicateComp(comp) {
    if (!comp || !(comp instanceof CompItem)) {
        return null;
    }
    return comp.duplicate();
}

/**
 * Получить индекс плейсхолдера по имени слоя.
 *
 * Поддерживаем варианты:
 * - "PH_1", "PH_2", ...
 * - "PH1", "PH2", ...
 * - "PH_1 something", "PH2 copy" и т.п. (берём только первую часть).
 *
 * Возвращает 0-based индекс (0 → первый футаж, 1 → второй и т.д.) или -1, если имя не подходит.
 */
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

/**
 * Внутренняя функция: обойти слои композиции (включая pre-comp'ы)
 * и заменить плейсхолдеры по их индексу (PH1/PH_1 → первый футаж, PH2/PH_2 → второй и т.д.).
 *
 * footageItems — массив футажей (FootageItem), индекс которых соответствует номеру PH.
 * visited — массив уже обработанных композиций (чтобы не уйти в цикл).
 */
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

        // Плейсхолдеры считаем слоями, чье имя соответствует PH1 / PH_1 / PH2 / ...
        var idx = getPlaceholderIndexFromName(layer.name);
        if (idx >= 0 && idx < footageItems.length) {
            var footage = footageItems[idx];
            if (footage) {
                layer.replaceSource(footage, false);
            }
        }
    }
}

/**
 * Заменить источники у слоёв-плейсхолдеров (имя начинается с "PH_")
 * на переданные футажи, включая pre-comp'ы внутри.
 */
function replacePlaceholdersInComp(comp, footageItems) {
    if (!comp || !(comp instanceof CompItem)) {
        return;
    }

    app.beginUndoGroup("Replace Placeholders PoC");

    try {
        _walkCompAndReplace(comp, footageItems, []);
    } catch (e) {
        alert("Ошибка при замене плейсхолдеров (с учётом pre-comp'ов): " + e.toString());
    } finally {
        app.endUndoGroup();
    }
}

/**
 * Основная функция PoC.
 *
 * Шаги:
 * 1. Проверяем наличие выделенных футажей.
 * 2. Ищем композицию-шаблон.
 * 3. Дублируем шаблон.
 * 4. Подставляем футажи в слои-плейсхолдеры нового дубликата.
 * 5. Делаем новую comp активной.
 */
function runReplacePlaceholdersPoC() {
    var proj = app.project;
    if (!proj) {
        alert("Проект After Effects не найден. Открой проект и попробуй снова.");
        return;
    }

    var footageItems = getSelectedFootageItems();
    if (footageItems.length === 0) {
        alert("Выдели в Project-панели хотя бы один футаж (FootageItem) перед запуском скрипта.");
        return;
    }

    var templateComp = findCompByName(TEMPLATE_COMP_NAME);
    if (!templateComp) {
        alert(
            "Не найдена композиция-шаблон с именем \"" +
                TEMPLATE_COMP_NAME +
                "\".\n" +
                "Создай comp с таким именем и слоями-плейсхолдерами (PH_1, PH_2, ...)."
        );
        return;
    }

    var newComp = duplicateComp(templateComp);
    if (!newComp) {
        alert("Не удалось создать дубликат композиции-шаблона.");
        return;
    }

    replacePlaceholdersInComp(newComp, footageItems);

    // Откроем новую comp во viewer'е (activeItem в последних AE read-only).
    try {
        if (typeof newComp.openInViewer === "function") {
            newComp.openInViewer();
        }
    } catch (e) {
        // Если по какой-то причине не удалось — просто игнорируем, комп всё равно создана.
    }

    alert("PoC завершён: создана новая композиция \"" + newComp.name + "\" с подставленными футажами.");
}

// Точка входа: можно вызывать runReplacePlaceholdersPoC() напрямую из панели или из меню скриптов.
runReplacePlaceholdersPoC();

