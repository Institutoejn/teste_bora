import React from 'react';
import logoNatura from '../assets/logo-natura.png';
import logoAvon from '../assets/logo-avon.png';
import logoOboticario from '../assets/logo-oboticario.png';
import logoEudora from '../assets/logo-eudora.png';
import logoMarykay from '../assets/logo-marykay.png';
import logoJequeti from '../assets/logo-jequeti.png';

export interface PredefinedBrand {
  name: string;
  defaultCommission: number;
  color: string;
  logoUrl: string;
  description?: string;
  /**
   * Fator de ajuste visual para garantir que o logo preencha o container quadrado
   * eficientemente, compensando margens internas excessivas no asset original.
   */
  visualScale?: number;
}

/**
 * Catálogo Canônico de Marcas de Revenda BORA.
 * Mapeia cada marca pré-cadastrada oficial ao seu respectivo asset real de imagem em assets/.
 */
export const PREDEFINED_BRANDS: PredefinedBrand[] = [
  {
    name: 'Natura',
    defaultCommission: 0.30,
    color: '#E85324',
    logoUrl: logoNatura,
    visualScale: 1.10,
    description: 'Cosméticos, perfumaria e cuidados diários',
  },
  {
    name: 'Avon',
    defaultCommission: 0.30,
    color: '#7F1874',
    logoUrl: logoAvon,
    visualScale: 1.75,
    description: 'Maquiagem, perfumaria e cuidados pessoais',
  },
  {
    name: 'O Boticário',
    defaultCommission: 0.20,
    color: '#004F3B',
    logoUrl: logoOboticario,
    visualScale: 1.05,
    description: 'Perfumaria fina, maquiagem e cuidados',
  },
  {
    name: 'Eudora',
    defaultCommission: 0.30,
    color: '#53284F',
    logoUrl: logoEudora,
    visualScale: 1.06,
    description: 'Perfumaria marcante e cosméticos premium',
  },
  {
    name: 'Mary Kay',
    defaultCommission: 0.35,
    color: '#D84B78',
    logoUrl: logoMarykay,
    visualScale: 1.05,
    description: 'Cuidados com a pele e maquiagem de alta precisão',
  },
  {
    name: 'Jequiti',
    defaultCommission: 0.30,
    color: '#0072BC',
    logoUrl: logoJequeti,
    visualScale: 1.0,
    description: 'Perfumaria de estrelas e cosméticos acessíveis',
  },
];

/**
 * Normaliza strings para comparação flexível (remove acentos, caixa alta/baixa, espaços extras).
 */
export function normalizeBrandName(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^o\s+/, ''); // 'o boticario' -> 'boticario'
}

/**
 * Busca a marca no catálogo pré-definido pelo nome cadastrado.
 */
export function findPredefinedBrand(name?: string | null): PredefinedBrand | undefined {
  if (!name) return undefined;
  const cleanInput = normalizeBrandName(name);

  return PREDEFINED_BRANDS.find(b => {
    const cleanCatalog = normalizeBrandName(b.name);
    return cleanCatalog === cleanInput || cleanCatalog.includes(cleanInput) || cleanInput.includes(cleanCatalog);
  });
}

/**
 * Renderiza o logotipo REAL da marca a partir do asset existente no projeto,
 * aplicando calibração de escala para máximo preenchimento visual no container quadrado.
 */
export const BrandLogoIcon: React.FC<{
  name?: string;
  className?: string;
  fallbackClassName?: string;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ 
  name, 
  className = 'w-full h-full object-contain', 
  fallbackClassName,
  scale,
  style: propStyle,
}) => {
  if (!name) {
    return <span className={fallbackClassName}>?</span>;
  }

  const predefined = findPredefinedBrand(name);
  if (predefined?.logoUrl) {
    const effectiveScale = scale ?? predefined.visualScale ?? 1.0;
    const computedStyle: React.CSSProperties = {
      maxWidth: '100%',
      maxHeight: '100%',
      ...(effectiveScale !== 1.0
        ? {
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'center center',
          }
        : {}),
      ...propStyle,
    };

    return (
      <img
        src={predefined.logoUrl}
        alt={predefined.name}
        className={className}
        style={computedStyle}
        loading="eager"
      />
    );
  }

  return <span className={fallbackClassName}>{name.charAt(0).toUpperCase()}</span>;
};
