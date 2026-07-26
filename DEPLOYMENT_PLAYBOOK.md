# Плейбук: CI, реліз і сайт для Tauri-проєкту в pnpm-монорепо

Документ зібраний за результатами налаштування цього репозиторію (git-manager) з нуля до
працюючого стану. Мета — щоб у наступному проєкті на тому ж стеку все запрацювало **з першого
разу**, а не після двадцяти ранів.

Стек, до якого це застосовне: pnpm workspace + Tauri v2 (Rust) + React/Vite десктоп + React/Vite
маркетинговий сайт на GitHub Pages + релізи з інсталяторами + автооновлення.

---

## ⚠️ ЧАСТИНА 0. ЩО ТРЕБА ЗРОБИТИ РУКАМИ НА GITHUB

**Це неможливо зробити з коду. Жоден скрипт і жоден агент цього за вас не зробить.**
Поки ці п'ять пунктів не виконані, пайплайн буде падати — і падати незрозуміло, бо повідомлення
про помилки тут максимально неінформативні.

Пройдіть їх **до** першого пуша тега.

### 0.1. Білінг

`Settings → Billing and plans` → переконайтесь, що платіжний метод активний і spending limit не нульовий.

**Симптом, якщо не зроблено:** джоба падає за 3 секунди з порожнім списком кроків і повідомленням:

> The job was not started because recent account payments have failed or your spending limit needs to be increased.

**Чому це підступно:** звичайні CI-джоби при цьому можуть спокійно виконуватись. Блокуються саме
джоби з `environment:` — тобто деплой Pages. Виглядає як «зламався деплой», а насправді білінг.

### 0.2. Увімкнути GitHub Pages з джерелом Actions

`Settings → Pages → Build and deployment → Source` → **GitHub Actions** (не «Deploy from a branch»).

**Симптом, якщо не зроблено:** сайт віддає 404, а `https://api.github.com/repos/OWNER/REPO/pages`
теж 404.

### 0.3. Дозволити тегам деплоїти в оточення `github-pages`

`Settings → Environments → github-pages → Deployment branches and tags`
→ режим **Selected branches and tags** → `Add deployment branch or tag rule`:

| Тип | Шаблон |
|---|---|
| Branch | `main` |
| Tag | `v*.*.*` |

**Симптом, якщо не зроблено:** усі збірки зелені, а джоба деплою падає з:

> Tag "v0.1.0" is not allowed to deploy to github-pages due to environment protection rules.

**Чому:** реліз-воркфлоу виконується з рефа `refs/tags/v0.1.0`, а оточення за замовчуванням
пускає тільки дефолтну гілку. Правило для тега додати обов'язково, інакше сайт після кожного
релізу доведеться деплоїти вручну.

### 0.4. Ключі для автооновлення (updater)

Без цього додаток збереться і працюватиме, але **автооновлення не працюватиме ніколи**.

1. Згенеруйте пару ключів локально:

```bash
pnpm --filter <ваш-desktop-пакет> tauri signer generate -w ~/.tauri/myapp.key
```

2. `Settings → Secrets and variables → Actions → New repository secret` — додайте два секрети:

| Ім'я секрету | Значення |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | вміст файлу `~/.tauri/myapp.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | пароль, який ви задали при генерації |

3. Публічний ключ (`~/.tauri/myapp.key.pub`) вставте в `tauri.conf.json` → `plugins.updater.pubkey`.

4. У тому ж файлі увімкніть генерацію артефактів апдейтера:

```json
"bundle": {
  "createUpdaterArtifacts": true
}
```

**Симптом, якщо покласти плейсхолдер замість справжнього ключа** (як було тут): збірка проходить,
`latest.json` не генерується, апдейтер у зібраному додатку падає на розборі ключа.

### 0.5. Права воркфлоу на створення релізів

`Settings → Actions → General → Workflow permissions` → **Read and write permissions**.

Альтернатива, якою користуємось тут: не змінювати глобальне налаштування, а прописати права
в самій джобі:

