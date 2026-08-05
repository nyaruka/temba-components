import { fixture, expect } from '@open-wc/testing';
import { html, render } from 'lit-html';
import { request_optin } from '../../src/flow/actions/request_optin';
import { Node, RequestOptin } from '../../src/store/flow-definition';
import { ActionTest } from '../ActionHelper';

const NODE: Node = { uuid: 'test-node', actions: [], exits: [] };

const renderAction = async (action: RequestOptin): Promise<HTMLElement> => {
  const host = (await fixture(html`<div></div>`)) as HTMLElement;
  render(request_optin.render(NODE, action), host);
  return host;
};

describe('request_optin action config', () => {
  const helper = new ActionTest(request_optin, 'request_optin');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(request_optin.name).to.equal('Request Opt-In');
    });

    it('is not offered for any flow type', () => {
      expect(request_optin.flowTypes).to.deep.equal([]);
    });

    it('is not editable', () => {
      expect(request_optin.form).to.be.undefined;
      expect(request_optin.toFormData).to.be.undefined;
      expect(request_optin.fromFormData).to.be.undefined;
    });
  });

  describe('rendering', () => {
    it('renders the opt-in from an existing definition', async () => {
      const host = await renderAction({
        uuid: 'action-uuid',
        type: 'request_optin',
        optin: { uuid: 'optin-1', name: 'U-Report' }
      });

      expect(host.textContent).to.contain('U-Report');
    });

    it('renders a placeholder when the opt-in is missing', async () => {
      const host = await renderAction({
        uuid: 'action-uuid',
        type: 'request_optin'
      } as RequestOptin);

      expect(host.textContent).to.contain('Unknown opt-in');
    });
  });
});
