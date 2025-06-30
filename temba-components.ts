// bring in the rest of our modules
import { addCustomElement } from './temba-modules';

// we import and declare the alias editor seperately since
// leaflet-map doesn't work in dev mode
import { AliasEditor } from './src/components/form/aliaseditor/AliasEditor';
import { LeafletMap } from './src/components/specialized/leafletmap/LeafletMap';

addCustomElement('leaflet-map', LeafletMap);
addCustomElement('alias-editor', AliasEditor);
