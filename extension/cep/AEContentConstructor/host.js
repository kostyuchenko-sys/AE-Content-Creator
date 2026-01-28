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

  function init() {
    var btn = document.getElementById("buildBtn");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен. Запусти панель в After Effects.");
        return;
      }

      setStatus("Запуск сборки из выделенных футажей...");

      // Вызываем нашу функцию из JSX-скрипта в контексте AE.
      // Предполагается, что `replace_placeholders_poc.jsx` уже загружен / подключен.
      cs.evalScript("runReplacePlaceholdersPoC()", function (result) {
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

