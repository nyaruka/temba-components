import { fixture, expect, assert } from '@open-wc/testing';
import { TextInput } from '../src/textinput/TextInput';
import { assertScreenshot, getAttributes, getClip } from './utils.test';

export const getInputHTML = (attrs: any = { value: 'hello world' }) => {
  return `<temba-textinput ${getAttributes(attrs)}></temba-textinput>`;
};

export const createInput = async (def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 250px;');
  const input: TextInput = await fixture(def, { parentNode });
  return input;
};

describe('temba-textinput', () => {
  it('can be created', async () => {
    const input: TextInput = await createInput(getInputHTML());
    assert.instanceOf(input, TextInput);
    await assertScreenshot('textinput/input', getClip(input));
  });

  it('shows placeholder', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ placeholder: 'Enter some text' })
    );

    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;

    expect(widget.placeholder).to.equal('Enter some text');
    await assertScreenshot('textinput/input-placeholder', getClip(input));
  });

  it('should focus inputs on click', async () => {
    const input: TextInput = await createInput(getInputHTML());
    await click('temba-textinput');
    await assertScreenshot('textinput/input-focused', getClip(input));
  });

  it('should render textarea', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world', textarea: true })
    );
    assert.instanceOf(input, TextInput);
    await assertScreenshot('textinput/textarea', getClip(input));
  });

  it('should focus textarea on click', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world', textarea: true })
    );
    await click('temba-textinput');
    await assertScreenshot('textinput/textarea-focused', getClip(input));
  });

  it('takes internal input changes', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world' })
    );

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal('INPUT');
    expect(widget.disabled).to.equal(false);

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('to the ');

    // should be reflected on our main input
    expect(input.value).to.equal('hello to the world');
  });

  it('does not take internal input changes for disabled', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world', disabled: true })
    );

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal('INPUT');
    expect(widget.disabled).to.equal(true);

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('to the ');

    // should be reflected on our main input
    expect(input.value).to.equal('hello world');
    await assertScreenshot('textinput/input-disabled', getClip(input));
  });

  it('takes internal textarea changes', async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world', textarea: true })
    );

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal('TEXTAREA');
    expect(widget.disabled).to.equal(false);

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('to the ');

    // should be reflected on our main input
    expect(input.value).to.equal('hello to the world');
  });

  it('does not take internal textarea changes for disabled', async () => {
    const input: TextInput = await fixture(
      getInputHTML({ value: 'hello world', textarea: true, disabled: true })
    );

    // trigger a change on our internal widget
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.tagName).to.equal('TEXTAREA');
    expect(widget.disabled).to.equal(true);

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('to the ');

    // should be reflected on our main input
    expect(input.value).to.equal('hello world');
  });

  it("doesn't advance cursor on GSM character replacement", async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world', textarea: true, gsm: true })
    );
    input.value = 'Let’s try some text with a funny tick.';

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('replaced ');

    expect(input.value).to.equal(
      "Let's try some text with a funny replaced tick."
    );
  });

  it("doesn't move cursor to the end on insert in input", async () => {
    const input: TextInput = await createInput(
      getInputHTML({ value: 'hello world' })
    );

    // focus our widget, move back a few spots and insert some text
    await click('temba-textinput');
    await pressKey('ArrowLeft', 5);
    await type('sad, sad ');

    expect(input.value).to.equal('hello sad, sad world');
    await assertScreenshot('textinput/input-inserted', getClip(input));
  });

  it('shows form attributes', async () => {
    const input: TextInput = await createInput(
      getInputHTML({
        name: 'message',
        value: 'hello world',
        label: 'Your Message',
        // eslint-disable-next-line @typescript-eslint/camelcase
        help_text: 'Enter your message here',
      })
    );
    await assertScreenshot('textinput/input-form', getClip(input));
  });

  it('updates input value', async () => {
    const input: TextInput = await createInput(
      getInputHTML({
        value: 'hello world',
      })
    );

    input.value = 'Updated by attribute change';
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;

    await assertScreenshot('textinput/input-updated', getClip(input));
    expect(widget.value).to.equal('Updated by attribute change');
  });

  it('shows datepicker placeholder in a form', async () => {
    const input: TextInput = await createInput(
      getInputHTML({
        name: 'Date',
        label: 'Your Date',
        datepicker: true,
        placeholder: 'Select a date',
        // eslint-disable-next-line @typescript-eslint/camelcase
        help_text: 'Dates can be helpful',
      })
    );

    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.placeholder).to.equal('Select a date');
    await assertScreenshot('textinput/date-form', getClip(input));
  });

  it('shows initialized date', async () => {
    const input: TextInput = await createInput(
      getInputHTML({
        datepicker: true,
        placeholder: 'Select a date',
        value: '2020-04-20',
      })
    );

    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.value).to.equal('2020-04-20');

    await waitFor(500);
    await click('temba-textinput');
    await waitFor(500);

    const clip = getClip(input);

    // account for the portaled date picker
    clip.height += 325;
    clip.width += 55;

    await assertScreenshot('textinput/date-initialized', clip);
  });

  it('updates on date selection', async () => {
    const input: TextInput = await createInput(
      getInputHTML({
        datepicker: true,
        placeholder: 'Select a date',
        value: '2020-04-20',
      })
    );

    // open our picker
    await waitFor(500);
    await click('temba-textinput');
    await waitFor(500);

    // click on a new date
    const newDate = document.querySelectorAll(
      ".flatpickr-day[aria-label='April 21, 2020']"
    )[1] as HTMLSpanElement;
    newDate.click();

    // make sure it updated
    const widget = input.shadowRoot.querySelector(
      '.textinput'
    ) as HTMLInputElement;
    expect(widget.value).to.equal('April 21, 2020');
  });
});
