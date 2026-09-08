# solare°

Pełnoekranowa piaskownica WebGL z wzajemną grawitacją N-body. Stale widoczne logo, pełny reset oraz dolny pasek czasu i lotu światła.

## Uruchomienie

Node 20.17+; `npm ci`, `npm run dev`. `npm run build` tworzy `dist`. `npm test` sprawdza integrator i zachowanie układu.

## Obsługa

- Przeciągnięcie: obrót; kółko / pinch: zoom do kursora; prawy przycisk / dwa palce: przesunięcie.
- Kliknięcie ciała: podgląd WebGL obok nazwy oraz edycja masy, promienia, prędkości, położenia, okresu i nachylenia osi.
- Dwuklik: śledzenie ciała. Wybór ciała możliwy także pod logo.
- Kliknięcie pustego miejsca: utworzenie komety, czarnej dziury lub planety. Wskazany punkt leży na płaszczyźnie ekliptyki; wysokość można zmienić polem Y.
- Logo / S: narzędzia czasu i nawigacji, wyszukiwanie i wybór ciał (filtrowanie po nazwie, bez rozróżniania wielkości liter i polskich znaków diakrytycznych), przełącznik rzeczywistej skali, restart symulacji.
- Nad dolnym paskiem widnieje data i godzina symulacji (UTC) w formacie „Data - Czas”; zegar rusza od momentu wczytania i biegnie razem z upływem czasu symulacji.
- Spacja: pauza; A: dodawanie; R / Reset: pełne przywrócenie początkowego układu, ustawień i kamery; Escape: zamknięcie panelu.
- „Zamień orbitę” przenosi także księżyce wraz z pozycją i prędkością ich planety.

## Model i granice dokładności

Fizyka pracuje w AU, masach słonecznych i dniach, niezależnie od wizualnego powiększenia planet. Wszystkie 32 domyślne ciała (Słońce, osiem planet, 23 wybrane księżyce) i dodane obiekty wzajemnie oddziałują według grawitacji Newtona. Velocity Verlet z krokiem ograniczanym przez czas dynamiczny i zbliżenia. Kolizje przy rzeczywistych promieniach rozróżniają łączenie, wyrzut odłamków, rozbijające uderzenie, skośne zderzenie i pochłanianie. Masa i pęd liniowy są zachowane. Początkowy układ jest barycentryczny. Parametry planet bazują na tabelach JPL.

## Położenia planet na bieżącą chwilę

Po wczytaniu (oraz po Reset) planety stoją tam, gdzie faktycznie są w tym momencie. `src/ephemeris.js` liczy je z tabeli elementów keplerowskich i ich wiekowych tempo zmian, [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/approx_pos.html), dopasowanie na lata 1800-2050. Rozwiązujemy równanie Keplera Newtonem, a prędkość bierzemy z ruchu średniego wynikającego z tabelarycznego tempa długości średniej, więc położenie i prędkość są wzajemnie spójne.

Porównanie z niezależną biblioteką opartą na VSOP87 daje dla tej samej chwili różnice rzędu kilku do kilkudziesięciu sekund łuku dla planet wewnętrznych i do około 9 minut łuku dla Saturna - czyli dokładnie tyle, ile JPL deklaruje dla tego dopasowania. To nie jest pełna efemeryda pokroju DE440. Poza zakresem 1800-2050 elementy tracą ważność. Ziemia jest stawiana w barycentrum układu Ziemia-Księżyc (rozbieżność około 4700 km). Czas traktujemy jako UTC, bez poprawki TT (około 69 s).

Księżyce nie mają teorii ruchu: ich fazy początkowe pozostają skomponowane, a jedynie towarzyszą planetom na ich prawdziwych pozycjach. Zegar nad dolnym paskiem pokazuje moment symulacji; podczas lotu światła jest ukryty, bo całkowanie grawitacji jest wtedy wstrzymane.

To nie jest kompletna symulacja wszystkich rzeczywistych warunków. Brak OTW, pływów, ewolucji termicznej, deformacji, momentów sił, pełnej dynamiki osi oraz perturbacji relatywistycznych. Czarna dziura jest masą punktową z promieniem Schwarzschilda jako granicą pochłaniania; pierścień jest ilustracją, nie modelem akrecji ani soczewkowania. Orientacje obrotu mają zadany okres i nachylenie, nie ewoluują od momentów sił. Przy bardzo ekstremalnych masach dokładność jest ograniczona.

