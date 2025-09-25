import { html, fixture, expect } from '@open-wc/testing';
import '../src/form/KeyValueEditor';
import '../src/form/ArrayEditor';

describe('Field Configuration System', () => {
  describe('KeyValueEditor', () => {
    it('should render with empty value and always show one empty row', async () => {
      const el = await fixture(html`
        <temba-key-value-editor></temba-key-value-editor>
      `);

      expect(el).to.exist;
      // Should always have at least one row (empty row)
      const rows = el.shadowRoot?.querySelectorAll('.row');
      expect(rows?.length).to.equal(1);
      // Should not have add button anymore
      expect(el.shadowRoot?.querySelector('.add-btn')).to.not.exist;
    });

    it('should render with initial values and maintain empty row', async () => {
      const initialValue = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123'
      };

      const el = await fixture(html`
        <temba-key-value-editor .value=${initialValue}></temba-key-value-editor>
      `);

      expect(el).to.exist;
      // Should have 2 data rows + 1 empty row = 3 total
      const rows = el.shadowRoot?.querySelectorAll('.row');
      expect(rows?.length).to.equal(3);
    });

    it('should emit clean values without empty rows', async () => {
      const el = await fixture(html`
        <temba-key-value-editor></temba-key-value-editor>
      `);

      let changeEvent: any = null;
      el.addEventListener('change', (e) => {
        changeEvent = e;
      });

      // Trigger a field change that should cause an update
      const keyInput = el.shadowRoot?.querySelector('temba-textinput') as any;
      if (keyInput) {
        keyInput.value = 'test-key';
        keyInput.dispatchEvent(new Event('change'));
      }

      await (el as any).updateComplete;

      expect(changeEvent).to.exist;
      // Should emit the array format with key-value pairs
      expect(changeEvent.detail.value).to.be.an('array');
      expect(changeEvent.detail.value).to.deep.include({
        key: 'test-key',
        value: ''
      });
    });

    it('should hide remove button for empty rows', async () => {
      const initialValue = {
        'Content-Type': 'application/json'
      };

      const el = await fixture(html`
        <temba-key-value-editor .value=${initialValue}></temba-key-value-editor>
      `);

      expect(el).to.exist;
      const rows = el.shadowRoot?.querySelectorAll('.row');
      expect(rows?.length).to.equal(2); // 1 data row + 1 empty row

      // First row (with data) should have remove button
      const firstRowRemoveBtn = rows?.[0]?.querySelector('.remove-btn');
      expect(firstRowRemoveBtn).to.exist;

      // Second row (empty) should have spacer instead of remove button
      const secondRowRemoveBtn = rows?.[1]?.querySelector('.remove-btn');
      const secondRowSpacer = rows?.[1]?.querySelector('.remove-btn-spacer');
      expect(secondRowRemoveBtn).to.not.exist;
      expect(secondRowSpacer).to.exist;
    });

    it('should show remove button when empty row gets content', async () => {
      const el = await fixture(html`
        <temba-key-value-editor></temba-key-value-editor>
      `);

      // Initially should have no remove button (empty row)
      let rows = el.shadowRoot?.querySelectorAll('.row');
      expect(rows?.[0]?.querySelector('.remove-btn')).to.not.exist;
      expect(rows?.[0]?.querySelector('.remove-btn-spacer')).to.exist;

      // Simulate adding content by setting value and triggering update
      (el as any).value = { 'test-key': '' };
      (el as any).requestUpdate();
      await (el as any).updateComplete;

      // Now should have remove button for the row with content
      rows = el.shadowRoot?.querySelectorAll('.row');
      expect(rows?.length).to.equal(2); // row with content + empty row
      expect(rows?.[0]?.querySelector('.remove-btn')).to.exist;
      expect(rows?.[1]?.querySelector('.remove-btn-spacer')).to.exist;
    });
  });

  describe('ArrayEditor', () => {
    it('should render with empty array', async () => {
      const itemConfig = {
        name: { type: 'text', label: 'Name', required: true },
        value: { type: 'text', label: 'Value' }
      };

      const el = await fixture(html`
        <temba-array-editor .itemConfig=${itemConfig}></temba-array-editor>
      `);

      await (el as any).updateComplete;

      expect(el).to.exist;
      // ArrayEditor with maintainEmptyItem=true doesn't show add button
      expect(el.shadowRoot?.querySelector('.add-btn')).to.not.exist;
    });

    it('should render with initial items', async () => {
      const itemConfig = {
        operator: { type: 'text', label: 'Operator' },
        value: { type: 'text', label: 'Value' }
      };

      const initialValue = [
        { operator: 'equals', value: 'test' },
        { operator: 'contains', value: 'example' }
      ];

      const el = await fixture(html`
        <temba-array-editor
          .value=${initialValue}
          .itemConfig=${itemConfig}
          itemLabel="Rule"
        ></temba-array-editor>
      `);

      expect(el).to.exist;
      const items = el.shadowRoot?.querySelectorAll('.array-item');
      // Expects 3 items: 2 initial items + 1 auto-generated empty item
      expect(items?.length).to.equal(3);
    });

    it('should render with sortable list when sortable=true', async () => {
      const itemConfig = {
        operator: { type: 'text', label: 'Operator' },
        value: { type: 'text', label: 'Value' }
      };

      const initialValue = [
        { operator: 'equals', value: 'test' },
        { operator: 'contains', value: 'example' }
      ];

      const el = await fixture(html`
        <temba-array-editor
          .value=${initialValue}
          .itemConfig=${itemConfig}
          .sortable=${true}
          itemLabel="Rule"
        ></temba-array-editor>
      `);

      await (el as any).updateComplete;

      expect(el).to.exist;

      // Should have a sortable list component
      const sortableList = el.shadowRoot?.querySelector('temba-sortable-list');
      expect(sortableList).to.exist;

      // Should have sortable items with proper classes and IDs
      const sortableItems = el.shadowRoot?.querySelectorAll('.sortable');
      expect(sortableItems?.length).to.equal(2); // Only non-empty items should be sortable

      // Each sortable item should have a unique ID
      const firstItem = sortableItems?.[0] as HTMLElement;
      const secondItem = sortableItems?.[1] as HTMLElement;
      expect(firstItem?.id).to.equal('array-item-0');
      expect(secondItem?.id).to.equal('array-item-1');
    });

    it('should not render sortable list when sortable=false', async () => {
      const itemConfig = {
        operator: { type: 'text', label: 'Operator' },
        value: { type: 'text', label: 'Value' }
      };

      const initialValue = [{ operator: 'equals', value: 'test' }];

      const el = await fixture(html`
        <temba-array-editor
          .value=${initialValue}
          .itemConfig=${itemConfig}
          .sortable=${false}
          itemLabel="Rule"
        ></temba-array-editor>
      `);

      await (el as any).updateComplete;

      expect(el).to.exist;

      // Should not have a sortable list component
      const sortableList = el.shadowRoot?.querySelector('temba-sortable-list');
      expect(sortableList).to.not.exist;

      // Should have regular list container instead
      const listContainer = el.shadowRoot?.querySelector('.list-items');
      expect(listContainer).to.exist;
    });
  });
});
