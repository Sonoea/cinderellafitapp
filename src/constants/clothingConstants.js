import { HoodieSVG, OverallSVG, DressSVG, RaincoatSVG, CapeSVG, TshirtSVG } from '../components/ClothingOverlays';

// Map of clothing components
export const CLOTHING_OVERLAYS = {
    hoodie: { component: HoodieSVG, name: 'フード付きパーカー', defaultColor: '#E53935' },
    overall: { component: OverallSVG, name: 'オーバーオール', defaultColor: '#1976D2' },
    dress: { component: DressSVG, name: 'ワンピース', defaultColor: '#EC407A' },
    raincoat: { component: RaincoatSVG, name: 'レインコート', defaultColor: '#FDD835' },
    cape: { component: CapeSVG, name: 'ケープ', defaultColor: '#7B1FA2' },
    tshirt: { component: TshirtSVG, name: 'Tシャツ', defaultColor: '#4CAF50' },
};

export default CLOTHING_OVERLAYS; 
