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
 * Заменить источники у слоёв-плейсхолдеров (имя начинается с "PH_")
 * на переданные футажи.
 */
function replacePlaceholdersInComp(comp, footageItems) {
    if (!comp || !(comp instanceof CompItem)) {
        return;
    }

    // Клонируем массив, чтобы не портить оригинал.
    var queue = footageItems.slice();

    app.beginUndoGroup("Replace Placeholders PoC");

    try {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (queue.length === 0) {
                break; // Футажи закончились.
            }

            var layer = comp.layer(i);

            // Нас интересуют только AVLayer с source (футаж или precomp)
            if (!(layer instanceof AVLayer) || !layer.source) {
                continue;
            }

            // Плейсхолдеры считаем слоями, чье имя начинается с "PH_"
            if (typeof layer.name === "string" && layer.name.indexOf("PH_") === 0) {
                var footage = queue.shift();
                layer.replaceSource(footage, false);
            }
        }
    } catch (e) {
        alert("Ошибка при замене плейсхолдеров: " + e.toString());
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

    // Сделаем новую comp активной.
    proj.activeItem = newComp;

    alert("PoC завершён: создана новая композиция \"" + newComp.name + "\" с подставленными футажами.");
}

// Точка входа: можно вызывать runReplacePlaceholdersPoC() напрямую из панели или из меню скриптов.
runReplacePlaceholdersPoC();

