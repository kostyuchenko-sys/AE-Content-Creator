(function () {
  "use strict";

  function getCSInterface() {
    /* global CSInterface */
    if (typeof CSInterface === "undefined") {
      return null;
    }
    return new CSInterface();
  }

  function setStatus(text, type) {
    var el = document.getElementById("status");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("error", "success", "info");
    if (type) {
      el.classList.add(type);
    }
  }

  function normalizePath(path) {
    if (!path) return "";
    if (path.indexOf("file://") === 0) {
      path = decodeURIComponent(path.substring(7));
    }
    return path.replace(/\/+/g, "/");
  }

  function toFileUrl(path) {
    var p = normalizePath(path);
    if (!p) return "";
    if (p.indexOf("file://") === 0) return p;
    return "file://" + encodeURI(p);
  }

  var templates = [];
  var selectedTemplate = null;
  var slotAssignments = {}; // index -> { path, name }
  var droppedFiles = [];
  var missingSlots = {}; // index -> true

  function getRepoPathInput() {
    var el = document.getElementById("repoPathInput");
    return el ? el.value.trim() : "";
  }

  function setRepoPathInput(value) {
    var el = document.getElementById("repoPathInput");
    if (el) el.value = value || "";
  }

  function getSavedRepoPath() {
    try {
      return localStorage.getItem("templatesRepoPath") || "";
    } catch (e) {
      return "";
    }
  }

  function saveRepoPath(path) {
    try {
      localStorage.setItem("templatesRepoPath", path);
    } catch (e) {}
  }

  function updateFootageList() {
    var listEl = document.getElementById("footageList");
    if (!listEl) return;

    if (droppedFiles.length === 0) {
      listEl.innerHTML = "";
      return;
    }

    var html = "<div style='color:#007aff;margin-bottom:4px;'>Загружено: " + droppedFiles.length + "</div>";
    droppedFiles.forEach(function (file, idx) {
      var name = file.name || file.path || "File " + (idx + 1);
      html += "<div class='footageItem'>" + name + "</div>";
    });
    listEl.innerHTML = html;
  }

  function renderTemplates() {
    var grid = document.getElementById("templatesGrid");
    if (!grid) return;

    grid.innerHTML = "";
    if (!templates.length) {
      grid.innerHTML = "<div style='font-size:11px;color:#777;'>Нет доступных шаблонов</div>";
      return;
    }

    templates.forEach(function (tpl) {
      var card = document.createElement("div");
      card.className = "templateCard" + (selectedTemplate && selectedTemplate.id === tpl.id ? " selected" : "");
      card.setAttribute("data-id", tpl.id || "");

      var preview = document.createElement("div");
      preview.className = "templatePreview";
      if (tpl.previewPath) {
        if (/\.mp4$/i.test(tpl.previewPath)) {
          var video = document.createElement("video");
          video.src = toFileUrl(tpl.previewPath);
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.style.width = "100%";
          video.style.height = "100%";
          preview.appendChild(video);
        } else {
          preview.style.backgroundImage = "url('" + toFileUrl(tpl.previewPath) + "')";
          preview.style.backgroundSize = "cover";
          preview.style.backgroundPosition = "center";
          preview.textContent = "";
        }
      } else {
        preview.textContent = "No preview";
      }

      var body = document.createElement("div");
      body.className = "templateBody";

      var name = document.createElement("div");
      name.className = "templateName";
      name.textContent = tpl.name || tpl.id || "Template";

      var desc = document.createElement("div");
      desc.className = "templateDesc";
      desc.textContent = tpl.description || "";

      body.appendChild(name);
      body.appendChild(desc);
      card.appendChild(preview);
      card.appendChild(body);

      card.addEventListener("click", function () {
        selectedTemplate = tpl;
        slotAssignments = {};
        renderTemplates();
        renderSlots();
      });

      grid.appendChild(card);
    });
  }

  function renderSlots() {
    var container = document.getElementById("slotsContainer");
    if (!container) return;

    container.innerHTML = "";
    if (!selectedTemplate || !selectedTemplate.placeholders || !selectedTemplate.placeholders.length) {
      container.innerHTML = "<div style='font-size:11px;color:#777;'>Нет плейсхолдеров</div>";
      return;
    }

    var placeholders = selectedTemplate.placeholders.slice().sort(function (a, b) {
      return (a.index || 0) - (b.index || 0);
    });

    placeholders.forEach(function (ph) {
      var idx = ph.index || 0;
      var card = document.createElement("div");
      card.className = "slotCard";

      var title = document.createElement("div");
      title.className = "slotTitle";
      title.textContent = "Slot " + idx + (ph.label ? " — " + ph.label : "");

      var drop = document.createElement("div");
      drop.className = "slotDrop";
      drop.textContent = slotAssignments[idx] ? slotAssignments[idx].name : "Перетащи файл";
      if (missingSlots[idx]) {
        drop.classList.add("missing");
      }

      drop.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.add("dragOver");
      });

      drop.addEventListener("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.remove("dragOver");
      });

      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.remove("dragOver");
        var files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        var file = files[0];
        var path = normalizePath(file.path || file.name);
        slotAssignments[idx] = { path: path, name: file.name || path };
        drop.textContent = slotAssignments[idx].name;
        delete missingSlots[idx];
        drop.classList.remove("missing");
        setStatus("Назначен файл для слота " + idx, "success");
      });

      card.appendChild(title);
      card.appendChild(drop);
      container.appendChild(card);
    });
  }

  function readJsonFile(fs, filePath) {
    var res = fs.readFile(filePath);
    if (res.err || !res.data) return null;
    try {
      return JSON.parse(res.data);
    } catch (e) {
      return null;
    }
  }

  function loadTemplatesFromPath(path) {
    var cs = getCSInterface();
    if (!cs || typeof window.cep === "undefined" || !window.cep.fs) {
      return [];
    }

    var fs = window.cep.fs;
    var dir = normalizePath(path);
    if (!dir) return [];

    var dirResult = fs.readdir(dir);
    if (dirResult.err) {
      // Может быть это прямой путь к template.json
      var single = readJsonFile(fs, dir);
      if (single) {
        single._basePath = dir.substring(0, dir.lastIndexOf("/"));
        return [single];
      }
      return [];
    }

    var entries = dirResult.data || [];
    var loaded = [];

    entries.forEach(function (entry) {
      if (!entry) return;
      if (/\.json$/i.test(entry)) {
        var jsonPath = dir + "/" + entry;
        var tpl = readJsonFile(fs, jsonPath);
        if (tpl) {
          tpl._basePath = dir;
          loaded.push(tpl);
        }
        return;
      }
      var candidate = dir + "/" + entry + "/template.json";
      var tpl2 = readJsonFile(fs, candidate);
      if (tpl2) {
        tpl2._basePath = dir + "/" + entry;
        loaded.push(tpl2);
      }
    });

    return loaded;
  }

  function normalizeTemplates(raw) {
    return raw
      .filter(function (tpl) {
        return tpl && (tpl.id || tpl.name || tpl.mainCompName);
      })
      .map(function (tpl, idx) {
        if (!tpl.id) tpl.id = "template_" + (idx + 1);
        if (!tpl.name) tpl.name = tpl.id;
        if (!tpl.mainCompName) tpl.mainCompName = "TEMPLATE_MAIN";
        if (!tpl.placeholders) tpl.placeholders = [];

        if (tpl.preview) {
          var base = tpl._basePath || "";
          if (tpl.preview.jpg) tpl.previewPath = base + "/" + tpl.preview.jpg;
          if (tpl.preview.mp4) tpl.previewPath = base + "/" + tpl.preview.mp4;
        }
        if (tpl.project && tpl.project.aep) {
          var basePath = tpl._basePath || "";
          tpl.projectPath = basePath + "/" + tpl.project.aep;
        }
        return tpl;
      });
  }

  function loadTemplates() {
    var cs = getCSInterface();
    if (!cs) {
      templates = [
        { id: "basic_story", name: "Basic Story", mainCompName: "TEMPLATE_MAIN", placeholders: [] }
      ];
      selectedTemplate = templates[0];
      renderTemplates();
      renderSlots();
      return;
    }

    var extConst = (typeof SystemPath !== "undefined" && SystemPath.EXTENSION)
      ? SystemPath.EXTENSION
      : (cs.SystemPath && cs.SystemPath.EXTENSION ? cs.SystemPath.EXTENSION : null);
    var defaultPath = extConst ? cs.getSystemPath(extConst) + "/templates" : "";
    var saved = getSavedRepoPath();
    var currentPath = getRepoPathInput() || saved || defaultPath;
    setRepoPathInput(currentPath);

    var loaded = loadTemplatesFromPath(currentPath);
    if (!loaded.length && defaultPath && currentPath !== defaultPath) {
      loaded = loadTemplatesFromPath(defaultPath);
    }

    if (!loaded.length) {
      loaded = [
        {
          id: "basic_story",
          name: "Basic Story",
          description: "Fallback template",
          mainCompName: "TEMPLATE_MAIN",
          placeholders: []
        }
      ];
    }

    templates = normalizeTemplates(loaded);
    selectedTemplate = templates[0] || null;
    renderTemplates();
    renderSlots();
    setStatus("Шаблонов: " + templates.length, "info");
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
        var path = normalizePath(file.path || file.name);
        if (path) {
          droppedFiles.push({ name: file.name, path: path });
          filePaths.push(path);
        }
      }

      if (filePaths.length === 0) {
        setStatus("Не удалось получить пути к файлам.");
        return;
      }

      setStatus("Импорт " + filePaths.length + " файлов...", "info");
      updateFootageList();

      // Импортируем файлы в AE через JSX (dedupe by fsName)
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен.");
        return;
      }

      var importCode =
        'try{' +
        'var proj=app.project;' +
        'if(!proj){"Проект не найден"}else{' +
        'var paths=' + JSON.stringify(filePaths) + ';' +
        'var selected=[];' +
        'for(var k=1;k<=proj.numItems;k++){try{proj.item(k).selected=false;}catch(_e0){}}' +
        'var indexByFsName={}; var indexByUri={};' +
        'for(var j=1;j<=proj.numItems;j++){' +
        '  var it=proj.item(j);' +
        '  if(it instanceof FootageItem && it.file){' +
        '    try{indexByFsName[it.file.fsName]=it;}catch(_eA){}' +
        '    try{indexByUri[it.file.absoluteURI]=it;}catch(_eB){}' +
        '  }' +
        '}' +
        'for(var i=0;i<paths.length;i++){' +
        '  try{' +
        '    var f=new File(paths[i]);' +
        '    if(!f.exists) continue;' +
        '    var found=indexByFsName[f.fsName] || indexByUri[f.absoluteURI] || null;' +
        '    if(!found){' +
        '      var io=new ImportOptions(f);' +
        '      var newIt=proj.importFile(io);' +
        '      if(newIt){found=newIt; indexByFsName[f.fsName]=newIt; try{indexByUri[f.absoluteURI]=newIt;}catch(_eC){}}' +
        '    }' +
        '    if(found){found.selected=true; selected.push(found);}' +
        '  }catch(_e1){}' +
        '}' +
        'if(selected.length>0){' +
        '  "Импортировано/выбрано: "+selected.length;' +
        '}else{' +
        '  "Не удалось импортировать файлы";' +
        '}' +
        '}' +
        '}catch(e){"Ошибка импорта: "+e.toString();}';

      cs.evalScript(importCode, function (result) {
        if (result && typeof result === "string") {
        setStatus(result, result.indexOf("Ошибка") !== -1 ? "error" : "success");
        } else {
        setStatus("Файлы обработаны.", "info");
        }
      });
    });
  }

  function buildFromSelection() {
    var cs = getCSInterface();
    if (!cs) {
      setStatus("CSInterface недоступен. Запусти панель в After Effects.", "error");
      return;
    }

    var compName = (selectedTemplate && selectedTemplate.mainCompName) || "TEMPLATE_MAIN";
    var templateProjectPath = selectedTemplate && selectedTemplate.projectPath ? selectedTemplate.projectPath : "";
    if (!selectedTemplate) {
      setStatus("Шаблон не выбран.", "error");
      return;
    }

    // Собираем массив путей по слотам (если есть)
    var providedPaths = [];
    var placeholders = (selectedTemplate && selectedTemplate.placeholders) ? selectedTemplate.placeholders : [];
    if (placeholders.length) {
      selectedTemplate.placeholders.forEach(function (ph) {
        var idx = ph.index || 0;
        if (slotAssignments[idx] && slotAssignments[idx].path) {
          providedPaths[idx - 1] = slotAssignments[idx].path;
        }
      });
    }

    // Валидация слотов: если есть частичное заполнение — просим дозаполнить
    missingSlots = {};
    var anyAssigned = false;
    var missingList = [];
    if (placeholders.length) {
      placeholders.forEach(function (ph) {
        var idx = ph.index || 0;
        if (slotAssignments[idx] && slotAssignments[idx].path) {
          anyAssigned = true;
        } else {
          missingSlots[idx] = true;
          missingList.push(idx);
        }
      });
    }
    if (placeholders.length && anyAssigned && missingList.length) {
      renderSlots();
      setStatus("Заполни все слоты: " + missingList.join(", "), "error");
      return;
    }

    setStatus("Запуск сборки (шаблон: " + compName + ")...", "info");

    var jsxCode = '(function(){' +
      'function isInFolder(item, folder){' +
      '  if(!item || !folder) return false;' +
      '  var parent=item.parentFolder;' +
      '  while(parent){ if(parent===folder) return true; parent=parent.parentFolder; }' +
      '  return false; }' +
      'function importTemplateProject(path){' +
      '  try{' +
      '    if(!path) return null;' +
      '    var f=new File(path);' +
      '    if(!f.exists) return null;' +
      '    var io=new ImportOptions(f);' +
      '    try{ io.importAs=ImportAsType.PROJECT; }catch(_e0){}' +
      '    return app.project.importFile(io);' +
      '  }catch(e){ return null; }' +
      '}' +
      'function getSelectedFootageItems(){' +
      '  var proj=app.project; if(!proj) return [];' +
      '  var items=proj.selection; var result=[];' +
      '  for(var i=0;i<items.length;i++){ if(items[i] instanceof FootageItem) result.push(items[i]); }' +
      '  return result;}' +
      'function findCompByName(name, folder){' +
      '  var proj=app.project; if(!proj) return null;' +
      '  var fallback=null;' +
      '  for(var i=1;i<=proj.numItems;i++){' +
      '    var it=proj.item(i);' +
      '    if(it instanceof CompItem && it.name===name){' +
      '      if(folder && isInFolder(it, folder)) return it;' +
      '      if(!fallback) fallback=it;' +
      '    }' +
      '  }' +
      '  if(fallback) return fallback;' +
      '  return null;}' +
      'function getPlaceholderIndexFromName(layerName){' +
      '  if(typeof layerName!==\"string\") return -1;' +
      '  var base=layerName.split(\" \")[0];' +
      '  var match=/^PH_?(\\\\d+)/.exec(base);' +
      '  if(!match) return -1;' +
      '  var num=parseInt(match[1],10);' +
      '  return (isNaN(num)||num<=0)?-1:num-1;}' +
      'function _walk(comp,items,visited){' +
      '  if(!comp||!(comp instanceof CompItem)) return;' +
      '  for(var v=0;v<visited.length;v++){ if(visited[v]===comp) return; }' +
      '  visited.push(comp);' +
      '  for(var i=1;i<=comp.numLayers;i++){' +
      '    var layer=comp.layer(i);' +
      '    if(!(layer instanceof AVLayer)||!layer.source) continue;' +
      '    if(layer.source instanceof CompItem){ _walk(layer.source,items,visited); }' +
      '    var idx=getPlaceholderIndexFromName(layer.name);' +
      '    if(idx>=0 && idx<items.length && items[idx]){ layer.replaceSource(items[idx], false); }' +
      '  }}' +
      'function resolveItemsFromPaths(paths){' +
      '  var proj=app.project; if(!proj) return [];' +
      '  var result=[];' +
      '  var indexByFsName={}; var indexByUri={};' +
      '  for(var j=1;j<=proj.numItems;j++){' +
      '    var it=proj.item(j);' +
      '    if(it instanceof FootageItem && it.file){' +
      '      try{indexByFsName[it.file.fsName]=it;}catch(_eA){}' +
      '      try{indexByUri[it.file.absoluteURI]=it;}catch(_eB){}' +
      '    }}' +
      '  for(var i=0;i<paths.length;i++){' +
      '    var p=paths[i]; if(!p){ result.push(null); continue; }' +
      '    var f=new File(p); if(!f.exists){ result.push(null); continue; }' +
      '    var found=indexByFsName[f.fsName] || indexByUri[f.absoluteURI] || null;' +
      '    if(!found){ var io=new ImportOptions(f); var newIt=proj.importFile(io); if(newIt){found=newIt;}}' +
      '    result.push(found);' +
      '  }' +
      '  return result;}' +
      'var proj=app.project; if(!proj) return \"Проект не найден\";' +
      'var templateFolder=null;' +
      'var templateProjectPath=' + JSON.stringify(templateProjectPath) + ';' +
      'if(templateProjectPath && templateProjectPath.length){ templateFolder=importTemplateProject(templateProjectPath); }' +
      'var comp=findCompByName(\"' + compName.replace(/"/g, '\\"') + '\", templateFolder);' +
      'if(!comp) return \"Не найден шаблон: ' + compName.replace(/"/g, '\\"') + '\";' +
      'var provided=' + JSON.stringify(providedPaths) + ';' +
      'var items=(provided && provided.length) ? resolveItemsFromPaths(provided) : getSelectedFootageItems();' +
      'if(!items || items.length===0) return \"Выдели футажи в Project\";' +
      'var newComp=comp.duplicate(); if(!newComp) return \"Не удалось создать дубликат\";' +
      'app.beginUndoGroup(\"Replace Placeholders\");' +
      'try{ _walk(newComp, items, []);}catch(e){ app.endUndoGroup(); return \"Ошибка: \"+e.toString(); }' +
      'app.endUndoGroup();' +
      'try{' +
      '  if(proj.activeItem && proj.activeItem instanceof CompItem){' +
      '    proj.activeItem.layers.add(newComp);' +
      '  }' +
      '}catch(eLayer){}' +
      'try{ if(typeof newComp.openInViewer===\"function\") newComp.openInViewer(); }catch(e2){}' +
      'return \"Создана композиция: \" + newComp.name;' +
      '})()';

    cs.evalScript(jsxCode, function (result) {
      if (result && typeof result === "string") {
        if (result.indexOf("Ошибка") !== -1 || result.indexOf("не найден") !== -1 || result.indexOf("Выдели") !== -1) {
          setStatus("Ошибка: " + result, "error");
        } else {
          setStatus("Готово. " + result, "success");
        }
      } else {
        setStatus("Готово. Композиция создана.", "success");
      }
    });
  }

  function init() {
    var btn = document.getElementById("buildBtn");
    var reloadBtn = document.getElementById("reloadTemplatesBtn");
    var clearBtn = document.getElementById("clearSlotsBtn");
    var browseBtn = document.getElementById("browseRepoBtn");
    if (!btn) return;

    try {
      setStatus("Панель загружена.", "info");
      var cs = getCSInterface();
      if (!cs) {
        setStatus("CSInterface недоступен. Проверь CSInterface.js.", "error");
      }

      // Глобально разрешаем drag&drop в документе
      document.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      document.addEventListener("drop", function (e) {
        e.preventDefault();
      });

      setRepoPathInput(getSavedRepoPath());
      loadTemplates();
      setupDragAndDrop();
    } catch (e) {
      setStatus("Ошибка инициализации: " + e.toString(), "error");
    }

    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        var path = getRepoPathInput();
        if (path) saveRepoPath(path);
        loadTemplates();
      });
    }

    if (browseBtn) {
      browseBtn.addEventListener("click", function () {
        if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialog) {
          setStatus("Browse недоступен: CEP FS не найден.", "error");
          return;
        }
        var res = window.cep.fs.showOpenDialog(
          true,
          false,
          "Select templates repo folder"
        );
        if (res && res.data && res.data.length) {
          var selectedPath = normalizePath(res.data[0]);
          setRepoPathInput(selectedPath);
          saveRepoPath(selectedPath);
          loadTemplates();
          setStatus("Выбрана папка репозитория шаблонов.", "info");
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        slotAssignments = {};
        missingSlots = {};
        renderSlots();
        setStatus("Слоты очищены.", "info");
      });
    }

    btn.addEventListener("click", buildFromSelection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
