# Sprawdzanie zakresów wiatru w Polsce

1. W panelu wybierz **Poland → Wind ranges to review**. Fioletowy znak **?** wskazuje miejscówkę z niepotwierdzonym zakresem. Po imporcie 48 potwierdzeń pozostały 34 takie wpisy.
2. Kliknij rozetę lub kafelek w tym trybie. Z widoku **All sites** możesz użyć przycisku **Set wind range** albo **Edit saved wind range**. Mapa pokaże miejscówkę i dużą rozetę, a obok pojawi się formularz. Na telefonie formularz jest pod podglądem i można go przewijać.
3. Kliknij **Choose review file**. Wybierz nazwę i miejsce zapisu, np. `fly-ireland-poland-wind-review.json` w katalogu pluginu. Do tego pliku będą dopisywane kolejne zatwierdzone miejscówki.
4. Wpisz kierunek, **z którego może wiać**, w stopniach. Podgląd zielonego łuku na dużej rozecie aktualizuje się podczas pisania.

| Wpis | Znaczenie |
| --- | --- |
| `80-130` | Jeden zakres |
| `80-130 / 280-360` | Dwa oddzielne zakresy |
| `285-15` | Zakres przechodzący przez północ |
| `0-360` | Wszystkie kierunki |

5. Kliknij **Confirm & save**. Przy podłączonym pliku komunikat **Saved to …** potwierdza zapis na dysku. Każdy zapis zawiera wszystkie dotychczasowe wpisy. Potem wybierz **Next site →** albo kolejną miejscówkę. **Next site →** przechodzi alfabetycznie od aktualnej pozycji i pomija zatwierdzone wpisy; dopiero po końcu listy wraca na początek. Możesz też przejść dalej bez zatwierdzania — szkic zostaje zapisany i miejscówka nadal wymaga sprawdzenia.
6. Po odświeżeniu przeglądarka odtwarza szkice i zatwierdzone wpisy. Podłącz ponownie ten sam plik przyciskiem **Choose review file**. Plugin odczyta go i połączy z postępem w przeglądarce, zanim go zapisze. Nowszy szkic nie usuwa wcześniej zatwierdzonego zakresu.
7. Gotowy plik umieść w katalogu pluginu i przekaż go do aktualizacji katalogu. Do importu służą wpisy z `confirmedAt` i `windRanges`; szkice mają samo `draft`.

Bez wybranego pliku postęp jest zapamiętywany w przeglądarce, a formularz przypomina o zapisie na dysku. **Download JSON** pobiera pełną kopię; **Load JSON** wczytuje wcześniejszą kopię. Jeśli przeglądarka nie obsługuje bezpośredniego zapisu, używaj pobierania po każdym zatwierdzeniu. Błąd zapisu nie jest zgłaszany jako sukces; pozostaw okno otwarte, ponów zapis albo pobierz kopię. Przy zablokowanym zapisie w przeglądarce pojawi się osobny komunikat.

Bezpośredni zapis korzysta z wyboru pliku i uprawnień przeglądarki opisanych w [dokumentacji Chrome](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access). Nie działa we wszystkich przeglądarkach. Plik jest odczytywany i sprawdzany przed zapisem; przypadkowo wybrany inny JSON nie zostanie nadpisany.

Zatwierdzanie w tym formularzu nie zmienia jeszcze źródłowych zakresów ani filtra **Wind-matched**. Zapisane zakresy zostaną włączone do pluginu po późniejszym imporcie pliku. Akceptacja filmu, GPS startu i kierunku wiatru pozostają oddzielnymi informacjami.

W wersji 1.1.26 zaimportowano już 48 potwierdzonych zakresów. Dotychczasowy plik nadal można podłączyć: zachowa wcześniejsze wpisy, a nowe potwierdzenia będą dodawane do tej samej historii. Zaimportowane kierunki działają w prognozie i nie wymagają ponownego potwierdzania.
