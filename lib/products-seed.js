// 24 Premium Incense & Fragrance products for SRIDATTAM
// Rebranded from fire-ritual themes to high-end fragrance lines

const IMG = {
  flames: 'https://images.unsplash.com/photo-1777732339789-5dc3483ed951',
  fire: 'https://images.unsplash.com/photo-1771929712193-fce37df50681',
  bowl: 'https://images.unsplash.com/photo-1777732340986-bc27a8b5d522',
  brass: 'https://images.unsplash.com/photo-1766399654235-a6793895422d',
  lamps: 'https://images.unsplash.com/photo-1760835249761-dc1ad2d7d759',
  spices: 'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32',
  spices2: 'https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg',
  incense: 'https://images.unsplash.com/photo-1617954095840-0427f79be4cf'
}

const img = (u) => `${u}?auto=format&fit=crop&w=900&q=80`

export const SEED_CATEGORIES = [
  { id: 'sandalwood', name: 'Mysore Sandalwood', slug: 'sandalwood' },
  { id: 'floral', name: 'Floral Notes', slug: 'floral' },
  { id: 'resins', name: 'Sacred Resins', slug: 'resins' },
  { id: 'samidha', name: 'Wood Samidha', slug: 'samidha' },
  { id: 'camphor', name: 'Pure Camphor', slug: 'camphor' },
  { id: 'combos', name: 'Luxury Bundles', slug: 'combos' }
]

