// ============================================================
// Datos de producto (ES) — una landing "navaja de ventas" por modelo.
// Specs tomadas de las fichas técnicas PardeSantos.
// ============================================================

export interface Producto {
  slug: string;
  name: string;
  size: string;
  price: string;
  eyebrow: string;
  tagline: string;
  hero: string;
  intro: string;
  destacados: { icon: string; title: string; body: string }[];
  gallery: string[];
  ficha: string;
  paraQuien: string[];
  dimensiones: [string, string][];
  materiales: [string, string][];
  electrico: [string, string][];
  accent: 'gold' | 'sea';
}

const P = (slug: string) => `/media/productos/${slug}`;

export const productos: Record<string, Producto> = {
  couva: {
    slug: 'couva',
    name: 'COUVA 6×6',
    size: '2 recámaras · 1 baño · salón · ~37 m²',
    price: '$495,000',
    eyebrow: 'RESIDENCIAL EXPANSIBLE',
    tagline: 'Tu casa lista para habitar o rentar, en semanas.',
    hero: `${P('couva')}/couva-1.jpg`,
    intro: 'La COUVA redefine el espacio con su sistema de armado expansivo: viaja a 2.20 m y se despliega a 6.30 m, triplicando su superficie. 2 recámaras, baño completo y salón, con acabados en cristal de carbono, fibra bambú-madera y piso SPC resistente a la humedad. Un look residencial sofisticado, listo para vivir o rentar.',
    destacados: [
      { icon: 'bolt', title: 'Sistema expansible', body: 'Llega compacta y triplica su superficie en sitio.' },
      { icon: 'sofa', title: '2 recámaras + salón', body: 'Distribución completa con acabados premium.' },
      { icon: 'shield', title: 'Diseñada para el clima', body: 'Panel EPS 75 mm y chapa con protección marina.' },
      { icon: 'clock', title: 'Lista en semanas', body: 'No los 6–12 meses de una obra tradicional.' },
    ],
    gallery: [`${P('couva')}/couva-1.jpg`, `${P('couva')}/couva-2.webp`, `${P('couva')}/couva-3.webp`, `${P('couva')}/couva-4.webp`, `${P('couva')}/couva-5.jpg`],
    ficha: `${P('couva')}/ficha.jpg`,
    paraQuien: ['Segundas residencias y casas de campo', 'Cabañas para familias pequeñas', 'Airbnb / renta vacacional de alta rentabilidad', 'Desarrollos eco-turísticos y villas'],
    dimensiones: [['Sin expandir', '5,900 × 2,200 × 2,480 mm'], ['Expandido', '5,900 × 6,300 × 2,480 mm'], ['Espesor de pared', '75 mm']],
    materiales: [['Color', 'Blanco o tipo madera'], ['Panel sándwich', 'EPS'], ['Chapa exterior', 'Acero galvanizado 0.3 mm'], ['Rev. exterior', 'Paneles tallados en metal'], ['Rev. interior', 'Cristal de carbono y fibra bambú-madera'], ['Suelo', 'SPC'], ['Ventanería', 'Aluminio puente roto']],
    electrico: [['Voltaje', '110 V – 127 V / 60 Hz'], ['Peso embalaje', '2,500 kg'], ['Volumen', '64.38 m³']],
    accent: 'gold',
  },
  macao: {
    slug: 'macao',
    name: 'MACAO 6×3',
    size: 'Con o sin baño · cocineta y clóset · ~18 m²',
    price: '$265,000',
    eyebrow: 'PREMIUM · NEGOCIO Y HOSPEDAJE',
    tagline: 'Tu suite, café, showroom u oficina — sin obra.',
    hero: `${P('macao')}/macao-1.jpg`,
    intro: 'El MACAO eleva la gama modular media con acabados de alta gama: paneles exteriores tallados en metal a prueba de fuego y perfilería de aluminio con puente térmico. Optimizado para cocina, clóset y baño privado opcional, con un diseño contemporáneo (blanco o gris mate) que combina estilo arquitectónico moderno con funcionalidad inmediata.',
    destacados: [
      { icon: 'kitchen', title: 'Listo para operar', body: 'Cocineta, clóset y baño opcional de fábrica.' },
      { icon: 'shield', title: 'Acabados premium', body: 'Metal tallado a prueba de fuego · aluminio puente roto.' },
      { icon: 'sofa', title: 'Imagen profesional', body: 'Blanco o gris mate, atmósfera acogedora y ejecutiva.' },
      { icon: 'clock', title: 'Sin remodelación', body: 'Llega, se instala y abres tu negocio.' },
    ],
    gallery: [`${P('macao')}/macao-1.jpg`, `${P('macao')}/macao-2.jpg`, `${P('macao')}/macao-3.jpg`, `${P('macao')}/macao-4.jpg`],
    ficha: `${P('macao')}/ficha.jpg`,
    paraQuien: ['Suites de Airbnb y hotel boutique', 'Oficinas corporativas y showrooms inmobiliarios', 'Cafeterías con barra interior', 'Departamento tipo estudio de lujo'],
    dimensiones: [['Expandido', '3,000 × 6,000 × 3,000 mm'], ['Espesor de pared', '50 mm (tejado EPS 80 mm)']],
    materiales: [['Color', 'Blanco o gris mate'], ['Panel sándwich', 'EPS 50 mm'], ['Rev. exterior', 'Paneles tallados en metal a prueba de fuego'], ['Suelo', 'Placa de cemento 18 mm + chapa corrugada 0.4 mm'], ['Ventanería', 'Aluminio puente roto'], ['Opcionales', 'Ventanal · cocina · baño · clóset']],
    electrico: [['Voltaje', '110 V – 127 V / 60 Hz'], ['Peso embalaje', '2,000 kg'], ['Volumen', '64.50 m³']],
    accent: 'sea',
  },
  nomad: {
    slug: 'nomad',
    name: 'NOMAD 3×6',
    size: 'Módulo plegable · sin cocina',
    price: '$129,000',
    eyebrow: 'FUNCIONAL · OBRA Y CAMPAMENTOS',
    tagline: 'Práctico, móvil y económico. Instálalo hoy, muévelo mañana.',
    hero: `${P('nomad')}/nomad-1.webp`,
    intro: 'El NOMAD es la solución práctica y altamente móvil: un módulo plegable de rápido despliegue, con óptimo aislamiento de lana de roca de 50 mm y chapa exterior de acero galvanizado, ideal para climas demandantes. Su sistema de armado manual y su peso ligero facilitan la logística de transporte e instalación inmediata.',
    destacados: [
      { icon: 'chart', title: 'El más económico', body: 'La entrada perfecta a la línea modular.' },
      { icon: 'bolt', title: 'Plegable y móvil', body: 'Ligero (1,100 kg), fácil de transportar y reubicar.' },
      { icon: 'shield', title: 'Aislado', body: 'Lana de roca 50 mm: interior fresco y confortable.' },
      { icon: 'clock', title: 'Despliegue rápido', body: 'Armado manual, instalación inmediata.' },
    ],
    gallery: [`${P('nomad')}/nomad-1.webp`, `${P('nomad')}/nomad-2.webp`, `${P('nomad')}/nomad-3.webp`, `${P('nomad')}/nomad-4.webp`],
    ficha: `${P('nomad')}/ficha.jpg`,
    paraQuien: ['Oficina de obra y oficinas de campo', 'Consultorio privado o estudio de diseño', 'Bodega de resguardo premium', 'Recámara de huéspedes / glamping'],
    dimensiones: [['Expandido', '5,950 × 3,000 × 2,800 mm'], ['Espesor de pared', '50 mm']],
    materiales: [['Color', 'Blanco'], ['Panel sándwich', 'Lana de roca 50 mm'], ['Chapa exterior', 'Acero galvanizado 0.3 mm'], ['Suelo', 'Tabla de cemento 18 mm + cuero 1.6 mm'], ['Puertas/Ventanas', 'Acero plás. 970 × 1,970 mm']],
    electrico: [['Voltaje', '110 V – 127 V / 60 Hz'], ['Peso embalaje', '1,100 kg'], ['Volumen', '49.98 m³']],
    accent: 'sea',
  },
  navik: {
    slug: 'navik',
    name: 'NAVIK 3×6',
    size: 'Persiana enrollable · comercio y almacén',
    price: '$150,000',
    eyebrow: 'COMERCIAL · RETAIL Y SEGURIDAD',
    tagline: 'Persiana enrollable de acero para comercio, pop-up y almacén.',
    hero: `${P('navik')}/navik-1.jpg`,
    intro: 'Diseñado con enfoque de máxima seguridad y versatilidad comercial, el NAVIK integra una persiana enrollable de acero de 3 mm que corre sobre un dintel a prueba de robo. Módulo robusto, aislado con lana de roca de 50 mm y chapa de acero galvanizado: cerrable herméticamente al finalizar la jornada.',
    destacados: [
      { icon: 'shield', title: 'Persiana enrollable', body: 'Cortina de acero de 3 mm: máxima seguridad al cerrar.' },
      { icon: 'kitchen', title: 'Ideal retail y pop-up', body: 'Abre de cara al público, cierra hermético de noche.' },
      { icon: 'bolt', title: 'Robusto y aislado', body: 'Lana de roca 50 mm + acero galvanizado.' },
      { icon: 'clock', title: 'Armado manual', body: 'Despliegue rápido, listo para operar.' },
    ],
    gallery: [`${P('navik')}/navik-1.jpg`, `${P('navik')}/navik-2.jpg`, `${P('navik')}/navik-3.jpg`, `${P('navik')}/navik-4.jpg`],
    ficha: `${P('navik')}/ficha.jpg`,
    paraQuien: ['Comercio minorista (retail)', 'Taquillas de eventos y módulos de información turística', 'Cafeterías de despacho rápido (drive-thru / pop-up)', 'Talleres de reparación', 'Caseta de seguridad y control de acceso'],
    dimensiones: [['Expandido', '5,950 × 3,000 × 2,800 mm'], ['Espesor de pared', '50 mm']],
    materiales: [['Color', 'Blanco'], ['Panel sándwich', 'Lana de roca 50 mm'], ['Chapa exterior', 'Acero galvanizado 0.3 mm'], ['Suelo', 'Tabla de cemento 18 mm + cuero 1.6 mm'], ['Cortina', 'Persiana enrollable de acero 3 mm']],
    electrico: [['Voltaje', '110 V – 127 V / 60 Hz'], ['Peso embalaje', '1,430 kg'], ['Volumen', '40.98 m³']],
    accent: 'gold',
  },
};

export const contactoProducto = {
  pago: '50% de enganche · 50% contra entrega',
  cripto: 'Aceptamos pesos y criptomonedas (XRP, USDT, BTC, ETH, TRX). + envío.',
};
