const { map, toGUID } = require('../service/app.service');

module.exports = class {
  constructor(model, docs) {
    return map(docs, (doc, i) => {
      const guid = toGUID(model.getName(), doc.id);
      // const cursor = toGUID(i, guid);

      return Object.defineProperties(model.transform(doc), {
        id: { value: doc.id },
        $id: { value: guid },
        // $$cursor: { value: cursor },
      });
    });
  }
};
