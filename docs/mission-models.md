# Modele obiektów stworzonych przez człowieka

Modele oznaczone jako `NASA 3D Resources` są oficjalnymi plikami GLB pobranymi
z publicznego repozytorium NASA. Aplikacja pobiera je dopiero po pokazaniu
odpowiedniego obiektu i przechowuje zdekodowany wzorzec w pamięci; kolejne
egzemplarze, np. lądowniki Apollo, powstają jako klony tego wzorca.

| Obiekt | Plik | Źródło |
| --- | --- | --- |
| Voyager 1 | `voyager-nasa.glb` | NASA 3D Resources · Voyager Probe (A) |
| ISS | `iss-nasa.glb` | NASA 3D Resources · International Space Station (ISS) (B) |
| Moduły Apollo | `apollo-lm-nasa.glb` | NASA 3D Resources · Apollo Lunar Module |
| Viking 1 i 2 | `viking-lander-nasa.glb` | NASA 3D Resources · Viking Lander |
| Perseverance | `perseverance-nasa.glb` | NASA 3D Resources · Mars 2020 Perseverance Rover |
| Opportunity | `opportunity-nasa.glb` | NASA 3D Resources · Mars Exploration Rover – Opportunity (MER-B) |

NASA udostępnia katalog jako zasoby bezpłatne do pobrania i użycia; katalog
jest też utrzymywany na GitHubie. Zobacz [NASA 3D Resources](https://science.nasa.gov/3d-resources/)
i [wytyczne użycia mediów NASA](https://www.nasa.gov/nasa-brand-center/images-and-media/).

Nie ma obecnie bezpośrednio ładowalnego pliku GLB w tym katalogu dla New
Horizons, Tesla Roadster/Starmana, Sojourner, Spirit ani Curiosity (dla
Curiosity NASA publikuje model Blender, nie GLB). Ich szczegółowe modele
proceduralne pozostają celowo rozdzielone według rzeczywistej architektury:
New Horizons ma RTG, antenę wysokiego zysku i instrumenty; Tesla ma sylwetkę
Roadstera, koła, kabinę i postać Starmana; łaziki mają sześć kół, maszt kamer,
zasilanie solarne (Sojourner, Spirit) albo RTG i rocker-bogie (Curiosity).
