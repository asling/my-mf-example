const t = require('@babel/types');
const lodash = require('lodash');

module.exports = function () {
  return {
    visitor: {
      ImportDeclaration: {
        exit(
          path,
          { opts: redirect },
        ) {
          const { specifiers, source } = path.node;
          const { value } = source;
          if (!Object.keys(redirect).includes(value)) {
            return;
          }
          const rMap = redirect[value];

          const imports = specifiers
            .map((spec) => {
              if (t.isImportSpecifier(spec)) {
                return spec.imported.name;
              }
            })
            .filter(Boolean);

          if (
            !lodash.intersection(imports, Object.keys(redirect[value])).length
          ) {
            return;
          }

          specifiers.forEach((spec) => {
            if (t.isImportSpecifier(spec)) {
              const {
                imported: { name: importedName },
                local: { name: localName },
              } = spec;
              if (!rMap[importedName]) return;
              const importDeclaration = t.importDeclaration(
                [
                  t.importSpecifier(
                    t.identifier(localName),
                    t.identifier(importedName),
                  ),
                ],
                t.stringLiteral(rMap[importedName]),
              );
              path.insertAfter([importDeclaration]);
            }
          });

          const restImport = specifiers.filter((spec) => {
            if (t.isImportDefaultSpecifier(spec)) {
              return true;
            }
            if (t.isImportSpecifier(spec)) {
              if (rMap[spec.imported.name]) {
                return false;
              }
            }
            return true;
          });
          if (restImport.length) {
            path.replaceWith(
              t.importDeclaration(restImport, t.stringLiteral(value)),
            );
          } else {
            path.remove();
          }
        },
      },
    },
  };
}
