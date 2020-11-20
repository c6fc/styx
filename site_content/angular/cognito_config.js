window.aws_region = "us-west-2";

angular.module('app')
	.constant('COGNITO_CONFIG', {
		"UserPoolId": "us-west-2_lfenNYcaU",
		"ClientId": "6qg1t25jfusif1463s2a8heef"
	})
	.constant('COGNITO_CREDENTIALS', {
		"IdentityPoolId": "us-west-2:8442a599-080c-44f4-8bbb-e85c7bb33740",
		"Logins": {
			'cognito-idp.us-west-2.amazonaws.com/us-west-2_lfenNYcaU': ""
		}
	})
	.constant('APIGATEWAY_URL', "api.styx.bradwoodward.io")
	;