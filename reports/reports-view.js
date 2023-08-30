const { BaseAppView } = require('../base-app-view.js');

class ReportsView extends BaseAppView {
  constructor(controller) {
    super();
    this._controller = controller;
    this._haveReports = false;
    this._mainWindow = window;
    this._selectedVersion = this._mainWindow.storage.version();
    this._selectedLanguage = this._mainWindow.lang.language();

    document
      .getElementById('recent-reports-contents')
      .addEventListener('click', this.loadReportByTarget.bind(this));
    document
      .getElementById('recent-reports-reload')
      .addEventListener('click', this.reloadButtonClicked.bind(this));
  }

  onLoginSuccessful() {
    this._mainWindow.loadRecentReports();
    this._haveReports = true;
  }

  reloadButtonClicked(evt) {
    if (this._haveReports) {
      this._mainWindow.loadRecentReports();
    }
  }

  loggedOut() {
    document.getElementById('recent-reports-contents').innerHTML = '';
    document.getElementById('report-frame').src = './blank.html';
    this._haveReports = false;
  }

  reportsUpdated(reports) {
    if (!reports || !reports.length) return;
    let reportsResult = '';
    for (let i = 0; i < reports.length; ++i) {
      let report = reports[i];
      if (report.guildName == 'Snowball') continue;
      reportsResult +=
        '<div class="reports-entry" code="' +
        report.code +
        '" id="report-' +
        report.code +
        '">';
      if (report.guildName)
        reportsResult +=
          ' <span class="reports-guild faction-' +
          report.guildFaction +
          '">' +
          report.guildName +
          '</span>';

      reportsResult +=
        '<div class="reports-entry-description">' +
        report.description +
        '</div>';
      reportsResult += '<div class="reports-entry-details">';
      reportsResult +=
        report.username +
        ' - (' +
        this.localizedPrivacy(report.is_private) +
        ')';
      reportsResult += ' - ' + new Date(report.end_time).toLocaleString();

      reportsResult += '</div>';
      reportsResult += '</div>';
    }

    document.getElementById('recent-reports-contents').innerHTML =
      reportsResult;

    this.selectReport(reports[0].code);
  }

  selectReport(code) {
    this._controller.loadReport(code);
    $('.reports-entry').removeClass('selected');
    $('#report-' + code).addClass('selected');
  }

  localizedPrivacy(privacy) {
    let lang = this._mainWindow.lang;
    if (privacy == 0) return lang.trans('public_report');
    if (privacy == 1) return lang.trans('private_report');
    if ((privacy = 2)) return lang.trans('unlisted_report');
    return '';
  }

  loadReportByTarget(event) {
    let node = event.target;
    let codeAttr = node.getAttribute('code');
    while (codeAttr === null && node) {
      node = node.parentNode;
      if (!node) break;
      codeAttr = node.getAttribute('code');
    }
    if (codeAttr !== null) {
      this.selectReport(codeAttr);
    }
  }
}

module.exports = {
  ReportsView,
};
