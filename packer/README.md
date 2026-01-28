# Template Packer (AE)

## Что делает

Скрипт упаковывает шаблон в единый пакет:

- `template.json` с метаданными и плейсхолдерами
- `preview.mp4` (или `preview.jpg` при необходимости)
- `project.aep` (сохранённая версия проекта)

## Формат пакета

```
<templateId>/
  template.json
  preview.mp4
  project.aep
  assets/ (опционально)
```

### template.json (пример)

```json
{
  "id": "basic_story",
  "name": "Basic Story",
  "description": "Простой сториз-шаблон",
  "mainCompName": "TEMPLATE_MAIN",
  "preview": { "mp4": "preview.mp4", "jpg": "preview.jpg" },
  "placeholders": [
    { "index": 1, "label": "Hero 1", "type": "video", "layerRef": "Layer 3" },
    { "index": 2, "label": "Hero 2", "type": "image", "layerRef": "Layer 5" }
  ]
}
```

## Как пользоваться

1. Открой проект с шаблоном.
2. Выбери `mainComp`.
3. Выдели слои для подмены и нажми **Mark placeholders**.
4. При необходимости задай стартовый **Counter** (если отмечаешь слои в разных precomp по очереди).
5. Укажи `templateId`, `name`, `description`, `output folder`.
6. При необходимости оставь включенной опцию **Reduce project + collect assets**.
7. Нажми **Build package** — будет собран пакет.

## Важно

Маркер плейсхолдера пишется в виде `PH:<index>_<LayerName>` (например `PH:2_AiVideo1`).  
Опция **Reduce project + collect assets** выполняет `Reduce Project` и пытается собрать все ассеты в папку `assets/`.
Это операция может быть разрушительной — лучше запускать упаковку на копии проекта.

