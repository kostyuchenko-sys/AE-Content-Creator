(function () {
  "use strict";

  // Простейший helper для работы с CEP/CSInterface.
  function getCSInterface() {
    /* global CSInterface */
    if (typeof CSInterface === "undefined") {
      return null;
    }
    return new CSInterface();
  }

  function setStatus(text) {
    var el = document.getElementById("status");
    if (el) {
      el.textContent = text;
    }
  }

  function populateTemplateSelect(templates) {
    var select = document.getElementById("templateSelect");
    if (!select) return;

    select.innerHTML = "";

    if (!templates || !templates.length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Нет доступных шаблонов";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }

    templates.forEach(function (tpl, index) {
      var opt = document.createElement("option");
      opt.value = tpl.mainCompName || "";
      opt.textContent = tpl.name || tpl.id || "Template " + (index + 1);
      opt.setAttribute("data-id", tpl.id || "");
      select.appendChild(opt);
    });

    select.disabled = false;
  }

  function loadTemplatesFromExtension() {
    // Всегда показываем хотя бы дефолтный шаблон
    var defaultTemplate = [
      { id: "basic_story", name: "Basic Story", mainCompName: "TEMPLATE_MAIN" }
    ];

    var cs = getCSInterface();
    if (!cs) {
      setStatus("CSInterface недоступен, используем шаблон по умолчанию.");
      populateTemplateSelect(defaultTemplate);
      return;
    }

    // Пробуем загрузить через CEP FS
    if (typeof window.cep !== "undefined" && window.cep.fs) {
      try {
        var fs = window.cep.fs;
        var extensionRoot = cs.getSystemPath(SystemPath.EXTENSION);
        var templatesDir = extensionRoot + "/templates";

        var dirResult = fs.readdir(templatesDir);
        if (!dirResult.err && dirResult.data) {
          var files = dirResult.data || [];
          var templates = [];

          files.forEach(function (fileName) {
            if (!/\.json$/i.test(fileName)) return;
            var filePath = templatesDir + "/" + fileName;
            var fileResult = fs.readFile(filePath);
            if (!fileResult.err && fileResult.data) {
              try {
                var tpl = JSON.parse(fileResult.data);
                if (tpl && (tpl.mainCompName || tpl.id)) {
                  templates.push(tpl);
                }
              } catch (e) {
                console.error("Failed to parse template JSON:", fileName, e);
              }
            }
          });

          if (templates.length > 0) {
            populateTemplateSelect(templates);
            setStatus("Загружено шаблонов: " + templates.length);
            return;
          }
        }
      } catch (e) {
        console.error("Error loading templates:", e);
      }
    }

    // Fallback на дефолтный шаблон
    setStatus("Используем шаблон по умолчанию.");
    populateTemplateSelect(defaultTemplate);
  }

  var droppedFiles = [];

  function updateFootageList() {
    var listEl = document.getElementById("footageList");
    if (!listEl) return;

    if (droppedFiles.length === 0) {
      listEl.innerHTML = "";
      return;
    }

    var html = "<div style='color: #007aff; margin-bottom: 4px;'>Загружено: " + droppedFiles.length + "</div>";
    droppedFiles.forEach(function (file, idx) {
      var name = file.name || file.path || "File " + (idx + 1);
      html += "<div class='footageItem'>" + name + "</div>";
    });
    listEl.innerHTML = html;
  }

  function setupDragAndDrop() {
    var dropZone = document.getElementById("dropZone");
    if (!dropZone) return;

    dropZone.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragOver");
    });

    dropZone.addEventListener("dragleave", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragOver");
    });

    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragOver");

      var files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      droppedFiles = [];
      var filePaths = [];

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var path = file.path || file.name;
        if (path) {
          droppedFiles.push({ name: file.name, path: path });
          filePaths.push(path);
        }
      }

      if (filePaths.length === 0) {
        setStatus("Не удалось получить пути к файлам.");
        return;
      }

      setStatus("Импорт " + filePaths.length + " файлов...");
      updateFootageList();

      // Импортируем файлы в AE через JSX
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен.");
        return;
      }

      // Конвертируем пути из file:// в обычные пути для macOS
      var normalizedPaths = filePaths.map(function (path) {
        if (path.indexOf("file://") === 0) {
          path = decodeURIComponent(path.substring(7));
        }
        // Убираем лишние слеши и нормализуем путь
        return path.replace(/\/+/g, "/");
      });

      var importCode = '(function() {' +
        'var proj = app.project;' +
        'if (!proj) return "Проект не найден";' +
        'var importedItems = [];' +
        'var paths = ' + JSON.stringify(normalizedPaths) + ';' +
        'for (var i = 0; i < paths.length; i++) {' +
        '  try {' +
        '    var file = new File(paths[i]);' +
        '    if (file.exists) {' +
        '      var importOptions = new ImportOptions(file);' +
        '      importOptions.importAs = ImportAsType.FOOTAGE;' +
        '      var item = proj.importFile(importOptions);' +
        '      if (item) importedItems.push(item);' +
        '    }' +
        '  } catch(e) {' +
        '    // Пропускаем файлы, которые не удалось импортировать' +
        '  }' +
        '}' +
        'if (importedItems.length > 0) {' +
        '  // Выделяем импортированные элементы' +
        '  proj.selection = importedItems;' +
        '  return "Импортировано: " + importedItems.length;' +
        '}' +
        'return "Не удалось импортировать файлы";' +
        '})()';

      cs.evalScript(importCode, function (result) {
        if (result && typeof result === "string") {
          setStatus(result);
          if (result.indexOf("Импортировано") !== -1) {
            updateFootageList();
          }
        } else {
          setStatus("Файлы обработаны.");
        }
      });
    });
  }

  function init() {
    var btn = document.getElementById("buildBtn");
    if (!btn) return;

    loadTemplatesFromExtension();
    setupDragAndDrop();

    btn.addEventListener("click", function () {
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен. Запусти панель в After Effects.");
        return;
      }

      var select = document.getElementById("templateSelect");
      var compName = select && select.value ? select.value : "TEMPLATE_MAIN";

      setStatus("Запуск сборки (шаблон: " + compName + ")...");

      // Встроенный JSX-код для замены плейсхолдеров
      var jsxCode = '(function() {' +
        'function getSelectedFootageItems() {' +
        '  var proj = app.project;' +
        '  if (!proj) return [];' +
        '  var items = proj.selection;' +
        '  var result = [];' +
        '  for (var i = 0; i < items.length; i++) {' +
        '    if (items[i] instanceof FootageItem) result.push(items[i]);' +
        '  }' +
        '  return result;' +
        '}' +
        'function findCompByName(name) {' +
        '  var proj = app.project;' +
        '  if (!proj) return null;' +
        '  for (var i = 1; i <= proj.numItems; i++) {' +
        '    var item = proj.item(i);' +
        '    if (item instanceof CompItem && item.name === name) return item;' +
        '  }' +
        '  return null;' +
        '}' +
        'function getPlaceholderIndexFromName(layerName) {' +
        '  if (typeof layerName !== "string") return -1;' +
        '  var base = layerName.split(" ")[0];' +
        '  var match = /^PH_?(\\d+)/.exec(base);' +
        '  if (!match) return -1;' +
        '  var num = parseInt(match[1], 10);' +
        '  return (isNaN(num) || num <= 0) ? -1 : num - 1;' +
        '}' +
        'function _walkCompAndReplace(comp, footageItems, visited) {' +
        '  if (!comp || !(comp instanceof CompItem)) return;' +
        '  for (var v = 0; v < visited.length; v++) {' +
        '    if (visited[v] === comp) return;' +
        '  }' +
        '  visited.push(comp);' +
        '  for (var i = 1; i <= comp.numLayers; i++) {' +
        '    var layer = comp.layer(i);' +
        '    if (!(layer instanceof AVLayer) || !layer.source) continue;' +
        '    if (layer.source instanceof CompItem) {' +
        '      _walkCompAndReplace(layer.source, footageItems, visited);' +
        '    }' +
        '    var idx = getPlaceholderIndexFromName(layer.name);' +
        '    if (idx >= 0 && idx < footageItems.length && footageItems[idx]) {' +
        '      layer.replaceSource(footageItems[idx], false);' +
        '    }' +
        '  }' +
        '}' +
        'var proj = app.project;' +
        'if (!proj) return "Проект не найден";' +
        'var footageItems = getSelectedFootageItems();' +
        'if (footageItems.length === 0) return "Выдели футажи в Project";' +
        'var templateComp = findCompByName("' + compName.replace(/"/g, '\\"') + '");' +
        'if (!templateComp) return "Не найден шаблон: ' + compName.replace(/"/g, '\\"') + '";' +
        'var newComp = templateComp.duplicate();' +
        'if (!newComp) return "Не удалось создать дубликат";' +
        'app.beginUndoGroup("Replace Placeholders");' +
        'try { _walkCompAndReplace(newComp, footageItems, []); }' +
        'catch(e) { app.endUndoGroup(); return "Ошибка: " + e.toString(); }' +
        'app.endUndoGroup();' +
        'try { if (typeof newComp.openInViewer === "function") newComp.openInViewer(); } catch(e) {}' +
        'return "Создана композиция: " + newComp.name;' +
        '})()';

      cs.evalScript(jsxCode, function (result) {
        if (result && typeof result === "string") {
          if (result.indexOf("Ошибка") !== -1 || result.indexOf("не найден") !== -1 || result.indexOf("Выдели") !== -1) {
            setStatus("Ошибка: " + result);
          } else {
            setStatus("Готово. " + result);
          }
        } else {
          setStatus("Готово. Композиция создана.");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

