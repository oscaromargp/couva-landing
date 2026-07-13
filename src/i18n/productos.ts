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

export interface Extras {
  comparativa?: { title: string; sub: string; cols: [string, string, string]; rows: [string, string, string][] };
  honestidad: string;
  faq: { q: string; a: string }[];
  testimonios: { quote: string; name: string; role: string }[];
}

export const productoExtras: Record<string, Extras> = {
  nomad: {
    comparativa: {
      title: 'NOMAD vs. contenedor de obra adaptado',
      sub: 'El costo real de adaptar un contenedor casi siempre supera al de un módulo hecho para eso.',
      cols: ['', 'NOMAD 3×6', 'Contenedor adaptado'],
      rows: [
        ['Precio', '$129,000 (cerrado)', 'Contenedor + adaptación + aislamiento: sube rápido'],
        ['Aislamiento', 'Lana de roca 50 mm de fábrica', 'Hay que forrarlo (costo extra) o se calienta'],
        ['Tiempo', 'Semanas', 'Semanas/meses de adaptación'],
        ['Movilidad', 'Plegable y ligero (1,100 kg)', 'Pesado y fijo'],
      ],
    },
    honestidad: 'Seamos claros: no es lo más barato del mercado, pero es lo más rápido, funcional y fácil de mover. Pagas por algo listo para usar, no por una caja que hay que adaptar.',
    faq: [
      { q: '¿No me sale más barato un contenedor?', a: 'En papel a veces sí, pero un contenedor hay que aislarlo y adaptarlo — ahí se dispara el costo. El NOMAD ya viene aislado y listo, con precio cerrado.' },
      { q: '¿Aguanta el clima de la costa?', a: 'Sí: chapa de acero galvanizado y lana de roca de 50 mm para el calor y la humedad. Te entregamos las especificaciones por escrito.' },
      { q: '¿Lo puedo mover después?', a: 'Sí, es plegable y ligero (1,100 kg). Ideal para obra: lo instalas, y cuando termina el proyecto lo llevas a la siguiente.' },
      { q: '¿En cuánto lo tengo?', a: 'En semanas. Te confirmamos el plazo exacto en la cotización según tu destino.' },
      { q: '¿Trae cocina o baño?', a: 'Este modelo es sin cocina (módulo funcional). Si necesitas baño/cocina, te recomendamos MACAO o COUVA.' },
    ],
    testimonios: [
      { quote: 'Lo usé como oficina de obra y bodega. No es lo más barato, pero llegó rápido y lo muevo a mi siguiente proyecto. Cumplió.', name: 'Cliente constructor', role: 'Oaxaca · (ejemplo — reemplazar por testimonio real)' },
    ],
  },
  navik: {
    comparativa: {
      title: 'NAVIK vs. contenedor forrado',
      sub: 'En la costa están cobrando hasta $300,000 por forrar un contenedor. Compara.',
      cols: ['', 'NAVIK 3×6', 'Contenedor forrado'],
      rows: [
        ['Precio', '$150,000 (cerrado)', 'Hasta $300,000'],
        ['Tiempo de montaje', 'Semanas', '~30 días de adaptación'],
        ['Qué es', 'Módulo hecho para comercio, con persiana de acero', 'Caja de barco adaptada'],
        ['Aislamiento', 'Lana de roca de fábrica', 'Se calienta si no se forra a fondo'],
      ],
    },
    honestidad: 'La verdad sin adornos: por la mitad de lo que cuesta forrar un contenedor, tienes un módulo diseñado para vender — con persiana de seguridad y aislado de fábrica. Rápido y funcional.',
    faq: [
      { q: '¿Por qué conviene sobre un contenedor forrado?', a: 'Un contenedor forrado en la zona llega a $300,000 y 30 días. El NAVIK cuesta $150,000, está hecho para comercio (persiana de acero) y llega en semanas.' },
      { q: '¿Sirve para café, tienda o taller?', a: 'Sí. La persiana enrollable abre de cara al público y cierra hermético de noche. Ideal para retail, pop-up, taller o caseta de seguridad.' },
      { q: '¿Es seguro?', a: 'La cortina es de acero de 3 mm sobre un dintel a prueba de robo. Cierra completamente al terminar la jornada.' },
      { q: '¿Aguanta el clima de playa?', a: 'Sí: acero galvanizado y lana de roca de 50 mm. Especificaciones por escrito.' },
      { q: '¿Cuánto tarda?', a: 'Semanas, no los ~30 días de adaptar un contenedor. Plazo exacto en tu cotización.' },
    ],
    testimonios: [
      { quote: 'Iba a forrar un contenedor y me salía carísimo. Con el NAVIK puse mi local por la mitad y en menos tiempo. No es regalado, pero es lo más rentable.', name: 'Cliente comercio', role: 'Costa de Oaxaca · (ejemplo — reemplazar por testimonio real)' },
    ],
  },
  macao: {
    comparativa: {
      title: 'MACAO vs. remodelar un local',
      sub: 'Abrir sin obra: menos tiempo, menos sorpresas.',
      cols: ['', 'MACAO 6×3', 'Local remodelado'],
      rows: [
        ['Precio', '$265,000 (cerrado)', 'Renta + remodelación + tiempo'],
        ['Tiempo', 'Semanas, listo para operar', 'Meses de obra'],
        ['Acabados', 'Premium de fábrica', 'Dependen del contratista'],
        ['Movilidad', 'Se puede reubicar', 'Fijo al inmueble'],
      ],
    },
    honestidad: 'No es la opción más económica, pero es la más rápida y con mejor imagen: llega con acabados premium y listo para operar. Ideal cuando el tiempo y la presentación importan.',
    faq: [
      { q: '¿Ya viene listo para operar?', a: 'Sí: cocineta, clóset y baño opcional, con acabados premium (metal tallado, aluminio puente roto). Solo conexiones finales en sitio.' },
      { q: '¿Para qué negocios sirve?', a: 'Suite de Airbnb/hotel boutique, café con barra, showroom, oficina o estudio de lujo.' },
      { q: '¿Lo puedo mover?', a: 'Sí, es modular; se puede reubicar si cambias de terreno o proyecto.' },
      { q: '¿Cuánto tarda?', a: 'Semanas. Te confirmamos el plazo exacto en la cotización.' },
    ],
    testimonios: [
      { quote: 'Lo puse como café y la imagen quedó de otro nivel, sin meses de obra. No es lo más barato, pero abrí rapidísimo.', name: 'Cliente hospedaje/comercio', role: 'Puerto Escondido · (ejemplo — reemplazar por testimonio real)' },
    ],
  },
  couva: {
    honestidad: 'No es la casa más barata por metro, pero es la de mejor retorno: llega en semanas, con precio cerrado, y tu terreno empieza a generar antes. Rápida, funcional y lista para rentar.',
    faq: [
      { q: '¿Es más barata que construir?', a: 'El precio por metro es similar a una construcción media, pero sin los sobrecostos ni los 6–12 meses de obra. La ventaja es el tiempo y la certeza de precio.' },
      { q: '¿Se expande de verdad?', a: 'Sí: viaja a 2.20 m y se despliega a 6.30 m en sitio, triplicando su superficie.' },
      { q: '¿Sirve para Airbnb?', a: '2 recámaras, baño y salón con acabados premium — lista para rentar en cuanto se instala.' },
      { q: '¿Aguanta el clima costero?', a: 'Panel EPS de 75 mm y chapa con protección para ambiente marino. Especificaciones por escrito.' },
    ],
    testimonios: [
      { quote: 'La renté en Airbnb casi de inmediato. No fue la más barata, pero empezó a generarme rápido. Valió la pena.', name: 'Cliente inversionista', role: 'La Paz / La Ventana, BCS · (ejemplo — reemplazar por real)' },
    ],
  },
};
