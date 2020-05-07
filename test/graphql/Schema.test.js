const { parse } = require('graphql');
// const { importSchema } = require('graphql-import');
const Schema = require('../../src/graphql/ast/Schema');

const typeDefs = `
  scalar Mixed
  directive @_authzModel on OBJECT
  enum Gender { male female }
  input SomeInput { id: ID! name: String! }
  type Query { noop: String }
  type Mutation { noop: String }
  type Subscription { noop: String }

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

  extend type Person {
    age: Int
  }
`;

const buildingDef = `
  type Building {
    year: Int
    type: String! @field(enforce: buildingType)
    tenants: [Person] @field(enforce: distinct, onDelete: cascade)
    landlord: Person @field(onDelete: nullify)
  }

  type Book {
    bids: [String]
    store: Building
  }
`;

describe('Documents', () => {
  test('foundation', () => {
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
    expect(personFields.length).toBe(5);
    expect(bookFields.length).toBe(5);
    expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status', 'age']);
    expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed', 'Int']);
    expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false, false]);
    expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true, true]);
    expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false, false]);
    expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toMenaceCase']);
    expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float']);
    expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true]);
    expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true]);
    expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false]);
    expect(Book.getField('bestSeller').getDirective('default').getArg('value')).toBe(false);
  });

  test('extendSchema', () => {
    const ast = parse(typeDefs);
    const schema = new Schema(ast);
    schema.extend(parse(buildingDef));

    expect(schema.getModels().length).toBe(3);
    expect(schema.getModelNames()).toEqual(['Person', 'Book', 'Building']);
    const bookFields = schema.getModel('Book').getFields();
    expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids', 'store']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'String', 'Building']);
  });
});
