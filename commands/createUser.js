module.exports = function createUserCommand(program, helpers) {
  /**
   * Script to generate one user
   */

  program
  .command('createUser [new?]')
  .description('Create a new user in current project')
  .action(function run() {
    var we = helpers.getWe();

    var sget = helpers.sget;

    var userStub = {
      username: 'administrator',
      biography: 'Administrator is the first user!',
      email: 'contato@albertosouza.net',
      password: '123',
      displayName: 'Administrator',
      language: 'pt-br',
      active: true
    };

    we.bootstrap(function(err, we) {
      if (err) return doneAll(err);

      we.log.info('-');
      we.log.info('--');
      we.log.info('--- User creation: ----');
      we.log.info('--');
      we.log.info('-');

      // alows user set new user data
      var whantsSendUserData = sget('Do you what set user data?. \n y or n?');
      // remove \n
      whantsSendUserData = whantsSendUserData.replace('\n','');


      if ( whantsSendUserData === 'y') {
        userStub.displayName = sget('What is the displayName?');
        userStub.displayName = userStub.displayName.replace('\n','');
        userStub.username = sget('What is the username?');
        userStub.username = userStub.username.replace('\n','');
        userStub.email = sget('What is the email?');
        userStub.email = userStub.email.replace('\n','');
        userStub.password = sget('What is the password?');
        userStub.password = userStub.password.replace('\n','');
      }

      we.log.info('I will create the user: ', userStub);

      we.db.models.user.create(userStub)
      .done(function (user) {
        we.log.info('New User: ', user.get());

        user.updatePassword(userStub.password , function(error) {
          if (error) return doneAll(error);

          return doneAll();
        });

      })
      .catch(doneAll);
    });

    function doneAll(err) {
      if ( err ) {
        we.log.error('Error on create user:', err);
      }

      we.exit(function () {
        // end / exit
        process.exit();
      });
    }
  });
}
