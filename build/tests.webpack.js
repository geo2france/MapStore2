//var context = require.context('../web', true, /(-test\.jsx?)|(-test-chrome\.jsx?)$/);
var context = require.context('../web', true, /\/components\/data\/featuregrid\/toolbars\/__tests__\/Toolbar-test\.jsx$/);
context.keys().forEach(context);
module.exports = context;
