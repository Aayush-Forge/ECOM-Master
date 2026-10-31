export interface ProductItem {
  id: string;
  name: string;
  title?: string;
  slug: string;
  price: number | string;
  regular_price?: number | string;
  compareAt?: number | string;
  sale_price?: number | string;
  categories: string[] | { id: string; name: string; slug: string }[];
  description: string;
  short_description?: string;
  ritual_use?: string;
  ingredients?: string;
  images: { src: string; alt?: string }[];
  stock_status?: string;
  featured?: boolean;
  weight?: string;
  rating?: number;
  average_rating?: string;
  rating_count?: number;
}

export const BACKEND_PRODUCTS_SEED: ProductItem[] = [
  {
    id: 'sd-001',
    name: 'Royal Mysore Sandalwood',
    slug: 'royal-mysore-sandalwood',
    categories: ['sandalwood', 'incense-sticks'],
    price: 399,
    regular_price: 499,
    compareAt: 499,
    short_description: 'Pure aged sandalwood powder blended with natural honey and herbs for deep inner peace.',
    description: 'A premium hand-rolled incense crafted from pure Mysore sandalwood powder. Highly grounding, woody, and classic, this fragrance elevates any room into a tranquil sanctuary.',
    ritual_use: 'Used for meditation, grounding, and daily aromatic wellness.',
    ingredients: 'Aged Mysore Sandalwood, honey, wood gums, absolute resins.',
    images: [
      { src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.25',
    average_rating: '4.95',
    rating_count: 24,
  },
  {
    id: 'sd-002',
    name: 'Divine Rose Incense Sticks',
    slug: 'divine-rose-incense',
    categories: ['floral', 'incense-sticks'],
    price: 349,
    regular_price: 449,
    compareAt: 449,
    short_description: 'Hand-rolled sticks prepared with sun-dried organic rose petals and fine floral oils.',
    description: 'A sweet, romantic, and velvety rose scent. Formulated from premium dried damask rose petals, this incense stick is charcoal-free and delivers a clean, celebratory ambiance.',
    ritual_use: 'Ideal for creative focus, romantic evenings, and home ambiance.',
    ingredients: 'Damask rose petals, essential oil, honey, natural charcoal-free binder.',
    images: [
      { src: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.25',
    average_rating: '4.88',
    rating_count: 19,
  },
  {
    id: 'sd-003',
    name: 'Sacred Frankincense Incense',
    slug: 'sacred-frankincense-incense',
    categories: ['resins', 'incense-sticks'],
    price: 449,
    regular_price: 649,
    compareAt: 649,
    short_description: 'Pure organic frankincense and pine resin crystals for atmospheric purification.',
    description: 'Rich, dry, and slightly citrusy frankincense resin. Traditionally used to cleanse home energy, clear negativity, and sharpen mental focus.',
    ritual_use: 'Ideal for clearing negative space and improving deep focus.',
    ingredients: 'Oman Frankincense resin, pine gum, tree bark powders.',
    images: [
      { src: 'https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.25',
    average_rating: '4.92',
    rating_count: 31,
  },
  {
    id: 'sd-004',
    name: 'The Maharaja Luxury Sticks',
    slug: 'maharaja-luxury-sticks',
    categories: ['sandalwood', 'combos'],
    price: 549,
    regular_price: 749,
    compareAt: 749,
    short_description: 'Bold, regal, and premium fragrance sticks featuring gold-touched resins.',
    description: 'A majestic aromatic experience suited for grand entries and spaces. Combines rich sandalwood with amber, saffron, and hints of temple camphor.',
    ritual_use: 'Designed for a prestigious, welcoming atmosphere in large living areas.',
    ingredients: 'Saffron strands, amber oil, sandalwood, premium gums.',
    images: [
      { src: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.30',
    average_rating: '5.00',
    rating_count: 42,
  },
  {
    id: 'sd-005',
    name: 'The Monk Meditation Cones',
    slug: 'monk-meditation-cones',
    categories: ['sandalwood', 'bamboo-free-dhoop-sticks'],
    price: 499,
    regular_price: 649,
    compareAt: 649,
    short_description: 'Stillness-promoting incense cones made from vetiver root and white chandan.',
    description: 'Slow-burning incense cones designed to create a sphere of silence. Infused with roots of vetiver (khus) and fine Mysore sandalwood.',
    ritual_use: 'Perfect for zazen, yoga, breathing exercises, and quiet reading.',
    ingredients: 'Khus grass, white sandalwood, tree resin.',
    images: [
      { src: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.20',
    average_rating: '4.85',
    rating_count: 15,
  },
  {
    id: 'sd-006',
    name: 'The Poet Jasmine Cones',
    slug: 'poet-jasmine-cones',
    categories: ['floral'],
    price: 699,
    regular_price: 899,
    compareAt: 899,
    short_description: 'A romantic jasmine incense experience for artistic stimulation.',
    description: 'Capture the cooling fragrance of midnight blooming jasmine. Specially formulated to inspire creativity, relaxation, and emotional flow.',
    ritual_use: 'For evening relaxation, writing, and creative hobbies.',
    ingredients: 'Mogra jasmine extract, honey, sawdust, natural binders.',
    images: [
      { src: 'https://images.unsplash.com/photo-1771929712193-fce37df50681?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1777732339789-5dc3483ed951?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: false,
    weight: '0.20',
    average_rating: '4.78',
    rating_count: 12,
  },
  {
    id: 'sd-007',
    name: 'The Sage Cedarwood Sticks',
    slug: 'sage-cedarwood-sticks',
    categories: ['resins'],
    price: 799,
    regular_price: 999,
    compareAt: 999,
    short_description: 'Earthy, piney, and woody cedarwood sticks for mental clarity.',
    description: 'Crafted from Himalayan cedarwood chips and dry sage leaves. Earthy and fresh, it clears nasal pathways and balances space energy.',
    ritual_use: 'Perfect for morning reading, workspace purification, and focus.',
    ingredients: 'Cedarwood dust, mountain sage leaves, resin.',
    images: [
      { src: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: false,
    weight: '0.25',
    average_rating: '4.90',
    rating_count: 8,
  },
  {
    id: 'sd-008',
    name: 'Pure Guggulu Botanical Resins',
    slug: 'pure-guggulu-resins',
    categories: ['resins', 'sambrani-kits-2'],
    price: 299,
    regular_price: 399,
    compareAt: 399,
    short_description: 'Raw Indian guggul resin tears for authentic temple fumigation and cleansing.',
    description: 'Fresh aromatic tears of wild Commiphora mukul (Guggulu). When burned over charcoal, it emits a balsamic, warm herbal fragrance that repels negativity.',
    ritual_use: 'Used for twilight fumigation, insect deterrence, and ancient Vedic havan ceremonies.',
    ingredients: '100% pure wild-harvested Indian guggul resin tears.',
    images: [
      { src: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?auto=format&fit=crop&w=800&q=80' },
      { src: 'https://images.unsplash.com/photo-1766399654235-a6793895422d?auto=format&fit=crop&w=800&q=80' },
    ],
    stock_status: 'instock',
    featured: true,
    weight: '0.25',
    average_rating: '4.91',
    rating_count: 27,
  },
];
