# Publikacja Fly Ireland na GitHubie

Gotowy projekt znajduje się w folderze **Fly Ireland**. Nazwa repozytorium: **fly-ireland**. Techniczna nazwa wtyczki: **windy-plugin-fly-ireland**.

## 1. Utwórz nowe repozytorium

Na GitHubie, na koncie `KamilYS2b7`, wybierz **New repository**, wpisz `fly-ireland` i ustaw wybraną widoczność. Nie dodawaj automatycznie README, licencji ani `.gitignore`: te pliki są już przygotowane w projekcie.

Jeśli wybierzesz inne konto lub nazwę, popraw odnośniki w `package.json` i `src/pluginConfig.ts` przed publikacją.

## 2. Wyślij źródła

Rozpakuj przygotowany ZIP i otwórz PowerShell w folderze **Fly Ireland**. Użyj GitHub Desktop albo poniższych poleceń, gdy masz zainstalowany Git:

```powershell
git init -b main
git add .
git commit -m "Initial Fly Ireland release"
git remote add origin https://github.com/KamilYS2b7/fly-ireland.git
git push -u origin main
```

Do repozytorium trafiają źródła z folderu, a nie sam plik ZIP. Zachowaj ukryty katalog `.github` oraz pliki `.gitignore` i `.nvmrc`.

Folder publikacyjny nie zawiera historii `.git` poprzedniego szablonu ani jego zdalnego repozytorium. Rozpocznij pracę w przygotowanym folderze **Fly Ireland**.

## 3. Sprawdź wynik

Po wysłaniu kodu otwórz zakładkę **Actions**. Workflow **Fly Ireland checks** uruchomi testy i kompilację na Windowsie oraz Ubuntu.

Lokalna kontrola:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
```

Do działania testów potrzebny jest Node.js 24 lub nowszy. `npm.cmd start` uruchamia serwer deweloperski wtyczki.

## Windy jest osobnym krokiem

GitHub udostępnia kod. Instalacja deweloperska odbywa się w [Windy Developer Mode](https://www.windy.com/developer-mode), z adresem `https://localhost:9999/plugin.js`.

Po zmianie nazwy z szablonu użyj ponownie **Install & open plugin**. Nowa ścieżka wtyczki to `/plugin/fly-ireland`.

Workflow publikujący do Windy jest uruchamiany ręcznie i wymaga sekretu repozytorium `WINDY_API_KEY`. Nie uruchamia się przy zwykłym wysłaniu kodu na GitHub. Domyślna konfiguracja zachowuje prywatną widoczność w galerii Windy.

## Poprawka 1.0.1 — wyświetlanie panelu

Zachowaj `desktopUI: 'embedded'` oraz `mobileUI: 'small'` w `src/pluginConfig.ts`. Tryb `fullscreen` otwiera zbędną pełnoekranową osłonę, a `embedded` nie jest obsługiwane jako tryb mobilny przez klienta Windy. Pusty kontener z krzyżykiem jest ukryty tylko dla Fly Ireland; własny panel i rozety nadal działają. Przycisk „−” zwija listę bez wyłączania wtyczki.

Wyślij poprawione źródła na GitHub i uruchom **Actions → Publish Fly Ireland to Windy → Run workflow**. W logu otrzymasz adres nowej wersji. Samo odświeżenie strony nie zastąpi opublikowanej wersji 1.0.0 lokalną poprawką.

## Wersja 1.1.0 — przewodniki po miejscówkach

Przycisk **Site guide** na kafelku oraz ikonka informacji przy dużej rozecie otwierają opisy i zdjęcia. **Show on map** pokazuje punkty startu, lądowania i parkingi wybranej miejscówki. Pasek **Site points** pozwala wrócić do opisu albo ukryć punkty. Zamknięcie przewodnika nie zamyka wtyczki.

Do źródeł na GitHubie dołącz katalog `assets/assets` z plikiem `site_descriptions.json` i podkatalogiem `sites`. Kompilacja kopiuje wymagane pliki do `dist/assets`; workflow publikuje je razem z wtyczką. Zdjęcia nie są osadzane w pliku JavaScript i są wczytywane dopiero po otwarciu opisu.

Punkty Lough Navar wymagają weryfikacji. Opisy źródłowe nie mają daty potwierdzenia aktualności zasad dostępu ani ograniczeń przestrzeni powietrznej.
