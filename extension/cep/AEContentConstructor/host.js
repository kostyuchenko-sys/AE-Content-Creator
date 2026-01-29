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
  var slotAssignments = {}; // index -> { type: "file"|"comp", path?, name }
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
      drop.textContent = slotAssignments[idx] ? slotAssignments[idx].name : "Перетащи файл/комп или кликни для выбора";
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
        if (!files || files.length === 0) {
          assignSlotFromSelection(idx, drop);
          return;
        }
        var file = files[0];
        var path = normalizePath(file.path || file.name);
        slotAssignments[idx] = { type: "file", path: path, name: file.name || path };
        drop.textContent = slotAssignments[idx].name;
        delete missingSlots[idx];
        drop.classList.remove("missing");
        setStatus("Назначен файл для слота " + idx, "success");
      });

      drop.addEventListener("click", function () {
        assignSlotFromSelection(idx, drop);
      });

      card.appendChild(title);
      card.appendChild(drop);
      container.appendChild(card);
    });
  }

  function assignSlotFromSelection(idx, dropEl) {
    var cs = getCSInterface();
    if (!cs) {
      setStatus("CSInterface недоступен. Запусти панель в After Effects.", "error");
      return;
    }

    var jsx = '(function(){' +
      'try{' +
      '  var proj=app.project; if(!proj) return \"\";' +
      '  var items=proj.selection; if(!items || items.length===0) return \"\";' +
      '  var it=items[0];' +
      '  if(it instanceof FootageItem){' +
      '    var p=\"\"; try{ p=it.file ? it.file.fsName : \"\"; }catch(e1){}' +
      '    return JSON.stringify({type:\"file\", name:it.name||\"\", path:p});' +
      '  }' +
      '  if(it instanceof CompItem){' +
      '    return JSON.stringify({type:\"comp\", name:it.name||\"\"});' +
      '  }' +
      '  return \"\";' +
      '}catch(e){ return \"\"; }' +
      '})()';

    cs.evalScript(jsx, function (result) {
      if (!result || typeof result !== "string") {
        setStatus("Выдели футаж или композицию в Project.", "error");
        return;
      }
      var data = null;
      try {
        data = JSON.parse(result);
      } catch (e) {
        data = null;
      }
      if (!data || !data.type) {
        setStatus("Выдели футаж или композицию в Project.", "error");
        return;
      }
      if (data.type === "comp") {
        slotAssignments[idx] = { type: "comp", name: "COMP: " + (data.name || "Comp"), compName: data.name || "" };
      } else if (data.type === "file" && data.path) {
        slotAssignments[idx] = { type: "file", path: data.path, name: data.name || data.path };
      } else {
        setStatus("Не удалось получить данные выбранного элемента.", "error");
        return;
      }
      if (dropEl) {
        dropEl.textContent = slotAssignments[idx].name;
        dropEl.classList.remove("missing");
      }
      delete missingSlots[idx];
      setStatus("Назначен элемент для слота " + idx, "success");
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
        } else if (tpl._basePath) {
          // Fallback: assume packaged project.aep in template folder
          tpl.projectPath = tpl._basePath + "/project.aep";
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
    var templateName = (selectedTemplate && selectedTemplate.name) ? selectedTemplate.name : compName;
    var templateProjectPath = selectedTemplate && selectedTemplate.projectPath ? selectedTemplate.projectPath : "";
    if (!selectedTemplate) {
      setStatus("Шаблон не выбран.", "error");
      return;
    }
    if (!templateProjectPath) {
      setStatus("В template.json нет project.aep — поиск шаблона будет в текущем проекте.", "info");
    }

    // Собираем массив путей по слотам (если есть)
    var providedSpecs = [];
    var placeholders = (selectedTemplate && selectedTemplate.placeholders) ? selectedTemplate.placeholders : [];
    if (placeholders.length) {
      selectedTemplate.placeholders.forEach(function (ph) {
        var idx = ph.index || 0;
        if (slotAssignments[idx]) {
          var spec = slotAssignments[idx];
          if (spec.type === "comp" && spec.compName) {
            providedSpecs[idx - 1] = { type: "comp", name: spec.compName };
          } else if (spec.type === "file" && spec.path) {
            providedSpecs[idx - 1] = { type: "file", path: spec.path };
          }
        }
      });
    }

    // Валидация слотов: подсветка незаполненных, но не блокируем сборку
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
    if (placeholders.length && missingList.length) {
      renderSlots();
      setStatus("Не все слоты заполнены: " + missingList.join(", ") + ". Пустые останутся без замены.", "info");
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
      'function getSelectedReplaceItems(){' +
      '  var proj=app.project; if(!proj) return [];' +
      '  var items=proj.selection; var result=[];' +
      '  for(var i=0;i<items.length;i++){' +
      '    if(items[i] instanceof FootageItem || items[i] instanceof CompItem){ result.push(items[i]); }' +
      '  }' +
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
      'function extractPlaceholderIndex(text){' +
      '  if(typeof text!==\"string\") return -1;' +
      '  var match=/PH[:_]?([0-9]+)/i.exec(text);' +
      '  if(!match) return -1;' +
      '  var num=parseInt(match[1],10);' +
      '  return (isNaN(num)||num<=0)?-1:num-1;' +
      '}' +
      'function getPlaceholderIndexFromName(layerName){' +
      '  return extractPlaceholderIndex(layerName);' +
      '}' +
      'function getPlaceholderIndexFromComment(layer){' +
      '  try{' +
      '    if(layer && layer.comment){' +
      '      return extractPlaceholderIndex(layer.comment);' +
      '    }' +
      '    return -1;' +
      '  }catch(e){ return -1; }' +
      '}' +
      'function getPlaceholderIndexFromMarker(layer, stats){' +
      '  try{' +
      '    var markerProp=layer.property(\"Marker\") || layer.property(\"ADBE Marker\");' +
      '    if(!markerProp || markerProp.numKeys<1) return -1;' +
      '    if(stats) stats.markers += markerProp.numKeys;' +
      '    for(var k=1;k<=markerProp.numKeys;k++){' +
      '      var mv=markerProp.keyValue(k);' +
      '      var comment=(mv && mv.comment) ? mv.comment : \"\";' +
      '      if(!comment){' +
      '        try{ comment=markerProp.valueAtTime(markerProp.keyTime(k), false).comment || \"\"; }catch(_e0){}' +
      '      }' +
      '      var idx=extractPlaceholderIndex(comment);' +
      '      if(idx>=0) return idx;' +
      '      if(stats && stats.samples.length<5 && comment){ stats.samples.push(layer.name+\": \"+comment); }' +
      '    }' +
      '    return -1;' +
      '  }catch(e){ return -1; }' +
      '}' +
      'function getPlaceholderIndex(layer){' +
      '  var idx=getPlaceholderIndexFromMarker(layer, null);' +
      '  if(idx>=0) return idx;' +
      '  idx=getPlaceholderIndexFromComment(layer);' +
      '  if(idx>=0) return idx;' +
      '  try{' +
      '    if(layer && layer.source && layer.source.name){' +
      '      idx=extractPlaceholderIndex(layer.source.name);' +
      '      if(idx>=0) return idx;' +
      '    }' +
      '  }catch(eSrc){}' +
      '  return getPlaceholderIndexFromName(layer.name);' +
      '}' +
      'function _walk(comp,items,visited,stats){' +
      '  if(!comp||!(comp instanceof CompItem)) return;' +
      '  for(var v=0;v<visited.length;v++){ if(visited[v]===comp) return; }' +
      '  visited.push(comp);' +
      '  for(var i=1;i<=comp.numLayers;i++){' +
      '    var layer=comp.layer(i);' +
      '    stats.layers++;' +
      '    if(!(layer instanceof AVLayer)||!layer.source) continue;' +
      '    if(layer.source instanceof CompItem){ _walk(layer.source,items,visited,stats); }' +
      '    var idx=getPlaceholderIndexFromMarker(layer, stats);' +
      '    if(idx<0) idx=getPlaceholderIndexFromComment(layer);' +
      '    if(idx<0){' +
      '      try{' +
      '        if(layer && layer.source && layer.source.name){' +
      '          idx=extractPlaceholderIndex(layer.source.name);' +
      '        }' +
      '      }catch(eSrc2){}' +
      '    }' +
      '    if(idx<0) idx=getPlaceholderIndexFromName(layer.name);' +
      '    if(idx>=0){' +
      '      stats.found++;' +
      '      if(idx<items.length && items[idx]){' +
      '        layer.replaceSource(items[idx], false);' +
      '        stats.replaced++;' +
      '      }' +
      '    }' +
      '  }}' +
      'function createPrecompForFootage(footage, idx){' +
      '  try{' +
      '    if(!footage || !(footage instanceof FootageItem)) return null;' +
      '    var w=1080, h=1920;' +
      '    var dur=60.0;' +
      '    var fr=25;' +
      '    try{ if(footage.mainSource && footage.mainSource.conformFrameRate){ fr=footage.mainSource.conformFrameRate; } }catch(_eFr){}' +
      '    if(!fr || fr<=0) fr=25;' +
      '    var name=\"PRECOMP_PH\" + (idx+1);' +
      '    var comp=app.project.items.addComp(name, w, h, 1.0, dur, fr);' +
      '    var layer=comp.layers.add(footage);' +
      '    if(layer && layer.source){' +
      '      var fw=layer.source.width||w; var fh=layer.source.height||h;' +
      '      if(fw>0 && fh>0){' +
      '        var scale=Math.max(w/fw, h/fh)*100;' +
      '        layer.property(\"Scale\").setValue([scale, scale]);' +
      '      }' +
      '    }' +
      '    return comp;' +
      '  }catch(e){ return null; }' +
      '}' +
      'function resolveItemsFromSpecs(specs){' +
      '  var proj=app.project; if(!proj) return [];' +
      '  var result=[];' +
      '  var indexByFsName={}; var indexByUri={};' +
      '  var compByName={};' +
      '  for(var j=1;j<=proj.numItems;j++){' +
      '    var it=proj.item(j);' +
      '    if(it instanceof FootageItem && it.file){' +
      '      try{indexByFsName[it.file.fsName]=it;}catch(_eA){}' +
      '      try{indexByUri[it.file.absoluteURI]=it;}catch(_eB){}' +
      '    } else if(it instanceof CompItem){' +
      '      if(!compByName[it.name]) compByName[it.name]=it;' +
      '    }}' +
      '  for(var i=0;i<specs.length;i++){' +
      '    var s=specs[i]; if(!s){ result.push(null); continue; }' +
      '    if(s.type===\"comp\" && s.name){' +
      '      result.push(compByName[s.name] || null);' +
      '      continue;' +
      '    }' +
      '    if(s.type===\"file\" && s.path){' +
      '      var f=new File(s.path); if(!f.exists){ result.push(null); continue; }' +
      '      var found=indexByFsName[f.fsName] || indexByUri[f.absoluteURI] || null;' +
      '      if(!found){ var io=new ImportOptions(f); var newIt=proj.importFile(io); if(newIt){found=newIt;}}' +
      '      if(found && found instanceof FootageItem){' +
      '        var pre= createPrecompForFootage(found, i);' +
      '        result.push(pre || found);' +
      '      } else {' +
      '        result.push(found);' +
      '      }' +
      '      continue;' +
      '    }' +
      '    result.push(null);' +
      '  }' +
      '  return result;}' +
      'function wrapSelectedItems(items){' +
      '  var result=[];' +
      '  for(var i=0;i<items.length;i++){' +
      '    var it=items[i];' +
      '    if(it instanceof FootageItem){' +
      '      var pre=createPrecompForFootage(it, i);' +
      '      result.push(pre || it);' +
      '    } else {' +
      '      result.push(it);' +
      '    }' +
      '  }' +
      '  return result;' +
      '}' +
      'var proj=app.project; if(!proj) return \"Проект не найден\";' +
      'var templateFolder=null;' +
      'var templateProjectPath=' + JSON.stringify(templateProjectPath) + ';' +
      'if(templateProjectPath && templateProjectPath.length){ templateFolder=importTemplateProject(templateProjectPath); }' +
      'var comp=findCompByName(\"' + compName.replace(/"/g, '\\"') + '\", templateFolder);' +
      'if(!comp) return \"Не найден шаблон: ' + compName.replace(/"/g, '\\"') + '\";' +
      'var provided=' + JSON.stringify(providedSpecs) + ';' +
      'var items=(provided && provided.length) ? resolveItemsFromSpecs(provided) : wrapSelectedItems(getSelectedReplaceItems());' +
      'if(!items || items.length===0) items=[];' +
      'var targetComp=comp;' +
      'app.beginUndoGroup(\"Replace Placeholders\");' +
      'var stats={found:0,replaced:0,layers:0,markers:0,samples:[]};' +
      'try{ _walk(targetComp, items, [], stats);}catch(e){ app.endUndoGroup(); return \"Ошибка: \"+e.toString(); }' +
      'app.endUndoGroup();' +
      'try{' +
      '  if(proj.activeItem && proj.activeItem instanceof CompItem){' +
      '    proj.activeItem.layers.add(targetComp);' +
      '  }' +
      '}catch(eLayer){}' +
      'try{ targetComp.name=' + JSON.stringify(templateName) + '; }catch(eName){}' +
      'try{ if(typeof targetComp.openInViewer===\"function\") targetComp.openInViewer(); }catch(e2){}' +
      'if(stats.found===0) return \"Не найдено плейсхолдеров (PH: в маркерах/комментарии/имени слоёв). Слоёв: \"+stats.layers+\", маркеров: \"+stats.markers+\", примеры: \"+stats.samples.join(\" | \");' +
      'return \"Обновлена композиция: \" + targetComp.name + \". Плейсхолдеров: \" + stats.found + \", заменено: \" + stats.replaced;' +
      '})()';

    cs.evalScript(jsxCode, function (result) {
      if (result && typeof result === "string") {
        var resultLower = result.toLowerCase();
        if (resultLower.indexOf("ошибка") !== -1 || resultLower.indexOf("не найден") !== -1 || resultLower.indexOf("выдели") !== -1) {
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
