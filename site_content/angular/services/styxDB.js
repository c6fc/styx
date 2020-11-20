angular
	.module('app')
	.service('styxDB', ['cognito', 'APIGATEWAY_URL', function(cognitoSvc, APIGATEWAY_URL) {
		var cache = {scan: {}};

		return {
			ddb: {},
			s3: {},

			init: function() {
				this.ddb = new AWS.DynamoDB({
					apiVersion: '2012-10-08'
				});

				this.s3 = new AWS.S3();
			},

			scan: function(table, force = null) {
				var self = this;

				if (cache.scan[table] && !force) {
					return Promise.resolve(cache.scan[table]);
				}

				return new Promise((success, failure) => {
					self.ddb.scan({
						TableName: table
					}).promise()
					.then((data) => {
						var entries = [];
						data.Items.forEach(function(i) {
							entries.push(AWS.DynamoDB.Converter.unmarshall(i));
						});

						cache.scan[table] = entries;
						success(entries);

					}, (err) => {
						failure(err);
					});
				});
			},

			getSignedUrl: function(action, params) {
				return this.s3.getSignedUrl(action, params);
			}
		};
	}]);