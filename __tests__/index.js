const axios = require('axios');
const { inspect } = require('util');

describe('async test', () => {
  const token = '6797ed319db5e74b2ca44ffca4a0a7319642f6c8';
  test('github/user/ml-MarkVann', () => {
    expect.assertions(8);
    return axios.get('https://api.github.com/users/ml-MarkVann', {
      headers: {
        Authorization: `token ${token}`,
      },
    })
    .then((res) => {
      // console.log(inspect(res));
      expect(res).not.toBeNull();
      expect(res.status).toEqual(200);
      expect(res.statusText).toEqual('OK');
      expect(res.data).not.toBeNull();
      return res.data;
    })
    .then((data) => {
      console.log(inspect(data));
      expect(data).not.toBeNull();
      expect(data).toHaveProperty('login', 'ml-MarkVann');
      expect(data).toHaveProperty('name', 'MarkVann');
      expect(data).toHaveProperty('type', 'User');
    })
    .catch((err) => {
      console.error(`#ERROR---> ${err}`);
    });
  });
});