```yaml
    permissions:
      contents: write
```

**PAT (персональний токен) не потрібен.** Вбудованого `GITHUB_TOKEN` достатньо для всього —
з одним важливим винятком, описаним у пункті 4.9.

---

## ЧАСТИНА 1. ПРАВИЛЬНИЙ ПОРЯДОК ДІЙ З НУЛЯ

Саме в такій послідовності. Пункти 2–5 — до першого пуша, пункт 6 — до першого тега.

1. **Створити репозиторій, залити код.**

2. **Закомітити `Cargo.lock`.** Приберіть `Cargo.lock` з `.gitignore`. Це застосунок, а не
   бібліотека — лок мусить бути в git. Деталі чому — 4.8.

3. **Додати скрипт `tauri`** у `package.json` десктоп-пакета:

```json
"scripts": {
  "tauri": "tauri"
}
```

4. **Налаштувати сайт під підкаталог GitHub Pages** (`/repo-name/`) — див. частину 2.

5. **Написати три воркфлоу** — див. частину 3.

6. **Виконати всі п'ять пунктів частини 0 на GitHub.**

7. **Перевірити локально, що збірка взагалі жива**, до будь-якого CI:

```bash
pnpm --filter <desktop-пакет> tauri build
```

```bash
cargo fmt --manifest-path <path>/src-tauri/Cargo.toml --check
```

```bash
cargo clippy --manifest-path <path>/src-tauri/Cargo.toml -- -D warnings
```

```bash
cargo test --manifest-path <path>/src-tauri/Cargo.toml
```

8. **Пуш у `main`** → CI і Pages мусять бути зелені.

9. **Прогнати реліз-воркфлоу вручну як димову перевірку.** `Actions → Release → Run workflow`.
   Він збере всі платформи, але **не створить реліз** (див. 3.2) — тобто ви перевіряєте збірку,
   не засмічуючи публічні релізи. Це найдешевший спосіб зловити 90% проблем.

10. **Тільки тепер тег:**

```bash
git tag v0.1.0 && git push origin v0.1.0
```

---

## ЧАСТИНА 2. КОНФІГУРАЦІЯ САЙТУ ПІД GITHUB PAGES

GitHub Pages віддає проєктний сайт із підкаталогу `https://USER.github.io/REPO/`, а не з кореня
домену. Це ламає всі абсолютні шляхи, якщо про це не подумати.

### 2.1. `vite.config.ts`

```ts
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/repo-name/' : '/',
});
```

І в воркфлоу збірки сайту: `env: { GITHUB_PAGES: 'true' }`.

### 2.2. `index.html` — тільки `%BASE_URL%`

```html
<link rel="icon" type="image/png" href="%BASE_URL%favicon.png" />
```

**Не `href="/favicon.png"`.** Vite підставляє base у посилання на ассети зі `src/`, але шлях на файл
із `public/` з ведучим слешем лишає як є — і він вестиме на корінь домену, тобто в 404.
Перевірка: після збірки в `dist/index.html` усі `src`/`href` мусять починатися з `/repo-name/`.

### 2.3. Запити з рантайму — через `BASE_URL`

```ts
fetch(`${import.meta.env.BASE_URL}download-manifest.json`)
```

**Не `fetch('./download-manifest.json')`.** Відносний шлях резолвиться відносно поточного URL: при
заході на `/repo` без слеша в кінці він піде в корінь домену.

Для `import.meta.env` потрібен `src/vite-env.d.ts`, інакше `tsc` впаде з
`TS2339: Property 'env' does not exist on type 'ImportMeta'`:

```ts
/// <reference types="vite/client" />
```

### 2.4. Роутер

Якщо на сайті буде клієнтський роутер — потрібен `public/404.html` як копія `index.html`, бо
Pages не вміє SPA-фолбек. Якщо сайт односторінковий (як тут) — не потрібен.

---

## ЧАСТИНА 3. ВОРКФЛОУ

