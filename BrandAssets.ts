/**
 * BORA Brand Assets Catalog
 * Centralização semântica das 18 variações oficiais da marca BORA.
 */

// Importações diretas dos assets para otimização do bundler Vite
import simboloColoridoTransparente from './assets/01_simbolo_colorido_transparente_4096.png';
import simboloColoridoFundoMarfim from './assets/02_simbolo_colorido_fundo_marfim_4096.png';
import simboloColoridoFundoVinho from './assets/03_simbolo_colorido_fundo_vinho_4096.png';
import simboloMonocromaticoVinho from './assets/04_simbolo_monocromatico_vinho_4096.png';
import simboloMonocromaticoMarfim from './assets/05_simbolo_monocromatico_marfim_4096.png';

import logoHorizontalColoridoTransparente from './assets/06_logo_horizontal_colorido_transparente_4096x1400.png';
import logoHorizontalColoridoFundoMarfim from './assets/07_logo_horizontal_colorido_fundo_marfim_4096x1400.png';
import logoHorizontalInvertidoFundoVinho from './assets/08_logo_horizontal_invertido_fundo_vinho_4096x1400.png';
import logoHorizontalMonocromaticoVinho from './assets/09_logo_horizontal_monocromatico_vinho_4096x1400.png';
import logoHorizontalMonocromaticoMarfim from './assets/10_logo_horizontal_monocromatico_marfim_4096x1400.png';

import assinaturaHorizontalColoridaTransparente from './assets/11_assinatura_horizontal_colorida_transparente_4096x1800.png';
import assinaturaHorizontalColoridaFundoMarfim from './assets/12_assinatura_horizontal_colorida_fundo_marfim_4096x1800.png';
import assinaturaHorizontalInvertidaFundoVinho from './assets/13_assinatura_horizontal_invertida_fundo_vinho_4096x1800.png';

import assinaturaVerticalColoridaTransparente from './assets/14_assinatura_vertical_colorida_transparente_4096.png';
import assinaturaVerticalColoridaFundoMarfim from './assets/15_assinatura_vertical_colorida_fundo_marfim_4096.png';
import assinaturaVerticalInvertidaFundoVinho from './assets/16_assinatura_vertical_invertida_fundo_vinho_4096.png';

import iconeAppFundoVinho from './assets/17_icone_app_fundo_vinho_4096.png';
import iconeAppFundoMarfim from './assets/18_icone_app_fundo_marfim_4096.png';

export const BrandAssets = {
  // 1. Símbolos
  symbols: {
    color: {
      transparent: simboloColoridoTransparente,
      ivory: simboloColoridoFundoMarfim,
      wine: simboloColoridoFundoVinho,
    },
    monochrome: {
      wine: simboloMonocromaticoVinho,
      ivory: simboloMonocromaticoMarfim,
    },
  },

  // 2. Logos Horizontais
  horizontalLogos: {
    color: {
      transparent: logoHorizontalColoridoTransparente,
      ivory: logoHorizontalColoridoFundoMarfim,
    },
    inverted: {
      wine: logoHorizontalInvertidoFundoVinho,
    },
    monochrome: {
      wine: logoHorizontalMonocromaticoVinho,
      ivory: logoHorizontalMonocromaticoMarfim,
    },
  },

  // 3. Assinaturas Horizontais (com slogan)
  horizontalSignatures: {
    color: {
      transparent: assinaturaHorizontalColoridaTransparente,
      ivory: assinaturaHorizontalColoridaFundoMarfim,
    },
    inverted: {
      wine: assinaturaHorizontalInvertidaFundoVinho,
    },
  },

  // 4. Assinaturas Verticais
  verticalSignatures: {
    color: {
      transparent: assinaturaVerticalColoridaTransparente,
      ivory: assinaturaVerticalColoridaFundoMarfim,
    },
    inverted: {
      wine: assinaturaVerticalInvertidaFundoVinho,
    },
  },

  // 5. Ícones da Aplicação
  appIcons: {
    wine: iconeAppFundoVinho,
    ivory: iconeAppFundoMarfim,
  },

  // 6. Mapeamento Central por Contexto de Uso
  usage: {
    favicon: simboloColoridoTransparente,
    appIcon: iconeAppFundoVinho,
    sidebarExpanded: logoHorizontalColoridoTransparente,
    sidebarCollapsed: simboloColoridoTransparente,
    topbarLight: logoHorizontalColoridoTransparente,
    topbarDark: logoHorizontalInvertidoFundoVinho,
    authLight: logoHorizontalColoridoTransparente,
    authDark: logoHorizontalInvertidoFundoVinho,
    loading: simboloColoridoTransparente,
    processing: simboloColoridoTransparente,
    onboarding: assinaturaHorizontalColoridaTransparente,
    tour: assinaturaHorizontalColoridaTransparente,
    mobile: logoHorizontalColoridoTransparente,
    footerLight: logoHorizontalColoridoTransparente,
    footerDark: logoHorizontalMonocromaticoMarfim,
  },
} as const;

export default BrandAssets;
