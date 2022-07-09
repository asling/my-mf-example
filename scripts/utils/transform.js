const fs = require('fs-extra');

exports.transformJsonToMap = (jsonPath) => {
  if (fs.existsSync(jsonPath)) {
    const fileData = fs.readFileSync(jsonPath);
    if (fileData) {
      return new Map(Object.entries(JSON.parse(fileData.toString())));
    }
  }
  return new Map();
};
