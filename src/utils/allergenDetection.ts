// Comprehensive allergen detection and management system for InstaLabel

// UK 14 Major Allergens with their keywords
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: [
    'wheat',
    'barley',
    'rye',
    'oats',
    'flour',
    'bread',
    'pasta',
    'couscous',
    'bulgur',
    'semolina',
    'spelt',
    'kamut',
    'triticale',
  ],
  crustaceans: [
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'crayfish',
    'langoustine',
    'scampi',
    'crawfish',
  ],
  eggs: [
    'egg',
    'eggs',
    'mayonnaise',
    'custard',
    'quiche',
    'omelette',
    'frittata',
    'albumin',
    'ovalbumin',
    'lysozyme',
  ],
  fish: [
    'fish',
    'salmon',
    'tuna',
    'cod',
    'haddock',
    'mackerel',
    'sardine',
    'anchovy',
    'fish sauce',
    'worcestershire sauce',
  ],
  peanuts: [
    'peanut',
    'groundnut',
    'peanuts',
    'arachis',
    'monkey nut',
    'beer nut',
  ],
  soy: [
    'soy',
    'soya',
    'tofu',
    'soybean',
    'edamame',
    'tempeh',
    'miso',
    'soy sauce',
    'tamari',
    'soy lecithin',
  ],
  milk: [
    'milk',
    'dairy',
    'cheese',
    'cream',
    'butter',
    'yogurt',
    'yoghurt',
    'whey',
    'casein',
    'lactose',
    'ghee',
  ],
  nuts: [
    'almond',
    'walnut',
    'cashew',
    'pistachio',
    'hazelnut',
    'brazil nut',
    'pecan',
    'macadamia',
    'pine nut',
    'chestnut',
  ],
  celery: ['celery', 'celeriac', 'celery salt', 'celery seed'],
  mustard: [
    'mustard',
    'mustard seed',
    'mustard powder',
    'english mustard',
    'dijon mustard',
  ],
  sesame: [
    'sesame',
    'sesame seed',
    'tahini',
    'sesame oil',
    'benne seed',
    'gingelly',
  ],
  sulphites: [
    'sulphite',
    'sulfite',
    'sulphur dioxide',
    'sulfur dioxide',
    'sodium sulphite',
    'potassium sulphite',
  ],
  lupin: ['lupin', 'lupini', 'lupine', 'lupin flour', 'lupin bean'],
  molluscs: [
    'mollusc',
    'mussel',
    'oyster',
    'clam',
    'scallop',
    'abalone',
    'whelk',
    'periwinkle',
    'limpet',
  ],
};

// False positive prevention - ingredients that contain allergen names but aren't actually that allergen
export const FALSE_POSITIVES: Record<string, string[]> = {
  milk: [
    'coconut milk',
    'almond milk',
    'soy milk',
    'oat milk',
    'rice milk',
    'hemp milk',
    'cashew milk',
  ],
  gluten: [
    'almond flour',
    'coconut flour',
    'chickpea flour',
    'rice flour',
    'corn flour',
    'potato flour',
  ],
  nuts: ['water chestnut', 'sweet chestnut', 'horse chestnut'],
  fish: ['star fruit', 'dragon fruit'],
  eggs: ['eggplant', 'aubergine'],
};

// Allergen severity levels
export const ALLERGEN_SEVERITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

// Allergen categories for grouping
export const ALLERGEN_CATEGORIES = {
  GRAINS: 'Grains',
  SEAFOOD: 'Seafood',
  DAIRY: 'Dairy',
  PROTEIN: 'Protein',
  LEGUMES: 'Legumes',
  SEEDS: 'Seeds',
  SPICES: 'Spices',
  PRESERVATIVES: 'Preservatives',
} as const;

// Allergen icon mapping for UI display - using Lucide icon names
export const ALLERGEN_ICON_MAP: Record<string, string> = {
  gluten: 'Wheat',
  crustaceans: 'Fish',
  eggs: 'Egg',
  fish: 'Fish',
  peanuts: 'Nut',
  milk: 'Milk',
  nuts: 'Nut',
  celery: 'Carrot',
  mustard: 'Flame',
  sesame: 'Circle',
  sulphites: 'Wine',
  lupin: 'Flower',
  molluscs: 'Shell',
};