Nie obejmuje wszystkich znanych księżyców. Mapy planet i ziemskiego Księżyca są astronomicznymi mapami powierzchni / atmosfery; 14 pozostałych księżyców ma własne mozaiki misji USGS i przybliżone profile barwne, a nieregularne satelity przybliżoną geometrię. Tytan ma model nieprzezroczystej atmosfery. Niezaimplementowane mapy pozostałych satelitów są jawnie oznaczone. Pas planetoid i ogony komet są dekoracyjnymi cząstkami bez wzajemnej grawitacji. Ogon komety wskazuje od Słońca, ale nie modeluje fizyki gazu.

Widok „Czytelny” powiększa promienie i nieliniowo skraca odległości. „Rzeczywista skala” przywraca proporcje przestrzeni i promieni. Cienkie orbity to chwilowe oskulacyjne rozwiązania dwuciałowe, aktualizowane z bieżących stanów; ślady pokazują faktyczny przebieg symulacji. Przy bardzo bliskich spotkaniach i szybkim tempie limit pracy klatki spowalnia upływ symulacji, zamiast zwiększać krok i destabilizować układ.

WebGL używa high-performance, dynamicznych buforów pozycji, wielkości, koloru, jasności i parametrów punktów, limitu DPR 2 i lokalnych tekstur. Maksymalnie 100 ciał. Brak Canvas 2D, zdalnych zapytań podczas działania i serwera danych.

## Walidacja

Testy obejmują zachowanie pędu i energii, stabilność orbity przez rok, związanie księżyców, reakcję na ruch Słońca, niezmienniczość Galileusza, kolizje i adaptację kroku. Efemerydy mają własny zestaw: okresy orbitalne odtworzone z tabelarycznych temp, odwracalność równania Keplera, zgodność prędkości z różnicą skończoną położeń, kierunek obiegu i prędkość względem wzoru vis-viva oraz długość ekliptyczna Słońca dla znanej daty. Mapa nieba jest sprawdzana na poziomie danych: punkt równonocy i bieguny, jednostkowość wektorów kierunku, zakres jasności katalogu od Syriusza do 8 mag, skupienie Drogi Mlecznej wokół centrum Galaktyki oraz obecność i położenie kluczowych obiektów głębokiego nieba. Testy komet pilnują gęstości siatki jądra, dwupłatowości kształtu, powtarzalności dla danego ziarna i monotoniczności aktywności z odległością. Testy scenariuszowe używają ustalonej epoki, żeby prawdziwe położenia planet nie uzależniły wyniku od dnia uruchomienia. Kompilacja produkcyjna jest sprawdzana. Nie przeprowadzono automatycznych testów przeglądarkowych w zestawie `npm test`. Opcjonalne WebMCP (odczyt i pauza) wykrywa wsparcie przeglądarki; brak dostępnego kontekstu do walidacji WebMCP.

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

Skutki kolizji: po połączeniu prędkość pozostałości wynika z łącznego pędu i masy obu ciał. Otarcia skalistych obiektów zmieniają składową normalną prędkości obu uczestników także w widoku czytelnym; oddalająca się para nie dostaje powtórnego impulsu. Wyrzut odłamków jest orientowany względem osi uderzenia, przy zachowaniu całkowitej masy i pędu. Skalista pozostałość ma trwałą deformację i przyciemniony, rozgrzany obszar po stronie uderzenia; otarcie zostawia mniejszy ślad, rozbicie głębszą deformację, akrecja gazu zmienia barwę bez skalnego krateru. Zmieniona siatka jest współdzielona z podglądem edytora. Jest to przybliżony model zdarzenia, nie hydrodynamika, model materiałowy skorupy ani pełna symulacja termiczna.

W panelu Symulacja jest bezpośredni przycisk „Własna czarna dziura”. Otwiera formularz z domyślną masą 10 M☉, edytowalną w kg lub masach Słońca (pola są synchronizowane), położeniem XYZ oraz prędkością, kierunkiem i wznoszeniem. Promień horyzontu przelicza się na bieżąco. Własny wariant jest również na liście rodzajów ciał obok gotowych obiektów katalogowych. Model pozostaje nierotujący; nie oferuje pozornych regulatorów ładunku ani relatywistycznego spinu.

