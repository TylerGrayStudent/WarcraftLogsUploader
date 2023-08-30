const { dialog } = require('@electron/remote');
const { BaseAppView } = require('./base-app-view');
const { AdService } = require('./scripts/services/ad-service');
const {
  ExternalLinkService,
} = require('./scripts/services/external-link-service');
const path = require('path');

function MainViewBuilder() {
  // BEGIN
  // END
  return MainView;
}

module.exports = { MainViewBuilder };
