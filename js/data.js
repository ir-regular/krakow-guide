/* =====================================================================
   KRAKÓW GUIDE — ALL CONTENT LIVES IN THIS FILE
   =====================================================================

   This is the only file you need to edit. Everything else (app.js) is a
   generic engine that just renders whatever it finds here.

   FOUR THINGS YOU CAN EDIT
   ------------------------
   1. INTRO       — the text on the opening screen
   2. CATEGORIES  — the kinds of place (pub, church, ice cream…) + icons
   3. DISTRICTS   — the districts, and the places inside each one
   4. TRIPS       — top-level pins that aren't part of any district

   ── TO ADD A DISTRICT ────────────────────────────────────────────────
   Copy any district block and paste it into the DISTRICTS array.
   Only `name` and `places` are truly required. Everything else is
   optional — if you leave out `center`/`zoom`, the map works them out
   from the places you listed.

   ── TO ADD A PLACE ───────────────────────────────────────────────────
   Add an object to that district's `places` array:

       { name: "…", category: "pub", coords: [50.0517, 19.9447],
         description: "…" }

   Required: name, category, coords, description. All other fields
   (tip, address, hours, price, link, namePl) are optional and simply
   won't render if you omit them.

   ── TO ADD A TRIP ─────────────────────────────────────────────────────
   A trip is shaped exactly like a place — same fields, same rules above
   — but goes in the TRIPS array near the bottom instead of inside a
   district. Use it for somewhere worth a pin that isn't really part of
   any district: a castle outside the city, a day trip, a mountain.
   Clicking it goes straight to its details, with no district screen in
   between — see the worked example near the bottom of this file.

   ── HOW TO GET COORDINATES ───────────────────────────────────────────
   Open Google Maps, right-click the exact spot, and click the
   "50.0617, 19.9394" numbers at the top of the menu — that copies them.
   Paste between square brackets: coords: [50.0617, 19.9394]
   (Latitude first, then longitude. Kraków is roughly lat 50.0, lon 19.9.)

   ── A NOTE ON THE COORDINATES BELOW ──────────────────────────────────
   The places listed here are a starting skeleton so you can see the
   thing working. The coordinates are close but hand-entered, so nudge
   any that land slightly off — and swap the descriptions for your own
   recommendations, which is the whole point.
   ===================================================================== */


/* ─── 1. INTRO ─────────────────────────────────────────────────────────
   Shown in the sidebar on the opening screen. `description` accepts
   either one string or an array of strings (one per paragraph).        */

const INTRO = {
  title:   "Kraków",
  tagline: "A short, opinionated guide for visiting friends.",
  description: [
    "Kraków is small enough to walk across in an afternoon and dense enough that you'll still be finding things on your fifth visit. Almost everything below is within half an hour on foot of the main square.",
    "Click a district on the map — or pick one from the list — to see what's there."
  ],
  // Optional closing note on the home screen. Delete the line to hide it.
  tip: "Trams and buses share one ticket system. Buy from the machine on board (it takes cards) and validate it straight away — inspectors do check."
};


/* ─── 2. CATEGORIES ────────────────────────────────────────────────────
   Every place has a `category` that must match one of these keys.
   To add a new kind of place, add one line here — the map pin, the
   legend and the sidebar chip all update automatically.

   The icon is just an emoji, so there are no image files to manage.   */

const CATEGORIES = {
  landmark:  { label: "Landmark",    icon: "🏛️", color: "#b3441f" },
  church:    { label: "Church",      icon: "⛪", color: "#7d5ba6" },
  museum:    { label: "Museum",      icon: "🖼️", color: "#2f6f8f" },
  history:   { label: "History",     icon: "🕯️", color: "#5b5750" },
  pub:       { label: "Pub & bar",   icon: "🍺", color: "#c98a1b" },
  food:      { label: "Food",        icon: "🍽️", color: "#c0522e" },
  icecream:  { label: "Ice cream",   icon: "🍦", color: "#d17a9e" },
  cafe:      { label: "Café",        icon: "☕", color: "#8a6240" },
  park:      { label: "Park & view", icon: "🌳", color: "#4f8a53" },
  market:    { label: "Market",      icon: "🧺", color: "#a8863b" },
  // Add your own, e.g.:
  // shop:   { label: "Shop",        icon: "🛍️", color: "#6b7f9e" },
};


