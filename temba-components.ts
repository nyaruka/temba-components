import './temba-modules';

// we import and declare the alias editor seperately since
// leaflet-map doesn't work in dev mode
import { AliasEditor } from './src/aliaseditor/AliasEditor';
import { LeafletMap } from './src/leafletmap/LeafletMap';
import { addCustomElement } from './temba-modules';

addCustomElement('leaflet-map', LeafletMap);
addCustomElement('alias-editor', AliasEditor);