export const SEED_PRODUCTS = [
  {
    id: 'sd-001', name: 'Royal Mysore Sandalwood', slug: 'royal-mysore-sandalwood',
    sanskrit: 'चन्दन धूप', categories: ['sandalwood'],
    price: 399, compareAt: 499, sku: 'SD-SAN-001',
    short_description: 'Pure aged sandalwood powder blended with natural honey and herbs for deep inner peace.',
    description: 'A premium hand-rolled incense crafted from pure Mysore sandalwood powder. Highly grounding, woody, and classic, this fragrance elevates any room into a tranquil sanctuary.',
    ritual_use: 'Used for meditation, grounding, and daily aromatic wellness.',
    ingredients: 'Aged Mysore Sandalwood, honey, wood gums, absolute resins.',
    images: [{ src: img(IMG.brass) }, { src: img(IMG.spices) }], stock_status: 'instock', featured: true, weight: '150g'
  },
  {
    id: 'sd-002', name: 'Divine Rose', slug: 'divine-rose-incense',
    sanskrit: 'गुलाब धूप', categories: ['floral'],
    price: 349, compareAt: 449, sku: 'SD-ROS-002',
    short_description: 'Hand-rolled sticks prepared with sun-dried organic rose petals and fine floral oils.',
    description: 'A sweet, romantic, and velvety rose scent. Formulated from premium dried damask rose petals, this incense stick is charcoal-free and delivers a clean, celebratory ambiance.',
    ritual_use: 'Ideal for creative focus, romantic evenings, and home ambiance.',
    ingredients: 'Damask rose petals, essential oil, honey, natural charcoal-free binder.',
    images: [{ src: img(IMG.spices2) }, { src: img(IMG.bowl) }], stock_status: 'instock', featured: true, weight: '150g'
  },
  {
    id: 'sd-003', name: 'Sacred Frankincense', slug: 'sacred-frankincense-incense',
    sanskrit: 'लोबान धूप', categories: ['resins'],
    price: 449, compareAt: 649, sku: 'SD-FRA-003',
    short_description: 'Pure organic frankincense and pine resin crystals for atmospheric purification.',
    description: 'Rich, dry, and slightly citrusy frankincense resin. Traditionally used to cleanse home energy, clear negativity, and sharpen mental focus.',
    ritual_use: 'Ideal for clearing negative space and improving deep focus.',
    ingredients: 'Oman Frankincense resin, pine gum, tree bark powders.',
    images: [{ src: img(IMG.flames) }, { src: img(IMG.fire) }], stock_status: 'instock', featured: true, weight: '150g'
  },
  {
    id: 'sd-004', name: 'The Maharaja Luxury Sticks', slug: 'maharaja-luxury-sticks',
    sanskrit: 'महाराजा धूप', categories: ['sandalwood', 'combos'],
    price: 549, compareAt: 749, sku: 'SD-MAH-004',
    short_description: 'Bold, regal, and premium fragrance sticks featuring gold-touched resins.',
    description: 'A majestic aromatic experience suited for grand entries and spaces. Combines rich sandalwood with amber, saffron, and hints of temple camphor.',
    ritual_use: 'Designed for a prestigious, welcoming atmosphere in large living areas.',
    ingredients: 'Saffron strands, amber oil, sandalwood, premium gums.',
    images: [{ src: img(IMG.lamps) }, { src: img(IMG.brass) }], stock_status: 'instock', featured: true, weight: '180g'
  },
  {
    id: 'sd-005', name: 'The Monk Meditation Cones', slug: 'monk-meditation-cones',
    sanskrit: 'भिक्षु धूप', categories: ['sandalwood'],
    price: 499, compareAt: 649, sku: 'SD-MNK-005',
    short_description: 'Stillness-promoting incense cones made from vetiver root and white chandan.',
    description: 'Slow-burning incense cones designed to create a sphere of silence. Infused with roots of vetiver (khus) and fine Mysore sandalwood.',
    ritual_use: 'Perfect for zazen, yoga, breathing exercises, and quiet reading.',
    ingredients: 'Khus grass, white sandalwood, tree resin.',
    images: [{ src: img(IMG.spices) }, { src: img(IMG.bowl) }], stock_status: 'instock', featured: true, weight: '120g'
  },
  {
    id: 'sd-006', name: 'The Poet Jasmine Cones', slug: 'poet-jasmine-cones',
    sanskrit: 'कवि धूप', categories: ['floral'],
    price: 699, compareAt: 899, sku: 'SD-POE-006',
    short_description: 'A romantic jasmine incense experience for artistic stimulation.',
    description: 'Capture the cooling fragrance of midnight blooming jasmine. Specially formulated to inspire creativity, relaxation, and emotional flow.',
    ritual_use: 'For evening relaxation, writing, and creative hobbies.',
    ingredients: 'Mogra jasmine extract, honey, sawdust, natural binders.',
    images: [{ src: img(IMG.fire) }, { src: img(IMG.flames) }], stock_status: 'instock', featured: false, weight: '120g'
  },
  {
    id: 'sd-007', name: 'The Sage Cedarwood Sticks', slug: 'sage-cedarwood-sticks',
    sanskrit: 'ऋषि धूप', categories: ['resins'],
    price: 799, compareAt: 999, sku: 'SD-SAG-007',
    short_description: 'Earthy, piney, and woody cedarwood sticks for mental clarity.',
    description: 'Crafted from Himalayan cedarwood chips and dry sage leaves. Earthy and fresh, it clears nasal pathways and balances space energy.',
    ritual_use: 'Perfect for morning reading, workspace purification, and focus.',
    ingredients: 'Cedarwood dust, mountain sage leaves, resin.',
    images: [{ src: img(IMG.spices2) }, { src: img(IMG.bowl) }], stock_status: 'instock', featured: false, weight: '150g'
  },
  {
    id: 'sd-008', name: 'Pure Guggulu Botanical Resins', slug: 'pure-guggulu-resins',
    sanskrit: 'गुग्गुल धूप', categories: ['resins'],
    price: 299, compareAt: 399, sku: 'SD-GUG-008',
    short_description: 'Earthy resin pieces sourced from Commiphora wightii trees. Clean and calming.',
    description: 'Traditional resin burnt on warm coals or electric burners. Delivers a rich balsamic fragrance that eliminates odors and cleanses air quality.',
    ritual_use: 'Air purification, spiritual grounding, and evening calming rituals.',
    ingredients: '100% natural raw Guggul resin.',
    images: [{ src: img(IMG.spices) }, { src: img(IMG.spices2) }], stock_status: 'instock', featured: true, weight: '200g'
  },
  {
    id: 'sd-009', name: 'Pure Sambrani Cups', slug: 'sambrani-cups',
    sanskrit: 'सम्ब्राणी धूप', categories: ['resins'],
    price: 649, compareAt: 849, sku: 'SD-SAM-009',
    short_description: 'Charcoal-free natural cups pre-filled with top-grade benzoin resin powder.',
    description: 'Light the rim of the natural herb cup and let it smolder. Fills the house with a thick, protective cloud of fragrant Sambrani smoke.',
    ritual_use: 'Home energy cleansing, post-bath hair drying ritual.',
    ingredients: 'Herb cup base, Loban (Benzoin) resin powder.',
    images: [{ src: img(IMG.brass) }, { src: img(IMG.lamps) }], stock_status: 'instock', featured: false, weight: '12 cups'
  },
  {
    id: 'sd-010', name: 'Pure Sandalwood Samidha Sticks', slug: 'sandalwood-samidha',
    sanskrit: 'चन्दन काष्ठ', categories: ['samidha'],
    price: 349, compareAt: 449, sku: 'SD-SMI-010',
    short_description: 'Aromatic wood samidha sticks soaked in organic ghee and honey.',
    description: 'Dried wood sticks cut into 4-inch pieces, pre-soaked in grass-fed ghee. Slow smoldering aromatic fuel for incense burners.',
    ritual_use: 'Aromatic fuel base, traditional fire pot rituals.',
    ingredients: 'Sandalwood logs, organic ghee, honey.',
    images: [{ src: img(IMG.fire) }, { src: img(IMG.flames) }], stock_status: 'instock', featured: true, weight: '250g'
  },
  {
    id: 'sd-011', name: 'Organic Vetiver Sticks', slug: 'organic-vetiver-sticks',
    sanskrit: 'उशीर धूप', categories: ['floral'],
    price: 399, compareAt: 499, sku: 'SD-VET-011',
    short_description: 'Cooling vetiver roots blended with sweet resin to soothe nerves.',
    description: 'Hand-collected vetiver grass roots dried and blended. Gives off an earthy, sweet scent that helps alleviate daily stress.',
    ritual_use: 'Evening stress relief, sleep prep, calming room aroma.',
    ingredients: 'Vetiver root powder, honey, natural tree binder.',
    images: [{ src: img(IMG.fire) }], stock_status: 'instock', featured: false, weight: '150g'
  },
  {
    id: 'sd-012', name: 'Pure Sandalwood Incense Powder', slug: 'sandalwood-powder',
    sanskrit: 'चन्दन चूर्ण', categories: ['sandalwood'],
    price: 899, compareAt: 1199, sku: 'SD-SND-012',
    short_description: 'Finest Mysore sandalwood powder for burning or creating paste.',
    description: 'Fine triple-sieved sandalwood powder. Sprinkle over incense sticks or warm coals for an immediate release of pure, authentic chandan fragrance.',
    ritual_use: 'Incense boost, forehead paste, aromatic wellness.',
    ingredients: '100% fine Mysore Sandalwood.',
    images: [{ src: img(IMG.brass) }, { src: img(IMG.spices) }], stock_status: 'instock', featured: true, weight: '80g'
  },
  {
    id: 'sd-013', name: 'Pure Bhimseni Camphor Crystals', slug: 'bhimseni-camphor',
    sanskrit: 'कपूर', categories: ['camphor'],
    price: 599, compareAt: 799, sku: 'SD-CAM-013',
    short_description: 'Authentic Bhimseni camphor crystals. Natural and residue-free.',
    description: 'Natural crystalline camphor crystals. Burns completely clean, leaving no black carbon residue, releasing a crisp, fresh, clearing scent.',
    ritual_use: 'Evening aarti, diffusers, clean room freshening.',
    ingredients: '100% pure Bhimseni Camphor.',
    images: [{ src: img(IMG.lamps) }], stock_status: 'instock', featured: false, weight: '100g'
  },
  {
    id: 'sd-014', name: 'Premium Incense Bundle & Holder', slug: 'incense-bundle-holder',
    sanskrit: 'धूप सामग्री', categories: ['combos'],
    price: 449, compareAt: 599, sku: 'SD-BDL-014',
    short_description: 'Hand-rolled sticks, sambrani cones, and a brass holder.',
    description: 'A curated selection of our finest fragrances: Sandalwood, Rose, and Sage, packed together with a hand-cast brass incense holder.',
    ritual_use: 'Perfect housewarming gift or comprehensive starter kit.',
    ingredients: 'Incense assortment, brass burner plate.',
    images: [{ src: img(IMG.incense) }, { src: img(IMG.spices) }], stock_status: 'instock', featured: true, weight: '300g'
  }
]
