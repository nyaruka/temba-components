import { html, fixture, expect } from '@open-wc/testing';
import { TembaSlider } from '../src/slider/TembaSlider';
import { assertScreenshot, getClip } from './utils.test';

describe('temba-slider', () => {
  it('renders default slider', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider"></temba-slider>
    `);

    expect(slider.label).to.equal('My Slider');
    await assertScreenshot('slider/default', getClip(slider));
  });

  it('renders a slider with visible range - custom min default max no value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" min="5" range></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(5);
    expect(slider.max).to.equal(100);
    expect(slider.value).to.equal('');
    await assertScreenshot(
      'slider/custom-min-default-max-no-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - default min custom max no value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" max="105" range></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(0);
    expect(slider.max).to.equal(105);
    expect(slider.value).to.equal('');
    await assertScreenshot(
      'slider/default-min-custom-max-no-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - custom min custom max no value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" min="5" max="105" range></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(5);
    expect(slider.max).to.equal(105);
    expect(slider.value).to.equal('');
    await assertScreenshot(
      'slider/default-min-default-max-valid-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - custom min custom max valid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider
        label="My Slider"
        min="5"
        max="105"
        value="55"
        range
      ></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(5);
    expect(slider.max).to.equal(105);
    expect(slider.value).to.equal('55');
    await assertScreenshot(
      'slider/custom-min-custom-max-valid-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - custom min custom max invalid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider
        label="My Slider"
        min="5"
        max="105"
        value="150"
        range
      ></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(5);
    expect(slider.max).to.equal(105);
    expect(slider.value).to.equal('150');
    await assertScreenshot(
      'slider/default-min-default-max-invalid-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - inverted min inverted max no value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" min="100" max="0" range></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(100);
    expect(slider.max).to.equal(0);
    expect(slider.value).to.equal('');
    await assertScreenshot(
      'slider/inverted-min-inverted-max-no-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - inverted min inverted max valid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider
        label="My Slider"
        min="100"
        max="0"
        value="50"
        range
      ></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(100);
    expect(slider.max).to.equal(0);
    expect(slider.value).to.equal('50');
    await assertScreenshot(
      'slider/inverted-min-inverted-max-valid-value',
      getClip(slider)
    );
  });

  it('renders a slider with visible range - inverted min inverted max invalid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider
        label="My Slider"
        min="100"
        max="0"
        value="150"
        range
      ></temba-slider>
    `);
    expect(slider.range).to.equal(true);
    expect(slider.min).to.equal(100);
    expect(slider.max).to.equal(0);
    expect(slider.value).to.equal('150');
    await assertScreenshot(
      'slider/inverted-min-inverted-max-invalid-value',
      getClip(slider)
    );
  });

  it('renders a slider without visible range - default min default max no value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider"></temba-slider>
    `);
    expect(slider.range).to.equal(false);
    expect(slider.min).to.equal(0);
    expect(slider.max).to.equal(100);
    expect(slider.value).to.equal('');
    await assertScreenshot('slider/no-visible-range-no-value', getClip(slider));
  });

  it('renders a slider without visible range - default min default max valid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" value="50"></temba-slider>
    `);
    expect(slider.range).to.equal(false);
    expect(slider.min).to.equal(0);
    expect(slider.max).to.equal(100);
    expect(slider.value).to.equal('50');
    await assertScreenshot(
      'slider/no-visible-range-valid-value',
      getClip(slider)
    );
  });

  it('renders a slider without visible range - default min default max invalid value', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider label="My Slider" value="150"></temba-slider>
    `);
    expect(slider.range).to.equal(false);
    expect(slider.min).to.equal(0);
    expect(slider.max).to.equal(100);
    expect(slider.value).to.equal('150');
    await assertScreenshot(
      'slider/no-visible-range-invalid-value',
      getClip(slider)
    );
  });

  // it('updates slider position on element value change', async () => {
  //   const slider: TembaSlider = await fixture(html`
  //     <temba-slider label="My Slider" value="50"></temba-slider>
  //   `);
  //   // if clientX/pageX = 408, value = 75
  //   const changedProperties: Map<string, any> = new Map<string, any>([['value', '50']]);
  //   await slider.updated(changedProperties);
  //   expect(slider.value).to.equal('75');
  //   await assertScreenshot('slider/update-slider-on-value-change', getClip(slider));
  // });

  // it('updates slider position on when track clicked', async () => {
  //   const slider: TembaSlider = await fixture(html`
  //     <temba-slider label="My Slider" value="50"></temba-slider>
  //   `);
  //   // if clientX/pageX = 440, value = 82
  //   const evt: MouseEvent = new MouseEvent('mousedown', {
  //     pageX: 440,
  //     clientX: 440,
  //     clientY: 5,
  //     bubbles: true,
  //     cancelable: true,
  //     view: window
  //   });
  //   await slider.handleTrackDown(evt);
  //   expect(slider.value).to.equal('82');
  //   await assertScreenshot('slider/update-slider-on-track-clicked', getClip(slider));
  // });

  // it('updates slider position on circle drag', async () => {
  //   const slider: TembaSlider = await fixture(html`
  //     <temba-slider label="My Slider" value="50"></temba-slider>
  //   `);
  //   // if clientX/pageX = 342, value = 59
  //   const evt: MouseEvent = new MouseEvent('mouseup', {
  //     pageX: 440,
  //     clientX: 342,
  //     clientY: 5,
  //     bubbles: true,
  //     cancelable: true,
  //     view: window
  //   });
  //   await slider.handleMouseUp(evt);
  //   expect(slider.value).to.equal('59');
  //   await assertScreenshot('slider/update-slider-on-value-change', getClip(slider));
  // });
});
