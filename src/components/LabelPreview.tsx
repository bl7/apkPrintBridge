import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {PrintQueueItem, Ingredient, MenuItem} from '../services/api';
import {
  getLabelTypeDisplayName,
  generateTSCLabelContent,
  LabelType,
  getDefaultExpiryDays,
  LabelHeight,
} from '../utils/labelManagement';
import {getAllergensFromIngredients} from '../utils/allergenDetection';
import {
  getLabelHeightPixels,
  getOptimalFontSize,
} from '../utils/labelManagement';

interface LabelPreviewProps {
  item: PrintQueueItem;
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  customExpiry?: string;
  initials: string;
  companyName?: string; // Add company name prop
  onUpdateLabelType: (uid: string, labelType: LabelType) => void;
  onUpdateExpiry?: (uid: string, expiry: string) => void;
  labelSettings?: Record<string, number>; // Add label settings prop
}

const LabelPreview: React.FC<LabelPreviewProps> = ({
  item,
  ingredients,
  menuItems,
  customExpiry,
  initials,
  companyName,
  onUpdateLabelType,
  onUpdateExpiry,
  labelSettings = {}, // Default to empty object
}) => {
  // Get item details
  const getItemDetails = () => {
    if (item.type === 'ingredients') {
      const ingredient = ingredients.find(i => i.ingredientName === item.name);
      return {
        name: item.name,
        ingredients: [item.name], // Single ingredient for ingredient labels
        allergens: ingredient?.allergens.map(a => a.allergenName) || [],
        expiryDays: ingredient?.expiryDays || 3,
      };
    } else {
      // For menu items, we need the full ingredient objects to display allergens
      const defaultLabelType = 'prep';
      const expiryDays =
        labelSettings[defaultLabelType] ||
        getDefaultExpiryDays(defaultLabelType);

      // Get the full ingredient objects from the stored ingredients array
      const ingredientObjects = item.ingredients
        .map(ingredientName => {
          return ingredients.find(i => i.ingredientName === ingredientName);
        })
        .filter((ing): ing is Ingredient => ing !== undefined);

      return {
        name: item.name,
        ingredients: ingredientObjects, // Pass full ingredient objects
        allergens: item.allergens || [], // Use stored allergens from PrintQueueItem
        expiryDays: expiryDays,
      };
    }
  };

  const itemDetails = getItemDetails();

  // Check if this is a PPDS label early so it's available throughout
  const isPPDSLabel = item.labelType === 'ppds';

  // Generate TSC label content with proper positioning
  const labelContent = generateTSCLabelContent(
    itemDetails.name,
    item.labelType,
    customExpiry || item.expiryDate,
    itemDetails.ingredients,
    itemDetails.allergens,
    new Date().toISOString().split('T')[0],
    initials,
    companyName,
  );

  // Get label height styling - respect the original label height from the item
  // Only use 80mm if explicitly set in the item, otherwise use default
  const labelHeight = getLabelHeightPixels(
    (item.labelHeight as LabelHeight) || '40mm',
  );
  const fontSize = getOptimalFontSize(
    (item.labelHeight as LabelHeight) || '40mm',
  );

  // Format the expiry date for display
  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return '';

    try {
      // Handle different date formats
      let date: Date;

      if (dateString.includes('-')) {
        // YYYY-MM-DD format
        date = new Date(dateString);
      } else if (dateString.includes('.')) {
        // DD.MM.YYYY format
        const parts = dateString.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const year = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        } else {
          return dateString; // Return original if can't parse
        }
      } else {
        // Try direct Date constructor
        date = new Date(dateString);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Invalid Date';
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = date
        .toLocaleDateString('en-US', {month: 'short'})
        .toUpperCase();
      const dayOfWeek = date
        .toLocaleDateString('en-US', {weekday: 'short'})
        .toUpperCase();

      return `${dayOfWeek}. ${day} ${month}`;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const formattedExpiryDate = formatExpiryDate(customExpiry || item.expiryDate);

  return (
    <View style={styles.container}>
      {/* Label Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.sectionTitle}>Label Preview</Text>
        <View
          style={[
            styles.labelPreview,
            {
              height: labelHeight,
              width: isPPDSLabel ? 56 * 3.78 : 60 * 3.78, // ~212px for PPDS, ~227px for others
            },
          ]}>
          {/* Black Header Bar */}
          <View style={styles.headerBar}>
            <Text style={styles.headerText}>{labelContent.header}</Text>
          </View>

          {/* White Body */}
          <View style={styles.labelBody}>
            {/* Expiry Line */}
            <View style={styles.expiryLine}>
              <Text style={styles.expiryLabel}>{labelContent.expiryLine}</Text>
              <Text style={styles.expiryDate}>{formattedExpiryDate}</Text>
            </View>

            {/* Printed Line with Initials on same line */}
            {labelContent.printedLine && (
              <View style={styles.printedLine}>
                <Text style={styles.printedText}>
                  {labelContent.printedLine}
                </Text>
                {item.labelType === 'ppds' ? (
                  // For PPDS labels, show company name instead of initials
                  <Text style={styles.initialsText}>
                    {companyName ? `Prepared By: ${companyName}` : ''}
                  </Text>
                ) : (
                  // For other label types, show initials
                  <Text style={styles.initialsText}>{initials}</Text>
                )}
              </View>
            )}

            {/* Ingredients Line */}
            {labelContent.ingredientsLine && (
              <Text style={styles.ingredientsText}>
                {labelContent.ingredientsLine}
              </Text>
            )}

            {/* Show initials line for PPDS labels only */}
            {labelContent.initialsLine && item.labelType === 'ppds' && (
              <Text style={styles.initialsText}>
                {labelContent.initialsLine}
              </Text>
            )}

            {/* Remove duplicate initials display - we already show them above */}
          </View>
        </View>

        {/* Label Dimensions Indicator */}
        <Text style={styles.labelHeightIndicator}>
          Size: {isPPDSLabel ? '56mm × 80mm' : '60mm × 40mm'} •{' '}
          {getLabelTypeDisplayName(item.labelType)} • {item.labelType}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },

  // Preview Section
  previewSection: {
    marginBottom: 20,
  },
  labelPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#000000',
    // Width and height are set dynamically in inline styles
    alignSelf: 'center',
    overflow: 'hidden', // Ensure content doesn't overflow the border
  },
  labelContent: {
    flex: 1,
    alignItems: 'center',
  },
  labelLine: {
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  labelTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  labelHeightIndicator: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  headerBar: {
    backgroundColor: '#000000',
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: 'center',
    minHeight: 20,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  labelBody: {
    padding: 0,
    flex: 1,
  },
  expiryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
    paddingHorizontal: 2,
    minHeight: 14,
  },
  expiryLabel: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    lineHeight: 14,
  },
  expiryDate: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    lineHeight: 14,
  },
  printedLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
    paddingHorizontal: 2,
    minHeight: 14,
  },
  printedText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    lineHeight: 14,
  },
  initialsText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    lineHeight: 14,
  },
  ingredientsText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 1,
    paddingHorizontal: 2,
    lineHeight: 14,
  },
});

export default LabelPreview;