Три файли, три різні задачі.

### 3.1. `ci.yml` — перевірки на кожен пуш

Ключовий момент, який неочевидний: **Rust-джоба мусить зібрати фронтенд перед `cargo`-командами.**

```yaml
      - name: Build Desktop Frontend
        run: |
          pnpm install --frozen-lockfile
          pnpm build:desktop
```

Причина: `tauri::generate_context!` вбудовує бандл фронтенду на етапі компіляції, а `dist/` у
`.gitignore` — на раннері його не існує. Без цього кроку `cargo clippy` падає з
`error: proc macro panicked` і кодом 101, і це виглядає як проблема Rust-коду.
Отже, у Rust-джобі потрібні і `pnpm/action-setup`, і `actions/setup-node`.

### 3.2. `release.yml` — збірка і публікація

Тригери: пуш тега `v*.*.*` (справжній реліз) + `workflow_dispatch` (димова перевірка без релізу).

**Матриця без `macos-13`** — цей ярлик більше не отримує раннера, джоба висить у Queued годинами
й тримає весь ран у незавершеному стані. Intel-збірка кросс-компілюється з arm64:

```yaml
        include:
          - platform: 'windows-latest'
            label: 'windows-x64'
            args: ''
            rust_targets: ''
          - platform: 'ubuntu-22.04'
            label: 'linux-x64'
            args: ''
            rust_targets: ''
          - platform: 'macos-latest'
            label: 'macos-arm64'
            args: '--target aarch64-apple-darwin'
            rust_targets: 'aarch64-apple-darwin'
          - platform: 'macos-latest'
            label: 'macos-x64'
            args: '--target x86_64-apple-darwin'
            rust_targets: 'x86_64-apple-darwin'
```

Оскільки дві джоби діляться одним раннером, ключ кешу мусить включати label, інакше вони
затирають кеш одна одної:

```yaml
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: <path>/src-tauri
          key: ${{ matrix.label }}
```

Виклик `tauri-action` для pnpm-монорепо:

```yaml
        with:
          projectPath: './apps/desktop'
          tauriScript: 'pnpm --filter @scope/desktop tauri'
          tagName: ${{ startsWith(github.ref, 'refs/tags/') && github.ref_name || '' }}
          releaseName: ${{ startsWith(github.ref, 'refs/tags/') && format('App {0}', github.ref_name) || '' }}
          args: ${{ matrix.args }}
```

Два важливих моменти:

- `tauriScript` обов'язковий, бо `tauri-action` визначає пакетний менеджер за лок-файлом у
  `projectPath`, а в монорепо `pnpm-lock.yaml` лежить у корені — і він відкатується на npm.
  Форма з `--filter` не залежить від робочої теки, тому надійніша за просте `pnpm tauri`.
- Порожній `tagName` при ручному запуску — це те, що робить `workflow_dispatch` димовою
  перевіркою. Без цієї умови ручний клік створить реліз з тегом `main`.

### 3.3. `pages.yml` — деплой сайту

