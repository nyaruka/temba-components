import { html, fixture, expect } from '@open-wc/testing';
import { TemplateEditor } from '../src/templates/TemplateEditor';
import { TemplateResult } from 'lit';
import { assertScreenshot, getClip } from './utils.test';

const createTemplateEditor = async (def: TemplateResult) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 520px;');
  const templateEditor = await fixture<TemplateEditor>(def, { parentNode });

  await templateEditor.updateComplete;
  return templateEditor;
};

describe('TemplateEditor', () => {
  it('renders template content', async () => {
    const templateEditor = await createTemplateEditor(html`
      <temba-template-editor
        url="/static/api/templates.json"
        template="580b124f-32cb-4003-b9e5-9eb783e29101"
        lang="eng"
      >
      </temba-template-editor>
    `);
    const clip = getClip(templateEditor);
    clip.height = 330;
    clip.bottom = clip.top + clip.height;
    await assertScreenshot('templates/default', clip);
  });

  it('updates template content when language changes', async () => {
    const templateEditor = await createTemplateEditor(html`
      <temba-template-editor
        url="/static/api/templates.json"
        template="580b124f-32cb-4003-b9e5-9eb783e29101"
        lang="eng"
      >
      </temba-template-editor>
    `);

    templateEditor.lang = 'fra';

    const clip = getClip(templateEditor);
    clip.height = 370;
    clip.bottom = clip.top + clip.height;

    await assertScreenshot('templates/french', clip);
  });

  it('renders an error message no language is found', async () => {
    const templateEditor = await createTemplateEditor(html`
      <temba-template-editor
        url="/static/api/templates.json"
        template="580b124f-32cb-4003-b9e5-9eb783e29101"
        lang="spa"
      >
      </temba-template-editor>
    `);

    const errorMessage = (
      templateEditor.shadowRoot.querySelector(
        '.error-message'
      ) as HTMLDivElement
    ).innerText;
    expect(errorMessage).to.equal(
      'No approved translation was found for current language.'
    );
  });
});
