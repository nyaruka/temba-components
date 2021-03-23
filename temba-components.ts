import './temba-modules';

// we import and declare the alias editor seperately since
// leaflet-map doesn't work in dev mode
import { AliasEditor } from './src/aliaseditor/AliasEditor';
import { LeafletMap } from './src/leafletmap/LeafletMap';
window.customElements.define('leaflet-map', LeafletMap);
window.customElements.define('alias-editor', AliasEditor);
