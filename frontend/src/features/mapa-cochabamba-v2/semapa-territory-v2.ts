// ============================================================
// SEMAPA COCHABAMBA â DATOS TERRITORIALES
// JerarquÃ­a: 6 Comunas â 15 Distritos â Zonas
// Mapa SVG activo: viewBox "0 0 918 1297" (cochabamba-zone-paths.ts)
// ============================================================

export type MapMetric = 'consumo' | 'cobertura' | 'poblacion' | 'medidores' | 'ica' | 'estres';

export const MAP_METRIC_LABELS: Record<MapMetric, string> = {
  consumo:   'Consumo mÂ³/s',
  cobertura: 'Cobertura %',
  poblacion: 'PoblaciÃ³n',
  medidores: 'Medidores Activos %',
  ica:       'Calidad ICA',
  estres:    'EstrÃ©s HÃ­drico',
};

// Cuando invert=true, valor alto = malo (rojo)
export const MAP_METRIC_INVERT: Record<MapMetric, boolean> = {
  consumo:   true,   // alto consumo = presiÃ³n
  cobertura: false,  // alta cobertura = bueno
  poblacion: false,  // referencial
  medidores: false,  // alto % activos = bueno
  ica:       false,  // alto ICA = buena calidad
  estres:    true,   // alto estrÃ©s = malo
};

export interface DistritoBoundary {
  id: number;
  nombre: string;
  comunaId: string;
  points: string;           // polygon points para <polygon>
  centroid: [number, number];
  zonas: string[];
}

export interface ComunaConfig {
  id: string;
  nombre: string;
  color: string;
  colorDark: string;        // versiÃ³n oscurecida para bordes
  distritoIds: number[];
  labelPos: [number, number]; // posiciÃ³n del label en nivel comunas
}

export const COMUNAS: ComunaConfig[] = [
  {
    id: 'tunari',
    nombre: 'Tunari',
    color: '#4ade80',
    colorDark: '#16a34a',
    distritoIds: [1, 2, 13],
    labelPos: [381, 451],
  },
  {
    id: 'molle',
    nombre: 'Molle',
    color: '#60a5fa',
    colorDark: '#2563eb',
    distritoIds: [3, 4],
    labelPos: [111, 784],
  },
  {
    id: 'adela-zamudio',
    nombre: 'Adela Zamudio',
    color: '#fbbf24',
    colorDark: '#d97706',
    distritoIds: [10, 11, 12],
    labelPos: [359, 806],
  },
  {
    id: 'valle-hermoso',
    nombre: 'Valle Hermoso',
    color: '#2dd4bf',
    colorDark: '#0f766e',
    distritoIds: [6, 7, 14],
    labelPos: [609, 867],
  },
  {
    id: 'alejo-calatayud',
    nombre: 'Alejo Calatayud',
    color: '#fb923c',
    colorDark: '#ea580c',
    distritoIds: [5, 8],
    labelPos: [344, 962],
  },
  {
    id: 'itocta',
    nombre: 'Itocta',
    color: '#c084fc',
    colorDark: '#9333ea',
    distritoIds: [9, 15],
    labelPos: [185, 1105],
  },
];

