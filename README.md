# solare°

Pełnoekranowa piaskownica WebGL z wzajemną grawitacją N-body. Stale widoczne logo, pełny reset oraz dolny pasek czasu i lotu światła.

## Uruchomienie

Node 20.17+; `npm ci`, `npm run dev`. `npm run build` tworzy `dist`. `npm test` sprawdza integrator i zachowanie układu.

## Obsługa

- Przeciągnięcie: obrót; kółko / pinch: zoom do kursora; prawy przycisk / dwa palce: przesunięcie.
- Kliknięcie ciała: podgląd WebGL obok nazwy oraz edycja masy, promienia, prędkości, położenia, okresu i nachylenia osi.
- Dwuklik: śledzenie ciała. Wybór ciała możliwy także pod logo.
- Kliknięcie pustego miejsca: utworzenie komety, czarnej dziury lub planety. Wskazany punkt leży na płaszczyźnie ekliptyki; wysokość można zmienić polem Y.
- Logo / S: narzędzia czasu i nawigacji, wybór ciał, przełącznik rzeczywistej skali, restart symulacji.
- Spacja: pauza; A: dodawanie; R / Reset: pełne przywrócenie początkowego układu, ustawień i kamery; Escape: zamknięcie panelu.
- „Zamień orbitę” przenosi także księżyce wraz z pozycją i prędkością ich planety.

## Model i granice dokładności

Fizyka pracuje w AU, masach słonecznych i dniach, niezależnie od wizualnego powiększenia planet. Wszystkie 32 domyślne ciała (Słońce, osiem planet, 23 wybrane księżyce) i dodane obiekty wzajemnie oddziałują według grawitacji Newtona. Velocity Verlet z krokiem ograniczanym przez czas dynamiczny i zbliżenia. Kolizje przy rzeczywistych promieniach rozróżniają łączenie, wyrzut odłamków, rozbijające uderzenie, skośne zderzenie i pochłanianie. Masa i pęd liniowy są zachowane. Początkowy układ jest barycentryczny. Początkowe fazy orbit są skomponowane, nie odpowiadają aktualnej efemerydzie. Parametry planet bazują na tabelach JPL.

To nie jest kompletna symulacja wszystkich rzeczywistych warunków. Brak OTW, pływów, ewolucji termicznej, deformacji, momentów sił, pełnej dynamiki osi oraz perturbacji relatywistycznych. Czarna dziura jest masą punktową z promieniem Schwarzschilda jako granicą pochłaniania; pierścień jest ilustracją, nie modelem akrecji ani soczewkowania. Orientacje obrotu mają zadany okres i nachylenie, nie ewoluują od momentów sił. Przy bardzo ekstremalnych masach dokładność jest ograniczona.

Nie obejmuje wszystkich znanych księżyców. Mapy planet i ziemskiego Księżyca są astronomicznymi mapami powierzchni / atmosfery; pozostałe księżyce mają przybliżone, barwione tekstury Księżyca, a nieregularne satelity przybliżoną geometrię. Pas planetoid i ogony komet są dekoracyjnymi cząstkami bez wzajemnej grawitacji. Ogon komety wskazuje od Słońca, ale nie modeluje fizyki gazu.

Widok „Czytelny” powiększa promienie i nieliniowo skraca odległości. „Rzeczywista skala” przywraca proporcje przestrzeni i promieni. Cienkie orbity to chwilowe oskulacyjne rozwiązania dwuciałowe, aktualizowane z bieżących stanów; ślady pokazują faktyczny przebieg symulacji. Przy bardzo bliskich spotkaniach i szybkim tempie limit pracy klatki spowalnia upływ symulacji, zamiast zwiększać krok i destabilizować układ.

WebGL używa high-performance, dynamicznych buforów pozycji, wielkości, koloru, jasności i parametrów punktów, limitu DPR 2 i lokalnych tekstur. Maksymalnie 100 ciał. Brak Canvas 2D, zdalnych zapytań podczas działania i serwera danych.

## Walidacja

Testy obejmują zachowanie pędu i energii, stabilność orbity przez rok, związanie księżyców, reakcję na ruch Słońca, niezmienniczość Galileusza, kolizje i adaptację kroku. Kompilacja produkcyjna jest sprawdzana. Nie przeprowadzono testów przeglądarkowych. Opcjonalne WebMCP (odczyt i pauza) wykrywa wsparcie przeglądarki; brak dostępnego kontekstu do walidacji WebMCP.

## Źródła

Parametry: https://ssd.jpl.nasa.gov/planets/phys_par.html oraz https://ssd.jpl.nasa.gov/astro_par.html.
Tekstury: Solar System Scope / INOVE, CC BY 4.0. Szczegóły i linki w `public/credits.txt`, dostępnym także pod `/credits.txt`.

