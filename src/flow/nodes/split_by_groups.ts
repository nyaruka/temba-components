import { SPLIT_GROUPS, FormData, NodeConfig, FlowTypes } from '../types';
import { Node, Category, Exit, Case } from '../../store/flow-definition.d';
import { generateUUID } from '../../utils';
import { resultNameField } from './shared';

// Helper function to create a switch router with group cases
const createGroupRouter = (
  userGroups: { uuid: string; name: string }[],
  existingCategories: Category[] = [],
  existingExits: Exit[] = [],
  existingCases: Case[] = [],
  resultName: string = ''
) => {
  const categories: Category[] = [];
  const exits: Exit[] = [];
  const cases: Case[] = [];

  // Create categories, exits, and cases for each selected group
  userGroups.forEach((group) => {
    // Try to find existing category by group name
    const existingCategory = existingCategories.find(
      (cat) => cat.name === group.name
    );
    const existingExit = existingCategory
      ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
      : null;
    const existingCase = existingCases.find(
      (c) => c.arguments?.[0] === group.uuid
    );

    const exitUuid = existingExit?.uuid || generateUUID();
    const categoryUuid = existingCategory?.uuid || generateUUID();
    const caseUuid = existingCase?.uuid || generateUUID();

    categories.push({
      uuid: categoryUuid,
      name: group.name,
      exit_uuid: exitUuid
    });

    exits.push({
      uuid: exitUuid,
      destination_uuid: existingExit?.destination_uuid || null
    });

    cases.push({
      uuid: caseUuid,
      type: 'has_group',
      arguments: [group.uuid, group.name],
      category_uuid: categoryUuid
    });
  });

  // Add default "Other" category for contacts not in any selected group
  const existingOtherCategory = existingCategories.find(
    (cat) =>
      cat.name === 'Other' &&
      !userGroups.some((group) => group.name === cat.name)
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
      operand: '@contact.groups',
      result_name: resultName
    },
    exits: exits
  };
};

export const split_by_groups: NodeConfig = {
  type: 'split_by_groups',
  name: 'Split by Group',
  group: SPLIT_GROUPS.split,
  flowTypes: [FlowTypes.VOICE, FlowTypes.MESSAGE, FlowTypes.BACKGROUND],
  form: {
    groups: {
      type: 'select',
      label: 'Groups',
      helpText:
        'Select the groups to split contacts by. Contacts will be routed based on their group membership.',
      required: true,
      options: [],
      multi: true,
      searchable: true,
      endpoint: '/api/v2/groups.json',
      valueKey: 'uuid',
      nameKey: 'name',
      placeholder: 'Search for groups...',
      allowCreate: true,
      createArbitraryOption: (input: string, options: any[]) => {
        // Check if a group with this name already exists
        const existing = options.find(
          (option) =>
            option.name.toLowerCase().trim() === input.toLowerCase().trim()
        );
        if (!existing && input.trim()) {
          return {
            name: input.trim(),
            arbitrary: true
          };
        }
        return null;
      }
    },
    result_name: resultNameField
  },
  layout: ['groups', 'result_name'],
  validate: (formData: FormData) => {
    const errors: { [key: string]: string } = {};

    if (
      !formData.groups ||
      !Array.isArray(formData.groups) ||
      formData.groups.length === 0
    ) {
      errors.groups = 'At least one group is required';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  toFormData: (node: Node) => {
    // Extract groups from the existing node structure
    const groups: { uuid: string; name: string }[] = [];

    if (node.router?.cases) {
      node.router.cases.forEach((c: Case) => {
        if (c.type === 'has_group' && c.arguments?.length >= 2) {
          groups.push({
            uuid: c.arguments[0],
            name: c.arguments[1]
          });
        }
      });
    }

    return {
      uuid: node.uuid,
      groups: groups,
      result_name: node.router?.result_name || ''
    };
  },
  fromFormData: (formData: FormData, originalNode: Node): Node => {
    // Get selected groups
    const selectedGroups = (formData.groups || [])
      .filter((group: any) => group?.uuid || group?.arbitrary)
      .map((group: any) => ({
        uuid: group.uuid || generateUUID(), // Generate UUID for arbitrary groups
        name: group.name
      }));

    // Create router and exits using existing data when possible
    const existingCategories = originalNode.router?.categories || [];
    const existingExits = originalNode.exits || [];
    const existingCases = originalNode.router?.cases || [];

    const { router, exits } = createGroupRouter(
      selectedGroups,
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
    operand: '@contact.groups'
  }
};
