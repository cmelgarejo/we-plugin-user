/**
 * User
 *
 * @module      :: Model
 * @description :: System User model
 *
 */
var bcrypt = require('bcrypt');
var async = require('async');

module.exports = {
  schema: true,
  attributes: {
    // wejs provider id
    idInProvider: {
      type: 'string',
      unique: true
    },

    username: {
      type: 'string',
      unique: true,
      required: true,
      regex: /^[A-Za-z0-9_-]{4,30}$/
    },

    biography: { type: 'text' },

    gender: { type: 'text' },

    email: {
      // Email type will get validated by the ORM
      type: 'email',
      required: true,
      unique: true
    },

    // a hashed password
    password: {
      type: 'text'
    },

    displayName: {
      type: 'string'
    },

    birthDate: 'date',

    avatar: {
      model: 'images'
    },

    active: {
      type: 'boolean',
      defaultsTo: false
    },

    isAdmin: {
      type: 'boolean',
      defaultsTo: false
    },

    isModerator: {
      type: 'boolean',
      defaultsTo: false
    },

    language: {
      type: 'string',
      defaultsTo: 'pt-br',
      maxLength: 6
    },

    // estado UF
    locationState: {
      type: 'string'
    },

    city: {
      type: 'string'
    },

    // instant | daily | semanal
    emailNotificationFrequency: {
      type: 'string',
      defaultsTo: 'instant'
    },

    // * @param  {boolean} preserve    true to preserve database data
    roles: {
      collection: 'role',
      via: 'users'
    },

    toJSON: function() {
      var req = this.req;
      delete this.req;

      // delete and hide user email
      delete obj.email;
      // remove password hash from view
      delete obj.password;
 
      var obj = this.toObject();

      if (req && req.isAuthenticated()) {
        if (req.user.id == obj.id || req.user.isAdmin) {
          // campos privados
          obj.email = this.email;
        }
      }

      if (!obj.displayName) {
        obj.displayName = obj.username;
      }
        
      // ember data type
      obj.type = 'user';

     // delete context cache
      delete obj._context;

      return obj;
    },

    verifyPassword: function (password, cb) {
      return User.verifyPassword(password, this.password, cb);
    },

    changePassword: function(user, oldPassword, newPassword, next){
      user.updateAttribute( 'password', newPassword , function (err) {
        if (!err) {
            next();
        } else {
            next(err);
        }
      });
    }
  },

  /**
   * async password generation
   *
   * @param  {string}   password
   * @param  {Function} next     callback
   */
  generatePassword: function(password, next) {
    var SALT_WORK_FACTOR = sails.config.user.SALT_WORK_FACTOR;

    return bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      return bcrypt.hash(password, salt, next);
    });
  },

  /**
   * Verify user password
   *
   * @param  {string}   password user password string to test
   * @param  {string}   hash     DB user hased password
   * @param  {Function} cb       Optional callback
   * @return {boolean}           return true or false if no callback is passed
   */
  verifyPassword: function (password, hash, cb) {
    // if user dont have a password
    if(!hash){
      if(!cb) return false;
      return cb(null, false);
    }

    // if dont has a callback do a sync check
    if (!cb) return bcrypt.compareSync(password, hash);
    // else compare async
    bcrypt.compare(password, hash, cb);
  },

  // Lifecycle Callbacks
  beforeCreate: function(user, next) {
    // never save consumers on create
    delete user.consumers;
    // dont allow to set admin and moderator flags
    delete user.isAdmin;
    delete user.isModerator;
    // sanitize
    user = SanitizeHtmlService.sanitizeAllAttr(user);

    // optional password
    if (user.password) {
      this.generatePassword(user.password, function(err, hash) {
        if (err) return next(err);

        user.password = hash;
        return next();
      });
    } else {
      // ensures that user password are undefined
      delete user.password;
      next();
    }
  },

  beforeUpdate: function(user, next) {
    // sanitize
    user = SanitizeHtmlService.sanitizeAllAttr(user);
    // if has user.newPassword generate the new password
    if (user.newPassword) {
      return this.generatePassword(user.newPassword, function(err, hash) {
        if (err) return next(err);
        // delete newPassword variable
        delete user.newPassword;
        // set new password
        user.password = hash;
        return next();
      });
    } else {
      return next();
    }
  },

  // custom find or create for oauth
  customFindORCreate: function(criteria, data, done) {
    User.findOne(criteria).exec(function(err, user) {
      if (err) return done(err);
      if (user) return done(null, user);
      User.create(data).exec(done);
    });
  },

  validUsername: function(username){
    var restrictedUsernames = [
      'logout',
      'login',
      'auth',
      'api',
      'admin',
      'account',
      'user'
    ];

    if (restrictedUsernames.indexOf(username) >= 0) {
      return false;
    }
    return true
  },

  /**
   * Add a role to an user 
   * @param  {Array} Array of users id
   * @param  {Object || Integer} Role to add user(s) 
   * @param  {Function} cb
   */
  addRole: function (users, role, cb){
    User.find(users)
    .exec(function (err, u){
      if ( err ) return cb(err);
      if ( !u || !u.length) return cb('User::addRole: No user was found for this array -> ', users);

      async.each(u, function (oneUser, callback){
        oneUser.roles.add(role);
        oneUser.save(callback);
      }, function (err){
        if ( err ) return cb('User::addRole: Some error processing each async user. error: ', err);
        cb();
      });
    });
  }
};