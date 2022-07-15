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
    expect(slider.value).to.equal('5');
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
    expect(slider.value).to.equal('0');
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
    expect(slider.value).to.equal('5');
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
    expect(slider.value).to.equal('105');
    await assertScreenshot(
      'slider/default-min-default-max-invalid-value',
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
    expect(slider.value).to.equal('0');
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
    expect(slider.value).to.equal('100');
    await assertScreenshot(
      'slider/no-visible-range-invalid-value',
      getClip(slider)
    );
  });

  it('updates slider position on element value change', async () => {
    const slider: TembaSlider = await fixture(html`
      <temba-slider
        label="My Slider"
        min="0"
        max="100"
        value="50"
        range
      ></temba-slider>
    `);
    slider.value = '75';
    expect(slider.value).to.equal('75');
    await assertScreenshot(
      'slider/update-slider-on-value-change',
      getClip(slider)
    );
  });

  // it('updates slider position on when track clicked', async () => {
  //   const slider: TembaSlider = await fixture(html`
  //     <temba-slider label="My Slider" value="50"></temba-slider>
  //   `);
  //   console.log('after fixture, before get bounding client rect');
  //   const clip = slider.getBoundingClientRect();
  //   console.log(clip);
  //   // initial circle is at x,y position (50)
  //   const x = clip.x + (clip.width / 2);
  //   let y = clip.y + (clip.height / 2);
  //   // update circle to x1,y1 position (75) via clicking the track
  //   const x1 = clip.x + (clip.width / 4);
  //   const y1 = clip.x + (clip.width / 2);
  //   // relative distance from 50 to 75
  //   let px = x1 - x;
  //   let py = y1 - y;
  //   console.log('after get bounding client rect, before mouse move');
  //   await moveMouse(px, py);
  //   console.log('after mouse move, before click');
  //   slider.click();
  //   console.log('after click, before expect');
  //   expect(slider.value).to.equal('75');
  //   await assertScreenshot('slider/update-slider-on-track-clicked', getClip(slider));
  // });

  // it('updates slider position on circle drag', async () => {
  //   const slider: TembaSlider = await fixture(html`
  //     <temba-slider label="My Slider" value="50"></temba-slider>
  //   `);
  //   console.log('after fixture, before get bounding client rect');
  //   const clip = slider.getBoundingClientRect();
  //   console.log(clip);
  //   // initial circle is at x,y position (50)
  //   const x = clip.x + (clip.width / 2);
  //   const y = clip.y + (clip.height / 2);
  //   console.log('after get bounding client rect, before mouse move');
  //   await moveMouse(x, y);
  //   console.log('after mouse move, before mouse down');
  //   await mouseDown();
  //   console.log('after mouse down, before mouse move');
  //   // update circle to x1,y1 position (75) via dragging the circle
  //   const x1 = clip.x + (clip.width / 4);
  //   const y1 = clip.x + (clip.width / 2);
  //   // relative distance from 50 to 75
  //   let px = x1 - x;
  //   let py = y1 - y;
  //   await moveMouse(px, py);
  //   console.log('after mouse move, before mouse up');
  //   await mouseUp();
  //   console.log('after mouse up, before expect');
  //   expect(slider.value).to.equal('75');
  //   await assertScreenshot('slider/update-slider-on-value-change', getClip(slider));
  // });
});