Czytelność uderzeń komet: ślad skalisty ma teraz miskę krateru, podniesione obrzeże i pas wyrzuconego materiału zamiast samego rozmytego zaciemnienia. Rozmiar i głębokość mają minimalne wartości wizualne, aby ślad był rozpoznawalny na siatce planety; nie są prognozą rzeczywistych wymiarów krateru. Kolejne uderzenia zachowują wcześniejsze deformacje. Przycisk „Pokaż miejsce uderzenia” w edytorze ustawia kamerę nad ostatnim śladem, zgodnie z obrotem ciała.

Audyt barw i źródła dla wszystkich ośmiu planet oraz Słońca: [COLOR-AUDIT.md](COLOR-AUDIT.md). Usunięto ciepłe światło, niebieskie doświetlenie i pomarańczową ilustrację Słońca; scena oraz podglądy używają neutralnej ekspozycji. Naturalne odcienie Wenus, Urana i Neptuna są przybliżone, a nie naukowo skalibrowane. Dokument jawnie opisuje ograniczenia tekstur, ekspozycji oraz poszczególne korekty.

Ekstremalne uderzenia w Ziemię mają osobny model skutków powierzchniowych. Energia zredukowanej masy z korektą relatywistycznej energii kinetycznej steruje przybliżoną intensywnością efektów: rozgrzany obszar uderzenia, emisja pożarów na orientacyjnej masce lądu wyznaczanej z tekstury, zwęglenie i pył zmieniający wygląd powierzchni. Animacja używa czasu symulowanego (pauza zatrzymuje ją); przy dużym tempie skutki ewoluują szybko. Zwęglenie i pył pozostają po wygaszeniu emisji. To heurystyczny model wizualny, bez hydrodynamiki, chemii spalania, atmosferycznego transportu pyłu ani prognozy obszarów pożarowych. Maska lądu na podstawie RGB jest orientacyjna, a czasy i zasięgi nie są wynikami obliczeń klimatycznych. Dynamika pozostaje newtonowska; korekta energii nie czyni jej relatywistyczną.

Przykład: kula o średnicy 8 km, gęstości przyjętej 500 kg/m³ i prędkości względnej 0,1c ma masę 1,34e14 kg i energię około 6,07e28 J. Jest to około 0,027% przybliżonej energii wiązania grawitacyjnego Ziemi, więc globalna katastrofa powierzchniowa nie oznacza rozerwania globu. Przy 8 km promienia masa i energia są osiem razy większe. Formularz używa promienia i niezależnej masy: dla tego przykładu ustaw promień 4 km oraz masę 1,34e14 kg. Źródła kontekstu skutków: https://nas.nasa.gov/areas/atap.html i https://ntrs.nasa.gov/citations/19900035038 . Skale 0,1c wykraczają poza kalibrację typowych modeli uderzeń asteroid.

Jasność Słońca: scena jest renderowana do bufora HDR, następnie bloom rozprowadza światło wyłącznie z widocznych jasnych pikseli. Fotosfera ma luminancję renderowania znacznie wyższą niż oświetlone planety; końcowe mapowanie tonów daje białą prześwietloną tarczę i blask. Usunięto płaski billboard z pozorną koroną, który nie był modelem ekspozycji. Przesłonięcie tarczy w buforze głębokości ogranicza źródło blasku. Parametry HDR/bloom są przybliżeniem ekspozycji i rozproszenia w optyce, nie wartością luminancji w cd/m² ani modelem atmosfery Słońca. Monitor nie może odtworzyć rzeczywistej jasności. Źródło: https://science.nasa.gov/sun/facts/ — korona jest zbyt słaba w porównaniu z fotosferą, aby normalnie widzieć ją bez przesłonięcia tarczy.

## Mapa nieba

Tło nie jest już losowym rozsypem punktów. `src/sky.js` renderuje sferę niebieską z prawdziwych katalogów przygotowanych offline przez `tools/build-sky.mjs`:

