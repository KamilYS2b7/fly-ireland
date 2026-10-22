# Testowanie przez publiczny URL bez klucza Windy

W repozytorium GitHub otwórz **Settings → Pages** i w sekcji
**Build and deployment → Source** wybierz **GitHub Actions**.

Następnie otwórz **Actions → Deploy plugin URL for testing → Run workflow**
i wybierz gałąź `main`. Po włączeniu Pages kolejne zmiany na `main`
będą automatycznie aktualizować pliki wtyczki.

Po udanym wdrożeniu adres do pola **Load plugin directly from URL** w Windy:

```text
https://kamilys2b7.github.io/fly-ireland/plugin.min.js
```

Adres zaczyna działać dopiero po udanym wdrożeniu GitHub Pages. Dokładny
adres jest również wypisywany w podsumowaniu zadania. Pliki są publicznie
dostępne; wtyczka nie jest przez to publikowana w katalogu Windy.
Klucz `WINDY_API_KEY` nie jest potrzebny. Serwer lokalny nie jest potrzebny.

Workflow **Publish Fly Ireland to Windy** służy wyłącznie do opcjonalnego
wysyłania na serwery Windy i nie jest używany w tym sposobie testowania.
