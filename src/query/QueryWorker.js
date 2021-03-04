const { ucFirst, unravelObject } = require('../service/app.service');
const QueryService = require('./QueryService');

module.exports = class QueryWorker {
  constructor(query) {
    this.query = query;
    this.model = query.model();
    this.resolver = query.resolver();
  }

  async getWork() {
    const { crud, method, flags } = this.query.toObject();
    const modifier = /One$/.test(method) ? 'One' : 'Many';
    const fields = this.model.getSelectFields();
    const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});
    // const normalize = data => Object.entries(data).reduce((prev, [name, value]) => Object.assign(prev, { [fieldNameToKeyMap[name]]: value }), {});

    // Select fields
    const $select = unravelObject(this.query.select() ? Object.keys(this.query.select()).map(n => fieldNameToKeyMap[n]) : fields.map(f => f.getKey()));

    // Where clause
    const where = await this.model.resolveBoundValues(unravelObject(this.query.match()));
    let $where = await QueryService.resolveQueryWhereClause(this.query.match(where));
    $where = this.model.normalize($where);

    switch (crud) {
      case 'create': {
        break;
      }
      case 'read': {
        break;
      }
      case 'update': {
        const toUpdate = await this.query.clone().crud('read').method(`find${modifier}`).resolve();
        console.log(toUpdate);
        break;
      }
      case 'delete': {
        // const toDelete = await queryBuilder.where($where).data(flags);
        break;
      }
      default: {
        throw new Error(`Unknown query crud operation: '${crud}'`);
      }
    }

    // Input data
    let $data = {};
    if (crud === 'create' || crud === 'update') {
      $data = unravelObject(this.query.data());
      $data = await this.model.appendDefaultValues($data);
      $data = await this.model[`append${ucFirst(crud)}Fields`]($data);
      $data = this.model.normalize($data);
    }

    const work = {
      key: this.model.getKey(),
      method: this.query.method(),
      isNative: Boolean(this.query.native()),
      schema: fields.reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getType() }), {}),
      select: $select,
      where: $where,
      data: $data,
      flags,
    };

    if (flags.debug) console.log(JSON.stringify(work));

    return work;
  }

  getCacheKey() {
    return this.query.getCacheKey();
  }
};
