# solare°

Pełnoekranowa piaskownica WebGL z wzajemną grawitacją N-body. Domyślnie wyłącznie logo i reset widoku.

## Uruchomienie

Node 20.17+; `npm ci`, `npm run dev`. `npm run build` tworzy `dist`. `npm test` sprawdza integrator i zachowanie układu.

## Obsługa

- Przeciągnięcie: obrót; kółko / pinch: zoom do kursora; prawy przycisk / dwa palce: przesunięcie.
- Kliknięcie ciała: edycja masy, promienia, prędkości, położenia, okresu i nachylenia osi.
- Dwuklik: śledzenie ciała. Wybór ciała możliwy także pod logo.
- Kliknięcie pustego miejsca: utworzenie komety, czarnej dziury lub planety. Wskazany punkt leży na płaszczyźnie ekliptyki; wysokość można zmienić polem Y.
- Logo / S: narzędzia czasu i nawigacji, wybór ciał, przełącznik rzeczywistej skali, restart symulacji.
- Spacja: pauza; A: dodawanie; R / Reset: wyłącznie reset kamery; Escape: zamknięcie panelu.
- „Zamień orbitę” przenosi także księżyce wraz z pozycją i prędkością ich planety.

## Model i granice dokładności

Fizyka pracuje w AU, masach słonecznych i dniach, niezależnie od wizualnego powiększenia planet. Wszystkie 32 domyślne ciała (Słońce, osiem planet, 23 wybrane księżyce) i dodane obiekty wzajemnie oddziałują według grawitacji Newtona. Velocity Verlet z krokiem ograniczanym przez czas dynamiczny i zbliżenia. Kolizje przy rzeczywistych promieniach łączą ciała, zachowując masę i pęd. Początkowy układ jest barycentryczny. Początkowe fazy orbit są skomponowane, nie odpowiadają aktualnej efemerydzie. Parametry planet bazują na tabelach JPL.

To nie jest kompletna symulacja wszystkich rzeczywistych warunków. Brak OTW, pływów, ewolucji termicznej, deformacji, momentów sił, pełnej dynamiki osi oraz perturbacji relatywistycznych. Czarna dziura jest masą punktową z promieniem Schwarzschilda jako granicą pochłaniania; pierścień jest ilustracją, nie modelem akrecji ani soczewkowania. Orientacje obrotu mają zadany okres i nachylenie, nie ewoluują od momentów sił. Przy bardzo ekstremalnych masach dokładność jest ograniczona.

Nie obejmuje wszystkich znanych księżyców. Mapy planet i ziemskiego Księżyca są astronomicznymi mapami powierzchni / atmosfery; pozostałe księżyce mają przybliżone, barwione tekstury Księżyca, a nieregularne satelity przybliżoną geometrię. Pas planetoid i ogony komet są dekoracyjnymi cząstkami bez wzajemnej grawitacji. Ogon komety wskazuje od Słońca, ale nie modeluje fizyki gazu.

Widok „Czytelny” powiększa promienie i nieliniowo skraca odległości. „Rzeczywista skala” przywraca proporcje przestrzeni i promieni (mikroskopijne ciała mają minimalny promień renderowania). Cienkie orbity to chwilowe oskulacyjne rozwiązania dwuciałowe, aktualizowane z bieżących stanów; ślady pokazują faktyczny przebieg symulacji. Przy bardzo bliskich spotkaniach i szybkim tempie limit pracy klatki spowalnia upływ symulacji, zamiast zwiększać krok i destabilizować układ.

WebGL używa high-performance, dynamicznych buforów pozycji, wielkości, koloru, jasności i parametrów punktów, limitu DPR 2 i lokalnych tekstur. Maksymalnie 100 ciał. Brak Canvas 2D, zdalnych zapytań podczas działania i serwera danych.

## Walidacja

Testy obejmują zachowanie pędu i energii, stabilność orbity przez rok, związanie księżyców, reakcję na ruch Słońca, niezmienniczość Galileusza, kolizje i adaptację kroku. Kompilacja produkcyjna jest sprawdzana. Nie przeprowadzono testów przeglądarkowych. Opcjonalne WebMCP (odczyt i pauza) wykrywa wsparcie przeglądarki; brak dostępnego kontekstu do walidacji WebMCP.

## Źródła

Parametry: https://ssd.jpl.nasa.gov/planets/phys_par.html oraz https://ssd.jpl.nasa.gov/astro_par.html.
Tekstury: Solar System Scope / INOVE, CC BY 4.0. Szczegóły i linki w `public/credits.txt`, dostępnym także pod `/credits.txt`.
