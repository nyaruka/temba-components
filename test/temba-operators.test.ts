import { expect } from '@open-wc/testing';
import {
  getWaitForResponseOperators,
  operatorsToSelectOptions,
  getOperatorConfig,
  createOperatorOption,
  OPERATORS
} from '../src/flow/operators';

describe('operators', () => {
  describe('OPERATORS', () => {
    it('should have all expected operator types', () => {
      expect(OPERATORS).to.be.an('array');
      expect(OPERATORS.length).to.be.greaterThan(0);

      // verify structure of operators
      OPERATORS.forEach((op) => {
        expect(op).to.have.property('type');
        expect(op).to.have.property('name');
        expect(op).to.have.property('operands');
        expect(op.operands).to.be.a('number');
      });
    });

    it('should include location operators with filter', () => {
      const locationOps = OPERATORS.filter(
        (op) => op.filter === 'HAS_LOCATIONS'
      );
      expect(locationOps).to.have.lengthOf(3);
      expect(locationOps.map((op) => op.type)).to.include.members([
        'has_state',
        'has_district',
        'has_ward'
      ]);
    });

    it('should include hidden operators', () => {
      const hiddenOps = OPERATORS.filter((op) => op.visibility === 'hidden');
      expect(hiddenOps.length).to.be.greaterThan(0);
      expect(hiddenOps.map((op) => op.type)).to.include.members([
        'has_group',
        'has_category',
        'has_error',
        'has_value'
      ]);
    });
  });

  describe('getWaitForResponseOperators', () => {
    it('should return operators without hidden ones by default', () => {
      const operators = getWaitForResponseOperators();
      expect(operators).to.be.an('array');

      // should not include any hidden operators
      const hasHidden = operators.some((op) => op.visibility === 'hidden');
      expect(hasHidden).to.be.false;

      // should include text operators
      expect(operators.some((op) => op.type === 'has_any_word')).to.be.true;
      expect(operators.some((op) => op.type === 'has_text')).to.be.true;

      // should include number operators
      expect(operators.some((op) => op.type === 'has_number')).to.be.true;
      expect(operators.some((op) => op.type === 'has_number_eq')).to.be.true;
    });

    it('should exclude location operators when features not provided', () => {
      const operators = getWaitForResponseOperators();

      // should not include location operators without feature flag
      expect(operators.some((op) => op.type === 'has_state')).to.be.false;
      expect(operators.some((op) => op.type === 'has_district')).to.be.false;
      expect(operators.some((op) => op.type === 'has_ward')).to.be.false;
    });

    it('should exclude location operators when features array is empty', () => {
      const operators = getWaitForResponseOperators([]);

      // should not include location operators with empty features
      expect(operators.some((op) => op.type === 'has_state')).to.be.false;
      expect(operators.some((op) => op.type === 'has_district')).to.be.false;
      expect(operators.some((op) => op.type === 'has_ward')).to.be.false;
    });

    it('should include location operators when HAS_LOCATIONS feature enabled', () => {
      const operators = getWaitForResponseOperators(['HAS_LOCATIONS']);

      // should include all location operators
      expect(operators.some((op) => op.type === 'has_state')).to.be.true;
      expect(operators.some((op) => op.type === 'has_district')).to.be.true;
      expect(operators.some((op) => op.type === 'has_ward')).to.be.true;

      // should still include other operators
      expect(operators.some((op) => op.type === 'has_any_word')).to.be.true;
      expect(operators.some((op) => op.type === 'has_number')).to.be.true;

      // should still exclude hidden operators
      expect(operators.some((op) => op.type === 'has_group')).to.be.false;
      expect(operators.some((op) => op.type === 'has_value')).to.be.false;
    });

    it('should handle multiple features', () => {
      const operators = getWaitForResponseOperators([
        'HAS_LOCATIONS',
        'OTHER_FEATURE'
      ]);

      // should include location operators
      expect(operators.some((op) => op.type === 'has_state')).to.be.true;
      expect(operators.some((op) => op.type === 'has_district')).to.be.true;
      expect(operators.some((op) => op.type === 'has_ward')).to.be.true;
    });

    it('should ignore unrelated features', () => {
      const operatorsWithoutFeature = getWaitForResponseOperators();
      const operatorsWithUnrelatedFeature = getWaitForResponseOperators([
        'SOME_OTHER_FEATURE'
      ]);

      // should return same operators when feature doesn't apply to any operator
      expect(operatorsWithoutFeature.length).to.equal(
        operatorsWithUnrelatedFeature.length
      );
    });
  });

  describe('getOperatorConfig', () => {
    it('should return config for valid operator type', () => {
      const config = getOperatorConfig('has_any_word');
      expect(config).to.not.be.undefined;
      expect(config?.type).to.equal('has_any_word');
      expect(config?.name).to.equal('has any of the words');
      expect(config?.operands).to.equal(1);
    });

    it('should return config for location operators', () => {
      const stateConfig = getOperatorConfig('has_state');
      expect(stateConfig).to.not.be.undefined;
      expect(stateConfig?.type).to.equal('has_state');
      expect(stateConfig?.filter).to.equal('HAS_LOCATIONS');
      expect(stateConfig?.operands).to.equal(0);

      const districtConfig = getOperatorConfig('has_district');
      expect(districtConfig).to.not.be.undefined;
      expect(districtConfig?.operands).to.equal(1);
    });

    it('should return undefined for invalid operator type', () => {
      const config = getOperatorConfig('invalid_operator');
      expect(config).to.be.undefined;
    });

    it('should return config for hidden operators', () => {
      const config = getOperatorConfig('has_group');
      expect(config).to.not.be.undefined;
      expect(config?.visibility).to.equal('hidden');
    });
  });

  describe('operatorsToSelectOptions', () => {
    it('should convert operators to select options', () => {
      const operators = getWaitForResponseOperators();
      const options = operatorsToSelectOptions(operators);

      expect(options).to.be.an('array');
      expect(options.length).to.equal(operators.length);

      // each option should have value and name
      options.forEach((option) => {
        expect(option).to.have.property('value');
        expect(option).to.have.property('name');
        expect(option.value).to.be.a('string');
        expect(option.name).to.be.a('string');
      });
    });

    it('should map operator type to value and name to name', () => {
      const testOperators = [
        { type: 'has_any_word', name: 'has any of the words', operands: 1 }
      ];
      const options = operatorsToSelectOptions(testOperators as any);

      expect(options).to.have.lengthOf(1);
      expect(options[0].value).to.equal('has_any_word');
      expect(options[0].name).to.equal('has any of the words');
    });

    it('should handle empty array', () => {
      const options = operatorsToSelectOptions([]);
      expect(options).to.be.an('array');
      expect(options).to.have.lengthOf(0);
    });
  });

  describe('createOperatorOption', () => {
    it('should create option for valid operator', () => {
      const option = createOperatorOption('has_any_word');
      expect(option).to.have.property('value', 'has_any_word');
      expect(option).to.have.property('name', 'has any of the words');
    });

    it('should create option for location operator', () => {
      const option = createOperatorOption('has_state');
      expect(option).to.have.property('value', 'has_state');
      expect(option).to.have.property('name', 'has state');
    });

    it('should return type as name for unknown operator', () => {
      const option = createOperatorOption('unknown_op');
      expect(option).to.have.property('value', 'unknown_op');
      expect(option).to.have.property('name', 'unknown_op');
    });

    it('should handle hidden operators', () => {
      const option = createOperatorOption('has_group');
      expect(option).to.have.property('value', 'has_group');
      expect(option).to.have.property('name', 'is in the group');
    });
  });

  describe('operator operands', () => {
    it('should have correct operands for no-input operators', () => {
      const noInputOps = [
        'has_text',
        'has_number',
        'has_date',
        'has_time',
        'has_phone',
        'has_email',
        'has_state'
      ];

      noInputOps.forEach((type) => {
        const config = getOperatorConfig(type);
        expect(config?.operands).to.equal(0);
        expect(config?.categoryName).to.be.a('string');
      });
    });

    it('should have correct operands for single-value operators', () => {
      const singleValueOps = [
        'has_any_word',
        'has_all_words',
        'has_phrase',
        'has_number_eq',
        'has_number_lt',
        'has_district'
      ];

      singleValueOps.forEach((type) => {
        const config = getOperatorConfig(type);
        expect(config?.operands).to.equal(1);
      });
    });

    it('should have correct operands for two-value operators', () => {
      const twoValueOps = ['has_number_between', 'has_ward'];

      twoValueOps.forEach((type) => {
        const config = getOperatorConfig(type);
        expect(config?.operands).to.equal(2);
      });
    });
  });

  describe('operator categories', () => {
    it('should have category names for zero-operand operators', () => {
      const config = getOperatorConfig('has_text');
      expect(config?.operands).to.equal(0);
      expect(config?.categoryName).to.equal('Has Text');
    });

    it('should not have category names for operators with operands', () => {
      const config = getOperatorConfig('has_any_word');
      expect(config?.operands).to.equal(1);
      expect(config?.categoryName).to.be.undefined;
    });

    it('should have category names for location operators', () => {
      const stateConfig = getOperatorConfig('has_state');
      expect(stateConfig?.categoryName).to.equal('Has State');

      const districtConfig = getOperatorConfig('has_district');
      expect(districtConfig?.categoryName).to.equal('Has District');

      const wardConfig = getOperatorConfig('has_ward');
      expect(wardConfig?.categoryName).to.equal('Has Ward');
    });
  });
});
