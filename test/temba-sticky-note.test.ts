import { fixture, expect, html } from '@open-wc/testing';
import { StickyNote } from '../src/flow/StickyNote';
import { StickyNote as StickyNoteData } from '../src/store/flow-definition';
import { assertScreenshot, getClip } from './utils.test';

describe('StickyNote', () => {
  const mockStickyData: StickyNoteData = {
    position: { left: 100, top: 200 },
    title: 'Test Title',
    body: 'Test body content',
    color: 'yellow'
  };

  const createStickyNote = async (data: StickyNoteData, uuid: string = 'test-uuid') => {
    const component = await fixture(html`<temba-sticky-note></temba-sticky-note>`) as StickyNote;
    component.uuid = uuid;
    component.data = data;
    await component.updateComplete;
    return component;
  };

  it('renders with default yellow color', async () => {
    const component = await createStickyNote(mockStickyData);
    
    console.log('Component type:', typeof component);
    console.log('Component constructor:', component.constructor.name);
    console.log('Is StickyNote?', component instanceof StickyNote);

    expect(component).to.be.instanceOf(StickyNote);
    expect(component.data).to.exist;
    expect(component.data.color).to.equal('yellow');
    
    const stickyNote = component.shadowRoot?.querySelector('.sticky-note');
    expect(stickyNote).to.exist;
    expect(stickyNote?.classList.contains('yellow')).to.be.true;
  });

  it('renders color picker in bottom right corner', async () => {
    const component = await createStickyNote(mockStickyData);

    const colorPicker = component.shadowRoot?.querySelector('.color-picker');
    expect(colorPicker).to.exist;

    // Check for color options
    const colorOptions = component.shadowRoot?.querySelector('.color-options');
    expect(colorOptions).to.exist;
    
    const colorOptionElements = component.shadowRoot?.querySelectorAll('.color-option');
    expect(colorOptionElements).to.have.lengthOf(5);
  });

  it('shows color options on hover', async () => {
    const component = await createStickyNote(mockStickyData);

    const colorPicker = component.shadowRoot?.querySelector('.color-picker') as HTMLElement;
    expect(colorPicker).to.exist;

    // Simulate mouse enter
    const mouseEnterEvent = new MouseEvent('mouseenter');
    colorPicker.dispatchEvent(mouseEnterEvent);
    
    await component.updateComplete;

    const colorOptions = component.shadowRoot?.querySelector('.color-options');
    expect(colorOptions?.classList.contains('expanded')).to.be.true;
  });

  it('hides color options on mouse leave', async () => {
    const component = await createStickyNote(mockStickyData);

    const colorPicker = component.shadowRoot?.querySelector('.color-picker') as HTMLElement;

    // First expand
    const mouseEnterEvent = new MouseEvent('mouseenter');
    colorPicker.dispatchEvent(mouseEnterEvent);
    await component.updateComplete;

    // Then collapse
    const mouseLeaveEvent = new MouseEvent('mouseleave');
    colorPicker.dispatchEvent(mouseLeaveEvent);
    await component.updateComplete;

    const colorOptions = component.shadowRoot?.querySelector('.color-options');
    expect(colorOptions?.classList.contains('expanded')).to.be.false;
  });
});