/* ─── 3. DISTRICTS ─────────────────────────────────────────────────────

   DISTRICT FIELDS
     name         required   e.g. "Kazimierz"
     namePl       optional   Polish name, shown small under the title
     tagline      required   one line, shown in the list and under the title
     description  required   string, or array of strings for paragraphs
     places       required   array of places (see below)
     color        optional   colour of the district blob on the overview map
     icon         optional   emoji for the overview pin
     center       optional   [lat, lon] — auto-calculated if omitted
     zoom         optional   defaults to 15
     area         optional   rough polygon [[lat,lon], …] drawn on the
                             overview map. Hand-drawn approximations, not
                             official boundaries — omit it and you just get
                             a pin instead, which works perfectly well.
     tip          optional   highlighted note box

   PLACE FIELDS
     name         required
     category     required   a key from CATEGORIES above
     description  required   string or array of strings
     coords       [lat, lon] — required UNLESS you give an area or path
     area         optional   a filled shape: [[lat,lon], [lat,lon], …]
     path         optional   a line: [[lat,lon], [lat,lon], …]
     namePl, tip, address, hours, price, link   all optional

   PLACES THAT ARE REGIONS, NOT POINTS
     Some things aren't a single spot — a park, a ring of green space, a
     surviving stretch of wall. Give the place an `area` (a filled shape)
     or a `path` (a line) instead of, or as well as, `coords`:

         { name: "Błonia", category: "park",
           area: [[50.0640, 19.9160], [50.0616, 19.9052],
                  [50.0578, 19.9080], [50.0592, 19.9175]],
           description: "…" }

     Collect the corner points the same way as any other coordinate —
     right-click each corner in Google Maps and copy the numbers. Four or
     five points is usually plenty; it doesn't need to be exact.

     Use `path` for anything long and thin (a route, a wall, a riverbank).
     To close a loop, repeat the first point at the end — see Planty below.

     If you leave out `coords`, the pin goes in the middle of the shape.
     Give `coords` as well to place the pin somewhere specific — useful for
     a ring, where the middle isn't part of the place at all.
*/

