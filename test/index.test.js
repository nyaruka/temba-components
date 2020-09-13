// Our top-level components we can use
import "../src/aliaseditor/AliasEditor";
import "../src/leafletmap/LeafletMap";
import "../src/vectoricon/VectorIcon";
import "../src/formfield/FormField";
import "../src/omnibox/Omnibox";
import "../src/button/Button";
import "../src/dialog/Dialog";
import "../src/dialog/Modax";
import "../src/textinput/TextInput";
import "../src/label/Label";
import "../src/completion/Completion";
import "../src/contactsearch/ContactSearch";
import "../src/loading/Loading";
import "../src/alert/Alert";
import "../src/checkbox/Checkbox";
import "../src/datepicker/DatePicker";
import "../src/shadowless/Shadowless";

const testsContext = require.context("../src", true, /test$/);
testsContext.keys().forEach(testsContext);
