# solare°

Pełnoekranowa piaskownica WebGL z wzajemną grawitacją N-body. Domyślnie wyłącznie logo i reset widoku.

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

Górny Reset oraz R przywracają cały początkowy układ, usuwają nowe obiekty, odłamki i efekty, zerują czas, zamykają edytor, kończą lot światła i przywracają ustawienia czasu, skali oraz kamery. Przycisk celownika pod logo pozostaje osobnym resetem samego widoku.

Pod logo dostępny jest przycisk „Symulacja prędkości światła”. Kamera rozpoczyna prostoliniowy lot od środka Słońca w kierunku początkowego położenia Ziemi, patrząc wstecz na Słońce. Odległości i rozmiary przechodzą na rzeczywistą skalę. Prędkość wynosi dokładnie 299 792,458 km/s; 1 AU wymaga 499,004783836 s rzeczywistego czasu. Zegar opiera się na monotonicznym czasie przeglądarki, obejmuje przerwy między klatkami i ukrycie karty, a pauza wyklucza wstrzymany czas. Planety w tym trybie ewoluują w tempie jednej sekundy symulacji na sekundę rzeczywistą. Przy długim uśpieniu obliczenia grawitacji nadrabiają zaległość w ograniczonych porcjach, a kamera od razu pokazuje aktualną odległość.

Kamera przecina odległości orbitalne, a nie kolejno same planety: rzeczywiste planety nie leżą na jednej prostej. Wskaźnik podaje czasy dla nominalnych półosi orbit, nie obiecuje spotkania z poruszającą się planetą. W pierwszych około 2,3 sekundach punkt kamery jest jeszcze wewnątrz promienia Słońca. To geometryczna wizualizacja propagacji w próżni w układzie współrzędnych symulacji, nie fizyczny układ odniesienia fotonu, transport promieniowania we wnętrzu gwiazdy ani obraz uwzględniający opóźnienie światła, aberrację i względność.

Pauza oraz zakończenie lotu są dostępne na dolnym pasku; Escape kończy lot. Zakończenie przywraca wcześniejsze tempo, skalę i położenie kamery, zachowując rozwinięty stan ciał. Reset przywraca wszystko do początku. Stałe: https://ssd.jpl.nasa.gov/astro_par.html.