// Function to detect allergens from text
export function detectAllergens(text: string | undefined | null): string[] {
  // Early return if text is null, undefined, or not a string
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedAllergens: string[] = [];
  const lowerText = text.toLowerCase();

  // Check each allergen category
  Object.entries(ALLERGEN_KEYWORDS).forEach(([allergen, keywords]) => {
    const hasAllergen = keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase()),
    );

    if (hasAllergen) {
      // Check for false positives
      const isFalsePositive = FALSE_POSITIVES[allergen]?.some(falsePositive =>
        lowerText.includes(falsePositive.toLowerCase()),
      );

      if (!isFalsePositive) {
        detectedAllergens.push(allergen);
      }
    }
  });

  return [...new Set(detectedAllergens)]; // Remove duplicates
}

// Function to get allergen severity based on type and context
export function getAllergenSeverity(
  allergen: string,
  context?: string,
): 'Low' | 'Medium' | 'High' {
  // High severity allergens (common and dangerous)
  const highSeverity = [
    'peanuts',
    'tree nuts',
    'milk',
    'eggs',
    'fish',
    'crustaceans',
  ];

  // Medium severity allergens
  const mediumSeverity = ['soy', 'wheat', 'gluten', 'sesame'];

  if (highSeverity.includes(allergen)) {
    return 'High';
  } else if (mediumSeverity.includes(allergen)) {
    return 'Medium';
  }

  return 'Low';
}

// Function to format allergen display text
export function formatAllergenDisplay(allergen: string): string {
  return allergen.charAt(0).toUpperCase() + allergen.slice(1);
}

// Function to get allergen warning text
export function getAllergenWarningText(allergens: string[]): string {
  if (allergens.length === 0) return '';

  return allergens.map(allergen => `*${allergen.toUpperCase()}*`).join(', ');
}

// Function to check if ingredient contains specific allergen
export function ingredientContainsAllergen(
  ingredientName: string,
  allergenName: string,
): boolean {
  const detectedAllergens = detectAllergens(ingredientName);
  return detectedAllergens.includes(allergenName);
}

// Function to get all allergens from ingredient list
export function getAllergensFromIngredients(
  ingredients: (string | undefined | null)[],
): string[] {
  const allAllergens: string[] = [];

  // Filter out null/undefined ingredients and process valid ones
  ingredients
    .filter(
      (ingredient): ingredient is string =>
        ingredient !== null &&
        ingredient !== undefined &&
        typeof ingredient === 'string',
    )
    .forEach(ingredient => {
      const detected = detectAllergens(ingredient);
      allAllergens.push(...detected);
    });

  return [...new Set(allAllergens)]; // Remove duplicates
}

// Function to get allergens from ingredient objects (new API structure)
export function getAllergensFromIngredientObjects(
  ingredients: Array<{ ingredientName: string; uuid: string }>,
): string[] {
  const allAllergens: string[] = [];

  ingredients.forEach(ingredient => {
    if (ingredient && ingredient.ingredientName) {
      const detected = detectAllergens(ingredient.ingredientName);
      allAllergens.push(...detected);
    }
  });

  return [...new Set(allAllergens)]; // Remove duplicates
}

// Function to create allergen map for ingredients
export function createAllergenMap(
  ingredients: string[],
): Record<string, string[]> {
  const allergenMap: Record<string, string[]> = {};

  ingredients.forEach(ingredient => {
    const detected = detectAllergens(ingredient);
    if (detected.length > 0) {
      allergenMap[ingredient] = detected;
    }
  });

  return allergenMap;
}

// Function to validate allergen data
export function validateAllergenData(allergen: any): boolean {
  return (
    allergen &&
    typeof allergen.allergenName === 'string' &&
    typeof allergen.category === 'string' &&
    ['Low', 'Medium', 'High'].includes(allergen.severity) &&
    ['Active', 'Inactive'].includes(allergen.status)
  );
}

// Function to get allergen category color for UI
export function getAllergenCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    Grains: '#8B4513',
    Seafood: '#0066CC',
    Dairy: '#87CEEB',
    Protein: '#DC143C',
    Legumes: '#228B22',
    Seeds: '#DAA520',
    Spices: '#FF4500',
    Preservatives: '#9932CC',
  };

  return colorMap[category] || '#666666';
}

// Function to get allergen severity color for UI
export function getAllergenSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    High: '#DC143C',
    Medium: '#FF8C00',
    Low: '#32CD32',
  };

  return colorMap[severity] || '#666666';
}
