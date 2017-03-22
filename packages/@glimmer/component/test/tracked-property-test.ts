const { module, test } = QUnit;

import { tracked, tagForProperty, UntrackedPropertyError } from '../src/tracked';

module('Tracked Properties');

test('requesting a tag for an untracked property should throw an exception', (assert) => {
  class UntrackedPerson {
    firstName = 'Tom';
  }  

  let obj = new UntrackedPerson();

  assert.throws(() => {
    tagForProperty(obj, 'firstName')
  }, new UntrackedPropertyError(obj, 'firstName'));
});

test('tracked properties can be read and written to', (assert) => {
  class TrackedPerson {
    @tracked firstName = 'Tom';
  }

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom');
  obj.firstName = 'Edsger';
  assert.strictEqual(obj.firstName, 'Edsger');
});

test('can request a tag for a property', (assert) => {
  class TrackedPerson {
    @tracked firstName = 'Tom';
  }

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom');

  let tag = tagForProperty(obj, 'firstName');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  obj.firstName = 'Edsger';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after property is set');
  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true, 'tag is valid on the second check');
});

test('can track a computed property', (assert) => {
  let count = 0;
  let firstName = "Tom";

  class TrackedPerson {
    @tracked get firstName() {
      return firstName + count++;
    }

    set firstName(value) {
      firstName = value;
    }
  }

  let obj = new TrackedPerson();
  assert.strictEqual(obj.firstName, 'Tom0');
  assert.strictEqual(obj.firstName, 'Tom1');

  let tag = tagForProperty(obj, 'firstName');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  assert.strictEqual(obj.firstName, 'Tom2', 'reading from property does not invalidate the tag');

  obj.firstName = 'Edsger';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after property is set');
  snapshot = tag.value();
  assert.strictEqual(obj.firstName, 'Edsger3');
  assert.strictEqual(tag.validate(snapshot), true, 'tag is valid on the second check');
});

test('tracked computed properties are invalidated when their dependencies are invalidated', (assert) => {
  class TrackedPerson {
    @tracked('fullName')
    get salutation() {
      return `Hello, ${this.fullName}!`;
    }

    @tracked('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`
    }
    set fullName(fullName) {
      let [firstName, lastName] = fullName.split(' ');
      this.firstName = firstName;
      this.lastName = lastName;
    }

    @tracked firstName = 'Tom';
    @tracked lastName = 'Dale';
  }

  let obj = new TrackedPerson();
  assert.strictEqual(obj.salutation, 'Hello, Tom Dale!');
  assert.strictEqual(obj.fullName, 'Tom Dale');

  let tag = tagForProperty(obj, 'salutation');
  let snapshot = tag.value();
  assert.ok(tag.validate(snapshot), 'tag should be valid to start');

  obj.firstName = 'Edsger';
  obj.lastName = 'Dijkstra';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after chained dependency is set');
  assert.strictEqual(obj.fullName, 'Edsger Dijkstra');
  assert.strictEqual(obj.salutation, 'Hello, Edsger Dijkstra!');

  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true);

  obj.fullName = 'Alan Kay';
  assert.strictEqual(tag.validate(snapshot), false, 'tag is invalidated after chained dependency is set');
  assert.strictEqual(obj.fullName, 'Alan Kay');
  assert.strictEqual(obj.firstName, 'Alan');
  assert.strictEqual(obj.lastName, 'Kay');
  assert.strictEqual(obj.salutation, 'Hello, Alan Kay!');

  snapshot = tag.value();
  assert.strictEqual(tag.validate(snapshot), true);
});