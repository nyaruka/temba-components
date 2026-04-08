import {
  FormData,
  TextFieldConfig,
  AccordionLayoutConfig,
  CheckboxFieldConfig
} from '../types';
import { Node } from '../../store/flow-definition';
import { getOperatorConfig } from '../operators';

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
  required: false,
  placeholder: '(optional)',
  helpText: 'The name to use to reference this result in the flow'
};

/**
 * Shared localization requirement fields for router nodes.
 * These provide checkboxes for "Require rules to be localized" and
 * "Require categories to be localized" in a collapsible accordion.
 */
export const localizeRulesField: CheckboxFieldConfig = {
  type: 'checkbox',
  label: 'Require rules to be localized',
  helpText: 'Each language must specify its own rules for this node'
};

export const localizeCategoriesField: CheckboxFieldConfig = {
  type: 'checkbox',
  label: 'Require categories to be localized',
  helpText: (formData: FormData) => {
    const name = formData.result_name?.trim();
    if (name) {
      const key = name.toLowerCase().replace(/\s+/g, '_');
      return `Only enable if you plan to use @results.${key}.category_localized`;
    }
    return 'Only enable if you plan to use category_localized in your expressions for this result';
  },
  conditions: {
    visible: (formData: FormData) => !!formData.result_name
  }
};

const resultNameSection = {
  label: 'Save Result',
  localizable: false,
  items: ['result_name'],
  collapsed: (formData: FormData) => !(formData._isNew && formData.result_name),
  getValueCount: (formData: FormData) => !!formData.result_name
};

const advancedSection = {
  label: 'Localization',
  localizable: false,
  items: ['localizeRules', 'localizeCategories'],
  collapsed: true,
  getValueCount: (formData: FormData) =>
    !!(formData.localizeRules || formData.localizeCategories)
};

export const nodeOptionsAccordion: AccordionLayoutConfig = {
  type: 'accordion',
  multi: true,
  sections: [resultNameSection, advancedSection]
};

export const nodeOptionsAccordionSimple: AccordionLayoutConfig = {
  type: 'accordion',
  multi: true,
  sections: [resultNameSection]
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

  // Also include rule (case) argument localizations
  const cases = node.router?.cases || [];
  const rulesData: Record<string, any> = {};

  cases.forEach((c: any) => {
    if (!c.arguments?.length || !c.arguments.some((a: string) => a)) return;

    const caseLocalization = localization[c.uuid];
    const operatorName = getOperatorConfig(c.type)?.name || c.type;
    rulesData[c.uuid] = {
      operatorName,
      originalArguments: [...c.arguments],
      localizedArguments:
        caseLocalization?.arguments
          ? [...caseLocalization.arguments]
          : c.arguments.map(() => '')
    };
  });

  return {
    categories: localizationData,
    rules: rulesData
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

  // Also process rule localizations
  if (formData.rules) {
    Object.keys(formData.rules).forEach((caseUuid) => {
      const ruleData = formData.rules[caseUuid];
      const localized = ruleData.localizedArguments || [];
      const original = ruleData.originalArguments || [];

      // Save if any argument differs from original and is non-empty
      const hasLocalization = localized.some(
        (arg: string, i: number) => arg?.trim() && arg.trim() !== (original[i] || '')
      );

      if (hasLocalization) {
        localizationData[caseUuid] = {
          arguments: localized.map((a: string) => a?.trim() || '')
        };
      }
    });
  }

  return localizationData;
}