Тригери: пуш у `main` (з `paths`-фільтром), `workflow_dispatch` і — обов'язково — `workflow_call`:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'apps/site/**'
      - 'packages/**'
      - 'scripts/generate-download-manifest.mjs'
  workflow_call:
  workflow_dispatch:
```

І в `release.yml` — залежна джоба, яка викликає його після збірок:

```yaml
  deploy-site:
    needs: build-tauri
    if: startsWith(github.ref, 'refs/tags/')
    permissions:
      contents: read
      pages: write
      id-token: write
    uses: ./.github/workflows/pages.yml
```

**Чому не можна просто `on: release: types: [published]`:** реліз створює `GITHUB_TOKEN`, а GitHub
навмисно не запускає воркфлоу від подій, згенерованих цим токеном (захист від рекурсії). Такий
тригер не спрацює **ніколи** — і це не помилка конфігурації, це так задумано.

---

## ЧАСТИНА 4. ПОВНИЙ СПИСОК ГРАБЕЛЬ

Усі знайдені в цій сесії дефекти. Читати як список того, що треба перевірити наперед.

| # | Симптом | Причина | Правильно |
|---|---|---|---|
| 4.1 | `npm error Missing script: "tauri"` | у десктоп-пакеті немає скрипта `tauri`, а `tauri-action` викликає `<pm> run tauri build` | додати `"tauri": "tauri"` |
| 4.2 | збірка йде через `npm` у pnpm-репо | `tauri-action` шукає лок-файл у `projectPath`, а він у корені монорепо | `tauriScript: 'pnpm --filter <pkg> tauri'` |
| 4.3 | ручний запуск створив реліз з тегом `main` | `tagName: ${{ github.ref_name }}` без перевірки типу рефа | обгорнути в `startsWith(github.ref, 'refs/tags/')` |
| 4.4 | `cargo fmt --check` червоний на десятках файлів | Rust ніколи не форматувався | прогнати `cargo fmt` один раз на старті |
| 4.5 | `error: consider using sort_by_key` | `clippy::unnecessary_sort_by` фатальний через `-D warnings` | `sort_by_key(\|x\| std::cmp::Reverse(x.field))` |
| 4.6 | `unused variable` тільки на Linux/macOS | параметри використовуються лише в `#[cfg(target_os = "windows")]`-блоці; **на Windows це невидимо** | `#[cfg(not(target_os = "windows"))] let _ = (a, b, c);` |
| 4.7 | `error: proc macro panicked`, exit 101 | Rust-джоба не збирає фронтенд, а `dist/` у `.gitignore` | додати `pnpm build:desktop` перед `cargo` |
| 4.8 | `Found version mismatched Tauri packages` | `Cargo.lock` у `.gitignore`; без нього Tauri CLI звіряє npm-версії з **рядками-вимогами** з `Cargo.toml`, які відстали | закомітити `Cargo.lock` |
| 4.9 | сайт не оновлюється після релізу | реліз створив `GITHUB_TOKEN` — від його подій воркфлоу не запускаються | `workflow_call` + залежна джоба в реліз-рані |
| 4.10 | джоба висить у Queued годинами | ярлик `macos-13` не отримує раннера | кросс-компіляція x86_64 з `macos-latest` |
| 4.11 | `Tag "v0.1.0" is not allowed to deploy` | оточення `github-pages` пускає лише дефолтну гілку | правило для тега `v*.*.*` (пункт 0.3) |
| 4.12 | `.rpm` і `.app.tar.gz` позначені як windows | класифікація за словами «macos»/«linux» в імені, а Tauri назв не містить платформи | класифікувати за розширенням |
| 4.13 | кнопка «MSI» веде на `.exe` | пошук ассета лише за platform+arch, а під Windows два пакети | звіряти ще й суфікс файлу |
| 4.14 | посилання на завантаження 404 | вигадані імена файлів у фолбеку | фолбек — на сторінку релізів, ніколи на вигаданий файл |
| 4.15 | маніфест без жодного завантаження, тихо | неавторизований GitHub API: 60 запитів/год на IP, далі 403 | передавати `GITHUB_TOKEN` у скрипт |
| 4.16 | вираз у матриці працює дивно | ключ `rust-targets` — дефіс у `${{ matrix.rust-targets }}` парситься як **віднімання** | лише підкреслення: `rust_targets` |
| 4.17 | іконка сайту 404 | `href="/favicon.svg"` ігнорує base, та й файлу не існувало | `%BASE_URL%favicon.png` + файл у `public/` |
| 4.18 | `TS2339: Property 'env' does not exist` | немає типів Vite | `src/vite-env.d.ts` з `/// <reference types="vite/client" />` |
| 4.19 | іконка встановленого додатка — суцільний квадрат | у `src-tauri/icons/` лежали заглушки **1×1 піксель** по 70 байт, а `icon.icns` був узагалі PNG із чужим розширенням; збірка на це не скаржиться | згенерувати набір з одного джерела: `tauri icon app-icon.svg` |
| 4.20 | `ParsingFailed(InvalidComment)` при `tauri icon` | подвійний дефіс `--` усередині XML-комментаря в SVG (заборонено стандартом) | не писати `--` у комментарях SVG |
| 4.21 | локально замінили іконку, перезібрали — у `.exe` стара | `embed-resource` перекомпілює ресурс лише коли змінюється **текст** `resource.rc`; шлях до `icon.ico` там не змінився, а за вмістом файлу залежності немає. `cargo clean -p` цей артефакт не чіпає | видалити `target/release/build/<crate>-*/out/resource.{rc,lib}` і перезібрати. На CI не виникає: target холодний |

---

## ЧАСТИНА 5. ЯК ДІАГНОСТУВАТИ, НЕ ВИТРАЧАЮЧИ ГОДИН

Це найцінніша частина. У цій сесії саме на діагностиці згоріло найбільше часу — через три
спроби вгадати причину замість того, щоб її побачити.

### 5.1. Логи ранів недоступні без авторизації, анотації — доступні

Навіть у **публічному** репозиторії сторінка логів джоби вимагає входу («Sign in to view logs»),
і `GET /actions/jobs/<id>/logs` віддає 403. А ось **анотації публічні** і читаються через API:

```
https://api.github.com/repos/OWNER/REPO/actions/runs/<run_id>/jobs
https://api.github.com/repos/OWNER/REPO/check-runs/<job_id>/annotations
```

Тому: **виводьте діагностику в анотації одразу**, не після третього невдалого рану.

### 5.2. Шаблон «перехопити вивід і показати в анотації»

Додавайте це до кожного кроку, який може впасти незрозуміло:

```yaml
      - name: Build
        shell: bash
        run: |
          set -o pipefail
          <ваша команда> 2>&1 | tee build.log

      - name: Surface build output
        if: failure()
        shell: bash
        run: |
          if [ ! -s build.log ]; then
            echo "::error title=Build::build.log is missing or empty"
            exit 0
          fi
          log=$(tail -c 6000 build.log)
          log="${log//'%'/'%25'}"
          log="${log//$'\r'/'%0D'}"
          log="${log//$'\n'/'%0A'}"
          echo "::error title=Build output::$log"
