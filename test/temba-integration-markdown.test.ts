import { html, fixture, expect } from '@open-wc/testing';
import { Checkbox } from '../src/form/Checkbox';
import { assertScreenshot, getClip } from './utils.test';

describe('FormElement markdown integration', () => {
  it('renders checkbox with markdown errors', async () => {
    const checkbox: Checkbox = await fixture(html`
      <temba-checkbox
        label="Accept Terms"
        .errors=${[
          'Please read the **terms and conditions** at [this link](https://example.com)',
          'This field *requires* acceptance'
        ]}
      ></temba-checkbox>
    `);

    await checkbox.updateComplete;

    // Check that errors are rendered with markdown directly in checkbox shadow root
    const errorElements = checkbox.shadowRoot.querySelectorAll('.alert-error');
    expect(errorElements.length).to.equal(2);

    // First error should have bold text and link
    const firstError = errorElements[0];
    const boldElement = firstError.querySelector('strong');
    const linkElement = firstError.querySelector('a');
    expect(boldElement).to.not.be.null;
    expect(boldElement.textContent).to.equal('terms and conditions');
    expect(linkElement).to.not.be.null;
    expect(linkElement.getAttribute('href')).to.equal('https://example.com');

    // Second error should have italic text
    const secondError = errorElements[1];
    const italicElement = secondError.querySelector('em');
    expect(italicElement).to.not.be.null;
    expect(italicElement.textContent).to.equal('requires');

    await assertScreenshot(
      'integration/checkbox-markdown-errors',
      getClip(checkbox)
    );
  });
});
