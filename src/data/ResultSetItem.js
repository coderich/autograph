const { get } = require('lodash');
const { map, keyPaths, mapPromise, toGUID, hashObject } = require('../service/app.service');

module.exports = class ResultSetItem {
  constructor(model) {
    const fields = model.getFields().filter(f => f.getName() !== 'id');
    this.resultSetItem = this.createResultSetItem(fields);
  }

  create(query, data) {
    if (data == null || typeof data !== 'object') return data;
    Object.assign(this, query.toObject());
    this.data = data;
    this.query = query;
    return this.resultSetItem;
  }

  createResultSetItem(fields) {
    const self = this;
    const cache = new Map();

    const definition = fields.reduce((prev, field) => {
      const key = field.getKey();
      const name = field.getName();
      const $name = `$${name}`;

      // Deserialized field attributes
      prev[name] = {
        get() {
          const value = self.data[key];
          if (cache.has(name)) return cache.get(name);
          let $value = field.deserialize(self.query, value);
          if ($value != null && field.isEmbedded()) {
            const modelRef = field.getModelRef();
            const newQuery = self.query.model(modelRef);
            $value = map($value, $v => modelRef.getResultSetItem().create(newQuery, $v));
          }
          cache.set(name, $value);
          return $value;
        },
        set($value) {
          cache.set(name, $value);
        },
        enumerable: true,
        configurable: true, // Allows things like delete
      };

      // Fully deserialized, hydrated, and resolved field attributes
      prev[$name] = {
        get() {
          return (args = {}) => {
            // Ensure where clause
            args.where = args.where || {};

            // Cache
            const cacheKey = `${$name}-${hashObject(args)}`;
            if (cache.has(cacheKey)) return cache.get(cacheKey);

            const promise = new Promise((resolve, reject) => {
              (() => {
                const $value = this[name];

                if (field.isScalar() || field.isEmbedded()) return Promise.resolve($value);

                const modelRef = field.getModelRef();

                if (field.isArray()) {
                  if (field.isVirtual()) {
                    args.where[[field.getVirtualField()]] = this.id; // Is where[[field.getVirtualField()]] correct?
                    return self.resolver.match(modelRef).merge(args).many();
                  }

                  // Not a "required" query + strip out nulls
                  args.where.id = $value;
                  return self.resolver.match(modelRef).merge(args).many();
                }

                if (field.isVirtual()) {
                  args.where[[field.getVirtualField()]] = this.id;
                  return self.resolver.match(modelRef).merge(args).one();
                }

                return self.resolver.match(modelRef).id($value).one({ required: field.isRequired() });
              })().then((results) => {
                if (results == null) return field.resolve(self.query, results); // Allow field to determine
                return mapPromise(results, result => field.resolve(self.query, result)).then(() => results); // Resolve the inside fields but still return "results"!!!!
              }).then((resolved) => {
                resolve(resolved);
              }).catch((e) => {
                reject(e);
              });
            });

            cache.set(cacheKey, promise);
            return promise;
          };
        },
        enumerable: false,
      };

      // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
      prev[`${$name}:count`] = {
        get() {
          return (q = {}) => {
            q.where = q.where || {};
            if (field.isVirtual()) q.where[field.getVirtualField()] = this.id;
            else q.where.id = this[name];
            return self.resolver.match(field.getModelRef()).merge(q).count();
          };
        },
        enumerable: false,
      };

      return prev;
    }, {
      id: {
        get() { return self.data.id || self.data[self.model.idKey()]; },
        set(id) { self.data.id = id; }, // Embedded array of documents need to set id
        enumerable: true,
      },

      $id: {
        get() { return toGUID(self.model.getName(), this.id); },
        enumerable: false,
      },

      $$cursor: {
        get() {
          const sortPaths = keyPaths(self.sort);
          const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
          const sortJSON = JSON.stringify(sortValues);
          return Buffer.from(sortJSON).toString('base64');
        },
        enumerable: false,
      },

      $$model: {
        value: self.model,
        enumerable: false,
      },

      $$isResultSetItem: {
        value: true,
        enumerable: false,
      },

      $$save: {
        get() { return input => self.resolver.match(self.model).id(this.id).save({ ...this, ...input }); },
        enumerable: false,
      },

      $$remove: {
        get() { return () => self.resolver.match(self.model).id(this.id).remove(); },
        enumerable: false,
      },

      $$delete: {
        get() { return () => self.resolver.match(self.model).id(this.id).delete(); },
        enumerable: false,
      },

      toObject: {
        get() {
          return () => map(this, obj => Object.entries(obj).reduce((prev, [key, value]) => {
            if (value === undefined) return prev;
            prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
            return prev;
          }, {}));
        },
        enumerable: false,
        configurable: true,
      },
    });

    // Create and return ResultSetItem
    return Object.defineProperties({}, definition);
  }
};
