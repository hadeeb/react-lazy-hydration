//@ts-check
const { createMacro, MacroError } = require("babel-plugin-macros");
const { addDefault } = require("@babel/helper-module-imports");

module.exports = createMacro(function({ references, babel }) {
  const templ = babel.template;

  for (let key in references) {
    const refs = references[key];
    /**
     * @type {string}
     */
    let str;

    switch (key) {
      case "isBrowser": {
        const { name: insertedName } = addDefault(refs[0], "./isBrowser", {
          nameHint: "isBrowser"
        });
        str = `process.env.BROWSER || ${insertedName}`;
        break;
      }
      case "isDev":
        str = "'production' !== process.env.NODE_ENV";
        break;
      default:
        throw new MacroError(`unknown constant ${key}`);
    }

    const template = templ(str, {
      placeholderPattern: false
    });
    /**
     * @type  {babel.types.Expression}
     */
    // @ts-ignore
    const expression = template().expression;

    refs.forEach(ref => {
      ref.replaceWith(expression);
    });
  }
});
