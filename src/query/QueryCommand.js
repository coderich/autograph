module.exports = class QueryCommand {
  constructor(...operations) {
    this.operations = new Set(operations);
  }

  add(...operations) {
    operations.forEach(this.operations.add, this.operations);
    return this;
  }

  serialize() {
    return {
      operations: Array.from(this.operations).map(operation => operation.serialize()),
    };
  }
};
