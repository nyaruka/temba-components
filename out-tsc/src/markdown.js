import { html } from 'lit';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { directive, Directive, PartType } from 'lit/directive.js';
import { Remarkable } from 'remarkable';
export const markdown = new Remarkable();
// Class-based directive API
export class RenderMarkdown extends Directive {
    // State stored in class field
    // value: string | undefined;
    constructor(partInfo) {
        super(partInfo);
        // When necessary, validate part in constructor using `part.type`
        if (partInfo.type !== PartType.CHILD) {
            throw new Error('renderMarkdown only supports child expressions');
        }
    }
    // Optional: override update to perform any direct DOM manipulation
    // DirectiveParameters<this>
    update(part, [initialValue]) {
        /* Any imperative updates to DOM/parts would go here */
        return this.render(initialValue);
    }
    // Do SSR-compatible rendering (arguments are passed from call site)
    render(initialValue) {
        // Previous state available on class field
        //  if (this.value === undefined) {
        // this.value = initialValue;
        //}
        return html `${unsafeHTML(markdown.render(initialValue))}`;
    }
}
export const renderMarkdown = directive(RenderMarkdown);
//# sourceMappingURL=markdown.js.map