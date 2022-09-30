import { expect } from '@open-wc/testing';

let count = 0;

describe('root', () => {
  // this runs before each item, including all the nested children
  beforeEach(() => {
    count++;
  });

  it('increments', () => {
    expect(count).equal(1);
  });
  it('increments again', () => {
    expect(count).equal(2);
  });

  describe('child', () => {
    it('applies nested items too', () => {
      expect(count).equal(3);
    });

    describe('grandchild', () => {
      it('even doubly nested.. all the way down', () => {
        expect(count).equal(4);
      });
    });
  });

  describe('child with more', () => {
    beforeEach(() => {
      count++;
    });

    it('beforeEach commands stack, so 2x for this one', () => {
      expect(count).equal(6);
    });
  });
});
