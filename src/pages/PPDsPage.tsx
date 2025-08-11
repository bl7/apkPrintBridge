import React, {useState, useEffect, useCallback, useRef, Fragment} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';

import Modal from 'react-native-modal';
import {useAuth} from '../contexts/AuthContext';
import {usePrinter} from '../PrinterContext';
import {
  apiService,
  Ingredient,
  MenuItem,
  Allergen,
  PrintQueueItem,
  PrintLabelRequest,
} from '../services/api';
import {
  getAllergensFromIngredients,
  ALLERGEN_ICON_MAP,
} from '../utils/allergenDetection';
import {
  calculateExpiryDate,
  getDefaultExpiryDays,
  generateTSCLabelContent,
  LabelType,
} from '../utils/labelManagement';
import LabelPreview from '../components/LabelPreview';
import LabelSettingsDisplay from '../components/LabelSettingsDisplay';
import {
  Search,
  SearchX,
  FileText,
  Lock,
  Printer,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Eye,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';

// Types for the labels system
type TabType = 'menu'; // Only menu items for PPDS

const isTablet = false; // Simplified for mobile-first design

// Function to render allergen icon
const renderAllergenIcon = (allergen: string, size: number = 12) => {
  // Safety check for undefined/null allergen
  if (!allergen || typeof allergen !== 'string') {
    console.warn('Invalid allergen passed to renderAllergenIcon:', allergen);
    return <AlertTriangle size={size} color="#856404" />;
  }
};

const PPDSPage: React.FC = () => {
  const {isAuthenticated, user} = useAuth();
  const {connectedDevice, isPrinting, printPPDSLabel, setIsPrinting} =
    usePrinter();

  // Core data state
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Print settings
  const [customExpiry, setCustomExpiry] = useState<Record<string, string>>({});
  const [storageInstructions, setStorageInstructions] = useState<string>(
    'Keep refrigerated at 5°C',
  );

  // Label settings from InstaLabel.co API
  const [labelSettings, setLabelSettings] = useState<Record<string, number>>(
    {},
  );
  const [isLoadingLabelSettings, setIsLoadingLabelSettings] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Prompt state
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState<
    ((value: string) => void) | null
  >(null);

  // Company name from user context
  const companyName = user?.company_name || 'Your Company';

  // Prompt functions
  const showPrompt = (
    title: string,
    message = '',
    initial = '',
  ): Promise<string | undefined> => {
    return new Promise(resolve => {
      setPromptTitle(title);
      setPromptMessage(message);
      setPromptValue(initial);
      setPromptCallback(() => resolve);
      setPromptVisible(true);
    });
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    if (promptCallback) {
      promptCallback('');
    }
  };

  const handlePromptSubmit = () => {
    setPromptVisible(false);
    if (promptCallback) {
      promptCallback(promptValue);
    }
  };

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ingredientsData, menuItemsData, allergensData] = await Promise.all(
        [
          apiService.getIngredients(),
          apiService.getMenuItems(),
          apiService.getAllergens(),
        ],
      );

      setIngredients(ingredientsData);
      setMenuItems(menuItemsData);
      setAllergens(allergensData);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLabelSettings = useCallback(async () => {
    try {
      setIsLoadingLabelSettings(true);
      const settings = await apiService.getLabelSettings();
      const settingsMap: Record<string, number> = {};
      settings.settings.forEach(setting => {
        settingsMap[setting.label_type] = setting.expiry_days;
      });
      setLabelSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching label settings:', error);
    } finally {
      setIsLoadingLabelSettings(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchLabelSettings();
    }
  }, [isAuthenticated, fetchData, fetchLabelSettings]);

  // Print queue management
  const addToPrintQueue = (item: MenuItem, type: TabType) => {
    const existingItem = printQueue.find(
      qItem => qItem.uid === item.menuItemID,
    );

    if (existingItem) {
      // Update quantity if already in queue
      setPrintQueue(prev =>
        prev.map(qItem =>
          qItem.uid === item.menuItemID
            ? {...qItem, quantity: qItem.quantity + 1}
            : qItem,
        ),
      );
    } else {
      // Add new item to queue
      const defaultLabelType: LabelType = 'ppds';

      // Safe fallback for expiry days
      let expiryDays = 5; // Default PPDS expiry
      try {
        if (labelSettings[defaultLabelType]) {
          expiryDays = labelSettings[defaultLabelType];
        } else {
          expiryDays = getDefaultExpiryDays(defaultLabelType);
        }
      } catch (error) {
        console.warn('Error getting expiry days, using default:', error);
        expiryDays = 5; // Fallback to 5 days for PPDS
      }

      const expiryDate = calculateExpiryDate(
        defaultLabelType,
        undefined,
        expiryDays,
      );

      // Extract allergens from ingredients - PPDS page specific method
      const allAllergens: string[] = [];
      if (item.ingredients) {
        console.log('🔍 PPDS - Menu item ingredients:', item.ingredients);
        console.log(
          '🔍 PPDS - Available ingredients:',
          ingredients.map(i => ({id: i.ingredientID, name: i.ingredientName})),
        );

        item.ingredients.forEach(ingredientRef => {
          console.log(
            '🔍 PPDS - Looking for ingredient with uuid:',
            ingredientRef.uuid,
          );
          const fullIngredient = ingredients.find(
            i => i.ingredientID === ingredientRef.uuid,
          );
          console.log('🔍 PPDS - Found ingredient:', fullIngredient);

          if (fullIngredient && fullIngredient.allergens) {
            console.log(
              '🔍 PPDS - Ingredient allergens:',
              fullIngredient.allergens,
            );
            fullIngredient.allergens.forEach(allergen => {
              allAllergens.push(allergen.allergenName);
            });
          }
        });
      }

      console.log('🔍 PPDS - Final allergens array:', allAllergens);

      const newQueueItem: PrintQueueItem = {
        uid: item.menuItemID,
        name: item.menuItemName,
        type: 'menu',
        quantity: 1,
        labelType: defaultLabelType,
        expiryDate,
        allergens: [...new Set(allAllergens)], // Remove duplicates
        ingredients: item.ingredients?.map(i => i.ingredientName) || [],
        labelHeight: '80mm', // PPDS labels are 80mm height
      };

      setPrintQueue(prev => [...prev, newQueueItem]);
    }
  };

  const removeFromQueue = (uid: string) => {
    setPrintQueue(prev => prev.filter(item => item.uid !== uid));
  };

  const updateQuantity = (uid: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromQueue(uid);
      return;
    }
    setPrintQueue(prev =>
      prev.map(item => (item.uid === uid ? {...item, quantity} : item)),
    );
  };

  const incrementQuantity = (uid: string) => {
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, quantity: item.quantity + 1} : item,
      ),
    );
  };

  const decrementQuantity = (uid: string) => {
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid
          ? {...item, quantity: Math.max(1, item.quantity - 1)}
          : item,
      ),
    );
  };

  const updateLabelType = (uid: string, labelType: LabelType) => {
    setPrintQueue(prev =>
      prev.map(item => (item.uid === uid ? {...item, labelType} : item)),
    );
  };

  const updateCustomExpiry = (uid: string, expiry: string) => {
    setCustomExpiry(prev => ({...prev, [uid]: expiry}));
  };

  const openDatePicker = async (uid: string, currentDate: string) => {
    try {
      const newDate = await showPrompt(
        'Set Custom Expiry Date',
        'Enter expiry date (YYYY-MM-DD):',
        currentDate,
      );
      if (newDate) {
        updateCustomExpiry(uid, newDate);
      }
    } catch (error) {
      console.error('Error setting custom expiry:', error);
    }
  };

  const clearPrintQueue = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear the entire print queue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setPrintQueue([]);
            setCustomExpiry({});
          },
        },
      ],
    );
  };

  // Printing functionality
  const printLabels = async () => {
    if (!printQueue || printQueue.length === 0) {
      Alert.alert('Empty Queue', 'Please add items to the print queue first');
      return;
    }

    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      setIsPrinting(true);

      // Print each item in the queue
      for (const item of printQueue) {
        const quantity = item.quantity;

        // For PPDS page, we only handle menu items
        if (item.type === 'menu') {
          const defaultLabelType = 'ppds'; // Always PPDS for this page
          const expiryDays =
            labelSettings[defaultLabelType] ||
            getDefaultExpiryDays(defaultLabelType);
          const expiryDate = customExpiry[item.uid] || item.expiryDate;

          // Get the full ingredient objects from the stored ingredients array
          const ingredientObjects = item.ingredients
            .map(ingredientName => {
              return ingredients.find(i => i.ingredientName === ingredientName);
            })
            .filter((ing): ing is Ingredient => ing !== undefined);

          // Extract ingredient names and allergens for PPDS format
          const ingredientNames = ingredientObjects.map(
            ing => ing.ingredientName,
          );
          const allAllergens: string[] = [];
          ingredientObjects.forEach(ingredient => {
            if (ingredient.allergens) {
              ingredient.allergens.forEach(allergen => {
                allAllergens.push(allergen.allergenName);
              });
            }
          });

          // Create PPDS label data
          const ppdsLabelData = {
            productName: item.name,
            ingredients: ingredientNames,
            allergens: [...new Set(allAllergens)], // Remove duplicates
            expiryDate: expiryDate,
            storageInstructions: storageInstructions,
            companyName: companyName,
          };

          // Print the specified quantity for this item
          for (let i = 0; i < quantity; i++) {
            await printPPDSLabel(ppdsLabelData);

            // Log the print action
            try {
              await apiService.logPrintAction({
                labelType: item.labelType,
                itemId: item.uid,
                itemName: item.name,
                quantity: 1, // Log each individual print
                expiryDate: customExpiry[item.uid] || item.expiryDate,
                initial: undefined, // No initials for PPDS
                labelHeight: item.labelHeight,
                printerUsed: connectedDevice?.name || 'Unknown Printer',
                sessionId: `print_${Date.now()}`, // Generate unique session ID
              });
            } catch (logError) {
              console.warn('Failed to log print action:', logError);
              // Continue printing even if logging fails
            }

            // Small delay between prints to prevent buffer overflow
            if (i < quantity - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      }

      Alert.alert(
        'Success',
        `${printQueue.length} label types printed successfully!`,
      );
      setPrintQueue([]);
      setCustomExpiry({});
      setStorageInstructions('Keep refrigerated at 5°C');
    } catch (error) {
      console.error('Printing error:', error);
      Alert.alert('Error', 'Failed to print labels. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Enhanced tab content with better design
  const renderTabContent = () => {
    const items = menuItems || [];

    // Simple filtering by name only
    let filteredItems = items.filter(item => {
      const name = item.menuItemName;
      if (!name) return false;

      return name.toLowerCase().includes((searchTerm || '').toLowerCase());
    });

    // Sort by name alphabetically
    filteredItems.sort((a, b) => {
      const aName = a.menuItemName || '';
      const bName = b.menuItemName || '';
      return aName.localeCompare(bName);
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, endIndex);

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
          <Text style={styles.loadingText}>Loading menu items...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Enhanced Search and Filter Bar */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={searchTerm || ''}
              onChangeText={(text: string) => setSearchTerm(text || '')}
              placeholderTextColor="#999"
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <SearchX size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsList}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <SearchX size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No menu items found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'No items available'}
              </Text>
            </View>
          ) : (
            <>
              {currentItems.map(item => {
                const isInQueue = printQueue.some(
                  qItem => qItem.uid === item.menuItemID,
                );
                const queueItem = printQueue.find(
                  qItem => qItem.uid === item.menuItemID,
                );

                return (
                  <TouchableOpacity
                    key={item.menuItemID}
                    style={styles.itemCard}
                    onPress={() => !isInQueue && addToPrintQueue(item, 'menu')}>
                    <View style={styles.itemMainInfo}>
                      <Text style={styles.itemName}>{item.menuItemName}</Text>
                    </View>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          isInQueue && styles.addButtonDisabled,
                        ]}
                        onPress={() =>
                          !isInQueue && addToPrintQueue(item, 'menu')
                        }
                        disabled={isInQueue}>
                        {isInQueue ? (
                          <>
                            <CheckCircle size={16} color="#4CAF50" />
                            <Text
                              style={[
                                styles.addButtonText,
                                styles.addButtonTextDisabled,
                              ]}>
                              {queueItem?.quantity || 1} in Queue
                            </Text>
                          </>
                        ) : (
                          <>
                            <Plus size={16} color="#fff" />
                            <Text style={styles.addButtonText}>Add</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === 1 &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages &&
                          styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === totalPages &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        Next
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // Enhanced print queue with better design
  const renderPrintQueue = () => (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <View style={styles.queueHeaderTop}>
          <View style={styles.queueHeaderLeft}>
            <ShoppingCart size={24} color="#8A2BE2" />
            <Text style={styles.sectionTitle}>PPDS Print Queue</Text>
            <View style={styles.queueCount}>
              <Text style={styles.queueCountText}>
                {printQueue.length} item{printQueue.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {printQueue.length > 0 && (
          <View style={styles.queueHeaderButtons}>
            <TouchableOpacity
              style={styles.clearQueueButton}
              onPress={clearPrintQueue}>
              <X size={16} color="#F44336" />
              <Text style={styles.clearQueueText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.printButton}
              onPress={printLabels}
              disabled={!printQueue || printQueue.length === 0 || isPrinting}>
              <Printer size={16} color="#fff" />
              <Text style={styles.printButtonText}>
                {isPrinting ? 'Printing...' : 'Print All'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {printQueue.length === 0 ? (
        <View style={styles.emptyQueue}>
          <ShoppingCart size={48} color="#ccc" />
          <Text style={styles.emptyQueueText}>Print queue is empty</Text>
          <Text style={styles.emptyQueueSubtext}>
            Add menu items from above to start printing PPDS labels
          </Text>
        </View>
      ) : (
        <View style={styles.queueItems}>
          {printQueue.map(item => (
            <View key={item.uid} style={styles.queueItem}>
              <View style={styles.queueItemInfo}>
                <Text style={styles.queueItemName}>{item.name}</Text>
                <Text style={styles.queueItemType}>
                  {item.labelType.toUpperCase()} • {item.labelHeight}
                </Text>

                {/* Allergens in queue */}
                {item.allergens && item.allergens.length > 0 && (
                  <View style={styles.queueAllergens}>
                    <Text style={styles.queueAllergensLabel}>Allergens:</Text>
                    <View style={styles.queueAllergensList}>
                      {item.allergens.map((allergen, index) => (
                        <View key={index} style={styles.queueAllergenTag}>
                          <Text style={styles.queueAllergenText}>
                            {allergen}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.queueItemControls}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => decrementQuantity(item.uid)}>
                    <Minus size={16} color="#666" />
                  </TouchableOpacity>

                  <Text style={styles.quantityDisplay}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => incrementQuantity(item.uid)}>
                    <Plus size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromQueue(item.uid)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Enhanced PPDS label preview
  const renderLabelPreview = () => {
    if (printQueue.length === 0) {
      return (
        <View style={styles.previewPlaceholder}>
          <Eye size={48} color="#ccc" />
          <Text style={styles.previewText}>
            Select items to preview PPDS labels
          </Text>
        </View>
      );
    }

    // Debug: Log allergens data
    console.log(
      'PPDS Preview - Print Queue Items:',
      printQueue.map(item => ({
        name: item.name,
        allergens: item.allergens,
        ingredients: item.ingredients,
      })),
    );

    return (
      <View style={styles.previewScroll}>
        {printQueue.map(item => (
          <View key={item.uid} style={styles.previewContainer}>
            {/* Custom PPDS Label Preview */}
            <View style={styles.ppdsPreviewContainer}>
              {/* Product Name */}
              <Text style={styles.ppdsPreviewProductName}>{item.name}</Text>

              {/* Ingredients directly below name */}
              {item.ingredients && item.ingredients.length > 0 && (
                <View style={styles.ppdsPreviewIngredients}>
                  <Text style={styles.ppdsPreviewIngredientsLine}>
                    <Text style={styles.ppdsPreviewSectionTitle}>
                      Ingredients:{' '}
                    </Text>
                    <Text style={styles.ppdsPreviewIngredientsText}>
                      {item.ingredients
                        .map(ingredient => {
                          const allergen = item.allergens?.find(allergen =>
                            ingredient
                              .toLowerCase()
                              .includes(allergen.toLowerCase()),
                          );
                          if (allergen) {
                            return `${ingredient}(${allergen.toUpperCase()})`;
                          }
                          return ingredient;
                        })
                        .join(', ')}
                    </Text>
                  </Text>
                </View>
              )}

              {/* Allergen Warning Box - only show if allergens exist */}
              {item.allergens && item.allergens.length > 0 && (
                <View style={styles.ppdsPreviewAllergenBox}>
                  <Text style={styles.ppdsPreviewAllergenText}>
                    Contains:{' '}
                    {item.allergens.map(a => a.toUpperCase()).join(', ')}
                  </Text>
                </View>
              )}

              {/* Dates directly below ingredients/allergens */}
              <View style={styles.ppdsPreviewDates}>
                <Text style={styles.ppdsPreviewDateText}>
                  Packed: {new Date().toISOString().split('T')[0]}
                </Text>
                <Text style={styles.ppdsPreviewDateText}>
                  Use By: {customExpiry[item.uid] || item.expiryDate || 'N/A'}
                </Text>
              </View>

              {/* Bottom section - Storage and Company info */}
              <View style={styles.ppdsPreviewBottomSection}>
                {/* Storage Instructions */}
                <Text style={styles.ppdsPreviewStorageText}>
                  {storageInstructions}
                </Text>

                {/* Company Info */}
                <View style={styles.ppdsPreviewCompany}>
                  <Text style={styles.ppdsPreviewCompanyText}>
                    Prepared by: {companyName}
                  </Text>
                  <Text style={styles.ppdsPreviewWebsiteText}>
                    www.instalabel.co
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequired}>
          <Lock size={64} color="#ccc" />
          <Text style={styles.authRequiredText}>Authentication Required</Text>
          <Text style={styles.authRequiredSubtext}>
            Please log in to access the PPDS labels system.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8A2BE2" />
      {/* Prompt Modal */}
      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePromptCancel}>
        <View style={styles.promptOverlay}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>{promptTitle}</Text>
            {promptMessage ? (
              <Text style={styles.promptMessage}>{promptMessage}</Text>
            ) : null}
            <TextInput
              value={promptValue}
              onChangeText={setPromptValue}
              style={styles.promptInput}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity
                onPress={handlePromptCancel}
                style={[styles.promptButton, styles.promptCancel]}>
                <Text style={styles.promptButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePromptSubmit}
                style={[styles.promptButton, styles.promptSubmit]}>
                <Text style={[styles.promptButtonText, {color: 'white'}]}>
                  Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced PPDS Header */}
      <View style={styles.ppdsHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <FileText size={32} color="white" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.ppdsTitle}>PPDS Labels</Text>
            <Text style={styles.ppdsSubtitle}>
              Pre-Packaged for Direct Sale - UK Food Compliance
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{menuItems.length}</Text>
            <Text style={styles.statLabel}>Menu Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{printQueue.length}</Text>
            <Text style={styles.statLabel}>In Queue</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Printer
              size={20}
              color={connectedDevice ? '#4CAF50' : '#F44336'}
            />
            <Text style={styles.statLabel}>
              {connectedDevice ? 'Ready' : 'No Printer'}
            </Text>
          </View>
        </View>
        {/* Menu Items Tab Content */}
        {renderTabContent()}

        {/* Global Storage Instructions */}
        <View style={styles.globalStorageContainer}>
          <Text style={styles.globalStorageLabel}>
            Storage Instructions (applies to all labels):
          </Text>
          <TextInput
            style={styles.globalStorageInput}
            placeholder="e.g., Keep refrigerated at 5°C"
            value={storageInstructions}
            onChangeText={(text: string) => setStorageInstructions(text)}
            placeholderTextColor="#999"
          />
        </View>

        {/* Print Queue Section */}
        {renderPrintQueue()}

        {/* Label Preview Section */}
        <View style={styles.previewSection}>
          <View style={styles.previewSectionHeader}>
            <Eye size={24} color="#8A2BE2" />
            <Text style={styles.sectionTitle}>PPDS Label Preview</Text>
          </View>
          <Text style={styles.previewSubtitle}>
            Preview shows exactly what will be printed on each PPDS label
          </Text>
          {renderLabelPreview()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  authRequiredSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Enhanced PPDS Header
  ppdsHeader: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  ppdsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  ppdsSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    lineHeight: 18,
  },
  // Stats Section
  statsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A2BE2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },

  // Enhanced Tab Content
  tabContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },

  // Enhanced Items List
  itemsList: {
    width: '100%',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemMainInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 24,
  },

  itemActions: {
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8A2BE2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#4CAF50',
  },

  // Enhanced Print Queue
  queueSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  queueHeader: {
    marginBottom: 20,
  },
  queueHeaderTop: {
    marginBottom: 16,
  },
  queueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueCount: {
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  queueCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A2BE2',
  },
  clearQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fed7d7',
    gap: 4,
  },
  clearQueueText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyQueueText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyQueueSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  queueItems: {
    gap: 12,
  },
  queueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  queueItemInfo: {
    marginBottom: 16,
  },
  queueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  queueItemType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  queueIngredients: {
    marginTop: 8,
  },
  queueIngredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  queueIngredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  queueIngredientTag: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  queueIngredientText: {
    fontSize: 11,
    color: '#666',
  },
  queueAllergens: {
    marginTop: 8,
  },
  queueAllergensLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  queueAllergensList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  queueAllergenTag: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#000',
  },
  queueAllergenText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '500',
  },

  globalStorageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  globalStorageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  globalStorageInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  queueItemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quantityButton: {
    padding: 8,
  },
  quantityDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 8,
  },

  // Enhanced Preview Section
  previewSection: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  previewPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  previewText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  previewScroll: {
    width: '100%',
  },
  previewContainer: {
    marginBottom: 16,
  },
  ppdsPreviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'solid',
    // Compact 56mm × 80mm dimensions - scaled for mobile
    width: 280, // 56mm scaled down
    height: 400, // 80mm scaled down (maintains 56:80 ratio)
    alignSelf: 'center',
    // Ensure content stays within boundaries
    overflow: 'hidden',
    // Use flexbox for proper positioning
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  ppdsPreviewProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
    lineHeight: 20,
  },
  ppdsPreviewIngredients: {
    marginBottom: 8,
  },
  ppdsPreviewIngredientsLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  ppdsPreviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  ppdsPreviewIngredientsText: {
    fontSize: 12,
    color: '#000',
    lineHeight: 16,
    flex: 1,
  },
  ppdsPreviewAllergenBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  ppdsPreviewAllergenText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  ppdsPreviewDates: {
    marginBottom: 8,
  },
  ppdsPreviewDateText: {
    fontSize: 11,
    color: '#000',
    marginBottom: 2,
  },
  ppdsPreviewStorageText: {
    fontSize: 11,
    color: '#000',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ppdsPreviewCompany: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 8,
  },
  ppdsPreviewCompanyText: {
    fontSize: 11,
    color: '#000',
    marginBottom: 2,
  },
  ppdsPreviewWebsiteText: {
    fontSize: 11,
    color: '#000',
    fontStyle: 'italic',
  },

  // Enhanced Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Enhanced Pagination
  paginationContainer: {
    marginTop: 20,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  paginationButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Enhanced Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // Modal Styles
  promptOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  promptContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  promptMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  promptButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  promptCancel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  promptSubmit: {
    backgroundColor: '#8A2BE2',
  },
  promptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default PPDSPage;