## Rozszerzony model zderzeń

`src/collisions.js` porównuje energię kinetyczną ruchu względnego z przybliżoną energią wiązania grawitacyjnego oraz uwzględnia kąt i prędkość ucieczki. Jest to autorska heurystyka inspirowana rozróżnieniem reżimów opisanym przez Leinhardt i Stewart, nie implementacja ich skalibrowanych praw: https://arxiv.org/abs/1106.6084.

Powolne zderzenia łączą ciała. Energetyczne uderzenia skalistych ciał tworzą do sześciu masywnych odłamków w symetrycznych parach. Uderzenia skośne mogą rozdzielić ciała, rozpraszając część energii ruchu normalnego. Ciała gazowe przyjmują uproszczony model akrecji; czarna dziura zawsze pozostaje pochłaniającym obiektem, a jej horyzont rośnie wraz z masą. Limit 100 ciał ogranicza liczbę odłamków, zachowując nierozdzieloną masę w pozostałości.

Odłamki uczestniczą w pełnej grawitacji N-body i mogą ponownie zderzać się z innymi ciałami. Błysk i pył są krótkotrwałą wizualizacją WebGL, nie dodatkową masą. Kontrola kolizji następuje przed integracją i po każdym podkroku; tempo zatrzymuje się wraz z pauzą. Model zachowuje masę i pęd liniowy, lecz nie odtwarza hydrodynamiki, kraterów, przemian fazowych, chemii ani pełnego bilansu momentu pędu i energii wewnętrznej. Podgląd obraca obiekt z powolnym tempem prezentacyjnym niezależnym od przyspieszenia czasu i pokazuje jego kształt, teksturę, pierścienie oraz nachylenie osi.

## Reset i prędkość światła

Reset / R przywraca cały początkowy układ i ustawienia. Celownik pod logo resetuje sam widok.

Stały dolny pasek udostępnia pauzę, tempo i lot światła. Podczas lotu tempo można zmieniać między 1×, 10×, 60×, 300× i 1000× bez skoków przebytej drogi. Współczynnik przyspiesza zegar demonstracji; w jego czasie światło nadal przebywa 1 AU w 499,004783836 s. Zegar obejmuje przerwy między klatkami i ukrycie karty, wykluczając pauzę.

Na czas demonstracji widoczne planety są ustawione na jednej linii na nominalnych odległościach od Słońca. Ich rozmiary są powiększone, a kamera biegnie po równoległej prostej nieco nad nimi, patrząc wstecz ku Słońcu. Odległość na liczniku oznacza drogę wzdłuż osi przelotu od poziomu Słońca. Nie jest to fizyczne wyrównanie planet: rzeczywiste położenia, prędkości i stan N-body pozostają nietknięte, a integracja grawitacji jest wstrzymana na czas demonstracji. Księżyce są pokazywane przy planetach, a orbity i ślady są ukryte. Obroty są prezentowane według czasu lotu.

Panel podaje przebytą drogę w AU i milionach kilometrów, czas podróży, następne ciało, pozostałą odległość, czas lotu oraz czas oglądania przy bieżącym przyspieszeniu. Pasek etapów wyróżnia minięte planety i kolejną. Podpisy przy widocznych najbliższych planetach pomagają zorientować się w scenie.

Zakończenie lotu, Escape, rozpoczęcie edycji lub dodawania przywracają poprzedni widok i układ. Reset dodatkowo odtwarza cały stan początkowy. To demonstracja propagacji w próżni, bez modelowania relatywistycznego obrazu obserwatora. Stałe: https://ssd.jpl.nasa.gov/astro_par.html.

## Kadrowanie i skala przelotu

Domyślny lot używa płynnego zbliżenia kamery do każdej planety. W pobliżu minięcia odległość kamery wynosi około 3 promieni renderowanego ciała, przy polu widzenia 75°, co daje tarczę zajmującą około 45–50% wysokości kadru po jego lewej stronie. Kierunek patrzenia płynnie obejmuje Słońce i planetę, eksponując jej oświetlony fragment. To ruch kamery demonstracyjnej; licznik nadal opisuje propagację światła wzdłuż trasy, a nie długość odchylonej ścieżki kamery.

Przełącznik „Rzeczywiste rozmiary i odległości” wyłącza zbliżenia i powiększenia ciał: promienie są przeliczane z kilometrów do tej samej skali AU co pozycje, także dla Słońca i księżyców. Odległości planet w obu trybach bazują na nominalnych półosiach orbit. Wyrównanie planet pozostaje demonstracyjne; wyjście z lotu przywraca właściwy układ. Przy rzeczywistej skali planety nie mają wymuszonego rozmiaru 1/5 ekranu.