```

Екранування `%`, CR і LF обов'язкове — це вимога формату команд GitHub Actions.

**Не фільтруйте вивід grep'ом за очікуваним форматом.** Перша версія цього кроку шукала рядки
виду `файл:рядок:колонка` — і промовчала, бо помилка була без прив'язки до рядка. Виводьте хвіст
логу цілком.

### 5.3. Тривалість джоби відразу каже, де впало

| Час до падіння | Де шукати |
|---|---|
| 1–3 с | CLI не запустився або впав на валідації конфігу; версії, шляхи, відсутній скрипт |
| 20–40 с | встановлення пакетів, `cargo fmt`, дрібні кроки |
| хвилини | компіляція — тобто справді код |

Якщо крок падає за секунду — не шукайте баг у коді, шукайте в конфігурації.

### 5.4. «Локально працює, в CI ні» — це завжди різниця середовищ

Шукайте в такому порядку:

1. **Чого немає в git?** Найчастіше `Cargo.lock` або `dist/`. Перевірка: `git check-ignore -v <файл>`.
2. **Що є на CI, чого немає локально?** Порожні секрети приходять як порожні рядки.
3. **Інша ОС.** Код під `#[cfg(target_os = ...)]` на вашій машині взагалі не компілюється.

Корисний прийом для третього пункту: `cargo clippy --target x86_64-unknown-linux-gnu` на
мінімальному крейті без залежностей — відтворює лінти чужої платформи за секунди.

### 5.5. `--message-format=short` для clippy

Одна помилка — один рядок, замість десяти рядків із рамками. Значно легше читати в анотації.

### 5.6. Ліміт API

