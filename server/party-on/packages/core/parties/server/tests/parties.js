/* jshint -W079 */
/* Related to https://github.com/linnovate/mean/issues/898 */
'use strict';

/**
 * Module dependencies.
 */
var expect = require('expect.js'),
  config = require('meanio').loadConfig(),
  async = require('async'),
  request = require('request'),
  _ = require('underscore'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Party = mongoose.model('Party');

/**
 * Globals
 */
var user, party, loginToken;
var invalidAddress = '405 s ronson';

/**
 * Test Suites
 */
describe('Create and save party', function() {
  describe('Model Party:', function() {

    beforeEach(function(done) {
      this.timeout(10000);
      user = new User({
        name: 'Full name',
        email: 'test@test.com',
        username: 'user',
        password: 'password'
      });
      user.save(function() {
        party = new Party({
          formattedAddress: "629 S Woodlawn Ave.",
          latitude: 73.2,
          longitude: -176.32,
          maleCost: 5,
          startTime: new Date(),
          user: user,
          university: "Indiana University"
        });

        request({
          uri: config.hostname + '/api/login',
          method: 'POST',
          json: {
            email: user.email,
            password: user.password
          }
        }, function(err, resp, loginBody) {
          // obtain a login token for the user
          loginToken = loginBody.token;
          done();
        });
      });
    });

    afterEach(function(done) {
      this.timeout(10000);
      party.remove(function() {
        user.remove(done);
      });
    });

    describe('Method Save', function() {

      it('should be able to save without problems', function(done) {
        this.timeout(10000);

        return party.save(function(err, data) {
          expect(err).to.be(null);
          expect(data.maleCost).to.equal(5);
          expect(data.femaleCost).to.equal(0);
          expect(data.user.length).to.not.equal(0);
          expect(data.university).to.equal("Indiana University");
          done();
        });

      });

      it('should be able to show an error when try to save without formattedAddress', function(done) {
        this.timeout(10000);
        party.formattedAddress = '';

        return party.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });

      it('should be able to show an error when try to save with bad latitude type', function(done) {
        this.timeout(10000);
        party.latitude = 34345.2;
        return party.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });

      it('should be able to show an error when try to save without user', function(done) {
        this.timeout(10000);
        party.user = {};

        return party.save(function(err) {
          expect(err).to.not.be(null);
          done();
        });
      });
    });

    describe('CRUD Methods for Party over http', function() {    
      var crudParty;

      it('should be able to POST a party', function(done) {
        this.timeout(10000);
        
        crudParty = new Party(_.omit(party.toJSON(), '_id'));
        crudParty.startTime.setHours(party.startTime.getHours() + 4);
            
        var requestConfig = {
          uri: config.hostname + '/api/parties',
          auth: {
            bearer: loginToken
          },
          method: 'POST',
          json: crudParty.toJSON()
          };
          
          request(requestConfig, function(err, resp, body) {
            expect(err).to.be(null);
            expect(resp.statusCode).to.be(200);
            expect(body.startTime).to.be
            .equal(requestConfig.json.startTime);

            crudParty = new Party(body);
            done();
          });
        });
      
      it('should be able to use geocoder for formattedAddres', function(done){
	this.timeout(3000);

	crudParty = new Party(_.omit(party.toJSON(), '_id'));
        crudParty.startTime.setHours(party.startTime.getHours() + 4);

        var requestConfig = {
          uri: config.hostname + '/api/parties',
          auth: {
            bearer: loginToken
          },
          method: 'POST',
          json: crudParty.toJSON()
        };

	request(requestConfig, function(err, resp, body) {
            expect(err).to.be(null);
            expect(resp.statusCode).to.be(200);
            expect(body.formattedAddress).to.be
            .equal('629 South Woodlawn Avenue');
	    
            crudParty = new Party(body);
            done();
          });
      });

      it('should be able to geocode an unkown address', function(done){
	this.timeout(3000);
	var ronsonParty = new Party(_.omit(party.toJSON(), '_id'));
	ronsonParty.formattedAddress = invalidAddress;
	ronsonParty.startTime.setHours(party.startTime.getHours() + 4);
	var requestConfig = {
          uri: config.hostname + '/api/parties',
          auth: {
            bearer: loginToken
          },
          method: 'POST',
          json: ronsonParty.toJSON()
        };
	request(requestConfig, function(err, resp, body) {
	  expect(err).to.be(null);
          expect(resp.statusCode).to.be(200);
	  expect(body.errorCode).to.be
            .equal('UNKNOWN');
          done();
        });
      });

      it('should be able to GET a party', function(done) {
        this.timeout(10000);

	crudParty.formattedAddress = "629 S Woodlawn Ave.";

        request.get({
          uri: config.hostname + '/api/parties/' + crudParty.id.toString(), 
          auth: {
            bearer: loginToken
          },
          method: 'GET'
        }, function(err, resp, body) {
          // @hack - re-serialize body because 
          // it uses some black magic that makes it
          // come as not a real json object at all
          var newBody = JSON.parse(body.toString());
          var expectedGeocodeAddress = '629 South Woodlawn Avenue';

          expect(err).to.be(null);
          expect(newBody['_id']).to.be
            .equal(crudParty.id.toString());
          expect(newBody['formattedAddress']).to.be
            .equal(expectedGeocodeAddress);
          done();
          });
      });

      it('should be able to PUT an updated party', function(done) {
       this.timeout(10000);

        var updatedParty = new Party(crudParty.toJSON());
        updatedParty.endTime = new Date(crudParty.startTime.getTime());
        updatedParty.endTime.setHours(updatedParty.endTime.getHours());
        updatedParty.byob = !crudParty.byob;

        var requestConfig = {
          uri: config.hostname + '/api/parties/' + crudParty.id.toString(),
          auth: {
            bearer: loginToken
          },
          method: 'PUT',
          json: updatedParty.toJSON()
        };

        request(requestConfig, function(err, resp, body) {
          expect(err).to.be(null);
          expect(resp.statusCode).to.be(200);
          crudParty = new Party(body);
          expect(crudParty.id.toString()).to.be
            .equal(updatedParty.id.toString());
          expect(crudParty.endTime.getTime()).to
            .be(updatedParty.endTime.getTime());
          expect(crudParty.byob).to
            .be(updatedParty.byob);
          
            done();
        });
      });

      it('should not be able to PUT an invalid address', function(done) {
 	this.timeout(10000);
	  
	var invalidParty = new Party(crudParty.toJSON());
	invalidParty.startTime.setHours(party.startTime.getHours() + 4);
	invalidParty.formattedAddress = invalidAddress;
	
	var requestConfig = {
	  uri: config.hostname + '/api/parties/' + invalidParty.id,
	  auth: {
	    bearer: loginToken
	  },
	  method: 'PUT',
	  json: invalidParty.toJSON()
	};
	
	request(requestConfig, function(err, resp, body) {
	  expect(err).to.be(null);
	  expect(resp.statusCode).to.be(200);
	  expect(body.errorCode).to.be
	    .equal('UNKNOWN');
	  done();
	});	
      });

      it('should be able to DELETE a party', function(done) {
        this.timeout(10000);  
        
        var requestConfig = {
          uri: config.hostname + '/api/parties/' + crudParty.id.toString(),
          auth: {
            bearer: loginToken
          },
          method: 'DELETE',
          json: {}
        };
        
        request(requestConfig, function(err, resp, body) {
          expect(err).to.be(null);
          expect(resp.statusCode).to.be(200);

          done();
        });
      });
    });

    describe('Retrieving a list of relevant parties near me', function() {
      var now = new Date();
      var oneHour = 60 * 60 * 1000;

      var tooOldDate = new Date(now.getTime() - (oneHour * 14));
      var tooFarOffDate = new Date(now.getTime() + (oneHour * 72));
      var justYoungEnoughDate = new Date(now.getTime() - (oneHour * 7));
      var justCloseEnoughDate = new Date(now.getTime() + (oneHour * 47));

      var tooOldParty, tooFarOffParty,
        justYoungEnoughParty, justCloseEnoughParty;

      it('should be able to POST parties with different start dates', function(done) {
        this.timeout(10000);

        // create parties with interesting start dates
        var parties = _.map(
          [tooOldDate, tooFarOffDate, justYoungEnoughDate, justCloseEnoughDate],
          function(date) {
            return _.omit(
              _.extend(party.toJSON(), {startTime: date}),
              '_id');
          });

        var postJobs = [];
        for (var idx in parties) {
          // create a list of POST jobs for these parties
          postJobs.push((function(i){
            return function(cb) {
            request({
              uri: config.hostname + '/api/parties',
              auth: {
                bearer: loginToken
              },
              method: 'POST',
              json: parties[i]
            }, function(err, resp, body) {
              expect(err).to.be(null);
              expect(resp.statusCode).to.be(200);
              cb(err, new Party(body));
            });
          };
          })(idx));
        }
        // POST all 4 parties in parallel
        async.parallel(postJobs, function(err, results) {
          expect(err).to.be(null);
          tooOldParty = results[0];
          tooFarOffParty = results[1];
          justYoungEnoughParty = results[2];
          justCloseEnoughParty = results[3];
          done();
        });
      });

      it('should retrive only time-relevant parties', function(done) {
        this.timeout(10000);
        
        request({
          uri: config.hostname + '/api/parties/university/Indiana%20University',
          auth: {
            bearer: loginToken
          },
          method: 'GET'
          }, function(err, resp, body) {
            // @hack - re-serialize body because 
            // it uses some black magic that makes it
            // come as not a real json object at all
            expect(err).to.be(null);
            expect(resp.statusCode).to.be(200);
            body = JSON.parse(body.toString());
            expect(_.has(body, 'parties')).to.be(true);
            var relevantPartyIds = _.map(body.parties, function(party) {
              return party._id.toString();
            });
            var ours = [justYoungEnoughParty, justCloseEnoughParty, tooOldParty, tooFarOffParty];
            // parties in sweet spot time interval should be returned
            _.forEach([justYoungEnoughParty, justCloseEnoughParty],
              function(party) {
                expect(_.contains(relevantPartyIds, party.id.toString()))
                  .to.be(true);
            });
            // parties outside of sweet spot time interval should not be returned
            _.forEach([tooOldParty, tooFarOffParty],
              function(party) {
                expect(_.contains(relevantPartyIds, party.id.toString()))
                  .to.be(false);
            });
            done();
        });
      });
    });
  });

  describe('theWord', function() {

    it('should be able to post a word', function(done) {
      this.timeout(10000);

      var user = User.findOne({}, function(err, user) {
	Party.findOne({}, function(err, party) {

	  var newParty = new Party(party);
	  party.user = user._id;
	  party.save(function(err) {
	    
	    var msg = 'Message number ' + Math.random();
	    var oldMsgCount = party.theWord.length;
	    var wordEndpoint = config.hostname + '/api/parties/' + party._id + '/word';
	    request({
	      method: 'PUT',
	      uri: wordEndpoint,
	      json: {
		body: msg
	      }
	    }, function(err, resp, body) {
	      expect(err).to.be(null);
	      expect(resp.statusCode).to.be(200);
	      var newParty = new Party(body);
	      expect(newParty.theWord.length)
		.to.be(oldMsgCount + 1);
	      expect(newParty.theWord[newParty.theWord.length-1].body)
		.to.be.equal(msg);
	      done();
	    });
	  });
	});
      });
    });
  });
});
