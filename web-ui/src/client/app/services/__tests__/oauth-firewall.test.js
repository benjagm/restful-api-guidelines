/* global global */

describe('oauth-firewall', () => {
  let mockRequestToken, OAuthProviderMock, mockCheckTokenIsValid, firewall;
  beforeEach(() => {
    jest.resetModules();
    mockRequestToken = jest.fn();
    mockCheckTokenIsValid = jest.fn();
    jest.mock('../oauth-provider');
    jest.mock('../oauth-util', () => ({
      requestToken: mockRequestToken,
      checkTokenIsValid: mockCheckTokenIsValid
    }));
    global.window = {
      env: {},
      location: {
        hash: ''
      }
    };
    firewall = require('../oauth-firewall').default;
    OAuthProviderMock = require('../oauth-provider').default;
  });

  afterEach(() => {
    delete global.window;
  });

  test('return immediately with a resolved promise if oauth is disabled', (done) => {
    global.window.env.OAUTH_ENABLED = false;
    firewall()
      .then(() => {
        expect(mockCheckTokenIsValid).not.toHaveBeenCalled();
        expect(mockRequestToken).not.toHaveBeenCalled();
        done();
      });
  });

  test('return a rejected promise and request a token if OAuthProvider doesn\'t have an access token', (done) => {
    global.window.env.OAUTH_ENABLED = true;

    firewall()
      .catch(() => {
        expect(mockRequestToken).toHaveBeenCalled();
        done();
      });
  });

  test('parse implicit grant flow response and "redirect" the user', (done) => {
    const parseResponse = {};
    global.window.env.OAUTH_ENABLED = true;
    global.window.location.hash = '#access_token=foo';
    global.window.location.href = 'https://www.google.com#access_token=foo';
    OAuthProviderMock._response = parseResponse;

    firewall()
      .then((response) => {
        expect(global.window.location.href).toEqual('https://www.google.com');
        expect(parseResponse).toEqual(response);
        done();
      });
  });


  test('parse implicit grant flow response and request token if something went wrong', (done) => {
    global.window.env.OAUTH_ENABLED = true;
    global.window.location.hash = '#access_token=foo';
    global.window.location.href = 'https://www.google.com#access_token=foo';
    const parseError = new Error();
    OAuthProviderMock.parse = () => {
      throw parseError;
    };

    firewall()
      .catch((error) => {
        expect(mockRequestToken).toHaveBeenCalled();
        expect(parseError).toEqual(error);
        done();
      });
  });

  test('parse implicit grant flow response and reject if response it\'s an error', (done) => {
    const parseResponse = new Error('OAuthError');
    global.window.env.OAUTH_ENABLED = true;
    global.window.location.hash = '#access_token=foo';
    global.window.location.href = 'https://www.google.com#access_token=foo';
    OAuthProviderMock._response = parseResponse;

    firewall()
      .catch((error) => {
        expect(global.window.location.href).toEqual('https://www.google.com#access_token=foo');
        expect(error).toEqual(parseResponse);
        expect(mockRequestToken).not.toHaveBeenCalled();
        done();
      });
  });

  test('check token is valid if OAuthProvider has an access token', (done) => {
    mockCheckTokenIsValid.mockReturnValueOnce(Promise.resolve('valid'));
    global.window.env.OAUTH_ENABLED = true;
    OAuthProviderMock._accessToken = 'foo';

    firewall()
      .then((response) => {
        expect(mockCheckTokenIsValid).toHaveBeenCalled();
        expect(mockRequestToken).not.toHaveBeenCalled();
        expect(response).toEqual('valid');
        done();
      });
  });

});