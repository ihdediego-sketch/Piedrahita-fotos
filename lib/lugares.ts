import type { FeatureCollection, Polygon } from "geojson";

// Geometrías fijas tomadas de OpenStreetMap para los lugares que el mapa gris
// no distingue por sí solo. Van a mano porque las teselas vectoriales de
// OpenMapTiles no traen ni el polígono de la plaza (solo su línea peatonal) ni
// el nombre de los edificios.

// Plaza de España (way 756594071, place=square)
export const plaza: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Plaza de España" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.328085, 40.463614],
            [-5.328271, 40.46355],
            [-5.328312, 40.463543],
            [-5.328184, 40.463436],
            [-5.328156, 40.463451],
            [-5.328005, 40.463343],
            [-5.327977, 40.463339],
            [-5.327939, 40.463373],
            [-5.327831, 40.463428],
            [-5.327645, 40.463215],
            [-5.327602, 40.463157],
            [-5.327518, 40.46322],
            [-5.327425, 40.463274],
            [-5.327293, 40.463144],
            [-5.327237, 40.46315],
            [-5.327084, 40.46324],
            [-5.327105, 40.463288],
            [-5.327255, 40.463437],
            [-5.327245, 40.463442],
            [-5.327298, 40.463496],
            [-5.327343, 40.463535],
            [-5.327458, 40.463647],
            [-5.327557, 40.463756],
            [-5.327427, 40.463876],
            [-5.327467, 40.463892],
            [-5.327758, 40.463967],
            [-5.327898, 40.464011],
            [-5.327964, 40.4639],
            [-5.327799, 40.463854],
            [-5.327732, 40.463718],
            [-5.327831, 40.463692],
            [-5.328085, 40.463614],
          ],
        ],
      },
    },
  ],
};

// Los edificios con más peso en la memoria del pueblo, con su id de OSM al
// lado. Los que llevan anillo interior son multipolígonos: el segundo anillo
// es el patio.
export const edificios: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      // way 296501908
      type: "Feature",
      properties: { name: "Palacio de los Duques de Alba" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.326137, 40.461645],
            [-5.326139, 40.461431],
            [-5.326028, 40.46143],
            [-5.326029, 40.461328],
            [-5.325657, 40.461326],
            [-5.325655, 40.461423],
            [-5.325561, 40.461422],
            [-5.325559, 40.461632],
            [-5.32567, 40.461633],
            [-5.325672, 40.461469],
            [-5.326014, 40.461471],
            [-5.326012, 40.461645],
            [-5.326137, 40.461645],
          ],
        ],
      },
    },
    {
      // relación 3942884
      type: "Feature",
      properties: { name: "Iglesia de Nuestra Señora de la Asunción" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.328771, 40.46377],
            [-5.328586, 40.463473],
            [-5.328361, 40.463583],
            [-5.328312, 40.463543],
            [-5.328271, 40.46355],
            [-5.328085, 40.463614],
            [-5.327831, 40.463692],
            [-5.327872, 40.463776],
            [-5.327919, 40.463877],
            [-5.32798, 40.463865],
            [-5.327994, 40.463892],
            [-5.328088, 40.463873],
            [-5.328108, 40.463925],
            [-5.328227, 40.4639],
            [-5.328317, 40.463865],
            [-5.328771, 40.46377],
          ],
          [
            [-5.328686, 40.463675],
            [-5.328585, 40.46351],
            [-5.328408, 40.463597],
            [-5.328489, 40.463733],
            [-5.328686, 40.463675],
          ],
        ],
      },
    },
    {
      // relación 3939632
      type: "Feature",
      properties: { name: "Convento de las Carmelitas Descalzas" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.326468, 40.464017],
            [-5.326359, 40.463919],
            [-5.32633, 40.463936],
            [-5.326282, 40.463889],
            [-5.326225, 40.463923],
            [-5.326099, 40.46381],
            [-5.325944, 40.463892],
            [-5.325562, 40.464144],
            [-5.325798, 40.464342],
            [-5.32592, 40.464267],
            [-5.326003, 40.464334],
            [-5.326153, 40.464202],
            [-5.326468, 40.464017],
          ],
          [
            [-5.326162, 40.464048],
            [-5.326034, 40.46393],
            [-5.325723, 40.464124],
            [-5.325853, 40.464243],
            [-5.326162, 40.464048],
          ],
        ],
      },
    },
    {
      // way 296193483
      type: "Feature",
      properties: { name: "Ayuntamiento" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.327458, 40.463647],
            [-5.327387, 40.463688],
            [-5.32728, 40.463579],
            [-5.327343, 40.463535],
            [-5.327458, 40.463647],
          ],
        ],
      },
    },
    {
      // way 1287219885. Del convento de Santo Domingo solo queda en OSM su
      // cementerio, que ocupa el solar donde estuvo.
      type: "Feature",
      properties: { name: "Antiguo convento de Santo Domingo" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.323508, 40.460353],
            [-5.323944, 40.460177],
            [-5.323848, 40.460065],
            [-5.323821, 40.460076],
            [-5.323574, 40.45978],
            [-5.323199, 40.45993],
            [-5.323409, 40.460184],
            [-5.323462, 40.460168],
            [-5.323544, 40.460297],
            [-5.323489, 40.460314],
            [-5.323508, 40.460353],
          ],
        ],
      },
    },
  ],
};
