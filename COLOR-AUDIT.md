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

Scena i podgląd korzystają z białego światła, przestrzeni sRGB i NeutralToneMapping. Pozostawiono niewielkie neutralne doświetlenie oraz brak fizycznego spadku światła z odległością w przeskalowanej scenie, aby umożliwić oglądanie całego układu. Są to kompromisy ekspozycji, nie dodatkowe kolorowe filtry. Kolory orbit i interfejsu pozostają oznaczeniami, nie pomiarem barwy powierzchni. Barwy egzoplanet i większości księżyców nadal są umowne; brak wiarygodnych map nie uprawnia do przedstawiania ich jako rzeczywistych.
