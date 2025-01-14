/* jshint -W079 */ 
/* Related to https://github.com/linnovate/mean/issues/898 */
'use strict';

var crypto  = require('crypto'),
    config  = require('meanio').loadConfig(),
    request = require('request');

/**
 * Create a random hex string of specific length and
 * @todo consider taking out to a common unit testing javascript helper
 * @return string
 */
function getRandomString(len) {
  if (!len)
    len = 16;

  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex');
}

/**
 * Module dependencies.
 */

var expect = require('expect.js'),
  	mongoose = require('mongoose'),
  FBLogin = mongoose.model('FBLogin'),
  User = mongoose.model('User');

/**
 * Globals
 */
var user1, user2;

/**
 * Test Suites
 */
describe('<Unit Test>', function() {
  describe('Model User:', function() {

    before(function(done) {
      user1 = {
        name: 'Full name',
        email: 'test' + getRandomString() + '@test.com',
        username: getRandomString(),
        password: 'password',
        provider: 'local'
      };

      user2 = {
        name: 'Full name',
        email: 'test' + getRandomString() + '@test.com',
        username: getRandomString(),
        password: 'password',
        provider: 'local'
      };

      done();
    });

    describe('Method Save', function() {
      it('should begin without the test user', function(done) {
        User.find({
          email: user1.email
        }, function(err, users) {
          expect(users.length).to.equal(0);

          User.find({
            email: user2.email
          }, function(err, users) {
            expect(users.length).to.equal(0);
            done();
          });

        });
      });

      it('should be able to save without problems', function(done) {

        var _user = new User(user1);
        _user.save(function(err) {
          expect(err).to.be(null);
          _user.remove();
          done();
        });

      });

      it('should check that roles are assigned and created properly', function(done) {

        var _user = new User(user1);
        _user.save(function(err) {
          expect(err).to.be(null);

          // the user1 object and users in general are created with only the 'authenticated' role
          expect(_user.hasRole('authenticated')).to.equal(true);
          expect(_user.hasRole('admin')).to.equal(false);
          expect(_user.isAdmin()).to.equal(false);
          // With the introduction of roles by circles a user has both anonymous and authenticated circles upon creation 
          expect(_user.roles.length).to.equal(2);
          _user.remove(function(err) {
            done();
          });
        });

      });

      it('should confirm that password is hashed correctly', function(done) {

        var _user = new User(user1);

        _user.save(function(err) {
          expect(err).to.be(null);

          expect(_user.hashed_password.length).to.not.equal(0);
          expect(_user.salt.length).to.not.equal(0);
          expect(_user.authenticate(user1.password)).to.equal(true);
          _user.remove(function(err) {
            done();
          });

        });
      });

      it('should be able to create user and save user for updates without problems', function(done) {

        var _user = new User(user1);
        _user.save(function(err) {
          expect(err).to.be(null);

          _user.name = 'Full name2';
          _user.save(function(err) {
            expect(err).to.be(null);
            expect(_user.name).to.equal('Full name2');
            _user.remove(function() {
              done();
            });
          });

        });

      });

      it('should fail to save an existing user with the same values', function(done) {

        var _user1 = new User(user1);
        _user1.save();

        var _user2 = new User(user1);

        return _user2.save(function(err) {
          expect(err).to.not.be(null);
          _user1.remove(function() {

            if (!err) {
              _user2.remove(function() {
                done();
              });
            }

            done();

          });

        });
      });

      it('should show an error when try to save without name', function(done) {

        var _user = new User(user1);
        _user.name = '';

        return _user.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });

      it('should show an error when try to save without username', function(done) {

        var _user = new User(user1);
        _user.username = '';

        return _user.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });

      it('should show an error when try to save without password and provider set to local', function(done) {

        var _user = new User(user1);
        _user.password = '';
        _user.provider = 'local';

        return _user.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });

      it('should be able to to save without password and provider set to twitter', function(done) {

        var _user = new User(user1);

        _user.password = '';
        _user.provider = 'twitter';

        return _user.save(function(err) {
          _user.remove(function() {
            expect(err).to.be(null);
            expect(_user.provider).to.equal('twitter');
            expect(_user.hashed_password.length).to.equal(0);
            done();
          });
        });
      });

    });

    // source: http://en.wikipedia.org/wiki/Email_address
    describe('Test Email Validations', function() {
      it('Shouldnt allow invalid emails #1', function(done) {
        var _user = new User(user1);
        _user.email = 'Abc.example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #2', function(done) {
        var _user = new User(user1);
        _user.email = 'A@b@c@example.com';
        _user.save(function(err) {
          if (err) {
            expect(err).to.not.be(null);
            done();
          } else {
            _user.remove(function(err2) {
              expect(err).to.not.be(null);
              done();
            });
          }
        });
      });

      it('Shouldnt allow invalid emails #3', function(done) {
        var _user = new User(user1);
        _user.email = 'a"b(c)d,e:f;g<h>i[j\\k]l@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #4', function(done) {
        var _user = new User(user1);
        _user.email = 'just"not"right@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #5', function(done) {
        var _user = new User(user1);
        _user.email = 'this is"not\\allowed@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #6', function(done) {
        var _user = new User(user1);
        _user.email = 'this\\ still\\"not\\allowed@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #7', function(done) {
        var _user = new User(user1);
        _user.email = 'john..doe@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Shouldnt allow invalid emails #8', function(done) {
        var _user = new User(user1);
        _user.email = 'john.doe@example..com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.not.be(null);
              done();
            });
          } else {
            expect(err).to.not.be(null);
            done();
          }
        });
      });

      it('Should save with valid email #1', function(done) {
        var _user = new User(user1);
        _user.email = 'john.doe@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.be(null);
              done();
            });
          } else {
            expect(err).to.be(null);
            done();
          }
        });
      });

      it('Should save with valid email #2', function(done) {
        var _user = new User(user1);
        _user.email = 'disposable.style.email.with+symbol@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.be(null);
              done();
            });
          } else {
            expect(err).to.be(null);
            done();
          }
        });
      });

      it('Should save with valid email #3', function(done) {
        var _user = new User(user1);
        _user.email = 'other.email-with-dash@example.com';
        _user.save(function(err) {
          if (!err) {
            _user.remove(function() {
              expect(err).to.be(null);
              done();
            });
          } else {
            expect(err).to.be(null);
            done();
          }
        });
      });

      it('name should be escaped from xss', function(done) {

        var _user = new User(user1);
        _user.name = '</script><script>alert(1)</script>';

        return _user.save(function(err) {
          expect(_user.name).to.be('&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
          done();
        });
      });

      it('username should be escaped from xss', function(done) {

        var _user = new User(user1);
        _user.name = '<b>xss</b>';

        return _user.save(function(err) {
          expect(_user.name).to.be('&lt;b&gt;xss&lt;/b&gt;');
          done();
        });
      });

    });

    after(function(done) {

      /** Clean up user objects
       * un-necessary as they are cleaned up in each test but kept here
       * for educational purposes
       *
       *  var _user1 = new User(user1);
       *  var _user2 = new User(user2);
       *
       *  _user1.remove();
       *  _user2.remove();
       */

      done();
    });
  });

  describe('Facebook login using access tokens', function() {
    var user;
    var fbTokenData = {
      user_id: '150901598586601',
      access_token: 'CAABzpqkH5PgBAPkrEQ6qZBSly46kr8vLScufozeYMIEsX68wbFIOeCoatNWopS0WDeQ8QhxMMUuXRRKoA1DG9dh4K0u3nsBEKUTC8goiLGVDAOt6YNWb6oLNaRWreQt7ZAv7xOypVdgQi6oYyjN943QZAtt9QCYklBYQbHU5vhaX4Mb60jNkdfGExmZB5JlhflfdmLZBPtB5B8xWirCZCioTdGcCrI2fklZBJEQZA5ipAAZDZD'
    };

    it('should create a user, then be able to retrieve it again', function(done) {
      this.timeout(10000);

      var postEndpoint = config.hostname + '/api/auth/facebook/getorcreate';
      var requestConfig = {
	  uri: postEndpoint,
	  method: 'POST',
	  json: fbTokenData
      };
      // POST the user via facebook
      request(requestConfig, function(err, resp, body) {
	expect(err).to.be(null);
	expect(resp.statusCode).to.be(200);
	user = new User(body);
	expect(user.facebook).to.not.be(null);
	// query for the user again by facebook token
	request(requestConfig, function(err, resp, body) {
	  expect(err).to.be(null);
	  expect(resp.statusCode).to.be(200);
	  // downloaded user should be same as POSTed one
	  var downloadedUser = new User(body);
	  expect(downloadedUser.id.toString())
	    .to.equal(user.id.toString());
	  downloadedUser.remove(function(err) {
	    expect(err).to.be(null);
	    // The user's associated FBLogin should be removed
	    FBLogin.findOne({_id: downloadedUser.facebook},
	      function(err, doc) {
		expect(err).to.be(null);
		expect(doc).to.be(null);
		return done();
	    });
	  });
	});
      });
    });

    it('should authenticate when using facebook bearer token header', function(done) {
      var fbTestUser = config.testUsers.facebook;
      var authTestEndpoint = config.hostname + '/api/auth/test/requireslogin';
      // make a test request to see if Bearer login will work
      request({
	uri: authTestEndpoint,
	method: 'POST',
	headers: {
	  // headers necessary for Bearer login
	  'Authorization': 'Bearer ' + fbTestUser.accessToken,
	  'Passport-Auth-Strategy': 'Facebook'
	}
      }, function(err, resp, body) {
	expect(err).to.be(null);
	expect(resp.statusCode).to.be(200);
	// parse out the body from string? data here
	body = JSON.parse(body);
	expect(body.facebook.userId)
	  .to.be.equal(fbTestUser.userId);
	done();
      });
    });

  });
});
