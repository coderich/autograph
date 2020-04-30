const { map, toGUID } = require('../service/app.service');

module.exports = class {
  constructor(model, docs) {
    return map(docs, (doc, i) => {
      const id = doc[model.idField()];
      const guid = toGUID(model.getName(), id);
      // const cursor = toGUID(i, guid);

      return Object.defineProperties(model.transform(doc), {
        id: { value: id },
        $id: { value: guid },
        // $$cursor: { value: cursor },
      });
    });
  }
};
