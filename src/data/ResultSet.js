const DataResolver = require('./DataResolver');
const { keyPaths, map, mapPromise, lcFirst, ensureArray, toGUID } = require('../service/app.service');

const assignValue = (doc, prop, value) => {
  return Promise.resolve(value).then(($value) => {
    Object.defineProperty(doc, prop, { value: $value });
    return $value;
  });
};

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;

    // Object.defineProperties(promise, {
    //   hydrate: {}, // Entire result set
    //   populate: {}, // One attribute
    // });
  }

  async hydrate(resolver, query) {
    return this.getResults(resolver, query).then(async (results) => {
      const paths = [...new Set([...keyPaths(query.getSortFields())])];

      return Promise.all(ensureArray(results).map((doc) => {
        return Promise.all(paths.map((path) => {
          return path.split('.').reduce((promise, prop) => {
            return promise.then((subdoc) => {
              if (subdoc == null) return Promise.resolve(null);
              if (Array.isArray(subdoc)) return Promise.all(subdoc.map(sd => Promise.resolve(sd[prop])));
              return Promise.resolve(subdoc[prop]);
            });
          }, Promise.resolve(doc));
        }));
      })).then(() => results);
    });
  }

  getResults(resolver, query) {
    return this.promise.then(async (docs) => {
      const defaultDocs = await mapPromise(docs, doc => this.model.resolveDefaultValues(this.model.deserialize(doc)));

      return map(defaultDocs, (doc) => {
        const id = doc[this.model.idKey()];
        doc.id = id;
        const guid = toGUID(this.model.getName(), id);
        // const tdoc = this.model.deserialize(doc);
        const dataResolver = new DataResolver(doc, (data, prop) => this.resolve(data, prop, resolver, query));

        return Object.defineProperties(dataResolver, {
          id: { value: id, enumerable: true, writable: true },
          $id: { value: guid },
        });
      });
    });
  }

  resolve(doc, prop, resolver, query) {
    // Value check
    const value = doc[prop];
    if (value !== undefined) return value; // Already resolved
    if (typeof prop === 'symbol') return value;

    // // Count resolver
    // const countField = this.getCountField(prop);
    // if (countField) return assignValue(doc, prop, countField.count(resolver, doc));

    // Hydration check
    const [, $prop] = prop.split('$');
    if (!$prop) return value; // Nothing to hydrate

    // Field check
    const field = this.model.getField($prop);
    if (!field) return value; // Unknown field

    // Set $value to the original unhydrated value
    const $value = doc[$prop];
    if (field.isScalar() || field.isEmbedded()) return assignValue(doc, prop, $value); // No hydration needed; apply $value

    // Model resolver
    const fieldModel = field.getModelRef();

    if (field.isArray()) {
      if (field.isVirtual()) {
        const where = { [field.getVirtualField().getKey()]: doc.id };
        return assignValue(doc, prop, resolver.match(fieldModel).query({ where }).many({ find: true }));
      }

      return assignValue(doc, prop, Promise.all(ensureArray($value).map(id => resolver.match(fieldModel).id(id).one({ required: field.isRequired() }))));
    }

    if (field.isVirtual()) {
      const where = { [field.getVirtualField().getKey()]: doc.id };
      return assignValue(doc, prop, resolver.match(fieldModel).query({ where }).one({ find: true }));
    }

    return assignValue(doc, prop, resolver.match(fieldModel).id($value).one({ required: field.isRequired() }));
  }

  getCountField(prop) {
    const [, countProp] = prop.split('count').map(v => lcFirst(v));
    return this.model.getField(countProp);
  }
};
