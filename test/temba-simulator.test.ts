import { fixture, expect, assert } from '@open-wc/testing';
import { Simulator } from '../src/simulator/Simulator';
import {
  assertScreenshot,
  getClip,
  mockPOST,
  clearMockPosts,
  delay,
  waitForCondition,
  loadStore
} from './utils.test';

const FLOW_UUID = 'test-flow-123';

const createSimulator = async (attrs: any = {}) => {
  // load store first since simulator depends on it
  await loadStore();

  const defaults = {
    flow: FLOW_UUID,
    animationTime: '0' // disable animations for deterministic tests
  };
  const mergedAttrs = { ...defaults, ...attrs };

  const attrString = Object.entries(mergedAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const simulator: Simulator = await fixture(
    `<temba-simulator ${attrString}></temba-simulator>`
  );

  // reset cookie-based properties for deterministic tests
  simulator.size = 'medium';
  (simulator as any).following = true;
  (simulator as any).contextExplorerOpen = false;
  await simulator.updateComplete;

  return simulator;
};

// helper to open the simulator
const openSimulator = async (simulator: Simulator) => {
  const tab = simulator.shadowRoot.querySelector('temba-floating-tab') as any;
  expect(tab).to.exist;

  // trigger the button clicked event on the tab
  tab.dispatchEvent(new CustomEvent('temba-button-clicked', { bubbles: true }));

  await simulator.updateComplete;
  // brief delay for async API mock processing
  await delay(50);
};

// helper to get clip for the simulator window (fixed positioning)
const getSimulatorClip = (
  simulator: Simulator,
  includeContext: boolean = false
) => {
  const phoneWindow = simulator.shadowRoot.querySelector(
    'temba-floating-window'
  ) as any;

  if (!phoneWindow) {
    // if window not open, use default clip
    return getClip(simulator);
  }

  const windowElement = phoneWindow.shadowRoot?.querySelector(
    '.window'
  ) as HTMLElement;
  if (!windowElement) {
    return getClip(simulator);
  }

  const windowBounds = windowElement.getBoundingClientRect();

  if (includeContext) {
    // get the context explorer and phone to clip just those areas
    const phoneSimulator = phoneWindow.querySelector(
      '.phone-simulator'
    ) as HTMLElement;
    if (!phoneSimulator) {
      return getClip(simulator);
    }

    const contextExplorer = phoneSimulator.querySelector(
      '.context-explorer'
    ) as HTMLElement;
    const phoneFrame = phoneSimulator.querySelector(
      '.phone-frame'
    ) as HTMLElement;

    if (!contextExplorer || !phoneFrame) {
      return {
        x: windowBounds.x,
        y: windowBounds.y,
        width: windowBounds.width,
        height: windowBounds.height
      };
    }

    const contextBounds = contextExplorer.getBoundingClientRect();
    const phoneBounds = phoneFrame.getBoundingClientRect();

    // clip from the left edge of context explorer to the right edge of phone frame only
    // do not include the option-pane which is to the right of the phone
    // keep padding within the phone bounds to avoid capturing the gap to the option pane
    const padding = 10;
    const leftX = contextBounds.x - padding;

    // don't extend past the phone frame right edge - the option pane is close by
    const rightX = phoneBounds.right;

    const topY = Math.min(contextBounds.y, phoneBounds.y) - padding;
    const bottomY =
      Math.max(contextBounds.bottom, phoneBounds.bottom) + padding;

    return {
      x: leftX,
      y: topY,
      width: rightX - leftX,
      height: bottomY - topY
    };
  }

  // the phone-simulator is in the light DOM of the phoneWindow (slotted content)
  const phoneSimulator = phoneWindow.querySelector(
    '.phone-simulator'
  ) as HTMLElement;
  if (!phoneSimulator) {
    return getClip(simulator);
  }

  // get the phone-frame from within the phone-simulator
  const phoneFrame = phoneSimulator.querySelector(
    '.phone-frame'
  ) as HTMLElement;
  if (!phoneFrame) {
    // fallback to window bounds if phone-frame not found
    return {
      x: windowBounds.x,
      y: windowBounds.y,
      width: windowBounds.width,
      height: windowBounds.height
    };
  }

  const frameBounds = phoneFrame.getBoundingClientRect();

  // add padding around the phone frame
  const padding = 10;
  return {
    x: frameBounds.x - padding,
    y: frameBounds.y - padding,
    width: frameBounds.width + padding * 2,
    height: frameBounds.height + padding * 2
  };
};

// mock responses for simulation endpoints
const mockSimulatorStart = () => {
  const response = {
    session: {
      status: 'waiting',
      trigger: {
        type: 'manual',
        flow: { uuid: FLOW_UUID, name: 'Test Flow' }
      },
      runs: [
        {
          uuid: 'run-1',
          flow: { uuid: FLOW_UUID, name: 'Test Flow' },
          status: 'waiting',
          path: [
            {
              uuid: 'step-1',
              node_uuid: 'node-1',
              arrived_on: new Date().toISOString(),
              exit_uuid: null
            }
          ]
        }
      ],
      environment: {
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm',
        timezone: 'America/New_York',
        allowed_languages: ['eng'],
        default_country: 'US'
      }
    },
    events: [
      {
        type: 'msg_created',
        created_on: new Date().toISOString(),
        msg: {
          uuid: 'msg-1',
          text: 'Hello! How can I help you today?',
          urn: 'tel:+12065551212'
        }
      }
    ],
    contact: {
      uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
      urns: ['tel:+12065551212'],
      fields: {},
      groups: [],
      language: 'eng',
      status: 'active',
      created_on: new Date().toISOString()
    },
    context: {
      contact: {
        uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
        name: 'Test User',
        urns: {
          tel: ['+12065551212'],
          __default__: '+12065551212'
        },
        fields: {
          age: '25',
          city: 'Seattle'
        }
      },
      trigger: {
        type: 'manual',
        __default__: 'manual'
      }
    }
  };

  mockPOST(/\/flow\/simulate\/.*\//, response);
};

const mockSimulatorResume = (responseText: string, quickReplies?: string[]) => {
  const msg: any = {
    uuid: 'msg-response',
    text: responseText,
    urn: 'tel:+12065551212'
  };

  if (quickReplies) {
    msg.quick_replies = quickReplies.map((text) => ({ text }));
  }

  const response = {
    session: {
      status: 'waiting',
      trigger: {
        type: 'manual',
        flow: { uuid: FLOW_UUID, name: 'Test Flow' }
      },
      runs: [
        {
          uuid: 'run-1',
          flow: { uuid: FLOW_UUID, name: 'Test Flow' },
          status: 'waiting',
          path: [
            {
              uuid: 'step-1',
              node_uuid: 'node-1',
              arrived_on: new Date().toISOString(),
              exit_uuid: 'exit-1'
            },
            {
              uuid: 'step-2',
              node_uuid: 'node-2',
              arrived_on: new Date().toISOString(),
              exit_uuid: null
            }
          ]
        }
      ],
      environment: {
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm',
        timezone: 'America/New_York',
        allowed_languages: ['eng'],
        default_country: 'US'
      }
    },
    events: [
      {
        type: 'msg_created',
        created_on: new Date().toISOString(),
        msg
      }
    ],
    contact: {
      uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
      urns: ['tel:+12065551212'],
      fields: {
        age: '25',
        city: 'Seattle'
      },
      groups: [],
      language: 'eng',
      status: 'active',
      created_on: new Date().toISOString()
    },
    context: {
      contact: {
        uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
        name: 'Test User',
        urns: {
          tel: ['+12065551212'],
          __default__: '+12065551212'
        },
        fields: {
          age: '25',
          city: 'Seattle'
        }
      },
      results: {
        user_response: {
          value: responseText,
          __default__: responseText
        }
      }
    }
  };

  mockPOST(/\/flow\/simulate\/.*\//, response);
};

describe('temba-simulator', () => {
  beforeEach(() => {
    clearMockPosts();
  });

  it('can be created', async () => {
    const simulator: Simulator = await createSimulator();
    assert.instanceOf(simulator, Simulator);
    expect(simulator.flow).to.equal(FLOW_UUID);
    expect(simulator.endpoint).to.equal(`/flow/simulate/${FLOW_UUID}/`);
  });

  it('opens simulator window and starts flow', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    // ensure consistent size for screenshot
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    const phoneWindow = simulator.shadowRoot.querySelector(
      'temba-floating-window'
    ) as any;
    expect(phoneWindow).to.exist;

    // verify phone screen is visible
    const phoneScreen = simulator.shadowRoot.querySelector('.phone-screen');
    expect(phoneScreen).to.exist;

    // verify initial message is displayed
    const messages = simulator.shadowRoot.querySelectorAll('.message');
    expect(messages.length).to.be.greaterThan(0);

    await assertScreenshot(
      'simulator/open-initial',
      getSimulatorClip(simulator)
    );
  });

  it('sends a text message', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    // count initial messages
    let messages = simulator.shadowRoot.querySelectorAll('.message');
    const initialCount = messages.length;

    // mock the resume response
    mockSimulatorResume('Thanks for your message!');

    // type a message
    const input = simulator.shadowRoot.querySelector(
      '.message-input input'
    ) as HTMLInputElement;
    expect(input).to.exist;

    input.value = 'Hello from test';
    input.dispatchEvent(new Event('input'));
    await simulator.updateComplete;

    // press enter to send
    const enterEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      bubbles: true
    });
    input.dispatchEvent(enterEvent);

    await simulator.updateComplete;
    // brief delay for async API mock processing
    await delay(100);

    // verify we have more messages than before
    messages = simulator.shadowRoot.querySelectorAll('.message');
    expect(messages.length).to.be.greaterThan(initialCount);

    // ensure DOM is settled
    await simulator.updateComplete;

    await assertScreenshot(
      'simulator/after-message-sent',
      getSimulatorClip(simulator)
    );
  });

  it('tests message flow and takes screenshot', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    // clear previous mocks and set up new mock for a response
    clearMockPosts();
    mockSimulatorResume('Thank you for your message!', ['Yes', 'No', 'Maybe']);

    // send a message
    const input = simulator.shadowRoot.querySelector(
      '.message-input input'
    ) as HTMLInputElement;
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    const enterEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      bubbles: true
    });
    input.dispatchEvent(enterEvent);

    // wait for quick replies to appear
    await waitForCondition(
      () =>
        simulator.shadowRoot.querySelectorAll('.quick-reply-btn').length > 0,
      2000
    );
    await simulator.updateComplete;

    // take screenshot with quick replies
    await assertScreenshot(
      'simulator/quick-replies',
      getSimulatorClip(simulator)
    );
  });

  it('opens attachment menu', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    // click the attachment button
    const attachmentButton = simulator.shadowRoot.querySelector(
      '.attachment-button'
    ) as HTMLElement;
    expect(attachmentButton).to.exist;
    attachmentButton.click();

    await simulator.updateComplete;

    // verify attachment menu is displayed
    const attachmentMenu =
      simulator.shadowRoot.querySelector('.attachment-menu');
    expect(attachmentMenu).to.exist;
    expect(attachmentMenu.classList.contains('open')).to.be.true;

    await assertScreenshot(
      'simulator/attachment-menu',
      getSimulatorClip(simulator)
    );
  });

  it('sends an image attachment', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    // reset attachment indices for deterministic testing
    simulator.resetAttachmentIndices();
    await openSimulator(simulator);

    // mock the response for image attachment
    mockSimulatorResume('Nice picture!');

    // open attachment menu and click image option
    const attachmentButton = simulator.shadowRoot.querySelector(
      '.attachment-button'
    ) as HTMLElement;
    attachmentButton.click();
    await simulator.updateComplete;
    await delay(200);

    const imageMenuItem = Array.from(
      simulator.shadowRoot.querySelectorAll('.attachment-menu-item')
    ).find((el) => el.textContent?.includes('Image')) as HTMLElement;
    expect(imageMenuItem).to.exist;
    imageMenuItem.click();

    await delay(100);
    await simulator.updateComplete;

    // verify attachment wrapper is displayed (image attachments show in attachments not messages)
    const attachmentWrappers = simulator.shadowRoot.querySelectorAll(
      '.attachment-wrapper'
    );
    expect(attachmentWrappers.length).to.be.greaterThan(0);

    await assertScreenshot(
      'simulator/image-attachment',
      getSimulatorClip(simulator)
    );
  });

  it('opens context explorer', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    await openSimulator(simulator);

    // find and click the context explorer button (has expressions icon)
    const optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    const contextButton = optionButtons.find((btn) =>
      btn.querySelector('temba-icon[name="expressions"]')
    ) as HTMLElement;
    expect(contextButton).to.exist;
    contextButton.click();

    await simulator.updateComplete;
    await delay(100);

    // verify context explorer is displayed
    const contextExplorer =
      simulator.shadowRoot.querySelector('.context-explorer');
    expect(contextExplorer).to.exist;
    expect(contextExplorer.classList.contains('open')).to.be.true;

    // delay for context explorer to fully render
    await delay(300);
    await simulator.updateComplete;
    await document.fonts.ready;

    await assertScreenshot(
      'simulator/context-explorer-open',
      getSimulatorClip(simulator, true)
    );
  });

  it('expands context tree items', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    await openSimulator(simulator);

    // ensure context explorer starts closed
    if ((simulator as any).contextExplorerOpen) {
      // click to close it first
      const optionButtons = Array.from(
        simulator.shadowRoot.querySelectorAll('.option-btn')
      );
      const contextButton = optionButtons.find((btn) =>
        btn.querySelector('temba-icon[name="expressions"]')
      ) as HTMLElement;
      contextButton.click();
      await simulator.updateComplete;
      await delay(100);
    }

    // now open context explorer
    const optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    const contextButton = optionButtons.find((btn) =>
      btn.querySelector('temba-icon[name="expressions"]')
    ) as HTMLElement;
    expect(contextButton).to.exist;
    contextButton.click();

    await simulator.updateComplete;
    await delay(100);

    // verify context explorer is now open
    expect((simulator as any).contextExplorerOpen).to.be.true;
    const contextExplorer =
      simulator.shadowRoot.querySelector('.context-explorer');
    expect(contextExplorer).to.exist;
    expect(contextExplorer.classList.contains('open')).to.be.true;

    // find and click on an expandable item (should have context-item-expandable class)
    const expandableItems = simulator.shadowRoot.querySelectorAll(
      '.context-item-expandable'
    );
    expect(expandableItems.length).to.be.greaterThan(0);

    const firstExpandable = expandableItems[0] as HTMLElement;
    firstExpandable.click();

    // wait for children to be displayed with specific content
    await waitForCondition(() => {
      const children =
        simulator.shadowRoot.querySelectorAll('.context-children');
      if (children.length === 0) return false;
      // also check that the children have rendered content
      const items = simulator.shadowRoot.querySelectorAll('.context-item');
      return items.length > expandableItems.length;
    }, 2000);

    // verify children are displayed
    const contextChildren =
      simulator.shadowRoot.querySelectorAll('.context-children');
    expect(contextChildren.length).to.be.greaterThan(0);

    await simulator.updateComplete;
    // delay for DOM to fully render expanded content (context rendering is complex)
    await delay(300);
    await simulator.updateComplete;

    // ensure fonts are loaded and give extra time for rendering
    await document.fonts.ready;

    // wait for any pending animation frames
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
    await delay(200);

    await assertScreenshot(
      'simulator/context-expanded',
      getSimulatorClip(simulator, true)
    );
  });

  it('cycles simulator size', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    await openSimulator(simulator);

    // initially should be medium (set in createSimulator)
    expect(simulator.size).to.equal('medium');

    // find and click the size button (shows current size as text)
    const optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    const sizeButton = optionButtons.find((btn) => {
      const text = btn.textContent?.trim();
      return text === 'S' || text === 'M' || text === 'L';
    }) as HTMLElement;
    expect(sizeButton).to.exist;
    sizeButton.click();

    await simulator.updateComplete;

    // should now be large (medium -> large)
    expect(simulator.size).to.equal('large');
  });

  it('resets simulation', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    // send a message first
    mockSimulatorResume('Response to test message');
    const input = simulator.shadowRoot.querySelector(
      '.message-input input'
    ) as HTMLInputElement;
    input.value = 'Test message';
    input.dispatchEvent(new Event('input'));

    const enterEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      bubbles: true
    });
    input.dispatchEvent(enterEvent);

    await delay(1000);
    await simulator.updateComplete;

    // verify we have multiple messages
    let messages = simulator.shadowRoot.querySelectorAll('.message');
    const messageCountBefore = messages.length;
    expect(messageCountBefore).to.be.greaterThan(1);

    // mock the start response for reset
    mockSimulatorStart();

    // click the reset button (has delete icon)
    const optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    const resetButton = optionButtons.find((btn) =>
      btn.querySelector('temba-icon[name="delete"]')
    ) as HTMLElement;
    expect(resetButton).to.exist;
    resetButton.click();

    await delay(100);
    await simulator.updateComplete;

    // verify messages are reset - should go back to just initial message
    messages = simulator.shadowRoot.querySelectorAll('.message');
    expect(messages.length).to.be.lessThan(messageCountBefore);

    await assertScreenshot(
      'simulator/after-reset',
      getSimulatorClip(simulator)
    );
  });

  it('displays event info messages', async () => {
    const responseWithEvents = {
      session: {
        status: 'waiting',
        trigger: {
          type: 'manual',
          flow: { uuid: FLOW_UUID, name: 'Test Flow' }
        },
        runs: [
          {
            uuid: 'run-1',
            flow: { uuid: FLOW_UUID, name: 'Test Flow' },
            status: 'waiting',
            path: [
              {
                uuid: 'step-1',
                node_uuid: 'node-1',
                arrived_on: new Date().toISOString(),
                exit_uuid: null
              }
            ]
          }
        ],
        environment: {
          date_format: 'YYYY-MM-DD',
          time_format: 'HH:mm',
          timezone: 'America/New_York',
          allowed_languages: ['eng'],
          default_country: 'US'
        }
      },
      events: [
        {
          type: 'contact_field_changed',
          created_on: new Date().toISOString(),
          field: { key: 'name', name: 'Name' },
          value: { text: 'John Doe' }
        },
        {
          type: 'msg_created',
          created_on: new Date().toISOString(),
          msg: {
            uuid: 'msg-1',
            text: 'Your name has been updated!',
            urn: 'tel:+12065551212'
          }
        }
      ],
      contact: {
        uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
        urns: ['tel:+12065551212'],
        fields: {
          name: 'John Doe'
        },
        groups: [],
        language: 'eng',
        status: 'active',
        created_on: new Date().toISOString()
      },
      context: {
        contact: {
          uuid: 'fb3787ab-2eda-48a0-a2bc-e2ddadec1286',
          name: 'John Doe',
          fields: {
            name: 'John Doe'
          }
        }
      }
    };

    mockPOST(/\/flow\/simulate\/.*\//, responseWithEvents);

    const simulator: Simulator = await createSimulator();
    simulator.size = 'medium';
    await simulator.updateComplete;
    await openSimulator(simulator);

    // verify event info is displayed
    const eventInfo = simulator.shadowRoot.querySelectorAll('.event-info');
    expect(eventInfo.length).to.be.greaterThan(0);

    await assertScreenshot('simulator/event-info', getSimulatorClip(simulator));
  });

  it('displays different simulator sizes', async () => {
    mockSimulatorStart();

    const simulator: Simulator = await createSimulator();
    await openSimulator(simulator);

    // get size button - find it by checking if textContent is a size indicator
    let optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    let sizeButton = optionButtons.find((btn) => {
      const text = btn.textContent?.trim();
      return text === 'S' || text === 'M' || text === 'L';
    }) as HTMLElement;
    expect(sizeButton).to.exist;

    // cycle to next size
    sizeButton.click();
    await simulator.updateComplete;
    await delay(200);

    // verify size changed
    expect(simulator.size).to.equal('large');

    // re-query the button after it updated
    optionButtons = Array.from(
      simulator.shadowRoot.querySelectorAll('.option-btn')
    );
    sizeButton = optionButtons.find((btn) => {
      const text = btn.textContent?.trim();
      return text === 'S' || text === 'M' || text === 'L';
    }) as HTMLElement;

    // cycle to next size
    sizeButton.click();
    await simulator.updateComplete;
    await delay(200);

    expect(simulator.size).to.equal('small');
  });

  it('verifies simulator endpoint configuration', async () => {
    const simulator: Simulator = await createSimulator();

    // verify endpoint is set correctly from flow prop
    expect(simulator.endpoint).to.equal(`/flow/simulate/${FLOW_UUID}/`);

    // change flow prop and verify endpoint updates
    simulator.flow = 'different-flow-456';
    await simulator.updateComplete;

    expect(simulator.endpoint).to.equal('/flow/simulate/different-flow-456/');
  });
});