Неавторизовано — 60 запитів на годину на IP. Якщо діагностуєте через API, ви його вичерпаєте
швидше, ніж думаєте. Перевірка: `curl -s https://api.github.com/rate_limit`.
Обхід: читати публічні HTML-сторінки ранів (вони під ліміт не потрапляють) або авторизуватись.

---

## ЧАСТИНА 6. РЕАЛЬНІ ІМЕНА АРТЕФАКТІВ TAURI

Tauri називає бандли за `productName`. Якщо в ньому є **пробіл** — GitHub при завантаженні
замінює пробіли на **крапки**. Для `productName: "Git Manager"` і версії `0.1.0` виходить:

| Платформа | Ім'я файлу |
|---|---|
| Windows NSIS | `Git.Manager_0.1.0_x64-setup.exe` |
| Windows MSI | `Git.Manager_0.1.0_x64_en-US.msi` |
| macOS ARM | `Git.Manager_0.1.0_aarch64.dmg` |
| macOS Intel | `Git.Manager_0.1.0_x64.dmg` |
| Linux AppImage | `Git.Manager_0.1.0_amd64.AppImage` |
| Linux deb | `Git.Manager_0.1.0_amd64.deb` |
| Linux rpm | `Git.Manager-0.1.0-1.x86_64.rpm` |
| macOS updater | `Git.Manager_aarch64.app.tar.gz` |

**Ніколи не хардкодьте ці імена в код сайту.** Беріть їх з GitHub API. Наш перший варіант мав
у фолбеку `Git-Manager_0.1.0_windows_x64-setup.exe` — такого файлу не існує і не існувало б.

Правильна класифікація в генераторі маніфесту — **за розширенням**, бо `.rpm` і `.app.tar.gz`
не містять у назві жодного платформного слова:

```js
const name = asset.name.toLowerCase();
let platform = 'windows';
if (name.includes('macos') || name.includes('darwin') ||
    name.endsWith('.dmg') || name.endsWith('.app.tar.gz')) {
  platform = 'macos';
} else if (name.includes('linux') || name.endsWith('.appimage') ||
           name.endsWith('.deb') || name.endsWith('.rpm')) {
  platform = 'linux';
}
let architecture = (name.includes('arm64') || name.includes('aarch64')) ? 'arm64' : 'x64';
```

### 6.1. Іконки застосунку

Тримайте **одне джерело** — `app-icon.svg` (1024×1024, з прозорістю) у корені десктоп-пакета — і
генеруйте з нього весь набір:

```bash
pnpm --filter <desktop-пакет> tauri icon app-icon.svg
```

`tauri icon` приймає і SVG, і PNG. Для десктоп-онлі застосунку теки `android/` та `ios/`, які він
теж створює, можна видалити.

**Обов'язково перевіряйте вміст, а не наявність файлів.** У цьому репозиторії всі шість іконок були
заглушками 1×1 піксель по 70 байт, причому `icon.icns` був звичайним PNG із розширенням `.icns`.
Збірка проходила успішно й нічого не повідомляла — проблема виявилась лише на встановленому
додатку, де Windows розтягнув один піксель на всю плитку. Перевірка:

```bash
python -c "import struct;d=open('icons/icon.ico','rb').read();print(len(d),struct.unpack('<H',d[4:6])[0],'images')"
```

Правильні значення після генерації: `icon.ico` — кілька зображень і ~19 КБ, `icon.icns` — заголовок
`icns` і ~100 КБ, `icon.png` — 512×512.

**Іконка на вже встановленій копії не зміниться від правки в репозиторії.** Вона вкомпільована в
`.exe`, тому потрібен новий реліз і перевстановлення. Windows ще й кешує іконки — інколи потрібен
перезапуск explorer.

Якщо в проєкті є UI-компонент логотипа — робіть іконку з тією ж геометрією, щоб бренд не
розходився. Тут `app-icon.svg` повторює `Logo.tsx`: градієнтна плитка indigo→blue з глифом
`FolderGit2` у білому.

