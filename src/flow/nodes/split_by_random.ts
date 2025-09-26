import { COLORS, NodeConfig } from '../types';
import { Node, Category, Exit } from '../../store/flow-definition.d';
import { generateUUID } from '../../utils';

// Helper function to create a random router with categories
const createRandomRouter = (
  userCategories: string[],
  existingCategories: Category[] = [],
  existingExits: Exit[] = []
) => {
  const categories: Category[] = [];
  const exits: Exit[] = [];

  // Create categories and exits for user-defined buckets
  userCategories.forEach((categoryName) => {
    // Try to find existing category by name
    const existingCategory = existingCategories.find(
      (cat) => cat.name === categoryName
    );
    const existingExit = existingCategory
      ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
      : null;

    const exitUuid = existingExit?.uuid || generateUUID();
    const categoryUuid = existingCategory?.uuid || generateUUID();

    categories.push({
      uuid: categoryUuid,
      name: categoryName,
      exit_uuid: exitUuid
    });

    exits.push({
      uuid: exitUuid,
      destination_uuid: existingExit?.destination_uuid || null
    });
  });

  return {
    router: {
      type: 'random' as const,
      categories: categories
    },
    exits: exits
  };
};

export const split_by_random: NodeConfig = {
  type: 'split_by_random',
  name: 'Split by Random',
  color: COLORS.split,
  form: {
    categories: {
      type: 'array',
      label: 'Buckets',
      helpText: 'Define the buckets to randomly split contacts into',
      required: true,
      itemLabel: 'Bucket',
      sortable: true,
      minItems: 2,
      maxItems: 10,
      isEmptyItem: (item: any) => {
        return !item.name || item.name.trim() === '';
      },
      itemConfig: {
        name: {
          type: 'text',
          placeholder: 'Bucket name',
          required: true
        }
      }
    }
  },
  layout: ['categories'],
  validate: (formData: any) => {
    const errors: { [key: string]: string } = {};

    // Check for duplicate category names
    if (formData.categories && Array.isArray(formData.categories)) {
      const categories = formData.categories.filter(
        (item: any) => item?.name && item.name.trim() !== ''
      );

      // Ensure minimum buckets
      if (categories.length < 2) {
        errors.categories = 'At least 2 buckets are required for random split';
      }

      // Find all categories that have duplicates (case-insensitive)
      const duplicateCategories = [];
      const lowerCaseMap = new Map();

      // First pass: map lowercase names to all original cases
      categories.forEach((category) => {
        const lowerName = category.name.trim().toLowerCase();
        if (!lowerCaseMap.has(lowerName)) {
          lowerCaseMap.set(lowerName, []);
        }
        lowerCaseMap.get(lowerName).push(category.name.trim());
      });

      // Second pass: collect all names that appear more than once
      lowerCaseMap.forEach((originalNames) => {
        if (originalNames.length > 1) {
          duplicateCategories.push(...originalNames);
        }
      });

      if (duplicateCategories.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateCategories)];
        errors.categories = `Duplicate bucket names found: ${uniqueDuplicates.join(
          ', '
        )}`;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node) => {
    // Extract categories from the existing node structure
    const categories =
      node.router?.categories?.map((cat) => ({ name: cat.name })) || [];

    return {
      uuid: node.uuid,
      categories: categories
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Get user categories
    const userCategories = (formData.categories || [])
      .filter((item: any) => item?.name?.trim())
      .map((item: any) => item.name.trim());

    // Create router and exits using existing data when possible
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];

    const { router, exits } = createRandomRouter(
      userCategories,
      existingCategories,
      existingExits
    );

    // Return the complete node
    return {
      uuid: originalNode.uuid,
      actions: originalNode.actions || [],
      router: router,
      exits: exits
    };
  },
  router: {
    type: 'random'
  }
};
