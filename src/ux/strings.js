// Every string the redesigned interface (index.html) adds of its own, in the
// same four languages as the rest of the app. They are kept here rather than
// in locales/messages.js so the classic interface (classic.html) is not touched
// at all: the elements that carry these strings are marked data-no-translate
// and re-rendered by enhance.js on the app's own 'languagechange' event,
// while every original control the redesign merely moves keeps being
// translated by i18n.js exactly as before.
export const UX_LANGUAGES=['pl','en','de','es'];

export const UX_STRINGS={
 'search.placeholder':['Szukaj planet, księżyców, gwiazd…','Search planets, moons, stars…','Planeten, Monde, Sterne suchen…','Buscar planetas, lunas, estrellas…'],
 'search.short':['Szukaj…','Search…','Suchen…','Buscar…'],
 'language':['Język','Language','Sprache','Idioma'],
 'search.label':['Szukaj w układzie i na niebie','Search the system and the sky','System und Himmel durchsuchen','Buscar en el sistema y el cielo'],
 'logo.home':['solare° – widok całego układu','solare° – whole-system view','solare° – Gesamtansicht','solare° – vista de todo el sistema'],
 'view.title':['Warstwy i widok','Layers & view','Ebenen & Ansicht','Capas y vista'],
 'view.toggle':['Pokaż lub ukryj panel warstw','Show or hide the layers panel','Ebenenleiste ein- oder ausblenden','Mostrar u ocultar el panel de capas'],
 'fold.collapse':['Zwiń panel','Fold the panel','Leiste einklappen','Plegar el panel'],
 'fold.expand':['Rozwiń panel','Unfold the panel','Leiste ausklappen','Desplegar el panel'],
 'layers.heading':['Na mapie','On the map','Auf der Karte','En el mapa'],
 'layers.physics':['Wektory fizyczne','Physics vectors','Physikvektoren','Vectores físicos'],
 'layers.physics.hint':['Prędkość i grawitacja każdego poruszającego się ciała w widoku','Velocity and gravity of every moving body in view','Geschwindigkeit und Schwerkraft jedes bewegten Körpers im Blickfeld','Velocidad y gravedad de cada cuerpo en movimiento a la vista'],
 'modes.heading':['Tryby','Modes','Modi','Modos'],
 'modes.surface.desc':['Stań na planecie lub księżycu i spójrz w niebo','Stand on a planet or moon and look at the sky','Auf einem Planeten oder Mond stehen und in den Himmel blicken','Párate en un planeta o luna y mira el cielo'],
 'modes.systems.desc':['Wczytaj inny układ gwiazdowy','Load another star system','Ein anderes Sternsystem laden','Cargar otro sistema estelar'],
 'star.heading':['Gwiazda centralna','Central star','Zentralstern','Estrella central'],
 'dock.speed':['Tempo','Speed','Tempo','Ritmo'],
 'scenarios':['Scenariusze','Scenarios','Szenarien','Escenarios'],
 'scenarios.hint':['Gotowe symulacje do obejrzenia','Ready-made simulations to watch','Fertige Simulationen zum Ansehen','Simulaciones listas para ver'],
 'scenarios.flight':['Leć z prędkością światła od Słońca przez planety','Fly at light speed from the Sun past the planets','Mit Lichtgeschwindigkeit von der Sonne an den Planeten vorbei','Vuela a la velocidad de la luz del Sol a los planetas'],
 'scenarios.death':['Ewolucja Słońca aż do białego karła','The Sun’s evolution down to a white dwarf','Die Entwicklung der Sonne bis zum Weißen Zwerg','La evolución del Sol hasta enana blanca'],
 'scenarios.hole':['Spadek do czarnej dziury z pierwszej osoby','A first-person fall into a black hole','Ein Sturz in ein Schwarzes Loch aus der Ich-Perspektive','Una caída en primera persona a un agujero negro'],
 'scenarios.collision':['Zderzenie komety, asteroidy lub planety z celem','A comet, asteroid or planet hitting a target','Ein Komet, Asteroid oder Planet trifft ein Ziel','Un cometa, asteroide o planeta impacta un objetivo'],
 'scenarios.eclipse':['Najbliższe zaćmienia Słońca i Księżyca','The next solar and lunar eclipses','Die nächsten Sonnen- und Mondfinsternisse','Los próximos eclipses de Sol y de Luna'],
 'scenarios.events.title':['Zdarzenia','Upcoming events','Ereignisse','Eventos'],
 'scenarios.events':['Przewidywane koniunkcje i zbliżenia','Predicted conjunctions and close approaches','Vorhergesagte Konjunktionen und Annäherungen','Conjunciones y acercamientos previstos'],
 'scenarios.stop':['Zakończ scenariusz','End scenario','Szenario beenden','Terminar escenario'],
 'add':['Dodaj ciało','Add body','Körper hinzufügen','Añadir cuerpo'],
 'add.catalog':['Obiekt z katalogu','Catalogue object','Objekt aus dem Katalog','Objeto del catálogo'],
 'add.catalog.desc':['Kometa, asteroida, planeta, gwiazda…','Comet, asteroid, planet, star…','Komet, Asteroid, Planet, Stern…','Cometa, asteroide, planeta, estrella…'],
 'add.hole':['Własna czarna dziura','Custom black hole','Eigenes Schwarzes Loch','Agujero negro propio'],
 'add.hole.desc':['Dowolna masa w masach Słońca','Any mass in solar masses','Beliebige Masse in Sonnenmassen','Cualquier masa en masas solares'],
 'add.tip':['Kliknięcie w pustą przestrzeń też dodaje ciało w tym miejscu.','Clicking empty space also adds a body at that spot.','Ein Klick ins Leere fügt dort ebenfalls einen Körper hinzu.','Hacer clic en el espacio vacío también añade un cuerpo allí.'],
 'map.label':['Sterowanie kamerą','Camera controls','Kamerasteuerung','Control de cámara'],
 'map.zoomIn':['Przybliż','Zoom in','Vergrößern','Acercar'],
 'map.zoomOut':['Oddal','Zoom out','Verkleinern','Alejar'],
 'map.home':['Widok całego układu','Whole-system view','Gesamtansicht','Vista de todo el sistema'],
 'camera':['Nagraj ujęcie','Record a shot','Aufnahme','Grabar toma'],
 'share':['Udostępnij','Share','Teilen','Compartir'],
 'share.copied':['Skopiowano link','Link copied','Link kopiert','Enlace copiado'],
 'more':['Więcej','More','Mehr','Más'],
 'more.tools':['Panel symulacji','Simulation panel','Simulationsleiste','Panel de simulación'],
 'more.fullscreen':['Pełny ekran','Full screen','Vollbild','Pantalla completa'],
 'more.help':['Skróty i pomoc','Shortcuts & help','Tastenkürzel & Hilfe','Atajos y ayuda'],
 'more.classic':['Klasyczny interfejs','Classic interface','Klassische Oberfläche','Interfaz clásica'],
 'more.reset':['Zresetuj symulację','Reset simulation','Simulation zurücksetzen','Reiniciar simulación'],
 'help':['Pomoc','Help','Hilfe','Ayuda'],
 'help.title':['Jak się poruszać','Getting around','So bewegst du dich','Cómo moverse'],
 'help.mouse':['Mysz i dotyk','Mouse & touch','Maus & Touch','Ratón y táctil'],
 'help.keyboard':['Klawiatura','Keyboard','Tastatur','Teclado'],
 'key.drag':['Przeciągnij','Drag','Ziehen','Arrastrar'],
 'key.wheel':['Kółko / szczypanie','Wheel / pinch','Rad / Pinch','Rueda / pellizco'],
 'key.click':['Klik','Click','Klick','Clic'],
 'key.dblclick':['Dwuklik','Double-click','Doppelklick','Doble clic'],
 'key.empty':['Klik w pustkę','Click empty space','Klick ins Leere','Clic en vacío'],
 'help.drag':['Obracanie widoku','Rotate the view','Ansicht drehen','Girar la vista'],
 'help.pan':['Przesuwanie','Pan','Verschieben','Desplazar'],
 'help.wheel':['Przybliżanie do kursora','Zoom towards the pointer','Zum Zeiger zoomen','Acercar hacia el puntero'],
 'help.click':['Szczegóły ciała','Body details','Details eines Körpers','Detalles del cuerpo'],
 'help.dblclick':['Śledzenie ciała kamerą','Follow a body with the camera','Einem Körper mit der Kamera folgen','Seguir un cuerpo con la cámara'],
 'help.empty':['Dodanie nowego ciała w tym miejscu','Add a new body at that spot','Dort einen neuen Körper hinzufügen','Añadir un cuerpo nuevo allí'],
 'help.space':['Pauza / wznowienie','Pause / resume','Pause / fortsetzen','Pausa / reanudar'],
 'help.search':['Szukaj','Search','Suchen','Buscar'],
 'help.zoom':['Przybliż / oddal','Zoom in / out','Vergrößern / verkleinern','Acercar / alejar'],
 'help.home':['Widok całego układu','Whole-system view','Gesamtansicht','Vista de todo el sistema'],
 'help.new':['Nowe ciało','New body','Neuer Körper','Cuerpo nuevo'],
 'help.tools':['Panel symulacji','Simulation panel','Simulationsleiste','Panel de simulación'],
 'help.fly':['Swobodny lot (Q / E w dół / w górę)','Free flight (Q / E down / up)','Freier Flug (Q / E runter / hoch)','Vuelo libre (Q / E bajar / subir)'],
 'help.shift':['Szybciej','Faster','Schneller','Más rápido'],
 'help.escape':['Zamknij panel, zwolnij mysz','Close a panel, release the pointer','Leiste schließen, Zeiger freigeben','Cerrar panel, liberar el puntero'],
 'help.reset':['Reset (z potwierdzeniem)','Reset (asks first)','Zurücksetzen (mit Nachfrage)','Reiniciar (con confirmación)'],
 'help.helpKey':['Ta pomoc','This help','Diese Hilfe','Esta ayuda'],
 'close':['Zamknij','Close','Schließen','Cerrar'],
 'cancel':['Anuluj','Cancel','Abbrechen','Cancelar'],
 'confirm.reset.title':['Zresetować symulację?','Reset the simulation?','Simulation zurücksetzen?','¿Reiniciar la simulación?'],
 'confirm.reset.body':['Dodane ciała, zmienione parametry, upływ czasu i ustawienie kamery zostaną utracone.','Added bodies, edited parameters, elapsed time and the camera position will be lost.','Hinzugefügte Körper, geänderte Parameter, vergangene Zeit und die Kameraposition gehen verloren.','Se perderán los cuerpos añadidos, los parámetros editados, el tiempo transcurrido y la cámara.'],
 'confirm.reset.ok':['Resetuj','Reset','Zurücksetzen','Reiniciar'],
 'confirm.remove.title':['Usunąć {name}?','Remove {name}?','{name} entfernen?','¿Eliminar {name}?'],
 'confirm.remove.body':['Ciało zniknie z symulacji razem ze swoją grawitacją. Przywróci je dopiero reset.','The body leaves the simulation along with its gravity. Only a reset brings it back.','Der Körper verschwindet samt seiner Schwerkraft. Nur ein Zurücksetzen holt ihn zurück.','El cuerpo sale de la simulación junto con su gravedad. Solo un reinicio lo devuelve.'],
 'confirm.remove.ok':['Usuń','Remove','Entfernen','Eliminar'],
 'body.params':['Parametry fizyczne','Physical parameters','Physikalische Parameter','Parámetros físicos'],
 'body.edit':['Edytuj','Edit','Bearbeiten','Editar'],
 'body.editing':['Zmiany zaczną działać po zatwierdzeniu.','Changes take effect once applied.','Änderungen wirken nach dem Übernehmen.','Los cambios se aplican al confirmar.'],
 'body.apply':['Zastosuj zmiany','Apply changes','Änderungen übernehmen','Aplicar cambios'],
 'welcome.title':['Witaj w solare°','Welcome to solare°','Willkommen bei solare°','Bienvenido a solare°'],
 'welcome.drag':['Przeciągnij, aby obrócić widok, kółkiem przybliżaj.','Drag to rotate, scroll to zoom.','Ziehen zum Drehen, scrollen zum Zoomen.','Arrastra para girar, usa la rueda para acercar.'],
 'welcome.select':['Kliknij planetę albo wyszukaj ją (klawisz /), by zobaczyć szczegóły.','Click a planet or search for it (/ key) to see its details.','Klicke einen Planeten an oder suche ihn (Taste /), um Details zu sehen.','Haz clic en un planeta o búscalo (tecla /) para ver sus detalles.'],
 'welcome.scenarios':['Na dole: tempo czasu i scenariusze – lot światła, zaćmienia, zderzenia.','At the bottom: time speed and scenarios – light flight, eclipses, collisions.','Unten: Zeittempo und Szenarien – Lichtflug, Finsternisse, Kollisionen.','Abajo: ritmo del tiempo y escenarios – vuelo de la luz, eclipses, choques.'],
 'welcome.start':['Zaczynamy','Let’s go','Los geht’s','Empezar'],
 'welcome.shortcuts':['Skróty klawiszowe','Keyboard shortcuts','Tastenkürzel','Atajos de teclado']
};