const DISTRICTS = [

  /* ══════════════════════════════════════════════════════════════ */
  {
    name: "Old Town",
    namePl: "Stare Miasto",
    icon: "🏰",
    color: "#b3441f",
    // `area` shades this district's rough outline on the overview map — a
    // hand-drawn approximation, not an official boundary. Omit it and the
    // district shows as a pin instead, which works perfectly well.
    area: [
      [50.0661, 19.9360], [50.0620, 19.9316], [50.0554, 19.9345],
      [50.0544, 19.9326], [50.0519, 19.9337], [50.0541, 19.9396],
      [50.0590, 19.9415], [50.0615, 19.9446], [50.0645, 19.9450],
      [50.0662, 19.9404]
    ],
    tagline: "The medieval core, ringed by a park where the walls used to be.",
    description: [
      "The Old Town is a near-perfect medieval grid built around one enormous square, with a green ring — the Planty — tracing the line of the city walls that were pulled down in the 1820s. It's compact: you can cross the whole thing in fifteen minutes.",
      "It is also, inevitably, where every other tourist is. It's worth an early morning or a late evening walk when the square empties out and you get the arcades more or less to yourself."
    ],
    tip: "Every hour, on the hour, a trumpeter plays the hejnał from the taller tower of St Mary's — and stops mid-note. Look up and you'll usually see him wave.",
    places: [
      {
        name: "Main Market Square",
        namePl: "Rynek Główny",
        category: "landmark",
        coords: [50.0616, 19.9373],
        description: "One of the largest medieval squares in Europe, and still the centre of gravity for the whole city. Laid out in 1257 and essentially unchanged in shape since.",
        tip: "The restaurant terraces around the edge charge a heavy premium for the view. Buy a drink one street back and walk in."
      },
      {
        name: "St Mary's Basilica",
        namePl: "Kościół Mariacki",
        category: "church",
        coords: [50.0617, 19.9394],
        description: "The brick church with two mismatched towers on the square. Inside is Veit Stoss's colossal carved wooden altarpiece, opened ceremonially each morning.",
        hours: "Tourist entry roughly 11:30–18:00; closed to sightseers during Mass.",
        price: "Small charge; separate ticket to climb the tower.",
        tip: "Tourists use the side door, not the main west door — that one is for people coming to pray."
      },
      {
        name: "Cloth Hall",
        namePl: "Sukiennice",
        category: "market",
        coords: [50.0616, 19.9370],
        description: "The long Renaissance trading hall down the middle of the square. Ground floor is souvenir stalls — amber, wood, sheepskin — and upstairs is a gallery of 19th-century Polish painting."
      },
      {
        name: "Wawel Castle & Cathedral",
        category: "landmark",
        coords: [50.0540, 19.9354],
        description: [
          "The royal hill above the river: a cathedral where Polish monarchs were crowned and buried, and a castle complex you can wander in parts.",
          "The courtyard and grounds are free to walk around. The interiors are ticketed separately and individually, which catches people out."
        ],
        tip: "Buy interior tickets online in advance in summer — the timed slots for the State Rooms genuinely sell out."
      },
      {
        name: "Barbican & Floriańska Gate",
        namePl: "Barbakan",
        category: "history",
        coords: [50.0653, 19.9413],
        description: "The surviving fragment of the city's defences — a squat circular brick fort and the gate it guarded. The street running south from here to the square was the royal processional route."
      },
      {
        name: "Collegium Maius",
        category: "museum",
        coords: [50.0614, 19.9330],
        description: "The oldest building of the Jagiellonian University, with a beautiful arcaded courtyard and a collection that includes instruments Copernicus plausibly handled as a student here.",
        tip: "The courtyard is free to walk into. Go for that alone even if you skip the museum."
      },
      {
        name: "Skarbonka",
        category: "landmark",
        coords: [50.06194087599326, 19.93663826419436],
        description: "A squat granite fountain on the square, nicknamed for its resemblance to a piggy bank (skarbonka). One of the two default meeting points on the Rynek — locals arrange to meet 'pod Skarbonką' without a second thought."
      },
      {
        name: "Adam Mickiewicz Monument",
        namePl: "Pomnik Adama Mickiewicza",
        category: "landmark",
        coords: [50.061479413039386, 19.938011555198578],
        description: "A bronze statue of Poland's national poet, unveiled in 1898 and rebuilt after the original was melted down during the German occupation. The other default meeting point on the square — 'pod Adasiem' ('under Adaś', an affectionate nickname) is as common a rendezvous as any street address."
      },
      {
        name: "Town Hall Tower",
        namePl: "Wieża Ratuszowa",
        category: "museum",
        coords: [50.0615446964191, 19.936479980068253],
        description: "The only surviving piece of the old Town Hall, demolished in the 1820s along with the city walls. Climbable, with a small history exhibit inside and a view over the square from the top."
      },
      {
        name: "Rynek Underground",
        namePl: "Podziemia Rynku",
        category: "museum",
        coords: [50.06194688769419, 19.93776970525552],
        description: "An archaeological museum beneath the square itself, built around the excavated foundations of the medieval marketplace — stalls, roads and workshops preserved where they stood, with multimedia displays layered on top."
      },
      {
        name: "St Adalbert's Church",
        namePl: "Kościół św. Wojciecha",
        category: "church",
        coords: [50.060901076335774, 19.93775839199445],
        description: "A small Romanesque church tucked into a corner of the square, and the oldest church in Kraków — parts of it predate the square's medieval layout, which grew up around it rather than the other way round."
      },
      {
        name: "Planty",
        category: "park",
        // A place can be a REGION rather than a point. `path` draws a line —
        // right for something long and thin like this ring of park. (Use
        // `area` instead for a solid shape; see Błonia further down.)
        // `coords` is optional here; it just puts the pin on the ring rather
        // than in the middle of the empty space it encloses.
        coords: [50.0674, 19.9385],
        path: [
          [50.0678, 19.9408], [50.0668, 19.9432], [50.0650, 19.9445],
          [50.0628, 19.9452], [50.0606, 19.9443], [50.0588, 19.9425],
          [50.0572, 19.9402], [50.0558, 19.9378], [50.0553, 19.9350],
          [50.0562, 19.9328], [50.0580, 19.9313], [50.0602, 19.9308],
          [50.0625, 19.9315], [50.0648, 19.9330], [50.0665, 19.9358],
          [50.0674, 19.9385], [50.0678, 19.9408]   // repeat the first point to close the loop
        ],
        description: "The four-kilometre ring of park that replaced the city walls, pulled down in the 1820s. It encircles the whole Old Town, so you're never more than a few minutes from it.",
        tip: "A pleasant and slightly aimless loop — good for getting your bearings on a first morning. The full circuit takes about an hour at a stroll."
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════════ */
  {
    name: "Stradom - Kazimierz",
    icon: "🕎",
    color: "#7d5ba6",
    area: [
    [50.0521, 19.9335],
    [50.0542, 19.9398],
    [50.0594, 19.9418],
    [50.0497, 19.9531],
    [50.0453, 19.9441],
    [50.0453, 19.9391],
    [50.0495, 19.9351]
    ],
    tagline: "The old Jewish quarter — synagogues by day, the best bars by night.",
    description: [
      "For 500 years Kazimierz was a separate town, and for most of that time it was the centre of Jewish life in Kraków. The community was destroyed in the Holocaust; the buildings largely survived, and stood half-empty until the 1990s.",
      "What's grown back is an odd and specific mix: seven historic synagogues and a serious memorial landscape sharing streets with the densest concentration of good bars in the city. It rewards being taken on its own terms rather than treated as nightlife with scenery."
    ],
    tip: "Plac Nowy is the hinge of the whole district — market stalls in the morning, and the bars around it running very late.",
    places: [
      {
        name: "Plac Nowy",
        category: "market",
        coords: [50.0517, 19.9447],
        description: "A scruffy square with a round brick building in the middle — the Okrąglak, a former ritual poultry slaughterhouse, now hatches selling zapiekanki. Flea market at weekends.",
        tip: "The zapiekanka — a long baguette half loaded with mushrooms and cheese — is the traditional 2am purchase. It is fine at 2am and merely acceptable at 2pm."
      },
      {
        name: "Remuh Synagogue & Cemetery",
        category: "history",
        coords: [50.0524, 19.9459],
        description: "A small working synagogue with a Renaissance cemetery behind it. Gravestones smashed during the occupation were reassembled into a mosaic 'Wailing Wall' along one side.",
        price: "Small entry charge.",
        tip: "Men are given a paper kippah at the door. Cover your shoulders."
      },
      {
        name: "Old Synagogue",
        namePl: "Stara Synagoga",
        category: "museum",
        coords: [50.0510, 19.9455],
        description: "The oldest surviving synagogue building in Poland, now a museum of Kraków's Jewish history and ritual life rather than an active place of worship."
      },
      {
        name: "Galicia Jewish Museum",
        category: "museum",
        coords: [50.0499, 19.9469],
        description: "A photographic museum documenting what remains of Jewish Galicia — ruined synagogues, overgrown cemeteries, traces in the landscape. Quieter and more affecting than its size suggests."
      },
      {
        name: "Alchemia",
        category: "pub",
        coords: [50.0519, 19.9443],
        description: "Candlelit, cluttered with junk-shop furniture, and the template that most Kazimierz bars have since copied. Rambling back rooms and live music some nights.",
        tip: "It genuinely is as dark as it looks. Go with people you already know how to find."
      },
      {
        name: "Hevre",
        category: "pub",
        coords: [50.0521, 19.9455],
        description: "A bar inside a former Jewish prayer house, with the original painted decoration left exposed above the tables. Good beer list, and a much better room than the average."
      },
      {
        name: "Good Lood",
        category: "icecream",
        coords: [50.0523, 19.9438],
        description: "A Kraków institution: a short rotating list of flavours that changes daily, made that morning, at a price that feels like a mistake. Expect a queue in summer.",
        tip: "The flavour list is posted daily on their social media, and the good ones sell out."
      },
      {
        name: "Corpus Christi Basilica",
        category: "church",
        coords: [50.0500, 19.9439],
        description: "An enormous Gothic brick church with a startlingly ornate Baroque interior — a boat-shaped pulpit, gilt everywhere. Usually almost empty, which is its own recommendation."
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════════ */
  {
    name: "Podgórze",
    icon: "🌉",
    color: "#2f6f8f",
    area: [
      [50.0472, 19.9445], [50.0450, 19.9670], [50.0428, 19.9722],
      [50.0358, 19.9640], [50.0370, 19.9478], [50.0430, 19.9425]
    ],
    tagline: "Across the river: the ghetto memorial, Schindler's factory, and mounds to climb.",
    description: [
      "Podgórze sits on the south bank and was an independent town until 1915, which is why it has its own square and its own hill. In 1941 the Nazis forced Kraków's Jewish population across the river into a walled ghetto here.",
      "It's the city's most serious district to visit, and also — a little incongruously — one of its most pleasant to walk, with river paths, a prehistoric mound and an increasingly good bar scene along the embankment."
    ],
    places: [
      {
        name: "Schindler's Factory",
        namePl: "Fabryka Schindlera",
        category: "museum",
        coords: [50.0475, 19.9617],
        description: [
          "Oskar Schindler's enamelware factory, now a museum — though not really about Schindler. It's an immersive, room-by-room reconstruction of Kraków under German occupation from 1939 to 1945.",
          "It is excellent and it is heavy. Allow two hours and don't schedule anything cheerful straight afterwards."
        ],
        tip: "Book online, days ahead. Same-day tickets are rarely available and the queue is long."
      },
      {
        name: "Ghetto Heroes Square",
        namePl: "Plac Bohaterów Getta",
        category: "history",
        coords: [50.0463, 19.9539],
        description: "The square where deportations to the camps were staged. It's now a memorial of seventy empty steel chairs, referencing the furniture thrown from windows and left in the street as the ghetto was cleared."
      },
      {
        name: "Ghetto Wall Fragment",
        category: "history",
        coords: [50.0450, 19.9576],
        description: "A surviving stretch of the ghetto wall on Lwowska street, built with rounded tops in a deliberate echo of Jewish gravestones. A plaque marks it."
      },
      {
        name: "Krakus Mound",
        namePl: "Kopiec Krakusa",
        category: "park",
        coords: [50.0389, 19.9611],
        description: "A grass mound of genuinely unknown origin and age — possibly a Celtic or early Slavic burial. Ten minutes uphill for the best free panorama of the city.",
        tip: "Best at sunset, and much less busy than the Kościuszko Mound across town. Bring something to sit on."
      },
      {
        name: "MOCAK",
        category: "museum",
        coords: [50.0470, 19.9628],
        description: "The contemporary art museum, in converted factory halls right next to Schindler's. A useful and deliberate palate cleanser if you've just come out of the occupation museum."
      },
      {
        name: "Father Bernatek Footbridge",
        namePl: "Kładka Bernatka",
        category: "landmark",
        coords: [50.0491, 19.9483],
        description: "The pedestrian bridge linking Kazimierz to Podgórze, hung with acrobat sculptures and a great many padlocks. The most pleasant way to cross between the two districts."
      },
      {
        name: "Forum Przestrzenie",
        category: "cafe",
        coords: [50.0475, 19.9346],
        description: "A derelict communist-era hotel repurposed as a bar and café, with deckchairs on the riverbank terrace facing Wawel. Best in the late afternoon.",
        tip: "Technically just west of Podgórze proper, but it's a ten-minute walk along the river and worth it."
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════════ */
  {
    name: "Nowa Huta",
    icon: "🏭",
    color: "#5b5750",
    area: [
      [50.0852, 20.0248], [50.0862, 20.0502], [50.0700, 20.0562],
      [50.0638, 20.0378], [50.0680, 20.0228], [50.0790, 20.0188]
    ],
    tagline: "A whole socialist-realist city built from scratch around a steelworks.",
    description: [
      "In 1949 the communist authorities began building an entirely new town east of Kraków — a steelworks and a model workers' city, planted next to the bourgeois old capital as a deliberate ideological counterweight.",
      "The result is a coherent piece of urban design: monumental avenues radiating from a central plaza, generous green space, and remarkably decent flats. It's a genuine tram ride out and completely unlike the rest of Kraków. Worth half a day if you have three or more."
    ],
    tip: "Tram 4 or 22 from the Old Town gets you to Plac Centralny in about 25 minutes. Just look out the window on the way.",
    places: [
      {
        name: "Plac Centralny",
        category: "landmark",
        coords: [50.0718, 20.0378],
        description: "The central plaza the whole district radiates from, ringed by arcaded socialist-realist blocks. Formally named after Ronald Reagan in 2004, which nobody says out loud."
      },
      {
        name: "Lord's Ark Church",
        namePl: "Arka Pana",
        category: "church",
        coords: [50.0836, 20.0286],
        description: "The authorities designed Nowa Huta deliberately without a church. Residents fought for one for twenty years, then largely built it themselves — a swooping concrete ark, finished in 1977. A landmark of the Solidarity years as much as an architectural one."
      },
      {
        name: "Nowa Huta Museum",
        category: "museum",
        coords: [50.0721, 20.0347],
        description: "A small, well-made museum on the founding and daily life of the district, including the propaganda and what was going on underneath it."
      },
      {
        name: "Stylowa",
        category: "food",
        coords: [50.0716, 20.0369],
        description: "A restaurant on the central plaza that has been running since 1956 and has changed its interior approximately not at all. Solid Polish food; the room is the point."
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════════ */
  {
    name: "Zwierzyniec & Błonia",
    icon: "🌳",
    color: "#4f8a53",
    area: [
      [50.0642, 19.9202], [50.0620, 19.9118], [50.0572, 19.8898],
      [50.0540, 19.8930], [50.0535, 19.9082], [50.0572, 19.9232]
    ],
    tagline: "The green west: a vast meadow, a mound with a view, and a flooded quarry.",
    description: [
      "West of the centre the city opens out. Błonia is a genuinely enormous common — 48 hectares of uninterrupted grass, ten minutes' walk from the Old Town, historically used for grazing and now for festivals, papal masses and cycling.",
      "Beyond it the ground rises into wooded hills with the Kościuszko Mound on top, and to the south there's a flooded limestone quarry with water an implausible shade of turquoise."
    ],
    places: [
      {
        name: "Błonia Meadow",
        category: "park",
        // `area` draws a filled shape — right for a place with real extent.
        // No `coords` needed: the pin is placed in the middle automatically.
        area: [
          [50.0640, 19.9160], [50.0616, 19.9052],
          [50.0578, 19.9080], [50.0592, 19.9175]
        ],
        description: "Forty-eight hectares of completely flat, completely uninterrupted grass, ten minutes' walk from the Old Town — a stranger thing to find in the middle of a European city than it sounds. Cycle across it, or walk the perimeter path on towards Kościuszko Mound.",
        tip: "Historically common grazing land, which is why it was never built on. It still legally can't be."
      },
      {
        name: "Kościuszko Mound",
        namePl: "Kopiec Kościuszki",
        category: "park",
        coords: [50.0546, 19.8955],
        description: "An artificial mound raised in the 1820s in honour of Tadeusz Kościuszko, later wrapped in an Austrian brick fort. Spiral path to the top and a wide view over the city and the Vistula valley.",
        price: "Ticketed, unlike Krakus Mound.",
        tip: "If you only climb one mound and you want the view with a café at the bottom, climb this one. If you want the view for free and with fewer people, climb Krakus."
      },
      {
        name: "Zakrzówek",
        category: "park",
        coords: [50.0353, 19.9055],
        description: "A flooded limestone quarry with sheer white cliffs and startlingly turquoise water, now with a proper swimming area and walkways.",
        tip: "Swim only in the supervised zone — the quarry is very deep and very cold, and people have drowned here."
      },
      {
        name: "Norbertine Convent",
        category: "church",
        coords: [50.0518, 19.9005],
        description: "A fortified white convent on the riverbank at the far end of the Błonia walk, founded in the 12th century. A good turning point before heading back along the Vistula."
      }
    ]
  }

];


/* ─── 4. TRIPS ──────────────────────────────────────────────────────────
   Top-level pins for things worth visiting that aren't part of any
   district — usually somewhere outside the city. Each entry uses the
   same fields as a place (see PLACE FIELDS above): name, category,
   description and coords are required; namePl, tip, address, hours,
   price and link are all optional.

   Clicking one goes straight to its details — there's no district
   screen in between, and no automatic zoom to fit it alongside the
   districts on the opening map (it may be much further out than they
   are). Panning the map or using this list both find it.            */

const TRIPS = [
  {
    name: "Pieskowa Skała Castle",
    namePl: "Zamek Pieskowa Skała",
    category: "landmark",
    coords: [50.24463828981555, 19.778297802840175],
    description: "A Renaissance courtyard castle about 25km north of the city, in the Ojców valley — one of the few strongholds on the medieval \"Trail of the Eagles' Nests\" to survive intact rather than as a ruin. It now holds a branch of the Wawel museum's decorative arts collection.",
    tip: "Pair it with a walk in Ojców National Park next door — the limestone outcrop known as Hercules's Club is a short walk from the castle."
  },
  {
    name: "Kryspinów",
    category: "park",
    coords: [50.04760751714946, 19.791847461493877],
    description: "The most popular of the old sand-quarry lakes around Kraków, and the closest thing the city has to an actual sand beach — lifeguards, volleyball courts, paddleboard and kayak rental, and a genuinely lively atmosphere on a hot weekend. About 20 minutes west of the centre by bus.",
    tip: "Gets very crowded on summer weekends. Go on a weekday, or early, if you want space to actually lie down."
  },
  {
    name: "Wieliczka Salt Mine",
    namePl: "Kopalnia Soli Wieliczka",
    category: "museum",
    coords: [49.98359121325868, 20.055158179349313],
    description: "A working salt mine since the 13th century and one of the first sites ever inscribed on UNESCO's World Heritage list, 15km southeast of the city. The tourist route winds through carved chambers, underground lakes and chapels hewn entirely from rock salt, ending at St Kinga's Chapel — a full working church, chandeliers included, carved by miners over decades.",
    tip: "Book a timed slot online. In summer the walk-up queue can be brutal, and the tour itself is a couple of hours with several hundred stairs down (there's a lift back up)."
  },
  {
    name: "Bagry Beach",
    namePl: "Zalew Bagry",
    category: "park",
    coords: [50.03298763667974, 19.993765040100666],
    description: "A large lake on a former sand quarry in the south of the city, and one of the places locals actually go to swim in summer rather than just tourists — day-trippers tend to head for Zakrzówek instead, which keeps this one comparatively uncrowded. Shoreline ranges from a developed beach with bars to quieter, wilder stretches."
  }
];