Prawa pionowa oś pokazuje etapy; każdy odcinek między sąsiednimi planetami jest wypełniany liniowo według przebytej odległości. Odstępy etykiet są równe dla czytelności, więc cała oś jest skalą etapową, nie jednolitą skalą AU. Jasna korona Słońca jest efektem addytywnym WebGL z obsługą logarytmicznego bufora głębokości, a rozmiar poświaty zależy od wybranej skali.

Dolne panele mają tło o kryciu 26%, bez rozmycia sceny. Kamera przelotu jest przesunięta bocznie w płaszczyźnie XZ, dzięki czemu planeta pojawia się od lewej krawędzi na środkowej wysokości kadru, zamiast spod dolnego panelu.

Kliknięcie nazwy planety na prawej osi (lub Enter / Spacja po ustawieniu fokusu) przenosi lot do jej odległości demonstracyjnej. Czas jest przeliczany jako droga / c; odczyty, kamera i postęp są aktualizowane razem. Zachowane zostają przyspieszenie, pauza i tryb skali. Można przeskakiwać w obie strony.

Lot domyślnie używa rzeczywistych promieni i odległości. Bliskie kadrowanie działa w obu trybach skali. Bazowy dystans kamery jest skalibrowany dla Ziemi (około 30% wysokości obrazu); dla dużych planet minimalny bezpieczny dystans rośnie z ich promieniem, zachowując większą tarczę w kadrze. Zmienia się pozycja kamery, nie rozmiary obiektów. Z tego względu kadry nie stanowią porównania wszystkich planet przy identycznej odległości obserwatora.

Efekty destrukcji wykorzystują 1024 miękkie cząsteczki WebGL i 32 instancjonowane, rozżarzone odłamki na zdarzenie, z limitem ośmiu równoczesnych zdarzeń. Czarna dziura pochłania stykający się z jej fizycznym horyzontem obiekt, zachowując jego masę w pozostałości; wizualny wir podąża za pozycją czarnej dziury. Inne kolizje generują rozbłysk, chmurę i stygnące odłamki, zgodnie z dotychczasowym wyborem skutków fizycznych. Powłoka świetlna jest ilustracją wyrzutu, nie falą dźwiękową w próżni. Geometryczne i świetlne efekty są usuwane po 3,5–7 s, zatrzymywane podczas pauzy i czyszczone przez Reset. Zderzenia są wykrywane według rzeczywistych promieni, niezależnie od powiększenia widoku.

## Poprawka rzeczywistego tempa czasu

Usunięto obcinanie kolejki do 0,5 dnia i stały limit 180 mikrokroków na klatkę. Zegar dodaje pełne `czas_klatki × dni_na_sekundę`, a niewykonane obliczenia zostają w kolejce zamiast znikać. `window.solare.getState().pendingDays` ujawnia ewentualną zaległość. Pauza wstrzymuje pracę bez kasowania kolejki; ukrycie karty nie nalicza nowych dni. Restart zeruje kolejkę.

Szybki integrator rozdziela dominujący ruch związanych księżyców (analityczny krok Keplera) od pozostałych przyspieszeń N-body (numeryczne kroki prędkości). Wszystkie ciała uczestniczą w obliczaniu sił, a pływowe różnice przyspieszeń ograniczają krok. Maksimum to 0,25 dnia. Bliskie kontakty, przeloty przecinające obszar kolizji oraz niezwiązane lub silnie ekscentryczne księżyce używają bezpośredniego integratora z mniejszym krokiem. To przybliżony integrator hierarchiczny, nie pełny model efemeryd. Zachowanie masy i pędu w samym rozwiązywaniu kolizji pozostaje bez zmian.

Test 60 kolejnych porcji czasu po 1/60 s przy 365 dni/s odtwarza 365 dni, około 0,998 obiegu Ziemi i zachowuje związanie wszystkich uwzględnionych księżyców. Osobny test porównuje położenie Ziemi z bezpośrednim integratorem. Przy przeciążeniu urządzenia lub ekstremalnych zderzeniach renderowanie może chwilowo pozostawać za zadanym czasem; opóźnienie jest zachowywane i nadrabiane, a nie potajemnie odrzucane.

## Katalog ciał i tworzenie

Formularz „Dodaj ciało” wypełnia masę w kg i promień w km na podstawie wybranego wzorca. Obie wartości trafiają do fizyki: masa steruje przyciąganiem, promień kontaktem i rozmiarem w rzeczywistej skali. Średnica i masa względem Słońca aktualizują się na bieżąco. W widoku czytelnym rozmiary nadal są celowo przeskalowane. Ciężar zależy od lokalnego pola grawitacyjnego, dlatego parametrem ciała jest masa.

