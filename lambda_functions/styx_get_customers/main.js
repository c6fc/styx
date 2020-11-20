'use strict';

var aws = require('aws-sdk');
var ddb = new aws.DynamoDB({region: "us-west-2", apiVersion: "2012-08-10"});
var ddbTypes = require('dynamodb-data-types').AttributeValue;
var iam = new aws.IAM();
var cognito = new aws.CognitoIdentityServiceProvider({region: "us-west-2", apiVersion: "2016-04-18"});

var origin = "";

function respond(statusCode, headers, body, success) {	

	var allowed_origins = [
		"https://" + process.env.BASEPATH,
		"http://localhost"
	]

	if (allowed_origins.indexOf(origin) !== false) {
		headers['Access-Control-Allow-Origin'] = origin;
	}

	callback(null, {
		statusCode: statusCode,
		headers: headers,
		body: ((typeof body == "string") ? body : JSON.stringify(body))
	});

	if (success == true) {
		return Promise.resolve(body);
	} else {
		return Promise.reject(body);
	}
}

var callback = null;
exports.main = function(event, context, cb) {

	console.log(event);

	callback = cb;
	origin = event.headers.origin || event.headers.Origin;

	try {

		var callerUsername = "";

		var identity = event.requestContext.identity.cognitoAuthenticationProvider.split('/')[2].split(':')
		getCognitoUser(identity[0], identity[2])
		.then((data) => {
			console.log(data);

			if (!data.UserAttributes.hasOwnProperty('nickname')) {
				return Promise.reject(respond(401, {}, { msg: "Your Cognito user isn't linked to your IAM user." ,success: false }, false));
			}

			callerUsername = data.UserAttributes.nickname;
			return getUser(callerUsername)
		})
		.then((user) => {

			var customerPromises = [];
			Object.keys(user.Tags).forEach(function(e) {
				if (/^MS-.*$/.test(e)) {
					customerPromises.push(query(e.substring(3)));
					console.log("Found " + e);
				} else {
					console.log(e + " Doesn't match");
				}
			});

			customerPromises.push(getGlobal());

			return Promise.all(customerPromises);

		}, (err) => {
			return Promise.reject(err);
		}).then((allCustomers) => {

			var customerList = [];
			allCustomers.forEach(function(t) {
				t.forEach(function(c) {
					customerList.push(c);
				});
			});

			var response = {
				callerUsername: callerUsername,
				customers: customerList
			}

			respond(200, {}, { msg: response, success: true }, true);

		}, (err) => {
			return Promise.reject(err);
		});

	} catch(err) {
		console.log(err);
		callback(err);
	}
};

function getUser(username) {
	return new Promise((success, failure) => {
		iam.getUser({
			UserName: username
		}, function(err, data) {
			if (err) {
				return failure(err);
			}

			var user = data.User;
			var tags = user.Tags;
			user.Tags = {};

			tags.forEach(function(e) {
				user.Tags[e.Key] = e.value;
			});

			return success(user);
		})
	})
}

function getCognitoUser(pool, username) {
	return new Promise((success, failure) => {
		cognito.adminGetUser({
			UserPoolId: pool,
			Username: username
		}).promise()
		.then((data) => {
			var attributes = {};

			data.UserAttributes.forEach(function(e) {
				attributes[e.Name] = e.Value;
			});

			data.UserAttributes = attributes;

			success(data);
		}, (err) => {
			failure(err);
		})
	})
}

function query(customer) {
	return new Promise((success, failure) => {
		ddb.query({
			ExpressionAttributeValues: {
				":v1": {
					"S": customer
				}
			},
			KeyConditionExpression: "customerName = :v1",
			TableName: process.env.TABLE
		}, function(err, data) {
			if (err) {
				return failure(err);
			}

			if (!data.hasOwnProperty('Items')) {
				return success([]);
			}

			var items = [];
			data.Items.forEach(function(e) {
				items.push(ddbTypes.unwrap(e));
			});

			console.log(items);

			return success(items);
		});
	});
}

function getGlobal() {
	return new Promise((success, failure) => {
		ddb.query({
			ExpressionAttributeValues: {
				":v1": {
					"S": "TRUE"
				}
			},
			KeyConditionExpression: "isGlobal = :v1",
			TableName: process.env.TABLE,
			IndexName: "Global"
		}, function(err, data) {
			if (err) {
				return failure(err);
			}

			if (!data.hasOwnProperty('Items')) {
				return success([]);
			}

			var items = [];
			data.Items.forEach(function(e) {
				items.push(ddbTypes.unwrap(e));
			});

			console.log('getGlobal');
			console.log(items);

			return success(items);
		});
	});
}