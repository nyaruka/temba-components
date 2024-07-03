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
        template="2b1cdee4-71b4-4c9a-805c-9bce6a2e7277"
      >
      </temba-template-editor>
    `);
    const clip = getClip(templateEditor);
    clip.height = 500;
    clip.bottom = clip.top + clip.height;
    await assertScreenshot('templates/default', clip);
  });

  it('updates template content when language changes', async () => {
    const templateEditor = await createTemplateEditor(html`
      <temba-template-editor
        url="/static/api/templates.json"
        template="2b1cdee4-71b4-4c9a-805c-9bce6a2e7277"
        lang="eng"
      >
      </temba-template-editor>
    `);

    templateEditor.lang = 'fra';

    const clip = getClip(templateEditor);
    clip.height = 500;
    clip.bottom = clip.top + clip.height;

    await assertScreenshot('templates/french', clip);
  });

  it('renders an error message no language is found', async () => {
    const templateEditor = await createTemplateEditor(html`
      <temba-template-editor
        url="/static/api/templates.json"
        template="2b1cdee4-71b4-4c9a-805c-9bce6a2e7277"
        lang="spa"
      >
      </temba-template-editor>
    `);

    const clip = getClip(templateEditor);
    clip.height = 200;
    clip.bottom = clip.top + clip.height;

    await assertScreenshot('templates/unapproved', clip);

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
