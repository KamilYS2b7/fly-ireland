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
