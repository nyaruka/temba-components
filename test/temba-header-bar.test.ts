import { expect, fixture } from '@open-wc/testing';
import { html } from 'lit';
import '../temba-modules';
import { HeaderBar } from '../src/layout/HeaderBar';

describe('temba-header-bar', () => {
  it('renders a fixed strip with its rule and grows slotted content', async () => {
    const bar = (await fixture(html`
      <temba-header-bar>
        <div id="content">title</div>
      </temba-header-bar>
    `)) as HeaderBar;

    const styles = getComputedStyle(bar);

    // the 52px strip plus its full-bleed 1px rule
    expect(styles.height).to.equal('53px');
    expect(styles.borderBottomWidth).to.equal('1px');
    expect(styles.display).to.equal('flex');

    // slotted content stretches to fill the strip
    const content = bar.querySelector('#content');
    expect(getComputedStyle(content).flexGrow).to.equal('1');
  });
});
