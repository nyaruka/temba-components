import { FormData, TextFieldConfig } from '../types';
import { Node } from '../../store/flow-definition';

/**
 * Shared result_name field configuration for router nodes.
 * This provides a consistent "Save as..." optional field interface across all splits.
 *
 * The field is hidden by default and revealed via a "Save as..." link.
 * Once revealed, it cannot be hidden again (the link disappears).
 * If the field already has a value, it's shown immediately without the link.
 */
export const resultNameField: TextFieldConfig = {
  type: 'text',
  label: 'Result Name',
  required: false,
  placeholder: '(optional)',
  helpText: 'The name to use to reference this result in the flow',
  optionalLink: 'Save result as...'
};

/**
 * Shared category localization functions for router nodes.
 * These provide a consistent way to localize category names across all router types.
 */

/**
 * Converts a node's categories to localization form data.
 * @param node - The node containing categories to localize
 * @param localization - The existing localization data for this language
 * @returns Form data with category UUIDs mapped to original and localized names
 */
export function categoriesToLocalizationFormData(
  node: Node,
  localization: Record<string, any>
): FormData {
  const categories = node.router?.categories || [];
  const localizationData: Record<string, any> = {};

  categories.forEach((category: any) => {
    const categoryUuid = category.uuid;
    const categoryLocalization = localization[categoryUuid];

    localizationData[categoryUuid] = {
      originalName: category.name,
      localizedName:
        categoryLocalization && categoryLocalization.name
          ? Array.isArray(categoryLocalization.name)
            ? categoryLocalization.name[0] || ''
            : categoryLocalization.name
          : ''
    };
  });

  return {
    categories: localizationData
  };
}

/**
 * Converts localization form data back to the localization structure.
 * @param formData - The form data containing category localizations
 * @param _node - The original node (reserved for future validation)
 * @returns Record mapping category UUIDs to their localization data
 */
export function localizationFormDataToCategories(
  formData: FormData,
  _node: Node
): Record<string, any> {
  const localizationData: Record<string, any> = {};

  if (formData.categories) {
    Object.keys(formData.categories).forEach((categoryUuid) => {
      const categoryData = formData.categories[categoryUuid];
      const localizedName = categoryData.localizedName?.trim() || '';
      const originalName = categoryData.originalName?.trim() || '';

      // Only save if localized name is different from original and not empty
      if (localizedName && localizedName !== originalName) {
        localizationData[categoryUuid] = {
          name: [localizedName]
        };
      }
    });
  }

  return localizationData;
}
