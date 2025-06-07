import { html, fixture, expect } from '@open-wc/testing';
import { FormField } from '../src/formfield/FormField';
import { assertScreenshot, getClip } from './utils.test';

describe('temba-field', () => {
  it('renders field with plain text errors', async () => {
    const formField: FormField = await fixture(html`
      <temba-field
        label="Test Field"
        name="test"
        .errors=${['This is a plain text error', 'Another error message']}
      >
        <input type="text" />
      </temba-field>
    `);

    await formField.updateComplete;

    // Check that errors are rendered
    const errorElements = formField.shadowRoot.querySelectorAll('.alert-error');
    expect(errorElements.length).to.equal(2);
    expect(errorElements[0].textContent.trim()).to.equal(
      'This is a plain text error'
    );
    expect(errorElements[1].textContent.trim()).to.equal(
      'Another error message'
    );

    await assertScreenshot('formfield/plain-text-errors', getClip(formField));
  });

  it('renders field with markdown errors', async () => {
    const formField: FormField = await fixture(html`
      <temba-field
        label="Test Field"
        name="test"
        .errors=${[
          'This is **bold** text',
          'This has a [link](https://example.com)',
          'This is *italic* and **bold** with a [link](https://example.com)'
        ]}
      >
        <input type="text" />
      </temba-field>
    `);

    await formField.updateComplete;

    // Check that errors are rendered
    const errorElements = formField.shadowRoot.querySelectorAll('.alert-error');
    expect(errorElements.length).to.equal(3);

    // First error should have bold text
    const firstError = errorElements[0];
    const boldElement = firstError.querySelector('strong');
    expect(boldElement).to.not.be.null;
    expect(boldElement.textContent).to.equal('bold');

    // Second error should have a link
    const secondError = errorElements[1];
    const linkElement = secondError.querySelector('a');
    expect(linkElement).to.not.be.null;
    expect(linkElement.getAttribute('href')).to.equal('https://example.com');
    expect(linkElement.textContent).to.equal('link');

    // Third error should have both bold, italic, and link
    const thirdError = errorElements[2];
    const thirdBoldElement = thirdError.querySelector('strong');
    const thirdItalicElement = thirdError.querySelector('em');
    const thirdLinkElement = thirdError.querySelector('a');
    expect(thirdBoldElement).to.not.be.null;
    expect(thirdItalicElement).to.not.be.null;
    expect(thirdLinkElement).to.not.be.null;

    await assertScreenshot('formfield/markdown-errors', getClip(formField));
  });

  it('renders field without errors', async () => {
    const formField: FormField = await fixture(html`
      <temba-field label="Test Field" name="test">
        <input type="text" />
      </temba-field>
    `);

    await formField.updateComplete;

    // Check that no errors are rendered
    const errorElements = formField.shadowRoot.querySelectorAll('.alert-error');
    expect(errorElements.length).to.equal(0);

    await assertScreenshot('formfield/no-errors', getClip(formField));
  });

  it('renders in widget-only mode with errors', async () => {
    const formField: FormField = await fixture(html`
      <temba-field
        widget_only
        .errors=${['Widget only **error** with [link](https://example.com)']}
      >
        <input type="text" />
      </temba-field>
    `);

    await formField.updateComplete;

    // Check that error is rendered in widget-only mode
    const errorElements = formField.shadowRoot.querySelectorAll('.alert-error');
    expect(errorElements.length).to.equal(1);

    const errorElement = errorElements[0];
    const boldElement = errorElement.querySelector('strong');
    const linkElement = errorElement.querySelector('a');
    expect(boldElement).to.not.be.null;
    expect(linkElement).to.not.be.null;

    await assertScreenshot(
      'formfield/widget-only-markdown-errors',
      getClip(formField)
    );
  });
});
