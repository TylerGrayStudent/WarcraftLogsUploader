class SanitizationService {
  sanitizeHtmlString(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  sanitizeHtmlStringsInJson(json) {
    return this.sanitizeJson(json, this.sanitizeHtmlString);
  }

  sanitizeJson(json, stringSanitizer) {
    return Array.isArray(json)
      ? this.sanitizeJsonArray(json, stringSanitizer)
      : this.sanitizeJsonObject(json, stringSanitizer);
  }

  sanitizeJsonArray(array, stringSanitizer) {
    return array.map((element) => this.sanitizeJson(element, stringSanitizer));
  }

  sanitizeJsonObject(object, stringSanitizer) {
    const objectIsString =
      typeof object === 'string' || object instanceof String;

    if (objectIsString) {
      return stringSanitizer(object);
    }

    const propertyNames = Object.keys(object);
    propertyNames.forEach((property) => {
      const propertyValue = object[property];

      const propertyIsString =
        typeof propertyValue === 'string' || propertyValue instanceof String;

      if (propertyIsString) {
        object[property] = stringSanitizer(propertyValue);
        return;
      }

      const propertyIsArray = Array.isArray(propertyValue);

      if (propertyIsArray) {
        this.sanitizeJsonArray(propertyValue, stringSanitizer);
        return;
      }

      const propertyIsObject =
        typeof propertyValue === 'object' &&
        propertyValue !== null &&
        propertyValue !== undefined;

      if (propertyIsObject) {
        this.sanitizeJsonObject(object[property], stringSanitizer);
      }
    });

    return object;
  }
}

module.exports = { SanitizationService };
