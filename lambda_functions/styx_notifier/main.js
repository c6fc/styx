'use strict';

const aws = require('aws-sdk');
var cb = "";

function respond(statusCode, headers, body, success) {	

	cb(null, {
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

exports.main = function(request, context, callback) {

	console.log(request);
	callback(null, true);

	/*
	cb = callback;

	var body = request.body;
	if (request.isBase64Encoded) { 
		body = new Buffer(req_body, 'base64').toString('utf8');
	}

	var ddb = new aws.DynamoDB({"region": "us-west-2"});
	var item = aws.DynamoDB.Converter.marshall(JSON.parse(body));

	console.log(item);

	return ddb.putItem({
		Item: item,
		TableName: process.env.TABLE,
	}).promise()
	.then((result) => {
		respond(200, {}, body.customerName, true);
	}, (err) => {
		respond(500, {}, err, true);
	});
	*/
};