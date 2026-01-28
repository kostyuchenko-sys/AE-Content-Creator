# Настройка CEP-панели AE Content Constructor

## Быстрая установка

1. **Включи PlayerDebugMode** (уже сделано автоматически):
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   defaults write com.adobe.CSXS.12 PlayerDebugMode 1
   defaults write com.adobe.CSXS.13 PlayerDebugMode 1
   ```

2. **Перезапусти After Effects** полностью (закрой и открой заново).

3. **Найди панель в меню**:
   - `Window → Extensions (Legacy) → AE Content Constructor`

## Если панель не появляется

### Проверь, что папка расширения на месте:
```bash
ls -la ~/Library/Application\ Support/Adobe/CEP/extensions/AEContentConstructor
```

Должны быть файлы:
- `CSXS/manifest.xml`
- `index.html`
- `host.js`
- `templates/` (папка с JSON-конфигами)

### Если папки нет — синхронизируй вручную:
```bash
# Из корня репозитория:
rsync -a extension/cep/AEContentConstructor/ ~/Library/Application\ Support/Adobe/CEP/extensions/AEContentConstructor/
rsync -a templates/ ~/Library/Application\ Support/Adobe/CEP/extensions/AEContentConstructor/templates/
```

### Проверь версию After Effects:
- Если AE 2024 (v24.x) → нужен CSXS.11
- Если AE 2025 (v25.x) → нужен CSXS.12 или CSXS.13

### Перезапусти Finder (иногда помогает):
```bash
killall Finder
```

## Использование

1. Открой After Effects и создай/открой проект.
2. Создай композицию-шаблон (например, `TEMPLATE_MAIN`) с плейсхолдерами `PH1`, `PH2`, `PH3`.
3. Импортируй футажи в Project-панель.
4. Выдели нужные футажи в Project.
5. Открой панель `AE Content Constructor`.
6. Выбери шаблон из списка (если есть несколько).
7. Нажми `Build from selection`.

## Отладка

Если кнопка ничего не делает:
- Убедись, что скрипт `ae-scripts/replace_placeholders_poc.jsx` доступен AE:
  - Либо запусти его один раз через `File → Scripts → Run Script File...`
  - Либо скопируй его в папку скриптов AE (обычно `~/Library/Application Support/Adobe/After Effects [версия]/Scripts/`)
