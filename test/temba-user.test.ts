import '../temba-modules';
import { fixture, assert } from '@open-wc/testing';
import { TembaUser, getFullName } from '../src/display/TembaUser';

const createUser = async (markup: string): Promise<TembaUser> => {
  return (await fixture(markup)) as TembaUser;
};

describe('temba-user', () => {
  it('renders with initials from name', async () => {
    const user = await createUser(
      '<temba-user name="Jane Doe"></temba-user>'
    );
    assert.instanceOf(user, TembaUser);
    assert.equal(user.initials, 'JD');
    assert.notEqual(user.bgcolor, '#e6e6e6');
    assert.isNull(user.bgimage);
  });

  it('resets initials and bgcolor when name is cleared', async () => {
    const user = await createUser(
      '<temba-user name="Jane Doe"></temba-user>'
    );
    user.name = '';
    await user.updateComplete;
    assert.equal(user.initials, '');
    assert.equal(user.bgcolor, '#e6e6e6');
  });

  it('sets bgimage from avatar', async () => {
    const user = await createUser(
      '<temba-user name="Jane" avatar="/img/a.png"></temba-user>'
    );
    assert.include(user.bgimage, "url('/img/a.png')");
  });

  it('uses default avatar when system is true', async () => {
    const user = await createUser(
      '<temba-user name="Bot" system></temba-user>'
    );
    assert.isNotNull(user.bgimage);
    assert.include(user.bgimage, 'url(');
  });

  it('renders name when showName set', async () => {
    const user = await createUser(
      '<temba-user name="Jane Doe" showname scale="1"></temba-user>'
    );
    await user.updateComplete;
    const nameEl = user.shadowRoot.querySelector('.name');
    assert.isNotNull(nameEl);
    assert.include(nameEl.textContent, 'Jane Doe');
  });

  it('omits name element when showName is false', async () => {
    const user = await createUser(
      '<temba-user name="Jane Doe"></temba-user>'
    );
    await user.updateComplete;
    assert.isNull(user.shadowRoot.querySelector('.name'));
  });
});

describe('getFullName', () => {
  it('prefers name over first/last', () => {
    assert.equal(
      getFullName({ name: 'Jane Doe', first_name: 'x', last_name: 'y' }),
      'Jane Doe'
    );
  });

  it('joins first and last when name is missing', () => {
    assert.equal(
      getFullName({ first_name: 'Jane', last_name: 'Doe' }),
      'Jane Doe'
    );
  });
});