- 41 411 gwiazd do jasności 8 mag, z rektascensją, deklinacją, jasnością i wskaźnikiem barwy B-V. Barwa gwiazdy wynika z B-V przez wzór Ballesterosa (2012) na temperaturę i przybliżenie ciała doskonale czarnego. Rozmiar rośnie z jasnością powoli, resztę niesie luminancja HDR, dzięki czemu najjaśniejsze gwiazdy rozkwitają w bloomie.
- Droga Mleczna dwiema warstwami: gładka mapa luminancji zrasteryzowana z pięciu poziomów izofot survey'u oraz rzadka chmura 110 000 punktów na wierzchu. Pas fizycznie jest światłem nierozdzielonych gwiazd, więc mapa niesie poświatę, a punkty przywracają ziarno tych gwiazd, które się rozdzielają.
- 31 jasnych obiektów głębokiego nieba: Galaktyka Andromedy, Galaktyka Trójkąta, oba Obłoki Magellana, Mgławica Oriona, Plejady, Omega Centauri, 47 Tucanae i inne, w skali odpowiadającej ich rzeczywistej rozciągłości kątowej i z jasnością powierzchniową malejącą wraz z rozmiarem.
- Linie 89 gwiazdozbiorów, domyślnie wyłączone (przełącznik „Gwiazdozbiory” w panelu Symulacja). To nakładka orientacyjna wymyślona przez ludzi, nie obiekt fizyczny, dlatego nie jest włączona sama z siebie.

Współrzędne są równikowe J2000 i obracane do układu ekliptycznego sceny nachyleniem 23,4392911°. Sfera jest zakotwiczona w kamerze, więc niebo nie wykazuje paralaksy przy przelotach - słusznie, bo najbliższa gwiazda leży około 268 000 AU stąd.

Granice: katalog urywa się na 8 mag, więc gwiazd jest około 41 tysięcy, a nie miliardy - to i tak znacznie więcej niż około 9 tysięcy widocznych gołym okiem z Ziemi. Pozycje są kwantowane do około 20 sekund łuku. Ruchy własne, paralaksa i gwiazdy zmienne nie są modelowane, więc mapa jest statyczna na epokę J2000. Obiekty głębokiego nieba są rysowane jako miękkie plamy o właściwym rozmiarze, nie jako obrazy. Barwy gwiazd nie uwzględniają poczerwienienia międzygwiazdowego, grawitacji powierzchniowej ani metaliczności. Dane pochodzą z d3-celestial (BSD-3-Clause, Olaf Frohn), który pakuje astrometrię Hipparcosa/Tycho i izofoty przeglądu nieba Mellingera; pełna atrybucja w `public/credits.txt`.

## Barwa tła

Tło sceny jest czarne. Wcześniejszy ciemnogranatowy odcień odpowiadał raczej rozpraszaniu w atmosferze Ziemi niż temu, co widać z pokładu statku: próżnia nie świeci, a poświata tła nieba jest o rzędy wielkości poniżej progu wyświetlacza. Zmiana obejmuje kolor czyszczenia bufora WebGL, tło CSS i `theme-color`.

## Skala paska trasy lotu

Punkty na prawej osi stoją teraz na swoich rzeczywistych odległościach heliocentrycznych, a nie w równych odstępach: Uran ląduje na 63,8% osi (19,19 / 30,07 AU), Neptun na 100%. Wypełnienie i główka paska śledzą ten sam ułamek przebytej drogi, więc postęp odpowiada odległości między ciałami, a nie liczbie minionych planet.

Cztery planety wewnętrzne mieszczą się w pierwszych 5% osi, więc same znaczniki zostają na prawdziwych pozycjach, a rozsuwane są wyłącznie etykiety, połączone ze swoim znacznikiem cienką kreską. Pasek jest ograniczony przez `clamp()` w pionie i przeliczany przy zmianie rozmiaru okna, więc mieści się na ekranie także na niskich i wąskich oknach.

## Komety

Jądro powstaje z dwóch zlanych płatów z wielooktawowym szumem i kilkoma misami uderzeniowymi, przy 3380 ścianach zamiast dawnych 180 - facetki przestały być widoczne. Kształt wzorowany jest na tym, co sondy zobaczyły z bliska: 67P/Czuriumow-Gierasimienko i 19P/Borrelly to ciała dwupłatowe, a 1P/Halleya to wydłużona bryła około 15 x 8 km.

Ogon nie jest już jednym strumieniem pyłu. Kometa dostaje dwa, skierowane gdzie indziej, bo tak jest naprawdę:

- Ogon jonowy to gaz zjonizowany promieniowaniem UV i porwany przez wiatr słoneczny. Biegnie niemal dokładnie od Słońca, jest wąski i włóknisty, z wędrującymi załamaniami, a jego błękit to emisja CO+ w okolicy 420 nm.
- Ogon pyłowy to ziarna wypychane ciśnieniem promieniowania, które zachowują pęd orbitalny z chwili uwolnienia. Dlatego odgina się od linii przeciwsłonecznej i rozwiera w wachlarz, a jego ciepła biel to po prostu odbite światło Słońca.

