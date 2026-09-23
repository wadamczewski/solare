# Dokładny teren w widoku z powierzchni

Widok systemowy używa jednej globalnej tekstury i siatki o umiarkowanej
gęstości. To celowy kompromis: taka mapa nie może pokazać szczytu Everestu,
stoków Olympus Mons ani ścian krateru Tycho. Widok z powierzchni dokłada
zatem osobną, lokalną siatkę tylko przy obserwatorze.

## Dane i sposób ładowania

| Ciało | Dane wysokości | Tekstura / obraz | Docelowy poziom danych |
| --- | --- | --- | --- |
| Ziemia | Copernicus DEM GLO-30 | NASA Blue Marble / lokalne obrazy powierzchni | 30 m, kafle 1°×1° |
| Mars | MOLA + HRSC | Mars Trek: MOLA/HRSC i CTX/HiRISE w miejscach z pokryciem | globalnie 200 m, lokalnie z danych misji |
| Księżyc | LOLA GDR / SLDEM | LROC WAC, lokalnie NAC | globalnie 118 m, gęściej w dostępnych obszarach |

Pierwszy rzeczywisty kafel jest dołączony dla Everestu. To wycinek 27,5–28,0°
N i 86,6–87,0° E, przeskalowany do 512×512 próbek z Copernicus GLO-30. Plik
wysokości jest binarny (`Float32`) i ładuje się dopiero po podejściu do tego
obszaru. Zawiera wysokości, a nie grafikę cieniowania, dzięki czemu normalne
siatki są liczone z faktycznej rzeźby terenu.

W pobliżu Olympus Mons oraz Tycho i Copernicusa działa również lokalna,
gęsta siatka o profilach opartych o opublikowane wymiary tych form. Zostaje
ona automatycznie zastąpiona surowym kaflem MOLA/HRSC albo LOLA/SLDEM, kiedy
kafel zostanie dodany do katalogu danych. Dzięki temu przejście nie wymaga
zmiany ani widoku, ani formatu kafli.

## Zasady dołączania następnych kafli

1. Dane wysokości przechodzą przez proces przygotowania poza aplikacją;
   przeglądarka nie pobiera wielogigabajtowego rastra planetarnego.
2. Kafel zapisujemy bezstratnie jako `Float32` lub Terrain-RGB; nie używamy
   JPEG do wysokości.
3. W czasie działania utrzymujemy jedynie okno 3×3 lokalnych siatek obok
   obserwatora. Po oddaleniu są zwalniane.
4. Kolor, wysokość i normalne muszą mieć ten sam układ planetograficzny oraz
   ten sam południk zerowy. To zapobiega przesunięciu rzeźby względem tekstury.

## Źródła

- [Copernicus DEM GLO-30](https://registry.opendata.aws/copernicus-dem/)
- [NASA Global Imagery Browse Services](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [USGS: Moon LRO LOLA DEM 118 m](https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m)
- [USGS: Mars MOLA + HRSC DEM 200 m](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_shaded_relief_200m)
- [NASA Mars Trek WMTS](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars)
