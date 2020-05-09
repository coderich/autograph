const Schema = require('../../src/graphql/ast/Schema');
const complexSchema = require('../fixtures/complex.graphql');

const typeDefs = `
  scalar Mixed
  directive @model(scope: Mixed) on OBJECT
  directive @field(transform: [Mixed] enforce: Mixed onDelete: Mixed) on FIELD_DEFINITION
  directive @default(value: Boolean) on FIELD_DEFINITION
  enum Gender { male female }
  input SomeInput { id: ID! name: String! }
  type Query { noop: String }
  type Mutation { noop: String }
  type Subscription { noop: String }

  extend type Person {
    age: Int
  }

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

const resolvers = {
  Book: {
    name: () => 'The Great Book',
  },
};

const extendDef = `
  type Building {
    year: Int
    type: String! @field(enforce: buildingType)
    tenants: [Person] @field(enforce: distinct, onDelete: cascade)
    landlord: Person @field(onDelete: nullify)
  }

  extend type Book {
    bids: [String]
    store: Building
  }

  extend type Person {
    name: String! @default(value: "Rich")
  }
`;

describe('Documents', () => {
  test('foundation', () => {
    const schema = new Schema({ typeDefs });
    expect(schema).toBeDefined();

    // Models
    const models = schema.getModels();
    expect(models.map(m => m.getName())).toEqual(['Person', 'Book']);
    expect(models.map(m => m.getScope())).toEqual(['private', 'protected']);

    // Fields
    const [Person, Book] = models;
    const [personFields, bookFields] = models.map(m => m.getFields());
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

    // Executable Schema
    expect(schema.makeExecutableSchema()).toBeDefined();
  });

  test('complexSchema', () => {
    const schema = new Schema({ typeDefs: complexSchema });
    expect(schema).toBeDefined();
    expect(schema.makeExecutableSchema()).toBeDefined();
  });

  test('extendSchema', () => {
    const schema = new Schema({ typeDefs, resolvers });
    schema.extend({
      typeDefs: extendDef,
      resolvers: {
        Book: {
          price: () => 11.45,
        },
        Person: {
          name: () => 'Great Person',
        },
      },
    });

    expect(schema.getModelNames()).toEqual(['Person', 'Book', 'Building']);
    const bookFields = schema.getModel('Book').getFields();
    expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids', 'store']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'String', 'Building']);
    expect(schema.getModel('Person').getField('name').getDirective('default').getArg('value')).toEqual('Rich');
    expect(schema.getModel('Person').getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toMenaceCase']);

    // Executable Schema
    expect(schema.makeExecutableSchema()).toBeDefined();

    expect(schema.getModel('Person').getField('name').getDirective('default').getArg('value')).toEqual('Rich');
    expect(schema.getModel('Person').getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toMenaceCase']);
  });
});
