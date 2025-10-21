import { COLORS, NodeConfig } from '../types';
import { Node, Category, Exit, Case } from '../../store/flow-definition.d';
import { generateUUID } from '../../utils';
import { urnSchemeMap } from '../utils';

// Helper function to get scheme options for the select dropdown
const getSchemeOptions = () => {
  return Object.entries(urnSchemeMap).map(([value, name]) => ({
    value,
    name
  }));
};

// Helper function to create a switch router with scheme cases
const createSchemeRouter = (
  selectedSchemes: string[],
  existingCategories: Category[] = [],
  existingExits: Exit[] = [],
  existingCases: Case[] = [],
  resultName: string = ''
) => {
  const categories: Category[] = [];
  const exits: Exit[] = [];
  const cases: Case[] = [];

  // Create categories, exits, and cases for each selected scheme
  selectedSchemes.forEach((scheme) => {
    const schemeName = urnSchemeMap[scheme] || scheme;

    // Try to find existing category by scheme name
    const existingCategory = existingCategories.find(
      (cat) => cat.name === schemeName
    );
    const existingExit = existingCategory
      ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
      : null;
    const existingCase = existingCases.find((c) => c.arguments?.[0] === scheme);

    const exitUuid = existingExit?.uuid || generateUUID();
    const categoryUuid = existingCategory?.uuid || generateUUID();
    const caseUuid = existingCase?.uuid || generateUUID();

    categories.push({
      uuid: categoryUuid,
      name: schemeName,
      exit_uuid: exitUuid
    });

    exits.push({
      uuid: exitUuid,
      destination_uuid: existingExit?.destination_uuid || null
    });

    cases.push({
      uuid: caseUuid,
      type: 'has_only_phrase',
      arguments: [scheme],
      category_uuid: categoryUuid
    });
  });

  // Add default "Other" category for schemes not in the selected list
  const existingOtherCategory = existingCategories.find(
    (cat) =>
      cat.name === 'Other' &&
      !selectedSchemes.some((scheme) => urnSchemeMap[scheme] === cat.name)
  );
  const existingOtherExit = existingOtherCategory
    ? existingExits.find(
        (exit) => exit.uuid === existingOtherCategory.exit_uuid
      )
    : null;

  const otherExitUuid = existingOtherExit?.uuid || generateUUID();
  const otherCategoryUuid = existingOtherCategory?.uuid || generateUUID();

  categories.push({
    uuid: otherCategoryUuid,
    name: 'Other',
    exit_uuid: otherExitUuid
  });

  exits.push({
    uuid: otherExitUuid,
    destination_uuid: existingOtherExit?.destination_uuid || null
  });

  return {
    router: {
      type: 'switch' as const,
      cases: cases,
      categories: categories,
      default_category_uuid: otherCategoryUuid,
      operand: '@(urn_parts(contact.urn).scheme)',
      result_name: resultName
    },
    exits: exits
  };
};

export const split_by_scheme: NodeConfig = {
  type: 'split_by_scheme',
  name: 'Split by URN Type',
  color: COLORS.split,
  form: {
    schemes: {
      type: 'select',
      label: 'Channel Types',
      helpText:
        "The contact's URN is the address they used to reach you such as their phone number or a Facebook ID. Select which URN types to split by below.",
      required: true,
      options: getSchemeOptions(),
      multi: true,
      searchable: true,
      placeholder: 'Select the channels to split by...'
    },
    result_name: {
      type: 'text',
      label: 'Result Name',
      required: false,
      placeholder: 'Result name (optional)',
      flavor: 'small',
      helpText: 'The name to use to reference this result in the flow'
    }
  },
  layout: ['schemes', 'result_name'],
  validate: (formData: any) => {
    const errors: { [key: string]: string } = {};

    if (
      !formData.schemes ||
      !Array.isArray(formData.schemes) ||
      formData.schemes.length === 0
    ) {
      errors.schemes = 'At least one channel type is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node) => {
    // Extract schemes from the existing node structure
    const schemes: string[] = [];

    if (node.router?.cases) {
      node.router.cases.forEach((c: Case) => {
        if (c.type === 'has_only_phrase' && c.arguments?.length > 0) {
          schemes.push(c.arguments[0]);
        }
      });
    }

    return {
      uuid: node.uuid,
      schemes: schemes.map((scheme) => ({
        value: scheme,
        name: urnSchemeMap[scheme] || scheme
      })),
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: any, originalNode: Node): Node => {
    // Get selected schemes (handle both array of objects and array of strings)
    const selectedSchemes = (formData.schemes || [])
      .filter((scheme: any) => scheme)
      .map((scheme: any) =>
        typeof scheme === 'string' ? scheme : scheme.value
      );

    // Create router and exits using existing data when possible
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createSchemeRouter(
      selectedSchemes,
      existingCategories,
      existingExits,
      existingCases,
      formData.result_name || ''
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
    type: 'switch',
    operand: '@(urn_parts(contact.urn).scheme)'
  }
};