Katalog obejmuje planety Układu Słonecznego, przykładową kometę, domyślną supermasywną czarną dziurę (milion mas Słońca), Sagittarius A*, M87*, Cygnus X-1, Proxima Centauri b, TRAPPIST-1 e, 51 Pegasi b i 55 Cancri e. Ciała są kopiami wstawianymi do lokalnej symulacji; ich macierzyste gwiazdy i rzeczywiste położenia w Galaktyce nie są importowane.

Promień czarnej dziury jest wyprowadzany z masy jako promień Schwarzschilda, także przy edycji i pochłanianiu. Nie jest niezależnym polem. To model nierotującej czarnej dziury; silnik pozostaje newtonowski i nie symuluje pełnej ogólnej teorii względności. Cygnus X-1 jest czarną dziurą o masie gwiazdowej, nie supermasywną.

Dane katalogowe sprawdzono 7 września 2026. Źródła i uwagi są też dostępne bezpośrednio w formularzu i `src/catalog.js`:
- [Sagittarius A*, NASA](https://science.nasa.gov/universe/black-holes/): około 4 mln mas Słońca.
- [M87*, NASA/JPL](https://www.jpl.nasa.gov/edu/resources/teachable-moment/how-scientists-captured-the-first-image-of-a-black-hole/): około 6,5 mld mas Słońca.
- [Cygnus X-1, NASA](https://www.nasa.gov/universe/nasas-ixpe-reveals-shape-orientation-of-hot-matter-around-black-hole/): około 21 mas Słońca.
- [Proxima Centauri b](https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/): 1,055 mas Ziemi; szacowany promień 1,02 promienia Ziemi.
- [TRAPPIST-1 e](https://science.nasa.gov/exoplanet-catalog/trappist-1-e/): 0,692 masy i 0,92 promienia Ziemi.
- [51 Pegasi b](https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/): 0,61 masy Jowisza; szacowany promień 1,26 promienia Jowisza.
- [55 Cancri e](https://science.nasa.gov/exoplanet-catalog/55-cancri-e/): 7,99 mas Ziemi i 1,875 promienia Ziemi.

Wartości są przybliżone, bez przedziałów niepewności; używamy tabel parametrów NASA. Przeliczenia stosują średnie promienie Ziemi/Jowisza używane w aplikacji. Tekstury egzoplanet są umownymi, zabarwionymi teksturami analogicznych ciał, nie mapami ich powierzchni. Nieznane okresy obrotu i osie otrzymują jawne założenia 24 h / 0°. Ustawienia można potem edytować.

Kolizje zależą od skali widoku: rzeczywista skala używa fizycznych powierzchni, a widok czytelny używa widocznych sfer (z uwzględnieniem osobnego mapowania księżyców). Test odcinka między kolejnymi krokami ogranicza przenikanie szybkich obiektów. Kamera i zoom nie zmieniają granicy kolizji; poświaty oraz pierścienie nie są powierzchniami zderzeń. W widoku czytelnym pomijamy model otarcia, którego fizyczne odsunięcie nie rozdzielałoby powiększonych brył. Masa, pęd i grawitacja pozostają w jednostkach fizycznych; kolizje w tym trybie są świadomym uproszczeniem wizualnym.

Nawigacja: W/S przód/tył, A/D ruch w bok, Q/E dół/góra względem kamery. Przytrzymanie prawego przycisku myszy pozwala się rozglądać, Shift przyspiesza ruch czterokrotnie. Lewy przycisk zachowuje orbitowanie, Shift + lewy przesuwanie, kółko zoom. Prędkość ruchu maleje przy powierzchniach i dopasowuje się do skali. Ruch odłącza śledzenie ciała; edycja formularza i automatyczny lot blokują nawigację. Utrata fokusu, puszczenie klawisza i Reset zatrzymują ruch. Skróty narzędzi przeniesiono na N (nowe ciało) i T (symulacja), aby A/S służyły do nawigacji.

Poprawka resetu: początkowy układ ma 32 ciała. Czytelne orbity księżyców mają większe odstępy promieniowe, a test przecięcia odcinka nie jest stosowany do księżyców tego samego gospodarza (cięciwa kroku nie opisuje ich zakrzywionej orbity). Ich kontakt nadal jest sprawdzany w położeniach końcowych. Zderzenia odłamków zachowują masę i pęd przez łączenie, bez rekurencyjnego tworzenia kolejnych generacji. Test regresji kontroluje pierwsze 10 dni po resecie. W długiej symulacji powiększone ciała nadal mogą rzeczywiście zetknąć się w widoku czytelnym.