export const DISTRITO_BOUNDARIES: DistritoBoundary[] = [
  {
    id: 13,
    nombre: 'D-13 Tunari',
    comunaId: 'tunari',
    points: '154,11 566,11 626,98 640,217 618,334 575,412 492,461 410,483 330,483 249,451 196,394 159,321 125,230 120,130',
    centroid: [384, 234],
    zonas: ['La Temible Cara Cara'],
  },
  {
    id: 1,
    nombre: 'D-1 Queru Queru',
    comunaId: 'tunari',
    points: '330,483 410,483 492,461 575,412 618,334 629,427 609,548 564,628 501,680 430,700 370,678 356,602',
    centroid: [478, 546],
    zonas: ['Queru Queru Alto', 'Aranjuez Alto', 'Mesadilla'],
  },
  {
    id: 2,
    nombre: 'D-2 Cala Cala',
    comunaId: 'tunari',
    points: '196,394 249,451 330,483 356,602 339,682 292,715 235,706 194,663 165,581 159,487 174,438',
    centroid: [259, 576],
    zonas: ['Mayorazgo', 'Cala Cala', 'Condebamba', 'Temporal Pampa', 'Queru Queru Alto'],
  },
  {
    id: 3,
    nombre: 'D-3 Sarco',
    comunaId: 'molle',
    points: '85,490 165,581 194,663 179,793 139,851 92,819 60,732 65,611',
    centroid: [128, 689],
    zonas: ['Sarco', 'HipÃ³dromo', 'Sarcobamba', 'Villa Busch', 'Chiquicollo'],
  },
  {
    id: 4,
    nombre: 'D-4 HipÃ³dromo',
    comunaId: 'molle',
    points: '60,732 92,819 139,851 147,984 102,1034 60,994 28,899 37,797',
    centroid: [88, 884],
    zonas: ['HipÃ³dromo', 'La Chimba', 'Villa Busch', 'CoÃ±a CoÃ±a'],
  },
  {
    id: 10,
    nombre: 'D-10 Centro Norte',
    comunaId: 'adela-zamudio',
    points: '194,663 235,706 292,715 339,682 356,776 330,849 279,880 225,858 185,797 179,793',
    centroid: [273, 776],
    zonas: ['Noroeste', 'Noreste', 'Sudoeste', 'Sudeste'],
  },
  {
    id: 12,
    nombre: 'D-12 Sarco Centro',
    comunaId: 'adela-zamudio',
    points: '370,678 430,700 501,680 564,628 574,745 529,823 455,858 384,841 356,776',
    centroid: [455, 769],
    zonas: ['Sarco', 'Cala Cala', 'Queru Queru', 'Tupuraya', 'HipÃ³dromo'],
  },
  {
    id: 11,
    nombre: 'D-11 Muyurina',
    comunaId: 'adela-zamudio',
    points: '356,776 384,841 377,908 339,938 296,921 279,880 330,849',
    centroid: [339, 880],
    zonas: ['Muyurina', 'Las Cuadras', 'Alalay Norte'],
  },
  {
    id: 6,
    nombre: 'D-6 Alalay Norte',
    comunaId: 'valle-hermoso',
    points: '564,628 609,548 652,570 669,678 653,793 606,832 574,745',
    centroid: [620, 685],
    zonas: ['Alalay Norte'],
  },
  {
    id: 7,
    nombre: 'D-7 Alalay',
    comunaId: 'valle-hermoso',
    points: '606,832 653,793 669,678 682,849 656,968 606,988 564,945 538,880',
    centroid: [618, 893],
    zonas: ['Alalay Norte', 'Alalay Sud'],
  },
  {
    id: 14,
    nombre: 'D-14 Alalay Sud',
    comunaId: 'valle-hermoso',
    points: '538,880 564,945 606,988 612,1101 578,1146 524,1133 487,1060 509,988',
    centroid: [552, 1023],
    zonas: ['Alalay Sud', 'Valle Hermoso'],
  },
  {
    id: 5,
    nombre: 'D-5 Jaihuayco',
    comunaId: 'alejo-calatayud',
    points: '185,797 225,858 279,880 296,921 339,938 356,1036 306,1075 242,1068 185,1016 151,945',
    centroid: [256, 949],
    zonas: ['Sudeste', 'La Maica', 'Jaihuayco', 'Alalay Norte', 'Lacma'],
  },
  {
    id: 8,
    nombre: 'D-8 Ticti',
    comunaId: 'alejo-calatayud',
    points: '377,908 455,858 529,823 538,880 509,988 487,1060 424,1068 370,1046 356,1036 339,938',
    centroid: [438, 971],
    zonas: ['Ticti', 'Valle Hermoso', 'Uspha Uspha'],
  },
  {
    id: 9,
    nombre: 'D-9 La Maica',
    comunaId: 'itocta',
    points: '28,899 60,994 102,1034 147,984 151,945 185,1016 159,1183 107,1205 51,1187 17,1122 11,1014',
    centroid: [92, 1075],
    zonas: ['La Maica', 'CoÃ±a CoÃ±a', 'Tamborada Pukarita', '1Â° de Mayo', 'Pukara Grande Norte', 'Valle Hermoso Oeste', 'Pukara Grande Sur', 'Pukara Grande Oeste'],
  },
  {
    id: 15,
    nombre: 'D-15 Pukara Grande',
    comunaId: 'itocta',
    points: '185,1016 242,1068 306,1075 356,1036 370,1046 353,1176 310,1216 245,1220 188,1190 159,1183',
    centroid: [273, 1122],
    zonas: ['Valle Hermoso Oeste', 'Khara Khara Arrumani', 'Pukara Grande Sur'],
  },
];

// Helpers
export function getComunaById(id: string): ComunaConfig | undefined {
  return COMUNAS.find(c => c.id === id);
}

export function getComunaByDistritoId(distritoId: number): ComunaConfig | undefined {
  return COMUNAS.find(c => c.distritoIds.includes(distritoId));
}

export function getDistritosByComuna(comunaId: string): DistritoBoundary[] {
  return DISTRITO_BOUNDARIES.filter(d => d.comunaId === comunaId);
}

export function getDistritoById(id: number): DistritoBoundary | undefined {
  return DISTRITO_BOUNDARIES.find(d => d.id === id);
}
