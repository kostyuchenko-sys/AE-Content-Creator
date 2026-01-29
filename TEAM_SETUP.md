## Установка для команды (Motion Designers)

Эта инструкция для тех, кто не работает с кодом. Сделайте шаги один раз, дальше обновление будет автоматически.

---

## Mac

### 1) Установить Git (один раз)

- Откройте терминал (Spotlight → Terminal).
- Введите:
  ```bash
  git --version
  ```
- Если Git не установлен, система предложит установку — согласитесь.

### 2) Склонировать репозиторий (один раз)

```bash
cd ~
git clone https://github.com/kostyuchenko-sys/AE-Content-Creator.git
```

### 3) Установить панель (один раз)

```bash
cd ~/AE-Content-Creator
./scripts/install.sh
```

### 4) Открыть панель в After Effects

- Перезапустите After Effects.
- Откройте:
  `Window → Extensions (Legacy) → AE Content Constructor`

### 5) Как обновляться (быстро)

Когда появятся обновления:
```bash
cd ~/AE-Content-Creator
git pull
```

После `git pull` панель обновится автоматически.

---

## Windows

### 1) Установить Git (один раз)

- Установите Git for Windows: https://git-scm.com/download/win  
- После установки откройте **Git Bash**.
- Введите:
  ```bash
  git --version
  ```

### 2) Склонировать репозиторий (один раз)

В **Git Bash**:
```bash
cd ~
git clone https://github.com/kostyuchenko-sys/AE-Content-Creator.git
```

### 3) Установить панель (один раз)

В **Git Bash**:
```bash
cd ~/AE-Content-Creator
./scripts/install.bat
```

**Или самый простой вариант (Windows, один файл):**
```bash
cd ~
./AE-Content-Creator/scripts/setup_windows.bat
```

### 4) Открыть панель в After Effects

- Перезапустите After Effects.
- Откройте:
  `Window → Extensions (Legacy) → AE Content Constructor`

### 5) Как обновляться (быстро)

В **Git Bash**:
```bash
cd ~/AE-Content-Creator
git pull
```

После `git pull` панель обновится автоматически.

---

## Частые вопросы

**Панель не появляется в меню**  
1) Закройте AE и откройте снова.  
2) Запустите:
```bash
cd ~/AE-Content-Creator
./scripts/deploy.sh   # Mac
./scripts/deploy.bat  # Windows
```

**Где лежат шаблоны**  
Шаблоны находятся в папке `projects/` внутри репозитория.

**Куда ставится панель**  
- Mac: `~/Library/Application Support/Adobe/CEP/extensions/AEContentConstructor`  
- Windows: `%APPDATA%\Adobe\CEP\extensions\AEContentConstructor`
