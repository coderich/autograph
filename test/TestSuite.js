// const Neo4j = require('neodb');
// const Redis = require('redis-mock');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { timeout } = require('../src/service/app.service');
const Schema = require('../src/core/Schema');
const DataLoader = require('../src/core/DataLoader');
const { schema, stores } = require('./schema');

let node;
let richard;
let christie;
let mobyDick;
let healthBook;
let chapter1;
let chapter2;
let page1;
let page2;
let page3;
let page4;
let bookBuilding;
let libraryBuilding;
let apartmentBuilding;
let bookstore1;
let bookstore2;
let library;

const sorter = (a, b) => {
  const idA = `${a.id}`;
  const idB = `${b.id}`;
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
};

module.exports = (name, db = 'mongo') => {
  describe(`${name}-${db}`, () => {
    beforeAll(async () => {
      jest.setTimeout(60000);

      const driverArgs = {};

      // Start in-memory db
      switch (db) {
        case 'redis': {
          // const redisClient = Redis.createClient();
          stores.default.type = 'redis';
          // driverArgs.redis = redisClient;
          break;
        }
        case 'neo4j': {
          stores.default.type = 'neo4jDriver';
          stores.default.uri = 'bolt://localhost';
          break;
        }
        case 'neo4jRest': {
          stores.default.type = 'neo4jRest';
          stores.default.uri = 'http://localhost:7474';
          break;
        }
        default: {
          const mongoServer = new MongoMemoryServer();
          stores.default.uri = await mongoServer.getConnectionString();
          break;
        }
      }

      // Create core classes
      const schema2 = new Schema(schema, stores, driverArgs);
      node = new DataLoader(schema2);

      //
      await timeout(2000);
      await Promise.all(schema2.getModels().map(model => model.drop()));
      await timeout(500);
    });


    describe('Create', () => {
      test('Person', async () => {
        richard = await node('Person').data({ name: 'Richard', emailAddress: 'rich@coderich.com' }).save();
        expect(richard.id).toBeDefined();
        expect(richard.name).toBe('Richard');

        christie = await node('Person').data({ name: 'Christie', emailAddress: 'christie@gmail.com', friends: [richard.id] }).save();
        expect(christie.id).toBeDefined();
        expect(christie.friends).toEqual([richard.id]);
      });

      test('Book', async () => {
        mobyDick = await node('Book').data({ name: 'moby dick', price: 9.99, bids: [1.99, 1.20, 5.00], bestSeller: true, author: richard.id }).save();
        expect(mobyDick.id).toBeDefined();
        expect(mobyDick.name).toBe('Moby Dick');
        expect(mobyDick.price).toBe(9.99);
        expect(mobyDick.author).toBe(richard.id);

        healthBook = await node('Book').data({ name: 'Health and Wellness', bids: [5.00, 9.00, 12.50], price: '29.99', author: christie.id }).save();
        expect(healthBook.id).toBeDefined();
        expect(healthBook.name).toEqual('Health And Wellness');
        expect(healthBook.price).toEqual(29.99);
        expect(healthBook.author).toEqual(christie.id);
      });

      test('Chapter', async () => {
        chapter1 = await node('Chapter').data({ name: 'chapter1', book: healthBook.id }).save();
        chapter2 = await node('Chapter').data({ name: 'chapter2', book: healthBook.id }).save();
        expect(chapter1.id).toBeDefined();
        expect(chapter1.name).toEqual('Chapter1');
        expect(chapter2.id).toBeDefined();
        expect(chapter2.name).toEqual('Chapter2');
      });

      test('Page', async () => {
        page1 = await node('Page').data({ number: 1, chapter: chapter1.id, verbage: 'This is the introduction, of sorts.' }).save();
        page2 = await node('Page').data({ number: 2, chapter: chapter1.id, verbage: 'Now you know.' }).save();
        page3 = await node('Page').data({ number: 1, chapter: chapter2.id, verbage: 'Ready for more?' }).save();
        page4 = await node('Page').data({ number: 2, chapter: chapter2.id, verbage: 'The end.' }).save();
        expect(page1.id).toBeDefined();
        expect(page2.id).toBeDefined();
        expect(page3.id).toBeDefined();
        expect(page4.id).toBeDefined();
      });

      test('Building', async () => {
        bookBuilding = await node('Building').data({ year: 1990, type: 'business', tenants: christie.id }).save();
        libraryBuilding = await node('Building').data({ type: 'business', tenants: christie.id }).save();
        apartmentBuilding = await node('Building').data({ type: 'home', tenants: [richard.id, christie.id], landlord: richard.id }).save();
        expect(bookBuilding.id).toBeDefined();
        expect(bookBuilding.year).toEqual(1990);
        expect(libraryBuilding.id).toBeDefined();
        expect(libraryBuilding.tenants).toEqual([christie.id]);
        expect(apartmentBuilding.id).toBeDefined();
        expect(apartmentBuilding.landlord).toEqual(richard.id);
        expect(apartmentBuilding.tenants).toEqual([richard.id, christie.id]);
      });

      test('BookStore', async () => {
        bookstore1 = await node('BookStore').data({ name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: bookBuilding }).save();
        bookstore2 = await node('BookStore').data({ name: 'New Books', books: [mobyDick.id], building: bookBuilding }).save();
        expect(bookstore1.id).toBeDefined();
        expect(bookstore1.books.length).toEqual(3);
        expect(bookstore1.building.type).toEqual('business');
        expect(bookstore2.id).toBeDefined();
        expect(bookstore2.books.length).toEqual(1);
        expect(bookstore2.building.type).toEqual('business');
      });

      test('Library', async () => {
        library = await node('Library').data({ name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: libraryBuilding }).save();
        expect(library.id).toBeDefined();
        expect(library.books.length).toEqual(3);
        expect(library.building.type).toEqual('business');
      });
    });


    describe('Get', () => {
      test('Person', async () => {
        expect(await node('Person').id(richard.id).one()).toMatchObject({ id: richard.id, name: richard.name });
        expect(await node('Person').id(christie.id).one()).toMatchObject({ id: christie.id, name: christie.name, friends: [richard.id] });
      });

      test('Book', async () => {
        expect(await node('Book').id(mobyDick.id).one()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick', author: richard.id });
        expect(await node('Book').id(healthBook.id).one()).toMatchObject({ id: healthBook.id, name: 'Health And Wellness', author: christie.id });
      });

      test('Chapter', async () => {
        expect(await node('Chapter').id(chapter1.id).one()).toMatchObject({ id: chapter1.id, name: 'Chapter1', book: healthBook.id });
        expect(await node('Chapter').id(chapter2.id).one()).toMatchObject({ id: chapter2.id, name: 'Chapter2', book: healthBook.id });
      });

      test('Page', async () => {
        expect(await node('Page').id(page1.id).one()).toMatchObject({ id: page1.id, number: 1, chapter: chapter1.id });
        expect(await node('Page').id(page2.id).one()).toMatchObject({ id: page2.id, number: 2, chapter: chapter1.id });
        expect(await node('Page').id(page3.id).one()).toMatchObject({ id: page3.id, number: 1, chapter: chapter2.id });
        expect(await node('Page').id(page4.id).one()).toMatchObject({ id: page4.id, number: 2, chapter: chapter2.id });
      });

      test('Building', async () => {
        expect(await node('Building').id(bookBuilding.id).one()).toMatchObject({ id: bookBuilding.id, year: 1990, type: 'business' });
        expect(await node('Building').id(libraryBuilding.id).one()).toMatchObject({ id: libraryBuilding.id, type: 'business' });
        expect(await node('Building').id(apartmentBuilding.id).one()).toMatchObject({ id: apartmentBuilding.id, type: 'home', tenants: [richard.id, christie.id], landlord: richard.id });
      });

      test('BookStore', async () => {
        expect(await node('BookStore').id(bookstore1.id).one()).toMatchObject({ id: bookstore1.id, name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: expect.objectContaining(bookBuilding) });
        expect(await node('BookStore').id(bookstore2.id).one()).toMatchObject({ id: bookstore2.id, name: 'New Books', books: [mobyDick.id], building: expect.objectContaining(bookBuilding) });
      });

      test('Library', async () => {
        expect(await node('Library').id(library.id).one()).toMatchObject({ id: library.id, name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: expect.objectContaining(libraryBuilding) });
      });

      test('Null', async () => {
        expect(await node('Library').id('no-such-id').one()).toBeNull();
      });
    });


    describe('Find', () => {
      test('Person', async () => {
        expect((await node('Person').many({ find: true })).length).toBe(2);
        expect(await node('Person').where({ name: 'richard' }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ name: 'Christie' }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ emailAddress: 'rich@coderich.com' }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect((await node('Person').where({ name: ['Richard', 'Christie'] }).many({ find: true })).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect((await node('Person').where({ name: '*' }).many({ find: true })).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect(await node('Person').where({ authored: mobyDick.id }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
      });

      test('Book', async () => {
        expect((await node('Book').many({ find: true })).length).toBe(2);
        expect(await node('Book').where({ author: richard.id }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ price: 9.99 }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ price: '9.99' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ author: christie.id }).many({ find: true })).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await node('Book').where({ bestSeller: true }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ bestSeller: 'TRu?' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ bestSeller: 'tru' }).many({ find: true })).toMatchObject([]);
        expect(await node('Book').where({ price: '?.??' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await node('Book').where({ price: '??.*' }).many({ find: true })).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await node('Book').where({ bids: [1.99] }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ bids: 1.99 }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect((await node('Book').where({ bids: 5.00 }).many({ find: true })).sort(sorter)).toMatchObject([{ id: mobyDick.id }, { id: healthBook.id }].sort(sorter));
        expect(await node('Book').where({ bids: [19.99, '1.99'] }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ chapters: chapter1.id }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
      });

      test('Chapter', async () => {
        expect((await node('Chapter').many({ find: true })).length).toBe(2);
        expect(await node('Chapter').where({ name: 'cHAPter1' }).many({ find: true })).toMatchObject([{ id: chapter1.id, name: 'Chapter1', book: healthBook.id }]);
        expect(await node('Chapter').where({ name: 'cHAPteR2' }).many({ find: true })).toMatchObject([{ id: chapter2.id, name: 'Chapter2', book: healthBook.id }]);
        expect(await node('Chapter').where({ name: 'cHAPteR3' }).many({ find: true })).toEqual([]);
        expect(await node('Chapter').where({ book: mobyDick.id }).many({ find: true })).toEqual([]);
        expect(await node('Chapter').where({ book: 'some-odd-id' }).many({ find: true })).toEqual([]);
        expect((await node('Chapter').where({ book: healthBook.id }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: chapter1.id, name: 'Chapter1', book: healthBook.id },
          { id: chapter2.id, name: 'Chapter2', book: healthBook.id },
        ].sort(sorter));
      });

      test('Page', async () => {
        expect((await node('Page').many({ find: true })).length).toBe(4);
        expect((await node('Page').where({ chapter: chapter1.id }).many({ find: true })).length).toBe(2);
        expect((await node('Page').where({ chapter: chapter2.id }).many({ find: true })).length).toBe(2);
        expect((await node('Page').where({ number: 1 }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: page1.id, chapter: chapter1.id },
          { id: page3.id, chapter: chapter2.id },
        ].sort(sorter));
        expect((await node('Page').where({ number: '2' }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: page2.id, chapter: chapter1.id },
          { id: page4.id, chapter: chapter2.id },
        ].sort(sorter));
      });

      test('Building', async () => {
        expect((await node('Building').many({ find: true })).length).toBe(3);
        expect((await node('Building').where({ tenants: [richard.id] }).many({ find: true })).length).toBe(1);
        expect((await node('Building').where({ tenants: [christie.id] }).many({ find: true })).length).toBe(3);
        expect((await node('Building').where({ tenants: [richard.id, christie.id] }).many({ find: true })).length).toBe(3);
        expect((await node('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).many({ find: true })).length).toBe(1);
        expect((await node('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).many({ find: true })).length).toBe(0);
      });

      test('BookStore', async () => {
        expect((await node('BookStore').many({ find: true })).length).toBe(2);
        expect((await node('BookStore').where({ books: [mobyDick.id] }).many({ find: true })).length).toBe(2);
        expect((await node('BookStore').where({ name: 'new books' }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: bookstore2.id, name: 'New Books', building: expect.objectContaining(bookBuilding) },
        ].sort(sorter));
      });

      test('Library', async () => {
        expect((await node('Library').many({ find: true })).length).toBe(1);
      });
    });


    describe('Count (find)', () => {
      test('Person', async () => {
        expect(await node('Person').count()).toBe(2);
        expect(await node('Person').where({ name: 'richard' }).count()).toBe(1);
        expect(await node('Person').where({ name: 'Christie' }).count()).toBe(1);
      });

      test('Book', async () => {
        expect(await node('Book').count()).toBe(2);
        expect(await node('Book').where({ author: richard.id }).count()).toBe(1);
        expect(await node('Book').where({ price: 9.99 }).count()).toBe(1);
        expect(await node('Book').where({ price: '9.99' }).count()).toBe(1);
        expect(await node('Book').where({ author: christie.id }).count()).toBe(1);
      });

      test('Chapter', async () => {
        expect(await node('Chapter').count()).toBe(2);
        expect(await node('Chapter').where({ name: 'cHAPter1' }).count()).toBe(1);
        expect(await node('Chapter').where({ name: 'cHAPteR2' }).count()).toBe(1);
        expect(await node('Chapter').where({ name: 'cHAPteR3' }).count()).toBe(0);
        expect(await node('Chapter').where({ book: mobyDick.id }).count()).toBe(0);
        expect(await node('Chapter').where({ book: 'some-odd-id' }).count()).toEqual(0);
        expect(await node('Chapter').where({ book: healthBook.id }).count()).toBe(2);
      });

      test('Page', async () => {
        expect(await node('Page').count()).toBe(4);
        expect(await node('Page').where({ chapter: chapter1.id }).count()).toBe(2);
        expect(await node('Page').where({ chapter: chapter2.id }).count()).toBe(2);
        expect(await node('Page').where({ number: 1 }).count()).toBe(2);
        expect(await node('Page').where({ number: '2' }).count()).toBe(2);
      });

      test('Building', async () => {
        expect(await node('Building').count()).toBe(3);
        expect(await node('Building').where({ tenants: [richard.id] }).count()).toBe(1);
        expect(await node('Building').where({ tenants: [christie.id] }).count()).toBe(3);
        expect(await node('Building').where({ tenants: [richard.id, christie.id] }).count()).toBe(3);
        expect(await node('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).count()).toBe(1);
        expect(await node('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).count()).toBe(0);
      });

      test('BookStore', async () => {
        expect(await node('BookStore').count()).toBe(2);
        expect(await node('BookStore').where({ books: [mobyDick.id] }).count()).toBe(2);
        expect(await node('BookStore').where({ name: 'new books' }).count()).toBe(1);
      });

      test('Library', async () => {
        expect(await node('Library').count()).toBe(1);
      });
    });


    describe('Data Validation', () => {
      test('Person', async () => {
        await expect(node('Person').save()).rejects.toThrow();
        await expect(node('Person').data({ name: 'Richard' }).save()).rejects.toThrow();
        await expect(node('Person').data({ name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: ['nobody'] }).save()).rejects.toThrow();
        await expect(node('Person').data({ name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: [richard.id, 'nobody'] }).save()).rejects.toThrow();
        await expect(node('Person').data({ name: 'NewGuy', emailAddress: 'newguygmail.com' }).save()).rejects.toThrow();
        await expect(node('Person').id(richard.id).data({ name: 'Christie' }).save()).rejects.toThrow();
        await expect(node('Person').id(richard.id).data({ name: 'christie' }).save()).rejects.toThrow();
        await expect(node('Person').id(richard.id).data({ name: null }).save()).rejects.toThrow();
        await expect(node('Person').id('nobody').data({ name: 'NewGuy' }).save()).rejects.toThrow();
        await expect(node('Person').id(richard.id).data({ friends: [richard.id] }).save()).rejects.toThrow();
      });

      test('Book', async () => {
        await expect(node('Book').save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible' }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible', author: 'Moses' }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible', author: richard.id }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible', price: 1.99 }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible', price: 1.99, author: mobyDick.id }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'The Bible', price: 1.99, author: [christie.id] }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'the bible', price: 1.99, author: christie.id }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'Great Book', price: -1, author: christie.id }).save()).rejects.toThrow();
        await expect(node('Book').data({ name: 'Best Book', price: 101, author: christie.id }).save()).rejects.toThrow();
        await expect(node('Book').id(mobyDick.id).data({ author: christie.id }).save()).rejects.toThrow();
        await expect(node('Book').id(mobyDick.id).data({ author: richard.id }).save()).resolves;

        switch (stores.default.type) {
          case 'mongo': {
            await expect(node('Book', { name: 'MoBY DiCK', price: 1.99, author: richard.id }).save()).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Chapter', async () => {
        await expect(node('Chapter').save()).rejects.toThrow();
        await expect(node('Chapter').data({ name: 'chapter1' }).save()).rejects.toThrow();
        await expect(node('Chapter').data({ name: 'chapter2' }).save()).rejects.toThrow();
        await expect(node('Chapter').data({ name: 'chapter3' }).save()).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(node('Chapter').data({ name: 'chapter1', book: healthBook.id }).save()).rejects.toThrow();
            await expect(node('Chapter').data({ name: 'chapter3', book: christie.id }).save()).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Page', async () => {
        await expect(node('Page').save()).rejects.toThrow();
        await expect(node('Page').data({ number: 3 }).save()).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(node('Page').data({ number: 1, chapter: chapter1 }).save()).rejects.toThrow();
            await expect(node('Page').data({ number: 1, chapter: chapter1.id }).save()).rejects.toThrow();
            await expect(node('Page').data({ number: 1, chapter: page4.id }).save()).rejects.toThrow();
            await expect(node('Page').id(page1.id).data({ number: 2 }).save()).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Building', async () => {
        await expect(node('Building').save()).rejects.toThrow();
        await expect(node('Building').data({ type: 'bad-type' }).save()).rejects.toThrow();
        await expect(node('Building').data({ type: 'business', landlord: bookstore1.id }).save()).rejects.toThrow();
        await expect(node('Building').data({ type: 'business', tenants: [richard.id, bookstore1.id] }).save()).rejects.toThrow();
      });

      test('BookStore', async () => {
        await expect(node('BookStore').save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'New Books' }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'New Books', building: 'bad-building' }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'besT bookS eveR', building: bookBuilding }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'Best Books Ever', building: libraryBuilding }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'More More Books', building: bookBuilding, books: bookBuilding.id }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'More More Books', building: bookBuilding, books: [bookBuilding.id] }).save()).rejects.toThrow();
        await expect(node('BookStore').data({ name: 'More More Books', building: bookBuilding, books: [mobyDick.id, bookBuilding] }).save()).rejects.toThrow();
      });

      test('Library', async () => {
        await expect(node('Library').save()).rejects.toThrow();
        await expect(node('Library').data({ name: 'New Library' }).save()).rejects.toThrow();
        await expect(node('Library').data({ name: 'New Library', building: 'bad-building' }).save()).rejects.toThrow();
        await expect(node('Library').data({ name: 'New Library', building: libraryBuilding }).save()).rejects.toThrow();
      });
    });


    describe('Data Normalization', () => {
      test('uniq', async () => {
        richard = await node('Person').id(richard.id).data({ name: 'richard', friends: [christie.id, christie.id, christie.id] }).save();
        expect(richard.name).toEqual('Richard');
        expect(richard.friends).toEqual([christie.id]);
      });
    });


    describe('Find (Deep)', () => {
      test('Person', async () => {
        expect(await node('Person').where({ authored: { name: 'Moby Dick' } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ authored: { author: { name: 'ChRist??' } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ friends: { name: 'Christie' } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ friends: { authored: { name: 'Health*' } } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).many({ find: true })).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).many({ find: true })).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await node('Book').where({ author: { name: 'Richard' } }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ author: { authored: { name: 'Moby*' } } }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ author: { authored: { name: 'Health*' } } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect((await node('Book').where({ author: { authored: { name: '*' } } }).many({ find: true })).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await node('Book').where({ chapters: { name: 'Chapter1' } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: '*' } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { pages: { number: 1 } } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Update', () => {
      test('Person', async () => {
        expect(await node('Person').id(richard.id).data({ name: 'Rich' }).save()).toMatchObject({ id: richard.id, name: 'Rich' });
        expect(await node('Person').id(richard.id).data({ name: 'richard' }).save()).toMatchObject({ id: richard.id, name: 'Richard' });
      });

      test('Book', async () => {
        expect(await node('Book').id(mobyDick.id).data({ name: 'mopey dick' }).save()).toMatchObject({ id: mobyDick.id, name: 'Mopey Dick' });
        expect(await node('Book').id(mobyDick.id).data({ name: 'moby dick' }).save()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick' });
      });
    });


    describe('Query (Deep)', () => {
      test('Person', async () => {
        expect(await node('Person').where({ authored: { name: 'Moby Dick' } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ authored: { author: { name: 'ChRist??' } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ friends: { name: 'Christie' } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ friends: { authored: { name: 'Health*' } } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await node('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).many()).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).many()).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([]);
        expect(await node('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await node('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await node('Book').where({ author: { name: 'Richard' } }).many()).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ author: { authored: { name: 'Moby*' } } }).many()).toMatchObject([{ id: mobyDick.id }]);
        expect(await node('Book').where({ author: { authored: { name: 'Health*' } } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect((await node('Book').where({ author: { authored: { name: '*' } } }).many()).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await node('Book').where({ chapters: { name: 'Chapter1' } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { name: '*' } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: { pages: { number: 1 } } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await node('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).many()).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Query (by counts)', () => {
      test('Person', async () => {
        expect(await node('Person').where({ countAuthored: '2' }).many()).toMatchObject([]);
        expect((await node('Person').where({ countAuthored: '1' }).many()).length).toBe(2);
      });
    });


    describe('Query (crazy stuff)', () => {
      test('sortBy', async () => {
        expect(await node('Book').sortBy({ name: 'asc' }).one()).toMatchObject({ id: healthBook.id, name: 'Health And Wellness' });
        expect(await node('Book').sortBy({ name: 'desc' }).one()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick' });
        expect(await node('Book').sortBy({ name: 'desc' }).first(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'desc' }).last(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).first(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).last(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).first(2)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }, { id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).last(2)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }, { id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).after(healthBook.$$cursor).first(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).after(healthBook.$$cursor).last(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await node('Book').sortBy({ name: 'asc' }).before(healthBook.$$cursor).first(1)).toMatchObject([]);
        expect(await node('Book').sortBy({ name: 'asc' }).before(healthBook.$$cursor).last(1)).toMatchObject([]);
      });
    });
  });
};