---

## ЧАСТИНА 7. ЯК ВИПУСКАТИ НАСТУПНІ ВЕРСІЇ

Версія дублюється в кількох файлах — тримайте їх синхронними скриптом і перевіркою в CI
(`sync-version.mjs` / `check-version.mjs` у цьому репозиторії):

- `package.json` (корінь і всі пакети)
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- і тег мусить бути `v<та сама версія>`

Порядок:

```bash
pnpm release:prepare 0.2.0
```

```bash
git add -A && git commit -m "release 0.2.0" && git push
```

```bash
git tag v0.2.0 && git push origin v0.2.0
```

**Не переставляйте тег, з якого вже опубліковано реліз.** У цій сесії тег `v0.1.0` рухався
чотири рази — це було припустимо лише тому, що реліз з нього ще не публікувався. Коли реліз уже
є, випускайте наступну патч-версію.

---

## ЧАСТИНА 8. ЧЕКЛІСТ ПЕРЕД ПЕРШИМ ТЕГОМ

Код:

- [ ] `Cargo.lock` закомічений (`git ls-files | grep Cargo.lock` щось повертає)
- [ ] у десктоп-пакеті є скрипт `"tauri": "tauri"`
- [ ] `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` — зелені локально
- [ ] `pnpm --filter <desktop> tauri build` проходить локально до кінця
- [ ] `base` у vite виставляється під Pages, у `dist/index.html` шляхи з префіксом репо
- [ ] у коді сайту немає жодного хардкодженого імені файлу релізу
- [ ] у матриці немає `macos-13`
- [ ] ключі матриці без дефісів
- [ ] у Rust-джобі CI є збірка фронтенду
- [ ] у `pages.yml` є `workflow_call`, у `release.yml` — залежна джоба деплою
- [ ] у кроках збірки є перехоплення виводу в анотації (5.2)
- [ ] іконки **справжні**, а не заглушки — перевірте розміри, а не наявність файлів:
      `icon.ico` мусить містити кілька зображень, `icon.icns` — бути формату ICNS,
      PNG-и — відповідати своїм іменам (див. 6.1)

GitHub (частина 0):

- [ ] білінг активний
- [ ] Pages увімкнені з джерелом **GitHub Actions**
- [ ] в оточенні `github-pages` дозволені `main` **і** тег `v*.*.*`
- [ ] секрети `TAURI_SIGNING_PRIVATE_KEY` і `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` додані
- [ ] справжній `pubkey` у `tauri.conf.json` і `createUpdaterArtifacts: true`
- [ ] воркфлоу мають право `contents: write`

Останнє перед тегом:

- [ ] `Actions → Release → Run workflow` пройшов зелено (збірка без публікації)

---

## ЧАСТИНА 9. ЯКБИ РОБИТИ ЦЕ ЗАНОВО

Стисло, чого коштувала кожна помилка процесу:

1. **Спочатку налаштування GitHub, потім код.** Білінг і Pages блокували деплой ще до того, як
   з'явився перший рядок воркфлоу. Пів години розбору «чому не деплоїться» — при тому що код був
   бездоганний.

2. **Локальна збірка — перед першим тегом, не після п'ятого рану.** Один запуск
   `pnpm tauri build` локально відповів би на питання «код чи конфіг» одразу.

3. **Логи читабельні — з першого дня.** Три рани були витрачені на здогадки: спочатку робоча
   тека, потім версія тулчейна, потім лінт `zombie_processes`. Усі три хибні. Крок з `tee` +
   анотацією, доданий одразу, зекономив би їх усі.

4. **`Cargo.lock` у git з самого початку.** Одна строчка в `.gitignore` дала помилку, яку
   неможливо відтворити локально за визначенням — бо локально лок є завжди.

5. **Ручний прогін реліз-воркфлоу як димова перевірка.** Створити реліз з тегом `main` через
   випадковий клік — саме те, від чого захищає порожній `tagName`.
