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
  List,
  FileText,
  Lock,
  Printer,
  CheckCircle,
  AlertTriangle,
  Wheat,
  Fish,
  Egg,
  Nut,
  Bean,
  Milk,
  Carrot,
  Flame,
  Circle,
  Wine,
  Flower,
  Shell,
  Calendar,
} from 'lucide-react-native';

// Types for the labels system
type TabType = 'ingredients' | 'menu';

const isTablet = false; // Simplified for mobile-first design

// Function to render allergen icon
const renderAllergenIcon = (allergen: string, size: number = 12) => {
  // Safety check for undefined/null allergen
  if (!allergen || typeof allergen !== 'string') {
    console.warn('Invalid allergen passed to renderAllergenIcon:', allergen);
    return <AlertTriangle size={size} color="#856404" />;
  }
};

const LabelsPage: React.FC = () => {
  const {isAuthenticated, user} = useAuth();
  const {connectedDevice, isPrinting, printComplexLabel, setIsPrinting} =
    usePrinter();

  // Core data state
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Print settings
  const [customExpiry, setCustomExpiry] = useState<Record<string, string>>({});
  const [initials, setInitials] = useState('NG');
  const [availableInitials, setAvailableInitials] = useState<string[]>(['NG']);
  const [isLoadingInitials, setIsLoadingInitials] = useState(false);

  // Label settings from InstaLabel.co API
  const [labelSettings, setLabelSettings] = useState<Record<string, number>>(
    {},
  );
  const [isLoadingLabelSettings, setIsLoadingLabelSettings] = useState(false);

  // Company name for PPDS labels (from user profile)
  const companyName = user?.company_name || 'InstaLabel Ltd';

  // Log company name for debugging
  console.log('🏢 Company name in LabelsPage:', {
    company_name: user?.company_name,
    fallback_company_name: 'InstaLabel Ltd',
    final_company_name: companyName,
    user_data: user,
  });

  // Label initials settings from InstaLabel.co API
  const [useInitials, setUseInitials] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ---- Simple cross-platform prompt modal (replaces Alert.prompt) ----
  const promptResolveRef = useRef<((value?: string) => void) | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');

  const showPrompt = (
    title: string,
    message = '',
    initial = '',
  ): Promise<string | undefined> => {
    setPromptTitle(title);
    setPromptMessage(message);
    setPromptValue(initial);
    setPromptVisible(true);
    return new Promise(resolve => {
      promptResolveRef.current = resolve;
    });
  };

  const handlePromptCancel = () => {
    setPromptVisible(false);
    if (promptResolveRef.current) promptResolveRef.current(undefined);
    promptResolveRef.current = null;
  };

  const handlePromptSubmit = () => {
    setPromptVisible(false);
    if (promptResolveRef.current) promptResolveRef.current(promptValue);
    promptResolveRef.current = null;
  };
  // -------------------------------------------------------------------

  // Load data from API
  const loadData = useCallback(async () => {
    // gate with the current auth state (useCallback depends on isAuthenticated)
    if (!isAuthenticated) return;

    // Check if we have a valid token before making API calls
    const token = apiService.getAccessToken();
    if (!token) {
      console.log('No access token available, skipping API calls');
      return;
    }

    setIsLoading(true);
    try {
      console.log(
        '🌐 Loading data with token:',
        token ? token.substring(0, 20) + '...' : 'no-token',
      );

      const [ingredientsData, menuItemsData, allergensData] = await Promise.all(
        [
          apiService.getIngredients(),
          apiService.getMenuItems(),
          apiService.getAllergens(),
        ],
      );

      // Debug: Log the data structure
      console.log('📊 Ingredients data:', ingredientsData);
      console.log('📊 Menu items data:', menuItemsData);
      console.log('📊 Allergens data:', allergensData);

      // Validate data structure before setting state
      const validIngredients = Array.isArray(ingredientsData)
        ? ingredientsData.filter(
            item => item && typeof item === 'object' && item.ingredientName,
          )
        : [];
      const validMenuItems = Array.isArray(menuItemsData)
        ? menuItemsData.filter(
            item => item && typeof item === 'object' && item.menuItemName,
          )
        : [];

      console.log('✅ Valid ingredients:', validIngredients.length);
      console.log('✅ Valid menu items:', validMenuItems.length);

      setIngredients(validIngredients);
      setMenuItems(validMenuItems);
      setAllergens(Array.isArray(allergensData) ? allergensData : []);

      console.log('✅ Data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      loadLabelInitials();
      loadLabelSettings();
    }
  }, [isAuthenticated, loadData]);

  // Load label initials from InstaLabel.co API
  const loadLabelInitials = useCallback(async () => {
    if (!isAuthenticated) return;

    const token = apiService.getAccessToken();
    if (!token) {
      console.log('No access token available, skipping initials API call');
      return;
    }

    setIsLoadingInitials(true);
    try {
      console.log('🔍 Loading label initials from InstaLabel.co API...');
      const response = await apiService.getLabelInitials();

      // Set the use_initials flag from API response
      setUseInitials(response.use_initials || false);

      if (
        response.use_initials &&
        response.initials &&
        Array.isArray(response.initials)
      ) {
        setAvailableInitials(response.initials);
        // Set the first available initial as default if current one is not in the list
        if (!response.initials.includes(initials)) {
          setInitials(response.initials[0] || 'NG');
        }
        console.log('✅ Label initials loaded:', response.initials);
      } else {
        console.log('⚠️ No initials available from API, using defaults');
        setAvailableInitials(['NG']);
      }
    } catch (error) {
      console.error('❌ Error loading label initials:', error);
      // Keep default initials on error
      setAvailableInitials(['NG']);
    } finally {
      setIsLoadingInitials(false);
    }
  }, [isAuthenticated, initials]);

  // Load label settings from InstaLabel.co API
  const loadLabelSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    const token = apiService.getAccessToken();
    if (!token) {
      console.log(
        'No access token available, skipping label settings API call',
      );
      return;
    }

    setIsLoadingLabelSettings(true);
    try {
      console.log('🔍 Loading label settings from InstaLabel.co API...');
      const response = await apiService.getLabelSettings();

      if (response.settings && Array.isArray(response.settings)) {
        // Convert array of settings to a map for easy lookup
        const settingsMap: Record<string, number> = {};
        response.settings.forEach(setting => {
          if (setting.label_type && typeof setting.expiry_days === 'number') {
            settingsMap[setting.label_type] = setting.expiry_days;
          }
        });

        setLabelSettings(settingsMap);
        console.log('✅ Label settings loaded:', settingsMap);
      } else {
        console.log('⚠️ No label settings available from API, using defaults');
        setLabelSettings({});
      }
    } catch (error) {
      console.error('❌ Error loading label settings:', error);
      // Keep default settings on error
      setLabelSettings({});
    } finally {
      setIsLoadingLabelSettings(false);
    }
  }, [isAuthenticated]);

  // Get expiry days for a specific label type, using API settings if available
  const getExpiryDaysForLabelType = useCallback(
    (labelType: string): number => {
      // First try to get from API settings
      if (labelSettings[labelType] !== undefined) {
        console.log(
          `📅 Using API expiry days for ${labelType}: ${labelSettings[labelType]} days`,
        );
        return labelSettings[labelType];
      }

      // Fall back to default values from labelManagement utility
      const defaultDays = getDefaultExpiryDays(labelType as LabelType);
      console.log(
        `📅 Using default expiry days for ${labelType}: ${defaultDays} days`,
      );
      return defaultDays;
    },
    [labelSettings],
  );

  // Refresh data
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset to first page when active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Queue management functions
  const addToPrintQueue = (item: Ingredient | MenuItem, type: TabType) => {
    // Debug: Log what we're receiving
    console.log('🔍 addToPrintQueue called with:');
    console.log('🔍 type parameter:', type);
    console.log('🔍 item:', item);

    // Get the name first and validate it
    const name =
      type === 'ingredients'
        ? (item as Ingredient).ingredientName
        : (item as MenuItem).menuItemName;

    console.log('🔍 extracted name:', name);

    if (!name) {
      console.error('Cannot add item with undefined name to queue:', item);
      Alert.alert('Error', 'Cannot add item with missing name to queue');
      return;
    }

    // Detect allergens
    let detectedAllergens: string[] = [];
    let ingredientNames: string[] = [];
    let expiryDays: number;

    if (type === 'ingredients') {
      const ingredient = item as Ingredient;
      // Safety check for allergens array
      if (!ingredient.allergens || !Array.isArray(ingredient.allergens)) {
        console.warn('Ingredient has invalid allergens:', ingredient);
        detectedAllergens = [];
      } else {
        detectedAllergens = ingredient.allergens.map(a => a.allergenName);
      }
      ingredientNames = [ingredient.ingredientName];
      // Use expiryDays from ingredient data
      expiryDays = ingredient.expiryDays || 3;
      console.log(`📅 Using ingredient expiry days: ${expiryDays} days`);
    } else {
      const menuItem = item as MenuItem;
      // Safety check for ingredients array
      if (!menuItem.ingredients || !Array.isArray(menuItem.ingredients)) {
        console.warn('MenuItem has invalid ingredients:', menuItem);
        detectedAllergens = [];
        ingredientNames = [];
      } else {
        // Map menu item ingredients to actual ingredient objects and extract names
        const ingredientObjects = menuItem.ingredients
          .map(ingredientObj => {
            // Handle both old string format and new object format
            const ingredientName =
              typeof ingredientObj === 'string'
                ? ingredientObj
                : ingredientObj.ingredientName;

            const ingredient = ingredients.find(
              i => i.ingredientName === ingredientName,
            );
            return ingredient;
          })
          .filter((ing): ing is Ingredient => ing !== undefined); // Type guard to remove undefined

        // Extract ingredient names
        ingredientNames = ingredientObjects.map(ing => ing.ingredientName);

        // Extract all allergens from the ingredient objects
        const allAllergens: string[] = [];
        ingredientObjects.forEach(ingredient => {
          if (ingredient.allergens) {
            ingredient.allergens.forEach(allergen => {
              allAllergens.push(allergen.allergenName);
            });
          }
        });

        // Remove duplicates and set detected allergens
        detectedAllergens = [...new Set(allAllergens)];

        console.log(
          `🔍 Menu item ${(item as MenuItem).menuItemName}: mapped ${
            ingredientNames.length
          } ingredients with ${detectedAllergens.length} allergens`,
        );
      }
      // For menu items, use label settings with 'prep' as default
      const defaultLabelType = 'prep';
      expiryDays = getExpiryDaysForLabelType(defaultLabelType);
      console.log(
        `📅 Using menu item expiry days for ${defaultLabelType}: ${expiryDays} days`,
      );
    }

    // Generate a truly unique ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const uid = `${type}-${timestamp}-${randomSuffix}`;

    const newItem: PrintQueueItem = {
      uid,
      name, // Use the validated name
      type,
      quantity: 1,
      labelType: type === 'ingredients' ? 'prep' : 'prep',
      expiryDate: calculateExpiryDate(
        type === 'ingredients' ? 'prep' : 'prep',
        undefined, // no custom expiry
        expiryDays,
      ),
      allergens: detectedAllergens,
      ingredients: ingredientNames, // Store the ingredient names
      labelHeight: '31mm', // Fixed height
    };

    setPrintQueue(prev => [...prev, newItem]);
    // Removed alert to improve UX flow - no need to confirm every addition
  };

  const removeFromQueue = (uid: string) => {
    if (!uid) {
      console.warn('Cannot remove item with undefined uid');
      return;
    }
    setPrintQueue(prev => prev.filter(item => item.uid !== uid));
  };

  const updateQuantity = (uid: string, quantity: number) => {
    if (!uid) {
      console.warn('Cannot update item with undefined uid');
      return;
    }
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      console.warn('Invalid quantity:', quantity);
      return;
    }
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, quantity: Math.max(1, quantity)} : item,
      ),
    );
  };

  const incrementQuantity = (uid: string) => {
    if (!uid) {
      console.warn('Cannot increment item with undefined uid');
      return;
    }
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, quantity: item.quantity + 1} : item,
      ),
    );
  };

  const decrementQuantity = (uid: string) => {
    if (!uid) {
      console.warn('Cannot decrement item with undefined uid');
      return;
    }
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid
          ? {...item, quantity: Math.max(1, item.quantity - 1)}
          : item,
      ),
    );
  };

  const updateLabelType = (uid: string, labelType: LabelType) => {
    if (!uid) {
      console.warn('Cannot update item with undefined uid');
      return;
    }
    if (!labelType) {
      console.warn('Cannot update item with undefined labelType');
      return;
    }
    setPrintQueue(prev =>
      prev.map(item => {
        if (item.uid === uid) {
          let expiryDays: number;

          if (item.type === 'ingredients') {
            // For ingredients, use their original expiryDays from data
            const ingredient = ingredients.find(
              i => i.ingredientName === item.name,
            );
            expiryDays = ingredient?.expiryDays || 3;
            console.log(
              `📅 Ingredient ${item.name}: using original expiry days ${expiryDays}`,
            );
          } else {
            // For menu items, use label settings for the new label type
            expiryDays = getExpiryDaysForLabelType(labelType);
            console.log(
              `📅 Menu item ${item.name}: using ${labelType} expiry days ${expiryDays}`,
            );
          }

          // Recalculate expiry date based on new label type
          const newExpiryDate = calculateExpiryDate(
            labelType,
            customExpiry[uid],
            expiryDays,
          );
          return {...item, labelType, expiryDate: newExpiryDate};
        }
        return item;
      }),
    );
  };

  const updateCustomExpiry = (uid: string, expiry: string) => {
    if (!uid) {
      console.warn('Cannot update item with undefined uid');
      return;
    }
    if (!expiry) {
      console.warn('Cannot update item with undefined expiry');
      return;
    }

    // Update the custom expiry
    setCustomExpiry(prev => ({...prev, [uid]: expiry}));

    // Also update the print queue item's expiry date
    setPrintQueue(prev =>
      prev.map(item =>
        item.uid === uid ? {...item, expiryDate: expiry} : item,
      ),
    );
  };

  // openDatePicker now uses the cross-platform prompt
  const openDatePicker = async (uid: string, currentDate: string) => {
    try {
      const result = await showPrompt(
        'Set Custom Expiry Date',
        'Enter date (YYYY-MM-DD):',
        currentDate,
      );
      if (result === undefined) {
        // user cancelled
        return;
      }
      if (result && /^\d{4}-\d{2}-\d{2}$/.test(result)) {
        updateCustomExpiry(uid, result);
      } else {
        Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format');
      }
    } catch (err) {
      console.warn('Prompt error:', err);
    }
  };

  const clearPrintQueue = () => {
    if (!printQueue || printQueue.length === 0) {
      Alert.alert('Empty Queue', 'The print queue is already empty');
      return;
    }

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

        // Generate the full label content using the same logic as the preview
        let labelContentObj: {
          header: string;
          expiryLine: string;
          printedLine: string;
          ingredientsLine?: string;
          initialsLine?: string;
        };

        if (item.type === 'ingredients') {
          // For ingredients, generate ingredient label content
          const ingredient = ingredients.find(
            i => i.ingredientName === item.name,
          );
          if (ingredient) {
            const expiryDate = customExpiry[item.uid] || item.expiryDate;
            labelContentObj = generateTSCLabelContent(
              item.name,
              item.labelType,
              expiryDate,
              [item.name], // Single ingredient name
              item.allergens || [],
              undefined, // printedDate will be generated inside
              useInitials ? initials : undefined,
              companyName, // Pass company name for PPDS labels
            );
          } else {
            // Fallback - create simple label
            labelContentObj = {
              header: item.name,
              expiryLine: '',
              printedLine: '',
            };
          }
        } else {
          // For menu items, generate menu item label content
          const defaultLabelType = 'prep';
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

          labelContentObj = generateTSCLabelContent(
            item.name,
            item.labelType,
            expiryDate,
            ingredientObjects, // Pass full ingredient objects
            item.allergens || [],
            undefined, // printedDate will be generated inside
            useInitials ? initials : undefined,
            companyName, // Pass company name for PPDS labels
          );
        }

        // Print the specified quantity for this item
        for (let i = 0; i < quantity; i++) {
          await printComplexLabel(labelContentObj);

          // Log the print action
          try {
            await apiService.logPrintAction({
              labelType: item.labelType,
              itemId: item.uid,
              itemName: item.name,
              quantity: 1, // Log each individual print
              expiryDate: customExpiry[item.uid] || item.expiryDate,
              initial: useInitials ? initials : undefined,
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

      Alert.alert(
        'Success',
        `${printQueue.length} label types printed successfully!`,
      );
      setPrintQueue([]);
      setCustomExpiry({});
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert(
        'Error',
        'Failed to print labels. Please check your printer connection.',
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const renderTabContent = () => {
    const items = (activeTab === 'ingredients' ? ingredients : menuItems) || [];
    const filteredItems = items.filter(item => {
      const name =
        activeTab === 'ingredients'
          ? (item as Ingredient).ingredientName
          : (item as MenuItem).menuItemName;

      // Safety check: skip items with undefined/null names
      if (!name) {
        console.warn('Item with undefined name found:', item);
        return false;
      }

      return name.toLowerCase().includes((searchTerm || '').toLowerCase());
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
          <Text style={styles.loadingText}>
            Loading {activeTab || 'items'}...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab || 'items'}...`}
            value={searchTerm || ''}
            onChangeText={(text: string) => setSearchTerm(text || '')}
          />
        </View>

        {/* Items List */}
        <View style={styles.itemsList}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <SearchX size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No {activeTab || 'items'} found
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchTerm && searchTerm.trim()
                  ? 'Try adjusting your search terms'
                  : 'Pull to refresh to load data'}
              </Text>
            </View>
          ) : (
            <>
              {/* Current Items */}
              {currentItems
                .map(item => {
                  const name =
                    activeTab === 'ingredients'
                      ? (item as Ingredient).ingredientName
                      : (item as MenuItem).menuItemName;

                  // Safety check: skip items with undefined/null names
                  if (!name) {
                    console.warn(
                      'Item with undefined name found in map:',
                      item,
                    );
                    return null;
                  }

                  const isInQueue = printQueue.some(
                    queueItem =>
                      queueItem.name && name && queueItem.name === name,
                  );

                  return (
                    <View
                      key={`${activeTab}-${
                        activeTab === 'ingredients'
                          ? (item as Ingredient).ingredientName
                          : (item as MenuItem).menuItemName
                      }-${Math.random().toString(36).substr(2, 9)}`}
                      style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{name}</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          isInQueue && styles.addedButton,
                        ]}
                        onPress={() => addToPrintQueue(item, activeTab)}>
                        <Text style={styles.addButtonText}>
                          {isInQueue ? 'Added' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
                .filter(Boolean)}
              {/* Remove null values */}
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <View style={styles.paginationControls}>
                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === 1 && styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === 1 &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        &lt;
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>
                      {currentPage} / {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.paginationButton,
                        currentPage === totalPages &&
                          styles.paginationButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}>
                      <Text
                        style={[
                          styles.paginationButtonText,
                          currentPage === totalPages &&
                            styles.paginationButtonTextDisabled,
                        ]}>
                        &gt;
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

  const renderPrintQueue = () => (
    <View style={styles.queueSection}>
      <View style={styles.queueHeader}>
        <Text style={styles.sectionTitle}>
          Print Queue ({Math.max(0, printQueue.length)})
        </Text>

        {/* Printer Status Indicator */}
        <View style={styles.printerStatusIndicator}>
          <Printer size={16} color={connectedDevice ? '#4CAF50' : '#F44336'} />
          <Text
            style={[
              styles.printerStatusText,
              {color: connectedDevice ? '#4CAF50' : '#F44336'},
            ]}>
            {connectedDevice ? 'Printer Ready' : 'No Printer'}
          </Text>
        </View>

        <View style={styles.queueActions}>
          <TouchableOpacity
            style={styles.printLabelsButton}
            onPress={printLabels}
            disabled={!printQueue || printQueue.length === 0 || isPrinting}>
            <Text style={styles.printLabelsButtonText}>
              {isPrinting ? 'Printing...' : 'Print Labels'}
            </Text>
          </TouchableOpacity>
          {printQueue && printQueue.length > 0 && (
            <TouchableOpacity
              style={styles.clearQueueButton}
              onPress={clearPrintQueue}>
              <Text style={styles.clearQueueText}>Clear Queue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!printQueue || printQueue.length === 0 ? (
        <View style={styles.emptyQueue}>
          <List size={48} color="#ccc" />
          <Text style={styles.emptyQueueText}>Your print queue is empty.</Text>
          <Text style={styles.emptyQueueSubtext}>
            Add items to get started!
          </Text>
        </View>
      ) : (
        <View style={styles.queueList}>
          {printQueue &&
            printQueue.map(item => (
              <View key={item.uid} style={styles.queueItem}>
                <View style={styles.queueItemInfo}>
                  <Text style={styles.queueItemName}>{item.name}</Text>
                  <Text style={styles.queueItemType}>
                    {item.type === 'ingredients' ? 'Ingredient' : 'Menu Item'} •{' '}
                    {item.labelType}
                  </Text>
                  <View style={styles.expiryRow}>
                    <Text style={styles.queueItemExpiry}>
                      Expires: {customExpiry[item.uid] || item.expiryDate}
                    </Text>
                    <TouchableOpacity
                      style={styles.calendarButton}
                      onPress={() =>
                        openDatePicker(
                          item.uid,
                          customExpiry[item.uid] || item.expiryDate,
                        )
                      }>
                      <Calendar size={16} color="#8A2BE2" />
                    </TouchableOpacity>
                  </View>

                  {/* Allergen display */}
                  {item.allergens && item.allergens.length > 0 && (
                    <View style={styles.queueItemAllergens}>
                      {item.allergens.slice(0, 3).map((allergen, index) => (
                        <View key={index} style={styles.queueAllergenTag}>
                          {renderAllergenIcon(allergen, 12)}
                          <Text style={styles.queueAllergenText}>
                            {allergen || 'Unknown'}
                          </Text>
                        </View>
                      ))}
                      {item.allergens.length > 3 && (
                        <Text style={styles.moreAllergens}>
                          +{Math.max(0, item.allergens.length - 3)} more
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.queueItemControls}>
                  {/* Quantity Controls with +/- buttons */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => decrementQuantity(item.uid)}>
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityDisplay}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => incrementQuantity(item.uid)}>
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Label Type Dropdown for Menu Items */}
                  {item.type === 'menu' && (
                    <View style={styles.labelTypeContainer}>
                      <TouchableOpacity
                        style={styles.labelTypeDropdown}
                        onPress={() => {
                          // For now, cycle through options - you can implement a proper dropdown later
                          const currentType = item.labelType;
                          const types: LabelType[] = ['cooked', 'prep', 'ppds'];
                          const currentIndex = types.indexOf(currentType);
                          const nextType =
                            types[(currentIndex + 1) % types.length];
                          updateLabelType(item.uid, nextType);
                        }}>
                        <Text style={styles.labelTypeDropdownText}>
                          {item.labelType.charAt(0).toUpperCase() +
                            item.labelType.slice(1)}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromQueue(item.uid)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderInitialsSection = () => {
    // Don't render anything if initials are disabled
    if (!useInitials) {
      return null;
    }

    return (
      <View style={styles.initialsSection}>
        <View style={styles.initialsRow}>
          <Text style={styles.initialsLabel}>Initials:</Text>
          {isLoadingInitials ? (
            <View style={styles.initialsLoading}>
              <ActivityIndicator size="small" color="#8A2BE2" />
              <Text style={styles.initialsLoadingText}>Loading...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.initialsDropdown}
              onPress={() => {
                // Cycle through available initials from API
                const currentIndex = availableInitials.indexOf(initials);
                const nextInitials =
                  availableInitials[
                    (currentIndex + 1) % availableInitials.length
                  ];
                setInitials(nextInitials);
              }}>
              <Text style={styles.initialsDropdownText}>{initials}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderLabelPreview = () => {
    if (printQueue.length === 0) {
      return (
        <View style={styles.previewPlaceholder}>
          <FileText size={48} color="#ccc" />
          <Text style={styles.previewText}>
            Select items to preview labels.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.previewScroll}>
        {printQueue.map(item => (
          <View key={item.uid} style={styles.previewContainer}>
            <LabelPreview
              item={item}
              ingredients={ingredients}
              menuItems={menuItems}
              initials={useInitials ? initials : ''}
              onUpdateLabelType={updateLabelType}
              labelSettings={labelSettings}
              companyName={companyName}
            />
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
            Please log in to access the labels system.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Main Content - Using ScrollView with proper patterns */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {/* Printer Settings Section */}
        <View style={styles.settingsSection}>
          {/* Available Printers */}
          <View style={styles.printersBox}>
            {connectedDevice ? (
              <View style={styles.connectedPrinter}>
                <Printer size={20} color="#4CAF50" />
                <Text style={styles.connectedPrinterText}>
                  Connected: {connectedDevice.name || 'Unknown Device'}
                </Text>
                <CheckCircle size={16} color="#4CAF50" />
              </View>
            ) : (
              <View style={styles.noPrinter}>
                <Printer size={20} color="#666" />
                <Text style={styles.noPrinterText}>No printer connected</Text>
              </View>
            )}
          </View>

          {/* Initials Section */}
          {renderInitialsSection()}
        </View>

        {/* Ingredients/Menu Items Section */}
        <View style={styles.itemsSection}>
          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('ingredients')}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'ingredients' && styles.activeTabText,
                ]}>
                Ingredients ({ingredients.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
              onPress={() => setActiveTab('menu')}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'menu' && styles.activeTabText,
                ]}>
                Menu Items ({menuItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          {renderTabContent()}
        </View>

        {/* Print Queue Section */}
        {renderPrintQueue()}

        {/* Label Preview Section */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>
            Print Preview (Actual Size: 56mm × 31mm)
          </Text>
          <Text style={styles.previewSubtitle}>
            Preview shows exactly what will be printed on each label
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
    backgroundColor: '#f5f5f5',
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 40,
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  printersBox: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  connectedPrinter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedPrinterText: {
    flex: 1,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 8,
  },
  noPrinter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noPrinterText: {
    color: '#6c757d',
    fontSize: 14,
    marginLeft: 8,
  },
  initialsSection: {
    marginTop: 10,
  },
  initialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initialsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  initialsDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  initialsDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  initialsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  initialsLoadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },

  itemsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#8A2BE2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    // Simple container
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  itemsList: {
    // Remove maxHeight to allow proper expansion
    // maxHeight: 400,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addedButton: {
    backgroundColor: '#6c757d',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  queueSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queueHeader: {
    marginBottom: 20,
  },
  printerStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  printerStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  queueActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  printLabelsButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  printLabelsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clearQueueButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8A2BE2',
    marginLeft: 10,
  },
  clearQueueText: {
    color: '#8A2BE2',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyQueue: {
    alignItems: 'center',
    padding: 40,
  },
  emptyQueueText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyQueueSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  queueList: {
    // Remove maxHeight to allow expansion
    // maxHeight: 400,
  },
  queueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  queueItemInfo: {
    marginBottom: 10,
  },
  queueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  queueItemType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  queueItemExpiry: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarButton: {
    padding: 5,
    marginLeft: 8,
  },
  queueItemAllergens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  queueAllergenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 6,
  },
  queueAllergenText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 6,
  },
  moreAllergens: {
    fontSize: 12,
    color: '#856404',
    alignSelf: 'center',
    marginLeft: 4,
  },
  queueItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  quantityDisplay: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  labelTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginLeft: 10,
  },
  labelTypeLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  labelTypeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelTypeDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  expiryDaysInfo: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  expiryDaysText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  previewSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  previewText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 15,
  },
  previewScroll: {
    // Remove maxHeight constraint to allow expansion with new labels
  },
  previewContainer: {
    marginBottom: 20,
  },
  authRequired: {
    alignItems: 'center',
    padding: 40,
  },
  authRequiredText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  authRequiredSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#8A2BE2',
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  paginationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginHorizontal: 10,
  },

  /* Prompt modal styles */
  promptOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  promptContainer: {
    width: '88%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  promptMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 14,
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  promptButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  promptCancel: {
    backgroundColor: '#f0f0f0',
  },
  promptSubmit: {
    backgroundColor: '#8A2BE2',
  },
  promptButtonText: {
    fontSize: 14,
    color: '#333',
  },
});

export default LabelsPage;
