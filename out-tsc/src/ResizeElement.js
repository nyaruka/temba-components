import { RapidElement } from './RapidElement';
import { throttle } from './utils';
export class ResizeElement extends RapidElement {
    handleResize() {
        this.requestUpdate();
    }
    getEventHandlers() {
        return [
            {
                event: 'resize',
                method: throttle(this.handleResize, 50),
                isWindow: true
            }
        ];
    }
}
//# sourceMappingURL=ResizeElement.js.map