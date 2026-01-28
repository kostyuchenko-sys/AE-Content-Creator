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
    var cs = getCSInterface();
    if (!cs || typeof window.cep === "undefined" || !window.cep.fs) {
      setStatus("CEP FS недоступен, используем шаблон по умолчанию (TEMPLATE_MAIN).");
      populateTemplateSelect([
        { id: "basic_story", name: "Basic Story", mainCompName: "TEMPLATE_MAIN" }
      ]);
      return;
    }

    var fs = window.cep.fs;
    var extensionRoot = cs.getSystemPath(SystemPath.EXTENSION);
    var templatesDir = extensionRoot + "/templates";

    var dirResult = fs.readdir(templatesDir);
    if (dirResult.err) {
      setStatus("Не удалось прочитать templates, используем дефолтный шаблон.");
      populateTemplateSelect([
        { id: "basic_story", name: "Basic Story", mainCompName: "TEMPLATE_MAIN" }
      ]);
      return;
    }

    var files = dirResult.data || [];
    var templates = [];

    files.forEach(function (fileName) {
      if (!/\.json$/i.test(fileName)) return;
      var filePath = templatesDir + "/" + fileName;
      var fileResult = fs.readFile(filePath);
      if (fileResult.err) return;
      try {
        var tpl = JSON.parse(fileResult.data || "{}");
        if (tpl && (tpl.mainCompName || tpl.id)) {
          templates.push(tpl);
        }
      } catch (e) {
        // Пропускаем битые JSON.
      }
    });

    if (!templates.length) {
      populateTemplateSelect([
        { id: "basic_story", name: "Basic Story", mainCompName: "TEMPLATE_MAIN" }
      ]);
    } else {
      populateTemplateSelect(templates);
    }
  }

  function init() {
    var btn = document.getElementById("buildBtn");
    if (!btn) return;

    loadTemplatesFromExtension();

    btn.addEventListener("click", function () {
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен. Запусти панель в After Effects.");
        return;
      }

      var select = document.getElementById("templateSelect");
      var compName = select && select.value ? select.value : "";

      setStatus(
        "Запуск сборки из выделенных футажей"
          + (compName ? " (шаблон: " + compName + ")" : "")
          + "..."
      );

      // Вызываем нашу функцию из JSX-скрипта в контексте AE.
      // Предполагается, что `replace_placeholders_poc.jsx` уже загружен / подключен.
      var jsxCall =
        compName && compName.length
          ? 'runReplacePlaceholdersPoCWithCompName("' + compName.replace(/"/g, '\\"') + '")'
          : "runReplacePlaceholdersPoC()";

      cs.evalScript(jsxCall, function (result) {
        // result может быть undefined или строкой из JSX.
        setStatus("Готово. " + (result || "Композиция обновлена."));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

