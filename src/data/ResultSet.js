const { map, toGUID } = require('../service/app.service');

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;
  }

  async hydrate(resolver, query) {
    return this.model.hydrate(resolver, await this.getResults(), { fields: query.getSelectFields() });
  }

  // getCountField(prop) {
  //   const [, countProp] = prop.split('count').map(v => lcFirst(v));
  //   return this.model.getField(countProp);
  // }

  // resolve(resolver, doc, prop, query) {
  //   const value = doc[prop];
  //   const { fields = {} } = cloneDeep(query);
  //   query.where = query.where || {};

  //   // Must be in selection
  //   if (!Object.prototype.hasOwnProperty.call(fields, prop)) return Promise.resolve(value);

  //   // Count resolver
  //   const countField = this.getCountField(prop);
  //   if (countField) return countField.count(resolver, doc);

  //   // Field resolver
  //   const field = this.model.getField(prop);
  //   if (!field) return Promise.resolve(value);
  //   if (field.isScalar() || field.isEmbedded()) return Promise.resolve(value);

  //   // Model resolver
  //   const [arg = {}] = (fields[field].__arguments || []).filter(el => el.query).map(el => el.query.value);
  //   const fieldModel = field.getModelRef();

  //   if (field.isArray()) {
  //     if (field.isVirtual()) {
  //       query.where[field.getVirtualField().getAlias()] = doc.id;
  //       return resolver.match(fieldModel).query({ ...query, ...arg }).many({ find: true });
  //     }

  //     return Promise.all(ensureArray(value).map(id => resolver.match(fieldModel).id(id).one({ required: field.isRequired() })));
  //   }

  //   if (field.isVirtual()) {
  //     query.where[field.getVirtualField().getAlias()] = doc.id;
  //     return resolver.match(fieldModel).query({ ...query, ...arg }).one({ find: true });
  //   }

  //   return resolver.match(fieldModel).id(value).one({ required: field.isRequired() });
  // }


  // async hydrate(resolver, query) {
  //   const results = await this.getResults();
  //   if (results == null) return results;

  //   const isArray = Array.isArray(results);

  //   const data = await Promise.all(ensureArray(results).map((doc) => {
  //     if (doc == null) return doc;
  //     if (Object.prototype.hasOwnProperty.call(doc, '$hydrated')) return doc;

  //     // const id = doc[this.model.idField()];
  //     // const guid = toGUID(this.model.getName(), id);
  //     // Object.defineProperty(doc, 'id', { value: id });
  //     // Object.defineProperty(doc, '$id', { value: guid });
  //     Object.defineProperty(doc, '$hydrated', { value: true });

  //     return Promise.all(Object.keys(doc).map((key) => {
  //       return this.resolve(resolver, doc, key, { fields: query.getSelectFields() });
  //     })).then(($values) => {
  //       $values.forEach(($value, i) => {
  //         const key = Object.keys(doc)[i];
  //         const $key = this.getCountField(key) ? key : `$${key}`;
  //         if (!Object.prototype.hasOwnProperty.call(doc, $key)) Object.defineProperty(doc, $key, { value: $value });
  //       });

  //       return this.model.transform(doc);
  //     });
  //   }));

  //   return isArray ? data : data[0];
  // }


  getResults(resolver) {
    return this.promise.then((docs) => {
      return map(docs, (doc, i) => {
        const id = doc[this.model.idField()];
        const guid = toGUID(this.model.getName(), id);
        // const cursor = toGUID(i, guid);

        return Object.defineProperties(this.model.transform(doc), {
          id: { value: id },
          $id: { value: guid },
          // $$cursor: { value: cursor },
        });
      });
    });
  }
};
