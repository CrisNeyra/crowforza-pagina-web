// ===== CROWFORZA - Base de Datos de Productos =====

const products = [
    // MARTILLOS
    {
        id: 1,
        name: "Martillo de Carpintero Stanley Pro",
        category: "martillos",
        price: 31490,
        oldPrice: 41990,
        image: "https://images.prom.ua/994905623_w640_h640_molotok-plotnika-stanley.jpg",
        rating: 4.8,
        reviews: 156,
        badge: "sale",
        description: "Martillo de carpintero profesional con mango ergonómico de fibra de vidrio y cabeza de acero forjado. Peso: 450g.",
        inStock: true,
        featured: true
    },
    {
        id: 2,
        name: "Martillo Demoledor Cat DX29 14,9kg 50J 1750W",
        category: "martillos",
        price: 36200,
        oldPrice: null,
        image: "https://cdn11.bigcommerce.com/s-ftsflnse4o/images/stencil/608x608/products/1395109/5613275/D_834030-MLA47696457044_092021-O__68693.1732688090.jpg?c=1",
        rating: 4.6,
        reviews: 89,
        badge: "new",
        description: "Maza De Acero 1.5kg Cabo Fibra Certificadas",
        inStock: true,
        featured: false
    },
    {
        id: 3,
        name: "Maza de Goma Profesional",
        category: "martillos",
        price: 19900,
        oldPrice: null,
        image: "https://hamilton.com.ar/wp-content/uploads/2023/07/MAG670.jpg",
        rating: 4.5,
        reviews: 67,
        badge: null,
        description: "Maza de goma negra para trabajos delicados. No daña superficies.",
        inStock: true,
        featured: false
    },

    // DESTORNILLADORES
    {
        id: 4,
        name: "Set Destornilladores Precision 12 pzas",
        category: "destornilladores",
        price: 26200,
        oldPrice: 34600,
        image: "https://http2.mlstatic.com/D_NQ_NP_851141-CBT53775677886_022023-O.webp",
        rating: 4.7,
        reviews: 312,
        badge: "sale",
        description: "Set completo de destornilladores de precisión para electrónica. Incluye puntas intercambiables.",
        inStock: true,
        featured: true
    },
    {
        id: 5,
        name: "Juego de 119 pcs destornilladores profesionales magnéticos con soporte organizador.",
        category: "destornilladores",
        price: 94500,
        oldPrice: null,
        image: "https://m.media-amazon.com/images/I/71rM-D2L5aL._AC_SL1500_.jpg",
        rating: 4.9,
        reviews: 445,
        badge: "hot",
        description: "KIT COMPLETO: Juego de destornilladores de 119 piezas. Incluye 6 tipos de puntas de destornillador, 50 piezas de puntas intercambiables y 10 piezas de llaves de vaso para trabajos de fijación diaria o tareas precisas como reparación de relojes, electrónica, ordenadores, reparación de joyas, mantenimiento de contadores, reparación de muebles, etc. Adecuado para el hogar, al aire libre, fábrica, instalación comercial y mantenimiento, etc.",
        inStock: true,
        featured: true
    },

    {
        id: 6,
        name: "Set Destornilladores Phillips 6 pzas",
        category: "destornilladores",
        price: 20990,
        oldPrice: 26200,
        image: "https://ferreteriavidri.com/images/items/large/85876.jpg",
        rating: 4.6,
        reviews: 156,
        badge: "new",
        description: "Juego de destornilladores Phillips en varios tamaños. Puntas templadas.",
        inStock: true,
        featured: false
    },

    // LLAVES
    {
        id: 7,
        name: "Juego De Llaves Combinadas 6 A 19 Mm 12 Piezas",
        category: "llaves",
        price: 62990,
        oldPrice: 83990,
        image: "https://i.ebayimg.com/images/g/ancAAeSwSWZn61wc/s-l1200.webp",
        rating: 4.8,
        reviews: 289,
        badge: "sale",
        description: "Composición Set: 6; 7; 8; 9; 10; 11; 12; 13; 14; 17; 19; 22 mm",
        inStock: true,
        featured: true
    },
    {
        id: 8,
        name: "Llave Inglesa Ajustable 10\"",
        category: "llaves",
        price: 23600,
        oldPrice: null,
        image: "https://th.bing.com/th/id/R.da55af6ceb519b74494065c77f754617?rik=bJFb4C3cMZcY9g&pid=ImgRaw&r=0",
        rating: 4.7,
        reviews: 198,
        badge: "hot",
        description: "Llave inglesa ajustable de 10 pulgadas. Apertura máxima 30mm.",
        inStock: true,
        featured: true
    },
    {
        id: 9,
        name: "Set Llaves Allen Hexagonales",
        category: "llaves",
        price: 16800,
        oldPrice: null,
        image: "https://m.media-amazon.com/images/I/715kTSCM-yL._AC_SL1500_.jpg",
        rating: 4.5,
        reviews: 134,
        badge: null,
        description: "Juego de llaves Allen de 1.5 a 10mm con soporte plegable.",
        inStock: true,
        featured: false
    },
   
    // ALICATES
    {
        id: 10,
        name: "Alicates Tope de gama",
        category: "alicates",
        price: 45100,
        oldPrice: null,
        image: "https://img.lojadomecanico.com.br/IMAGENS/2/468/388185/1666965529306.JPG",
        rating: 4.9,
        reviews: 367,
        badge: "hot",
        description: "Alicates universales alemanes de alta calidad. Corte lateral integrado.",
        inStock: true,
        featured: true
    },
    {
        id: 11,
        name: "Alicates de Corte Diagonal",
        category: "alicates",
        price: 19900,
        oldPrice: 25200,
        image: "https://biassoni.com.ar/wp-content/uploads/2022/01/Alicate992811.jpg",
        rating: 4.6,
        reviews: 145,
        badge: "sale",
        description: "Alicates de corte diagonal para cables y alambres. Filos inductivos.",
        inStock: true,
        featured: false
    },
    {
        id: 12,
        name: "Alicates de Punta Larga",
        category: "alicates",
        price: 17300,
        oldPrice: null,
        image: "https://m.media-amazon.com/images/I/51Ogl0+2yEL._AC_SL500_.jpg",
        rating: 4.5,
        reviews: 98,
        badge: null,
        description: "Alicates de punta de cadena multiusos, los alicates de punta de franja son excelentes alicates de uso general para doblar láminas de metal y alambre y sus mandíbulas cónicas estrechas a un punto fino",
        inStock: true,
        featured: false
    },


    // MEDICIÓN
    {
        id: 13,
        name: "Cinta Métrica 5m",
        category: "medicion",
        price: 13600,
        oldPrice: null,
        image: "https://cdn.homedepot.com.mx/productos/130069/130069-z.jpg",
        rating: 4.7,
        reviews: 423,
        badge: "hot",
        description: "Cinta métrica de 5 metros con carcasa resistente a golpes.",
        inStock: true,
        featured: true
    },
    {
        id: 14,
        name: "Nivel de Burbuja 60cm",
        category: "medicion",
        price: 30400,
        oldPrice: 37800,
        image: "https://proimeq.cl/wp-content/uploads/2020/08/Nivel-60cm-sodimac-scaled.jpg",
        rating: 4.6,
        reviews: 178,
        badge: "sale",
        description: "Perfil de fundición de aluminio inyectada resistente y manejable con una forma estrecha y trapezoidal. Imanes de ferrita potentes para fijar el nivel de burbuja en elementos de construcción metálicos: manos libres al alinear y ajustar postes y vigas.",
        inStock: true,
        featured: false
    },
    {
        id: 15,
        name: "Calibre Digital de Precisión",
        category: "medicion",
        price: 47250,
        oldPrice: null,
        image: "https://media.adeo.com/mkp/058dc38697bbc1cf6cf99d69e0ee8783/media.png",
        rating: 4.8,
        reviews: 267,
        badge: "new",
        description: "Los calibradores digitales pueden medir fácilmente el diámetro exterior, el diámetro interior, el paso, la profundidad, etc. La función de cero puede recalibrar el calibrador en cualquier momento para una mayor precisión. La función de conversión milímetro / pulgada se puede adaptar a los hábitos de los diferentes usuarios.",
        inStock: true,
        featured: true
    },
    // SIERRAS,

    {
        id: 16,
        name: "Sierra de Mano Universal",
        category: "sierras",
        price: 26200,
        oldPrice: 31500,
        image: "https://media.adeo.com/mkp/582b8d465e8233c3c90533d98c949c0c/media.jpeg?width=3000&height=3000&format=jpg&quality=80&fit=bounds",
        rating: 4.6,
        reviews: 156,
        badge: "sale",
        description: "Juego de sierra de mano de 13 piezas con hojas de sierra y accesorios (para más información, consulte la siguiente descripción). Todo se guarda en un estuche rígido, compacto y ligero, ideal para proyectos de bricolaje, actividades al aire libre o uso doméstico con diferentes tipos de materiales. Adecuado para cortar madera, plástico, metal, cerámica, azulejos, etc.",    
        inStock: true,
        featured: false
    },
    {
        id: 17,
        name: "Serrucho Profesional 22\"",
        category: "sierras",
        price: 34100,
        oldPrice: null,
        image: "https://cdn.homedepot.com.mx/productos/884260/884260-za4.jpg",
        rating: 4.7,
        reviews: 134,
        badge: "hot",
        description: "Serrucho de 22 pulgadas dorado Truper, es apto para cortar madera y PVC en trabajos de construcción y carpintería; cuenta con 7 dientes por pulgada. Su hoja está hecha de acero al alto carbono templado y mango de madera con sujeción de 3 puntos.",
        inStock: true,
        featured: true
    },
    {
        id: 18,
        name: "Sierra Caladora Inalámbrica",
        category: "sierras",
        price: 19900,
        oldPrice: null,
        image: "https://urreastore.com.mx/7796-large_default/skb920-sierra-caladora-inalambrica-urrea.jpg",
        rating: 4.4,
        reviews: 67,
        badge: null,
        description: "Sierra de calar para cortes curvos. Marco de acero reforzado.",
        inStock: true,
        featured: false
    },
    
];

// Categorías disponibles
const categories = [
    { id: "martillos", name: "Martillos", icon: "fa-hammer", count: 45 },
    { id: "destornilladores", name: "Destornilladores", icon: "fa-screwdriver", count: 78 },
    { id: "llaves", name: "Llaves", icon: "fa-wrench", count: 92 },
    { id: "alicates", name: "Alicates", icon: "fa-pliers", count: 56 },
    { id: "medicion", name: "Medición", icon: "fa-ruler-combined", count: 34 },
    { id: "sierras", name: "Sierras", icon: "fa-saw", count: 28 }
];

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { products, categories };
}
