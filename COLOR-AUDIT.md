# Audyt barw — 7 września 2026

Cel: obraz w świetle widzialnym z neutralnym balansem bieli, bez efektów ziemskiej atmosfery. Nie istnieje jeden niezależny od ekspozycji „prawdziwy” kod RGB planety. Monitory nie odtwarzają jasności Słońca; mapa RGB bez widma i charakterystyki instrumentu nie pozwala na ścisłą kalibrację kolorymetryczną.

| Ciało | Obserwacja i zmiana | Źródło |
|---|---|---|
| Słońce | Usunięto pomarańczową mapę ilustracyjną, żółty mnożnik i pomarańczową poświatę. Biała, prześwietlona fotosfera i biała poświata odpowiadają ekspozycji na planety. Bez udawania, że ilustracyjna mapa jest pomiarem fotosfery. | [NASA: kolor Słońca](https://science.gsfc.nasa.gov/attic/eclipse2017.gsfc.nasa.gov/what-color-sun.html) |
| Merkury | Zachowana szara mapa, usunięte globalne ciepłe/niebieskie oświetlenie. Nie używamy map geologicznych w fałszywych barwach. | [NASA: true color](https://science.nasa.gov/photojournal/mercurys-true-color-is-in-the-eye-of-the-beholder/) |
| Wenus | Dotychczasowa złota mapa chmur była zbyt kontrastowa. Jasne, lekko kremowe chmury z małym kontrastem. Nie pokazujemy radarowej powierzchni przez atmosferę. | [NASA: Wenus](https://science.nasa.gov/venus/venus-facts/) |
| Ziemia | Zachowana mapa bez dodatkowego tintu lub zwiększania nasycenia. Oceany niebieskie, lądy zróżnicowane, lód biały. Obecna mapa jest bez dynamicznych chmur i nie jest pojedynczym zdjęciem globu. | [NASA: Blue Marble](https://science.nasa.gov/resource/blue-marble-2002/) |
| Mars | Mapa miała intensywny pomarańczowy kolor. Ograniczono nasycenie, zachowując lokalne różnice i białe czapy; neutralne światło nie dodaje żółci. Współczynnik redukcji jest przybliżeniem, nie odzyskaniem oryginalnego widma. | [NASA: Mars w true color](https://science.nasa.gov/asset/hubble/true-color-image-of-mars/) |
| Jowisz | Zachowane białe/kremowe strefy i brązowe pasy mapy, bez dodatkowego barwienia. Nie używamy kompozycji podczerwonych jako koloru naturalnego. | [NASA: Cassini true-color portrait](https://science.nasa.gov/resource/cassini-jupiter-portrait/) |
| Saturn | Zachowana bladozłota mapa; usunięto ciepłe światło. Pierścienie odbijają oświetlenie zamiast świecić materiałem emisyjnym. Ich barwa jest stonowana, szarobeżowa. | [NASA: natural-color portrait](https://www.nasa.gov/news-release/nasa-cassini-spacecraft-provides-new-view-of-saturn-and-earth/) |
| Uran | Blady niebieskozielony, mały kontrast. Zachowana subtelna struktura mapy. | [Oxford, Irwin et al. 2024](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0) |
| Neptun | Usunięto głęboki kobalt ilustracyjnej mapy. Blady niebieskozielony, nieco bardziej niebieski od Urana; obniżony kontrast pasów. | [Oxford, Irwin et al. 2024](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0) |

## Granice dokładności

Oryginalne mapy Solar System Scope pozostają materiałem ilustracyjnym, nie skalibrowanymi produktami naukowymi. Profile Wenus, Urana i Neptuna są jawnymi przybliżeniami wyglądu na ekranie na podstawie źródeł, a wartości RGB w `src/natural-color.js` nie pochodzą z opublikowanej tabeli pomiarowej. Nie należy nazywać tej wersji „dokładnymi prawdziwymi barwami”. Ścisła rekonstrukcja wymagałaby danych radiometrycznych/spektralnych, modelu obserwatora i kalibracji wyświetlacza.

Scena i podgląd korzystają z białego światła, przestrzeni sRGB i NeutralToneMapping. Pozostawiono niewielkie neutralne doświetlenie oraz brak fizycznego spadku światła z odległością w przeskalowanej scenie, aby umożliwić oglądanie całego układu. Są to kompromisy ekspozycji, nie dodatkowe kolorowe filtry. Kolory orbit i interfejsu pozostają oznaczeniami, nie pomiarem barwy powierzchni. Rozszerzenie o 23 księżyce i 14 własnych map misji opisuje [MOON-APPEARANCE.md](MOON-APPEARANCE.md). Barwy egzoplanet nadal są umowne; usunięto z nich rozpoznawalne mapy innych planet i oznaczono przybliżenie w edytorze.

## Dodatkowe sprawdzenie planet — 8 września 2026

Każdą planetę porównano z drugim materiałem, oprócz źródła w tabeli powyżej. Nie ma podstaw do dalszego zwiększania nasycenia. Te źródła nie zamieniają map ilustracyjnych w skalibrowane produkty naukowe.

| Ciało | Druga referencja i wniosek |
|---|---|
| Słońce | [NASA: struktura i temperatura fotosfery](https://solarscience.msfc.nasa.gov/interior.shtml). Zachowana biała emisja HDR; sam monitor nie odtwarza jej fizycznej luminancji. |
| Merkury | [NASA: mapa MESSENGER w false color](https://science.nasa.gov/resource/mercury-false-color-rotation-movie/) wyraźnie rozróżnia wzmocnienie spektralne od obrazu widzialnego. Pozostaje mało nasycony szary. |
| Wenus | [NASA/JPL: Mariner 10](https://science.nasa.gov/photojournal/venus-from-mariner-10/) opisuje przede wszystkim białe cząstki chmur. Sam obraz jest kompozycją UV/orange z syntetyczną zielenią — nie kopiujemy jego kontrastu ani koloru jako true color. |
| Ziemia | [NASA: natural i enhanced z DSCOVR/EPIC](https://www.nasa.gov/centers-and-facilities/goddard/nasa-makes-an-epic-update-to-website-for-daily-earth-pics/) pokazuje wpływ przetwarzania na lądy i atmosferę. Mapa pozostaje ilustracyjna, bez bieżących chmur; nie zwiększono kontrastu. |
| Mars | [NASA: porównanie widzialnego i podczerwieni](https://science.nasa.gov/missions/hubble/martian-colors-provide-clues-about-martian-water/). Brązowo-rdzawe tony zamiast intensywnego pomarańczu. To towarzyszący opis tego samego zestawu Hubble, nie niezależna obserwacja. |
| Jowisz | [JPL: Voyager 1, trzy filtry](https://www.jpl.nasa.gov/images/pia01353-jupiter/). Zgodne z przygaszonymi kremowo-brązowymi pasami Cassini; brak dodatkowego tintu. |
| Saturn | [NASA: Cassini, barwy atmosfery](https://apod.nasa.gov/apod/ap240623.html). Bladozłote chmury, możliwe niebieskawe obszary wskutek rozpraszania; model nie odtwarza zmian sezonowych. |
| Uran | [ESA/Hubble: model atmosferyczny Irwina](https://esahubble.org/news/heic2209/) wspiera różnice wynikające z mgły. Do barwy wyświetlanej stosujemy nowszą rekonstrukcję Oxford 2024, nie starsze silnie nasycone obrazy porównawcze. |
| Neptun | [ESA/Hubble: ten sam model obu planet](https://esahubble.org/news/heic2209/), porównany z Oxford 2024. Pozostaje nieznacznie bardziej niebieski od Urana. |

Jądro komety otrzymało bardzo ciemny, matowy szary materiał i straciło pożyczone kratery Księżyca. Referencje: [ESA/OSIRIS: RGB komety 67P](https://blogs.esa.int/rosetta/2014/12/12/comet-67pc-g-in-living-colour/) oraz [ESA: szarość i jasność NAVCAM](https://blogs.esa.int/rosetta/2014/10/17/navcams-shades-of-grey/). Proceduralny kształt jest reprezentatywny, nie dokładną rekonstrukcją 67P.

Dla Proxima Centauri b, TRAPPIST-1 e, 51 Pegasi b i 55 Cancri e katalogi NASA podają ograniczenia parametrów, ale nie dostarczają rozdzielonych map naturalnego koloru. Materiały są neutralnymi placeholderami, a nie domniemanymi zdjęciami. Podobnie dyski wokół Sagittarius A*, M87* i Cygnus X-1 pozostają ilustracją: obrazy radiowe i rentgenowskie nie definiują widzialnego RGB. Brak danych nie pozwala uczciwie potwierdzić ich wyglądu na podstawie kilku fotografii.
