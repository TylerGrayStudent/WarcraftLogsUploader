const { br } = require('../constants/lang-br');
const { cn } = require('../constants/lang-cn');
const { de } = require('../constants/lang-de');
const { en } = require('../constants/lang-en');
const { es } = require('../constants/lang-es');
const { fr } = require('../constants/lang-fr');
const { it } = require('../constants/lang-it');
const { ja } = require('../constants/lang-ja');
const { ko } = require('../constants/lang-ko');
const { ru } = require('../constants/lang-ru');
const { tw } = require('../constants/lang-tw');

class LangService {
  trans(str) {
    if (this._locale && this._locale[str]) return this._locale[str];
    return this._enLocale[str];
  }

  language() {
    return this._localeString;
  }
  setLanguage(lang) {
    this._localeString = lang || {};
    this._enLocale = en;

    this._locale = eval(lang);
    this._localeString = lang;
  }
}

module.exports = { LangService };
