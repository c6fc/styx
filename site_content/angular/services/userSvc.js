angular
	.module('app')
	.service('userSvc', ['COGNITO_CONFIG', 'COGNITO_CREDENTIALS', 'cognito', function(COGNITO_CONFIG, COGNITO_CREDENTIALS, cognitoSvc) {
		if (!cognitoSvc.isAdmin()) {
			return {};
		}

		return {

			cognitoIdp: new AWS.CognitoIdentityServiceProvider({
				apiVersion: '2016-04-18',
				region: 'us-west-2'
			}),

			cognitoIdentity: new AWS.CognitoIdentity({
				apiVersion: '2014-06-30',
				region: 'us-west-2'
			}),

			iam: new AWS.IAM({
				apiVersion: '2010-05-08',
				region: 'us-east-1'
			}),

			users: [],
			identities: [],

			createUser: function(email, nickname, isAdmin = false) {
				var self = this;

				return self.cognitoIdp.adminCreateUser({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: email,
					DesiredDeliveryMediums: ["EMAIL"],
					ForceAliasCreation: false,
					UserAttributes: [{
						Name: "email",
						Value: email
					}, {
						Name: "email_verified",
						Value: "true"
					}, {
						Name: "nickname",
						Value: nickname
					}]
				}).promise().then((data) => {

					if (isAdmin) {
						return self.makeUserAdmin(data.User);
					}

					return Promise.resolve(data.User);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			deleteUser: function(user) {
				var self = this;

				if (cognitoSvc.cognitoUserSession.idToken.payload.email == user.email) {
					return Promise.reject("You cannot delete yourself.");
				}

				return self.cognitoIdp.adminDeleteUser({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			disableUser: function(user) {
				var self = this;

				if (cognitoSvc.cognitoUserSession.idToken.payload.email == user.email) {
					return Promise.reject("You cannot disable yourself.");
				}

				return self.cognitoIdp.adminDisableUser({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			enableUser: function(user) {
				var self = this;

				return self.cognitoIdp.adminEnableUser({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			getUserAuthEvents: function(user) {
				var self = this;

				return self.cognitoIdp.adminListUserAuthEvents({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user,
					MaxResults: 20
				}).promise((data) => {
					return Promise.resolve(data.Username);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			listUsers: function() {
				var self = this;

				return Promise.all([
					this.cognitoIdp.listUsers({
						UserPoolId: COGNITO_CONFIG.UserPoolId,
						AttributesToGet: ['email', 'nickname']
					}).promise(),
					this.cognitoIdp.listUsersInGroup({
						GroupName: "styx-admins",
						UserPoolId: COGNITO_CONFIG.UserPoolId
					}).promise(),
				]).then((data) => {
					var users = data[0].Users;

					var admins = data[1].Users.map(function(a) {
						return a.Username;
					});

					users.forEach(function(u) {
						u.isAdmin = false;
						u.authEvents = [];
						if (admins.indexOf(u.Username) > -1) {
							u.isAdmin = true;
						}

						u.Attributes.forEach(function(att) {
							u[att.Name] = att.Value;
						})
					});

					self.users = users;

					return Promise.resolve(users);
				});
			},

			listUserTags: function(user) {
				if (!user.nickname || user.nickname == "") {
					return Promise.resolve({});
				}

				return this.iam.listUserTags({
					UserName: user.nickname,
				}).promise()
				.then((data) => {

					user.tags = [];
					data.Tags.forEach((tag) => {
						if (/^Styx-.*$/.test(tag.Key)) {
							user.tags.push(tag);
						}
					});

					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			makeUserAdmin: function(user) {
				console.log(user);
				return this.cognitoIdp.adminAddUserToGroup({
					GroupName: "styx-admins",
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			makeUserLimited: function(user) {
				if (cognitoSvc.cognitoUserSession.idToken.payload.email == user.email) {
					return Promise.reject("You cannot demote yourself.");
				}

				return this.cognitoIdp.adminRemoveUserFromGroup({
					GroupName: "styx-admins",
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(user);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			resetUserPassword: function(user) {
				var self = this;

				return self.cognitoIdp.adminResetUserPassword({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(data.Username);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			setUserNickname: function(user) {
				var self = this;

				return self.cognitoIdp.adminUpdateUserAttributes({
					UserAttributes: [{
						Name: "email",
						Value: user.email
					}, {
						Name: "nickname",
						Value: user.nickname
					}],
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: user.Username
				}).promise((data) => {
					return Promise.resolve(data.Username);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},

			forceResetUser: function(email) {
				var self = this;

				return self.cognitoIdp.adminCreateUser({
					UserPoolId: COGNITO_CONFIG.UserPoolId,
					Username: email,
					DesiredDeliveryMediums: ["EMAIL"],
					ForceAliasCreation: false,
					MessageAction: "RESEND",
					UserAttributes: [{
						Name: "email",
						Value: email
					}, {
						Name: "email_verified",
						Value: "true"
					}]
				}).promise().then((data) => {
					return Promise.resolve(data.User);
				}, (e) => {
					console.log(e);
					return Promise.reject(e);
				});
			},
		};
	}]);