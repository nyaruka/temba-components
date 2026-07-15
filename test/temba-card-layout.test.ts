import { expect, fixture, oneEvent } from '@open-wc/testing';
import { html } from 'lit';
import { SinonStub } from 'sinon';
import { CustomEventType } from '../src/interfaces';
import { Card } from '../src/layout/Card';
import { CardLayout } from '../src/layout/CardLayout';
import { mockPOST, waitForCondition } from './utils.test';

const LAYOUT = html`
  <temba-card-layout breakpoint="800">
    <div slot="main" id="main-view" style="height:200px">main content</div>
    <temba-card id="card-a" label="Alpha" icon="info">
      <div id="panel-a" style="height:30px">A</div>
    </temba-card>
    <temba-card id="card-b" label="Beta" icon="fields" count="3">
      <div id="panel-b" style="height:30px">B</div>
    </temba-card>
  </temba-card-layout>
`;

const createLayout = async (width: number, def = LAYOUT) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', `width: ${width}px; display: flex;`);
  const layout = (await fixture(def, { parentNode })) as CardLayout;
  await waitForCondition(() => layout.narrow === width < 800);
  await layout.updateComplete;
  return layout;
};

describe('temba-card-layout', () => {
  it('renders the card column when wide', async () => {
    const layout = await createLayout(1000);

    expect(layout.narrow).to.be.false;
    expect(layout.shadowRoot.querySelector('temba-card-stack')).to.exist;
    expect(layout.shadowRoot.querySelector('temba-tabs')).to.not.exist;

    layout.getCards().forEach((card) => {
      expect(card.hasAttribute('plain')).to.be.false;
      expect(card.hasAttribute('slot')).to.be.false;
    });
  });

  it('renders tabs when narrow', async () => {
    const layout = await createLayout(600);

    expect(layout.narrow).to.be.true;
    expect(layout.shadowRoot.querySelector('temba-tabs')).to.exist;
    expect(layout.shadowRoot.querySelector('temba-card-stack')).to.not.exist;

    // no card column running to the edge — the layout supplies the right
    // inset itself so every page gets the same treatment
    expect(getComputedStyle(layout).paddingRight).to.equal('8px');

    // main first, then one tab per card
    const tabs = layout.shadowRoot.querySelectorAll('temba-tab');
    expect(tabs.length).to.equal(3);
    expect(tabs[0].getAttribute('name')).to.equal('Chat');
    expect(tabs[1].getAttribute('name')).to.equal('Alpha');
    expect(tabs[2].getAttribute('name')).to.equal('Beta');

    // cards are chromeless and routed to their tab slots
    layout.getCards().forEach((card) => {
      expect(card.hasAttribute('plain')).to.be.true;
      expect(card.getAttribute('slot')).to.equal(`panel-${card.id}`);
    });
  });

  it('keeps panel instances connected across mode switches', async () => {
    const layout = await createLayout(1000);
    const panel = layout.querySelector('#panel-a');
    const main = layout.querySelector('#main-view');

    // squeeze below the breakpoint
    (layout.parentElement as HTMLElement).style.width = '600px';
    await waitForCondition(() => layout.narrow);
    await layout.updateComplete;

    expect(layout.querySelector('#panel-a')).to.equal(panel);
    expect(panel.isConnected).to.be.true;
    expect(main.isConnected).to.be.true;

    // and back out again
    (layout.parentElement as HTMLElement).style.width = '1000px';
    await waitForCondition(() => !layout.narrow);
    await layout.updateComplete;

    expect(layout.querySelector('#panel-a')).to.equal(panel);
    expect(panel.isConnected).to.be.true;
    expect(layout.querySelector('#card-a').hasAttribute('plain')).to.be.false;
  });

  it('applies an initial order', async () => {
    const layout = await createLayout(
      1000,
      html`
        <temba-card-layout breakpoint="800" order='["card-b", "card-a"]'>
          <div slot="main">main</div>
          <temba-card id="card-a" label="Alpha"><div>A</div></temba-card>
          <temba-card id="card-b" label="Beta"><div>B</div></temba-card>
        </temba-card-layout>
      `
    );

    expect(layout.getIds()).to.deep.equal(['card-b', 'card-a']);
  });

  it('computes the flip point from the column footprint by default', async () => {
    // no explicit breakpoint: flips when the main view cannot get its
    // minimum width (420) beside the column footprint (384) = 804
    const parentNode = document.createElement('div');
    parentNode.setAttribute('style', 'width: 780px; display: flex;');
    const layout = (await fixture(
      html`
        <temba-card-layout>
          <div slot="main">main</div>
          <temba-card id="card-a" label="Alpha"><div>A</div></temba-card>
        </temba-card-layout>
      `,
      { parentNode }
    )) as CardLayout;

    await waitForCondition(() => layout.narrow);
    expect(layout.shadowRoot.querySelector('temba-tabs')).to.exist;

    parentNode.style.width = '850px';
    await waitForCondition(() => !layout.narrow);
    expect(layout.shadowRoot.querySelector('temba-card-stack')).to.exist;
  });

  it('refreshes tab badges when a projected panel reports details', async () => {
    const layout = await createLayout(600);
    expect(layout.narrow).to.be.true;

    // card-b starts with count 3 on its tab
    let tabs = layout.shadowRoot.querySelectorAll('temba-tab');
    expect(tabs[2].getAttribute('count')).to.equal('3');

    layout.querySelector('#panel-b').dispatchEvent(
      new CustomEvent('temba-details-changed', {
        detail: { count: 7 },
        bubbles: true,
        composed: true
      })
    );
    await waitForCondition(() => {
      const entries = layout.shadowRoot.querySelectorAll('temba-tab');
      return entries[2].getAttribute('count') === '7';
    });

    tabs = layout.shadowRoot.querySelectorAll('temba-tab');
    expect(tabs[2].getAttribute('count')).to.equal('7');
  });

  it('shrinks tab labels when the pane is very tight', async () => {
    const layout = await createLayout(700);
    expect(layout.narrow).to.be.true;
    expect(layout.compactTabs).to.be.false;

    let tabs = layout.shadowRoot.querySelector('temba-tabs') as any;
    expect(tabs.focusedName).to.be.false;

    (layout.parentElement as HTMLElement).style.width = '500px';
    await waitForCondition(() => layout.compactTabs);
    await layout.updateComplete;

    tabs = layout.shadowRoot.querySelector('temba-tabs') as any;
    expect(tabs.focusedName).to.be.true;
  });

  it('resolves narrow when revealed inside a small pane', async () => {
    // ticket page pattern: the layout is display:none until a selection is
    // made — when revealed it must pick the right mode for its width
    const parentNode = document.createElement('div');
    parentNode.setAttribute('style', 'width: 600px; display: flex;');
    const layout = (await fixture(
      html`
        <temba-card-layout breakpoint="800" style="display: none;">
          <div slot="main">main</div>
          <temba-card id="card-a" label="Alpha"><div>A</div></temba-card>
        </temba-card-layout>
      `,
      { parentNode }
    )) as CardLayout;

    // hidden — no width yet, stays at the default
    expect(layout.narrow).to.be.false;

    layout.style.display = '';
    await waitForCondition(() => layout.narrow);
    expect(layout.shadowRoot.querySelector('temba-tabs')).to.exist;
  });

  it('goes narrow when a fixed-width sibling squeezes it', async () => {
    // ticket page pattern: a resizable list sits beside the layout
    const parentNode = document.createElement('div');
    parentNode.setAttribute('style', 'width: 1000px; display: flex;');
    const layout = (await fixture(
      html`
        <temba-card-layout
          breakpoint="800"
          style="flex: 1 1 auto; min-width: 0;"
        >
          <div slot="main">main</div>
          <temba-card id="card-a" label="Alpha"><div>A</div></temba-card>
        </temba-card-layout>
      `,
      { parentNode }
    )) as CardLayout;

    const sibling = document.createElement('div');
    sibling.setAttribute('style', 'flex: 0 0 150px;');
    parentNode.prepend(sibling);
    await waitForCondition(() => !layout.narrow);

    // widen the "ticket list" so the layout drops below the breakpoint
    sibling.style.flexBasis = '450px';
    await waitForCondition(() => layout.narrow);
    expect(layout.shadowRoot.querySelector('temba-tabs')).to.exist;
  });

  describe('settings persistence', () => {
    const SETTINGS_URL = /\/user\/settings\//;

    // HTMLElement.click() is unreliable under the puppeteer harness —
    // dispatch the click on a card's header directly
    const clickHeader = (card: Card) => {
      card.shadowRoot
        .querySelector('.card-header')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    const getSettingsPosts = () => {
      return (window.fetch as SinonStub)
        .getCalls()
        .filter(
          (call) =>
            SETTINGS_URL.test(String(call.args[0])) &&
            call.args[1]?.method === 'POST'
        )
        .map((call) => JSON.parse(call.args[1].body));
    };

    const createPersistentLayout = async (settings: string) => {
      mockPOST(SETTINGS_URL, { settings: {} });
      const initialPosts = getSettingsPosts().length;
      const layout = await createLayout(
        1000,
        html`
          <temba-card-layout
            breakpoint="800"
            settings-endpoint="/user/settings/"
            settings=${settings}
          >
            <div slot="main">main</div>
            <temba-card id="card-a" label="Alpha"><div>A</div></temba-card>
            <temba-card id="card-b" label="Beta"><div>B</div></temba-card>
          </temba-card-layout>
        `
      );
      layout.saveDelay = 10;
      return {
        layout,
        newPosts: () => getSettingsPosts().slice(initialPosts)
      };
    };

    it('seeds order and collapsed state from settings', async () => {
      const { layout } = await createPersistentLayout(
        '{"order": ["card-b", "card-a"], "collapsed": ["card-a"]}'
      );

      expect(layout.getIds()).to.deep.equal(['card-b', 'card-a']);
      expect((layout.querySelector('#card-a') as Card).collapsed).to.be.true;
      expect((layout.querySelector('#card-b') as Card).collapsed).to.be.false;
    });

    it('posts merged settings on toggle without clobbering other pages', async () => {
      // saved state includes cards this page doesn't render — card-x in the
      // order and card-z collapsed — which must survive a save from here
      const { layout, newPosts } = await createPersistentLayout(
        '{"order": ["card-b", "card-x", "card-a"], "collapsed": ["card-z", "card-a"]}'
      );
      expect(layout.getIds()).to.deep.equal(['card-b', 'card-a']);

      // expand card-a
      clickHeader(layout.querySelector('#card-a') as Card);

      await waitForCondition(() => newPosts().length > 0);
      expect(newPosts()[0]).to.deep.equal({
        contact_cards: {
          order: ['card-b', 'card-x', 'card-a'],
          collapsed: ['card-z']
        }
      });
    });

    it('posts the merged order after a drag', async () => {
      const { layout, newPosts } = await createPersistentLayout(
        '{"order": ["card-x", "card-a", "card-b"]}'
      );
      expect(layout.getIds()).to.deep.equal(['card-a', 'card-b']);

      const header = layout
        .querySelector('#card-a')
        .shadowRoot.querySelector('.card-header') as HTMLElement;
      const rect = header.getBoundingClientRect();
      const bounds = layout.getBoundingClientRect();

      await moveMouse(rect.left + rect.width / 2, rect.top + rect.height / 2);
      await mouseDown();
      await moveMouse(rect.left + rect.width / 2, bounds.bottom - 5);
      await mouseUp();

      // card-x keeps its saved slot; the present cards swap around it
      await waitForCondition(() => newPosts().length > 0);
      expect(newPosts()[0].contact_cards.order).to.deep.equal([
        'card-x',
        'card-b',
        'card-a'
      ]);
    });

    it('flushes a pending save on disconnect', async () => {
      const { layout, newPosts } = await createPersistentLayout('{}');
      layout.saveDelay = 60000;

      clickHeader(layout.querySelector('#card-a') as Card);
      expect(newPosts().length).to.equal(0);

      layout.remove();
      await waitForCondition(() => newPosts().length > 0);
      expect(newPosts()[0].contact_cards.collapsed).to.deep.equal(['card-a']);
    });
  });

  it('reorders on drag through the forwarded slots', async () => {
    const layout = await createLayout(1000);

    const header = layout
      .querySelector('#card-a')
      .shadowRoot.querySelector('.card-header') as HTMLElement;
    const rect = header.getBoundingClientRect();
    const bounds = layout.getBoundingClientRect();

    const orderChanged = oneEvent(layout, CustomEventType.OrderChanged, false);

    await moveMouse(rect.left + rect.width / 2, rect.top + rect.height / 2);
    await mouseDown();
    await moveMouse(rect.left + rect.width / 2, bounds.bottom - 5);
    await mouseUp();

    const event = await orderChanged;
    expect(event.detail.ids).to.deep.equal(['card-b', 'card-a']);
    expect(layout.getIds()).to.deep.equal(['card-b', 'card-a']);

    // a later squeeze into tabs reflects the dragged order
    (layout.parentElement as HTMLElement).style.width = '600px';
    await waitForCondition(() => layout.narrow);
    await layout.updateComplete;

    const tabs = layout.shadowRoot.querySelectorAll('temba-tab');
    expect(tabs[1].getAttribute('name')).to.equal('Beta');
    expect(tabs[2].getAttribute('name')).to.equal('Alpha');
  });
});