Tory ziaren liczy klasyczna konstrukcja syndyn: ziarno uwolnione przed czasem tau startuje stamtąd, gdzie jądro było wtedy, i zostaje odepchnięte od Słońca o 1/2 · beta · g_Słońca · tau². Ponieważ wiek i beta zmieniają się niezależnie, ziarna wypełniają wachlarz, a nie linię. Wokół jądra świeci koma. Aktywność zależy od odległości od Słońca: lód wodny sublimuje na dobre wewnątrz około 3 AU, więc dalej kometa jest praktycznie martwa i ogona nie ma.

Granice: kierunki są fizyczne, ale długości ogonów są stylizowane, aby pozostały czytelne w widoku „czytelnym”, który i tak nieliniowo ściska odległości. Nie modelujemy tempa produkcji gazu, rozkładu rozmiarów ziaren, fotodysocjacji, struktury pola magnetycznego wiatru słonecznego ani odrzutu zmieniającego orbitę komety. Ziarna ogona nie mają masy i nie uczestniczą w grawitacji.

## Języki i wygląd — 8 września 2026

Przełącznik z flagą obok Reset: polski, angielski, niemiecki i hiszpański. Pierwszy obsługiwany język z `navigator.languages` wybierany jest automatycznie; brak dopasowania oznacza angielski. Ręczny wybór zapisuje się lokalnie jako `solare-language` i ma pierwszeństwo. Reset układu nie zmienia języka. Tłumaczenie obejmuje kontrolki, etykiety ciał, wyszukiwanie, błędy, opisy katalogowe, datę i dane lotu. Zmiana nie odtwarza formularzy ani stanu fizyki.

[Audyt 23 księżyców](MOON-APPEARANCE.md) zawiera referencje i ograniczenia każdego obiektu. [Audyt planet](COLOR-AUDIT.md) odróżnia obraz w świetle widzialnym od map enhanced/false color. Nie obiecujemy kalibracji radiometrycznej ani dokładnego obrazu nieznanych powierzchni. Egzoplanety i niezaimplementowane mapy satelitów nie dziedziczą cudzych kraterów.

### Początek lotu wewnątrz Słońca

W odległości poniżej fizycznego promienia Słońca scena kosmosu nie jest renderowana. Osobny nieprzezroczysty shader przedstawia jasne lokalne pole promieniowania. Delikatne zmiany jasności są schematem edukacyjnym, nie zdjęciem plazmy ani symulacją hydrodynamiczną. Etykieta pokazuje jądro (0–0,25 R), strefę promienistą (0,25–0,7 R), konwekcyjną (0,7–1 R) i cienką fotosferę. Temperatura to jawnie przybliżona interpolacja od 15 mln K przez 7 mln i 2 mln do 5772 K; nie rozwiązujemy struktury gwiazdy. Zmiana promienia Słońca zmienia granicę wnętrza; profil termiczny pozostaje słonecznym modelem referencyjnym.

Przelot prostą od środka do powierzchni zajmuje w demonstracji około 2,32 s przy 1×. **Nie jest to czas ucieczki energii ze Słońca**: w rzeczywistości promieniowanie rozprasza się w nieprzezroczystej plazmie i dyfunduje, a konwekcja przenosi energię w zewnętrznych warstwach. Opis jest widoczny podczas przelotu przez wnętrze. Po wyjściu kontynuowany jest dotychczasowy zegar próżniowy, 1 AU / c = 499,0048 s od środka; bliskie kadrowanie planet pozostaje ruchem kamery demonstracyjnej.

Źródła: [NASA/Marshall, Solar Interior](https://solarscience.msfc.nasa.gov/interior.shtml), [ESA, Anatomy of the Sun](https://www.esa.int/ESA_Multimedia/Images/2020/01/Anatomy_of_the_Sun). Nie przypisujemy jednej dokładnej liczby lat propagacji: źródła podają różne przybliżenia zależne od modelu transportu.

Testy Node obejmują kompletność czterech słowników, zmianę języka i dynamiczne komunikaty w izolowanym DOM, zachowanie wartości oraz handlerów formularzy, lokalizowane wyszukiwanie, granice wnętrza i pauzę/przewijanie, indywidualność map księżyców i kolejność materiałów względem śladów kolizji. Nie stanowią wizualnego testu GPU ani walidacji kolorymetrycznej monitora.
