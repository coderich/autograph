const { parse } = require('graphql');
// const { importSchema } = require('graphql-import');
const Schema = require('../../src/graphql/ast/Schema');

const typeDefs = `
  scalar Mixed

  type Person @model(scope: private) {
    name: String! @field(transform: [toTitleCase, toMenaceCase])
    authored: [Book]
    emailAddress: String!
    status: Mixed
  }

  type Book {
    name: String!
    price: Float!
    author: Person!
    bestSeller: Boolean @default(value: false)
    bids: [Float]
  }
`;

describe('Documents', () => {
  test('bareSchema', () => {
    const ast = parse(typeDefs);
    const schema = new Schema(ast);
    expect(schema).toBeDefined();

    // Models
    const models = schema.getModels();
    expect(models.length).toBe(2);
    expect(models.map(m => m.getName())).toEqual(['Person', 'Book']);
    expect(models.map(m => m.getScope())).toEqual(['private', 'protected']);

    // Fields
    const [Person, Book] = models;
    const [personFields, bookFields] = models.map(m => m.getFields());
    expect(personFields.length).toBe(4);
    expect(bookFields.length).toBe(5);
    expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status']);
    expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed']);
    expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false]);
    expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true]);
    expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false]);
    expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toMenaceCase']);
    expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float']);
    expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true]);
    expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true]);
    expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false]);
    expect(Book.getField('bestSeller').getDirective('default').getArg('value')).toBe(false);
  });
});