// The interface language falls back to English for anything unknown, the
// same rule i18n.js's detectLanguage uses, and a {name} placeholder is
// filled in from `values` - the only interpolation any string here needs.
export function uxText(key,language='pl',values={}){
 const row=UX_STRINGS[key];
 if(!row)return key;
 const index=UX_LANGUAGES.indexOf(language);
 const text=row[index<0?1:index]??row[1];
 return text.replace(/\{(\w+)\}/g,(match,name)=>name in values?String(values[name]):match);
}

// Shortcuts the redesign adds on top of the ones main.js already handles
// (Space, Escape, N, T and WASD/Q/E stay exactly where they were). Returns
// the action name for a keydown, or null for keys this layer leaves alone.
// R is claimed here only so a stray keypress asks before wiping the
// simulation - it still resets once confirmed.
export function uxShortcut(event){
 if(!event||event.altKey)return null;
 const key=String(event.key||'');
 if((event.ctrlKey||event.metaKey)&&key.toLowerCase()==='k')return 'search';
 if(event.ctrlKey||event.metaKey)return null;
 if(key==='/')return 'search';
 if(key==='?')return 'help';
 if(key==='+'||key==='=')return 'zoom-in';
 if(key==='-'||key==='_')return 'zoom-out';
 if(key==='0'||key==='Home')return 'home';
 if(key.toLowerCase()==='r'&&!event.shiftKey)return 'reset';
 return null;
}

// A shortcut must never fire while someone is typing a value or a search
// term; the same test main.js applies to its own keys.
export function isEditableTarget(target){
 if(!target||typeof target!=='object')return false;
 if(target.isContentEditable)return true;
 return ['INPUT','SELECT','TEXTAREA'].includes(target.tagName);
}
