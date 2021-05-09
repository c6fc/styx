const aws = require('aws-sdk');

let cb = '';
let origin = '';

function respond(statusCode, headers, body, success) {
  const allowedOrigins = [
    `https://${process.env.BASEPATH}`,
    'http://localhost',
  ];

  let responseHeaders;

  if (allowedOrigins.indexOf(origin) > -1) {
    responseHeaders['Access-Control-Allow-Origin'] = origin;
  }

  cb(null, {
    statusCode,
    responseHeaders,
    body: ((typeof body === 'string') ? body : JSON.stringify(body)),
  });

  if (success) {
    return Promise.resolve(body);
  }

  return Promise.reject(body);
}

exports.main = function (request, context, callback) {
  const ddb = new aws.DynamoDB({ region: 'us-west-2' });

  // eslint-disable-next-line no-console
  console.log(request);

  cb = callback;
  origin = request.headers.origin || request.headers.Origin;

  request.pathParameters.customer = Buffer.from(request.pathParameters.customer, 'base64').toString('utf8');

  // eslint-disable-next-line no-console
  console.log(request.pathParameters.customer);

  return ddb.deleteItem({
    Key: {
      customerName: {
        S: request.pathParameters.customer,
      },
    },
    TableName: process.env.TABLE,
  }).promise()
    .then(() => {
      respond(200, {}, request.pathParameters.customer, true);
    }, (err) => {
      respond(500, {}, err, true);
    });
};
